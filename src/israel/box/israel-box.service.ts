import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { BoxStatus, IsraelBox, Prisma, ShipmentStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { SeasonsService } from 'src/seasons/seasons.service';
import { AuditLogService } from 'src/audit/audit.service';
import { CreateIsraelBoxDto } from './dto/create-israel-box.dto';
import { CreateIsraelBoxesBulkDto } from './dto/create-israel-boxes-bulk.dto';
import { UpdateIsraelBoxDto } from './dto/update-israel-box.dto';

const MAX_BULK_BOX_RANGE = 100;

const boxInclude = {
  field: { select: { id: true, name: true } },
  shipment: { select: { id: true, shipmentNumber: true } },
  updatedBy: { select: { name: true } },
  _count: { select: { items: true } },
} satisfies Prisma.IsraelBoxInclude;

function isShippedStatus(status: BoxStatus): boolean {
  return status === BoxStatus.SHIPPED || status === BoxStatus.DELIVERED;
}

@Injectable()
export class IsraelBoxService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly seasonsService: SeasonsService,
    private readonly auditLog: AuditLogService,
  ) {}

  async syncShipmentTotals(tx: Prisma.TransactionClient, shipmentId: number | null) {
    if (shipmentId === null) {
      return;
    }

    const [totalBoxes, itemsAgg] = await Promise.all([
      tx.israelBox.count({ where: { shipmentId } }),
      tx.israelShipmentItem.aggregate({ where: { box: { shipmentId } }, _sum: { quantity: true } }),
    ]);

    await tx.israelShipment.update({
      where: { id: shipmentId },
      data: { totalBoxes, totalQuantity: itemsAgg._sum.quantity ?? 0 },
    });
  }

  private async assertShipmentAssignable(seasonId: number, shipmentId: number) {
    const shipment = await this.prisma.israelShipment.findFirst({
      where: { id: shipmentId, seasonId },
      select: { id: true, status: true, fieldId: true },
    });

    if (!shipment) {
      throw new NotFoundException(`Israel shipment ${shipmentId} not found in this season`);
    }

    if (shipment.status === ShipmentStatus.SHIPPED || shipment.status === ShipmentStatus.DELIVERED) {
      throw new BadRequestException('Cannot attach a box to a shipment that has already been shipped or delivered');
    }

    return shipment;
  }

  private async assertFieldExists(fieldId: number) {
    const field = await this.prisma.israelField.findUnique({ where: { id: fieldId }, select: { id: true } });
    if (!field) {
      throw new NotFoundException(`Israel field #${fieldId} not found`);
    }
  }

  async findAllBySeason(seasonId: number) {
    await this.seasonsService.assertSeasonExists(seasonId);

    return this.prisma.israelBox.findMany({
      where: { seasonId },
      include: boxInclude,
      orderBy: { boxNumber: 'asc' },
    });
  }

  async findOne(id: number) {
    const box = await this.prisma.israelBox.findUnique({
      where: { id },
      include: { ...boxInclude, items: true },
    });

    if (!box) {
      throw new NotFoundException(`Israel box #${id} not found`);
    }

    return box;
  }

  async create(dto: CreateIsraelBoxDto, actorId: number) {
    if (!Number.isInteger(dto.boxNumber) || dto.boxNumber <= 0) {
      throw new BadRequestException('boxNumber must be a positive integer');
    }

    if (!Number.isInteger(dto.fieldId)) {
      throw new BadRequestException('fieldId is required');
    }

    if (dto.notes !== undefined && typeof dto.notes !== 'string') {
      throw new BadRequestException('notes must be a string');
    }

    await this.seasonsService.assertSeasonExists(dto.seasonId);

    if (dto.shipmentId !== undefined) {
      const shipment = await this.assertShipmentAssignable(dto.seasonId, dto.shipmentId);
      if (dto.fieldId !== shipment.fieldId) {
        throw new BadRequestException('Box field must match the field of the shipment it is attached to');
      }
    } else {
      await this.assertFieldExists(dto.fieldId);
    }

    const existing = await this.prisma.israelBox.findUnique({
      where: { seasonId_boxNumber: { seasonId: dto.seasonId, boxNumber: dto.boxNumber } },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(`Box #${dto.boxNumber} already exists in this season`);
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const box = await tx.israelBox.create({
        data: {
          seasonId: dto.seasonId,
          fieldId: dto.fieldId,
          shipmentId: dto.shipmentId ?? null,
          boxNumber: dto.boxNumber,
          status: BoxStatus.OPEN,
          itemsCount: 0,
          notes: dto.notes,
          updatedById: actorId,
        },
      });

      await this.syncShipmentTotals(tx, box.shipmentId);

      return box;
    });

    await this.auditLog.record({
      userId: actorId,
      action: 'CREATE',
      entityType: 'IsraelBox',
      entityId: created.id,
      after: created,
    });

    return created;
  }

  async bulkCreate(dto: CreateIsraelBoxesBulkDto, actorId: number) {
    if (!Number.isInteger(dto.startNumber) || dto.startNumber <= 0) {
      throw new BadRequestException('startNumber must be a positive integer');
    }

    if (!Number.isInteger(dto.endNumber) || dto.endNumber < dto.startNumber) {
      throw new BadRequestException('endNumber must be a positive integer greater than or equal to startNumber');
    }

    if (dto.endNumber - dto.startNumber + 1 > MAX_BULK_BOX_RANGE) {
      throw new BadRequestException(`Cannot create more than ${MAX_BULK_BOX_RANGE} boxes at once`);
    }

    if (!Number.isInteger(dto.fieldId)) {
      throw new BadRequestException('fieldId is required');
    }

    await this.seasonsService.assertSeasonExists(dto.seasonId);

    if (dto.shipmentId !== undefined) {
      const shipment = await this.assertShipmentAssignable(dto.seasonId, dto.shipmentId);
      if (dto.fieldId !== shipment.fieldId) {
        throw new BadRequestException('Box field must match the field of the shipment it is attached to');
      }
    } else {
      await this.assertFieldExists(dto.fieldId);
    }

    const boxNumbers = Array.from({ length: dto.endNumber - dto.startNumber + 1 }, (_, i) => dto.startNumber + i);

    const existing = await this.prisma.israelBox.findMany({
      where: { seasonId: dto.seasonId, boxNumber: { in: boxNumbers } },
      select: { boxNumber: true },
      orderBy: { boxNumber: 'asc' },
    });

    if (existing.length > 0) {
      const numbers = existing.map((b) => b.boxNumber).join(', ');
      throw new ConflictException(`The following box numbers already exist in this season: ${numbers}`);
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const boxes: IsraelBox[] = [];
      for (const boxNumber of boxNumbers) {
        boxes.push(
          await tx.israelBox.create({
            data: {
              seasonId: dto.seasonId,
              fieldId: dto.fieldId,
              shipmentId: dto.shipmentId ?? null,
              boxNumber,
              status: BoxStatus.OPEN,
              itemsCount: 0,
              updatedById: actorId,
            },
          }),
        );
      }

      await this.syncShipmentTotals(tx, dto.shipmentId ?? null);

      return boxes;
    });

    await this.auditLog.record({
      userId: actorId,
      action: 'CREATE',
      entityType: 'IsraelBox',
      entityId: created[0].id,
      after: created,
    });

    return created;
  }

  async update(id: number, dto: Omit<UpdateIsraelBoxDto, 'id'>, actorId: number) {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('At least one box field must be provided for update');
    }

    if (dto.boxNumber !== undefined && (!Number.isInteger(dto.boxNumber) || dto.boxNumber <= 0)) {
      throw new BadRequestException('boxNumber must be a positive integer');
    }

    if (dto.status !== undefined && !Object.values(BoxStatus).includes(dto.status)) {
      throw new BadRequestException('status is invalid');
    }

    if (dto.fieldId !== undefined && !Number.isInteger(dto.fieldId)) {
      throw new BadRequestException('fieldId must be a valid integer');
    }

    if (dto.notes !== undefined && dto.notes !== null && typeof dto.notes !== 'string') {
      throw new BadRequestException('notes must be a string');
    }

    const current = await this.prisma.israelBox.findUnique({ where: { id } });
    if (!current) {
      throw new NotFoundException(`Israel box #${id} not found`);
    }

    if (dto.boxNumber !== undefined && dto.boxNumber !== current.boxNumber) {
      const existing = await this.prisma.israelBox.findUnique({
        where: { seasonId_boxNumber: { seasonId: current.seasonId, boxNumber: dto.boxNumber } },
      });
      if (existing) {
        throw new ConflictException(`Box #${dto.boxNumber} already exists in this season`);
      }
    }

    if (dto.fieldId !== undefined && dto.fieldId !== current.fieldId) {
      if (current.itemsCount > 0) {
        throw new BadRequestException('Cannot change the field of a box that already has items');
      }
      await this.assertFieldExists(dto.fieldId);
    }

    const effectiveFieldId = dto.fieldId ?? current.fieldId;
    const isChangingShipment = dto.shipmentId !== undefined && dto.shipmentId !== current.shipmentId;
    let derivedStatus: BoxStatus | undefined;

    if (isChangingShipment && dto.shipmentId !== null) {
      const shipment = await this.assertShipmentAssignable(current.seasonId, dto.shipmentId as number);
      if (effectiveFieldId !== shipment.fieldId) {
        throw new BadRequestException('Box field must match the field of the shipment it is attached to');
      }
      derivedStatus = current.itemsCount > 0 ? BoxStatus.CLOSED : BoxStatus.OPEN;
    } else if (isChangingShipment && dto.shipmentId === null) {
      derivedStatus = current.itemsCount > 0 ? BoxStatus.CLOSED : BoxStatus.OPEN;
    } else if (dto.status !== undefined) {
      if (isShippedStatus(current.status) !== isShippedStatus(dto.status)) {
        throw new BadRequestException(
          'Box status can only be changed between OPEN and CLOSED, or between SHIPPED and DELIVERED. Shipped and delivered statuses are set automatically via shipment status changes.',
        );
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const box = await tx.israelBox.update({
        where: { id },
        data: {
          ...(dto.boxNumber !== undefined ? { boxNumber: dto.boxNumber } : {}),
          ...(dto.fieldId !== undefined ? { fieldId: dto.fieldId } : {}),
          ...(dto.shipmentId !== undefined ? { shipmentId: dto.shipmentId } : {}),
          ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
          status: derivedStatus ?? dto.status ?? current.status,
          updatedById: actorId,
        },
      });

      if (isChangingShipment) {
        await this.syncShipmentTotals(tx, current.shipmentId);
        await this.syncShipmentTotals(tx, dto.shipmentId ?? null);
      }

      return box;
    });

    await this.auditLog.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'IsraelBox',
      entityId: id,
      before: current,
      after: updated,
    });

    return updated;
  }

  async removeHard(id: number, actorId: number) {
    const result = await this.prisma.$transaction(async (tx) => {
      const box = await tx.israelBox.findUnique({ where: { id } });
      if (!box) {
        throw new NotFoundException(`Israel box #${id} not found`);
      }

      const itemCount = await tx.israelShipmentItem.count({ where: { boxId: id } });
      if (itemCount > 0) {
        throw new ConflictException(
          `Cannot delete box #${id} — it has ${itemCount} associated item${itemCount === 1 ? '' : 's'}. Remove them first.`,
        );
      }

      await tx.israelBox.delete({ where: { id } });
      await this.syncShipmentTotals(tx, box.shipmentId);

      return box;
    });

    await this.auditLog.record({
      userId: actorId,
      action: 'DELETE',
      entityType: 'IsraelBox',
      entityId: id,
      before: result,
    });

    return { deleted: true, id };
  }

  async removeHardBulk(ids: number[], actorId: number) {
    if (!Array.isArray(ids) || ids.length === 0 || !ids.every((id) => Number.isInteger(id) && id > 0)) {
      throw new BadRequestException('ids must be a non-empty array of positive integers');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const boxes = await tx.israelBox.findMany({ where: { id: { in: ids } } });

      const foundIds = new Set(boxes.map((box) => box.id));
      const missingIds = ids.filter((id) => !foundIds.has(id));
      if (missingIds.length > 0) {
        throw new NotFoundException(`Box(es) not found: ${missingIds.join(', ')}`);
      }

      const boxNumberById = new Map(boxes.map((box) => [box.id, box.boxNumber]));

      const itemCounts = await tx.israelShipmentItem.groupBy({
        by: ['boxId'],
        where: { boxId: { in: ids } },
        _count: { _all: true },
      });
      if (itemCounts.length > 0) {
        const boxNumbers = itemCounts.map((count) => boxNumberById.get(count.boxId) ?? count.boxId).join(', ');
        throw new ConflictException(`Cannot delete box(es) #${boxNumbers} — they have associated items. Remove them first.`);
      }

      await tx.israelBox.deleteMany({ where: { id: { in: ids } } });

      const shipmentIds = [...new Set(boxes.map((box) => box.shipmentId))];
      for (const shipmentId of shipmentIds) {
        await this.syncShipmentTotals(tx, shipmentId);
      }

      return boxes;
    });

    await this.auditLog.record({
      userId: actorId,
      action: 'DELETE',
      entityType: 'IsraelBox',
      entityId: result[0].id,
      before: result,
    });

    return { deleted: true, ids };
  }
}
