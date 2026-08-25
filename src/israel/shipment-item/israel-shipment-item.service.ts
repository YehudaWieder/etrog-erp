import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { BoxStatus, PitamStatus, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuditLogService } from 'src/audit/audit.service';
import { CreateIsraelShipmentItemDto } from './dto/create-israel-shipment-item.dto';
import { UpdateIsraelShipmentItemDto } from './dto/update-israel-shipment-item.dto';
import { PackIsraelShipmentItemsDto } from './dto/pack-israel-shipment-items.dto';
import { IsraelBoxService } from '../box/israel-box.service';

const itemInclude = {
  category: { select: { id: true, name: true } },
  updatedBy: { select: { name: true } },
} satisfies Prisma.IsraelShipmentItemInclude;

const itemWithBoxInclude = {
  ...itemInclude,
  box: {
    select: {
      id: true,
      boxNumber: true,
      fieldId: true,
      shipment: { select: { id: true, shipmentNumber: true, status: true } },
    },
  },
} satisfies Prisma.IsraelShipmentItemInclude;

type IsraelShipmentItemWithCategory = Prisma.IsraelShipmentItemGetPayload<{ include: typeof itemInclude }>;

@Injectable()
export class IsraelShipmentItemService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly boxService: IsraelBoxService,
  ) {}

  private async getAvailableQuantity(
    tx: Prisma.TransactionClient,
    filter: { seasonId: number; fieldId: number; categoryId: number; grade: string; pitamStatus: PitamStatus },
    excludeItemId?: number,
  ): Promise<number> {
    const result = await tx.israelStock.aggregate({
      where: {
        seasonId: filter.seasonId,
        fieldId: filter.fieldId,
        categoryId: filter.categoryId,
        grade: filter.grade,
        pitamStatus: filter.pitamStatus,
        isDeleted: false,
        ...(excludeItemId
          ? { NOT: { movementReferenceId: excludeItemId, type: 'PACKED_SHIPPED' } }
          : {}),
      },
      _sum: { quantity: true },
    });

    return result._sum.quantity ?? 0;
  }

  private async syncBoxItemsCount(tx: Prisma.TransactionClient, boxId: number) {
    const [result, currentBox, settings] = await Promise.all([
      tx.israelShipmentItem.aggregate({ where: { boxId }, _sum: { quantity: true } }),
      tx.israelBox.findUniqueOrThrow({ where: { id: boxId }, select: { status: true } }),
      tx.israelSettings.findFirst({ select: { cartonCapacity: true } }),
    ]);
    const itemsCount = result._sum.quantity ?? 0;
    const capacity = settings?.cartonCapacity ?? 50;

    // Mirrors Italy's box auto-close/auto-reopen: only OPEN/CLOSED boxes are capacity-driven,
    // SHIPPED/DELIVERED boxes are left untouched.
    let nextStatus: BoxStatus | undefined;
    if (currentBox.status === BoxStatus.OPEN && itemsCount >= capacity) {
      nextStatus = BoxStatus.CLOSED;
    } else if (currentBox.status === BoxStatus.CLOSED && itemsCount < capacity) {
      nextStatus = BoxStatus.OPEN;
    }

    const box = await tx.israelBox.update({
      where: { id: boxId },
      data: { itemsCount, ...(nextStatus ? { status: nextStatus } : {}) },
    });
    await this.boxService.syncShipmentTotals(tx, box.shipmentId);
  }

  async findAllBySeason(seasonId: number) {
    return this.prisma.israelShipmentItem.findMany({
      where: { seasonId },
      include: itemWithBoxInclude,
      orderBy: { id: 'desc' },
    });
  }

  async findByBox(boxId: number) {
    return this.prisma.israelShipmentItem.findMany({
      where: { boxId },
      include: itemInclude,
      orderBy: { id: 'asc' },
    });
  }

  async create(dto: CreateIsraelShipmentItemDto, actorId: number) {
    if (!Number.isInteger(dto.quantity) || dto.quantity <= 0) {
      throw new BadRequestException('quantity must be a positive integer');
    }

    if (dto.notes !== undefined && typeof dto.notes !== 'string') {
      throw new BadRequestException('notes must be a string');
    }

    const box = await this.prisma.israelBox.findUnique({ where: { id: dto.boxId } });
    if (!box) {
      throw new NotFoundException(`Israel box #${dto.boxId} not found`);
    }

    if (box.status !== BoxStatus.OPEN) {
      throw new BadRequestException('Cannot add items to a box that is not open');
    }

    const category = await this.prisma.israelSortCategory.findUnique({ where: { id: dto.categoryId } });
    if (!category) {
      throw new NotFoundException('Israel sort category not found');
    }

    if (!category.supportedGrades.includes(dto.grade)) {
      throw new BadRequestException(`Grade "${dto.grade}" is not supported by category "${category.name}"`);
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const available = await this.getAvailableQuantity(tx, {
        seasonId: box.seasonId,
        fieldId: box.fieldId,
        categoryId: dto.categoryId,
        grade: dto.grade,
        pitamStatus: dto.pitamStatus,
      });

      if (available < dto.quantity) {
        throw new BadRequestException(`Not enough stock available (available: ${available}, requested: ${dto.quantity})`);
      }

      const item = await tx.israelShipmentItem.create({
        data: {
          boxId: dto.boxId,
          seasonId: box.seasonId,
          categoryId: dto.categoryId,
          grade: dto.grade,
          pitamStatus: dto.pitamStatus,
          quantity: dto.quantity,
          notes: dto.notes,
          updatedById: actorId,
        },
        include: itemInclude,
      });

      await tx.israelStock.create({
        data: {
          seasonId: box.seasonId,
          date: new Date(),
          categoryId: dto.categoryId,
          grade: dto.grade,
          pitamStatus: dto.pitamStatus,
          quantity: -Math.abs(dto.quantity),
          type: 'PACKED_SHIPPED',
          movementReferenceId: item.id,
          boxId: box.id,
          notes: dto.notes,
          updatedById: actorId,
        },
      });

      await this.syncBoxItemsCount(tx, box.id);

      return item;
    });

    await this.auditLog.record({
      userId: actorId,
      action: 'CREATE',
      entityType: 'IsraelShipmentItem',
      entityId: created.id,
      after: created,
    });

    return created;
  }

  async packItems(dto: PackIsraelShipmentItemsDto, actorId: number) {
    if (!Array.isArray(dto.items) || dto.items.length === 0) {
      throw new BadRequestException('At least one item is required');
    }

    const box = await this.prisma.israelBox.findUnique({ where: { id: dto.boxId } });
    if (!box) {
      throw new NotFoundException(`Israel box #${dto.boxId} not found`);
    }

    if (box.status !== BoxStatus.OPEN) {
      throw new BadRequestException('Cannot add items to a box that is not open');
    }

    const categoryIds = [...new Set(dto.items.map((row) => row.categoryId))];
    const categories = await this.prisma.israelSortCategory.findMany({ where: { id: { in: categoryIds } } });
    const categoryById = new Map(categories.map((category) => [category.id, category]));

    for (const row of dto.items) {
      if (!Number.isInteger(row.quantity) || row.quantity <= 0) {
        throw new BadRequestException('quantity must be a positive integer');
      }

      if (row.notes !== undefined && typeof row.notes !== 'string') {
        throw new BadRequestException('notes must be a string');
      }

      const category = categoryById.get(row.categoryId);
      if (!category) {
        throw new NotFoundException(`Israel sort category #${row.categoryId} not found`);
      }

      if (!category.supportedGrades.includes(row.grade)) {
        throw new BadRequestException(`Grade "${row.grade}" is not supported by category "${category.name}"`);
      }
    }

    const created = await this.prisma.$transaction(
      async (tx) => {
        const items: IsraelShipmentItemWithCategory[] = [];

        for (const row of dto.items) {
          const available = await this.getAvailableQuantity(tx, {
            seasonId: box.seasonId,
            fieldId: box.fieldId,
            categoryId: row.categoryId,
            grade: row.grade,
            pitamStatus: row.pitamStatus,
          });

          if (available < row.quantity) {
            const category = categoryById.get(row.categoryId);
            throw new BadRequestException(
              `Not enough stock available for ${category?.name ?? row.categoryId} / ${row.grade} / ${row.pitamStatus} (available: ${available}, requested: ${row.quantity})`,
            );
          }

          const item = await tx.israelShipmentItem.create({
            data: {
              boxId: dto.boxId,
              seasonId: box.seasonId,
              categoryId: row.categoryId,
              grade: row.grade,
              pitamStatus: row.pitamStatus,
              quantity: row.quantity,
              notes: row.notes,
              updatedById: actorId,
            },
            include: itemInclude,
          });

          await tx.israelStock.create({
            data: {
              seasonId: box.seasonId,
              date: new Date(),
              categoryId: row.categoryId,
              grade: row.grade,
              pitamStatus: row.pitamStatus,
              quantity: -Math.abs(row.quantity),
              type: 'PACKED_SHIPPED',
              movementReferenceId: item.id,
              boxId: box.id,
              notes: row.notes,
              updatedById: actorId,
            },
          });

          items.push(item);
        }

        await this.syncBoxItemsCount(tx, box.id);

        return items;
      },
      { timeout: 60_000 },
    );

    await this.auditLog.record({
      userId: actorId,
      action: 'CREATE',
      entityType: 'IsraelShipmentItem',
      entityId: created[0].id,
      after: created,
    });

    return created;
  }

  async update(id: number, dto: Omit<UpdateIsraelShipmentItemDto, 'id'>, actorId: number) {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('At least one field must be provided for update');
    }

    if (dto.quantity !== undefined && (!Number.isInteger(dto.quantity) || dto.quantity <= 0)) {
      throw new BadRequestException('quantity must be a positive integer');
    }

    if (dto.notes !== undefined && dto.notes !== null && typeof dto.notes !== 'string') {
      throw new BadRequestException('notes must be a string');
    }

    const current = await this.prisma.israelShipmentItem.findUnique({ where: { id } });
    if (!current) {
      throw new NotFoundException(`Israel shipment item #${id} not found`);
    }

    const box = await this.prisma.israelBox.findUnique({ where: { id: current.boxId } });
    if (!box) {
      throw new NotFoundException(`Israel box #${current.boxId} not found`);
    }

    if (box.status === BoxStatus.SHIPPED || box.status === BoxStatus.DELIVERED) {
      throw new BadRequestException('Cannot edit items in a box that has already been shipped or delivered');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.quantity !== undefined && dto.quantity !== current.quantity) {
        const available = await this.getAvailableQuantity(
          tx,
          { seasonId: current.seasonId, fieldId: box.fieldId, categoryId: current.categoryId, grade: current.grade, pitamStatus: current.pitamStatus },
          current.id,
        );

        if (available < dto.quantity) {
          throw new BadRequestException(`Not enough stock available (available: ${available}, requested: ${dto.quantity})`);
        }

        await tx.israelStock.updateMany({
          where: { movementReferenceId: current.id, type: 'PACKED_SHIPPED', isDeleted: false },
          data: { quantity: -Math.abs(dto.quantity), ...(dto.notes !== undefined ? { notes: dto.notes } : {}) },
        });
      } else if (dto.notes !== undefined) {
        await tx.israelStock.updateMany({
          where: { movementReferenceId: current.id, type: 'PACKED_SHIPPED', isDeleted: false },
          data: { notes: dto.notes },
        });
      }

      const item = await tx.israelShipmentItem.update({
        where: { id },
        data: {
          ...(dto.quantity !== undefined ? { quantity: dto.quantity } : {}),
          ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
          updatedById: actorId,
        },
        include: itemInclude,
      });

      if (dto.quantity !== undefined && dto.quantity !== current.quantity) {
        await this.syncBoxItemsCount(tx, current.boxId);
      }

      return item;
    });

    await this.auditLog.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'IsraelShipmentItem',
      entityId: id,
      before: current,
      after: updated,
    });

    return updated;
  }

  async remove(id: number, actorId: number) {
    const current = await this.prisma.israelShipmentItem.findUnique({ where: { id } });
    if (!current) {
      throw new NotFoundException(`Israel shipment item #${id} not found`);
    }

    const box = await this.prisma.israelBox.findUnique({ where: { id: current.boxId } });
    if (!box) {
      throw new NotFoundException(`Israel box #${current.boxId} not found`);
    }

    if (box.status === BoxStatus.SHIPPED || box.status === BoxStatus.DELIVERED) {
      throw new BadRequestException('Cannot remove items from a box that has already been shipped or delivered');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.israelStock.updateMany({
        where: { movementReferenceId: id, type: 'PACKED_SHIPPED', isDeleted: false },
        data: { isDeleted: true, updatedById: actorId },
      });

      await tx.israelShipmentItem.delete({ where: { id } });

      await this.syncBoxItemsCount(tx, box.id);
    });

    await this.auditLog.record({
      userId: actorId,
      action: 'DELETE',
      entityType: 'IsraelShipmentItem',
      entityId: id,
      before: current,
    });

    return { deleted: true, id };
  }
}
