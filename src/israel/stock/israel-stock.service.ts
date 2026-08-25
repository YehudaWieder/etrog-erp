import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PitamStatus, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuditLogService } from 'src/audit/audit.service';
import { CreateIsraelStockMovementDto } from './dto/create-israel-stock-movement.dto';
import { UpdateIsraelStockMovementDto } from './dto/update-israel-stock-movement.dto';

const stockInclude = {
  category: { select: { id: true, name: true } },
  field: { select: { id: true, name: true } },
  box: { select: { id: true, status: true } },
} satisfies Prisma.IsraelStockInclude;

const MANUAL_MOVEMENT_TYPES = ['SELF_PICKUP', 'WASTE'] as const;

@Injectable()
export class IsraelStockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async findAllBySeason(seasonId: number) {
    return this.prisma.israelStock.findMany({
      where: { seasonId, isDeleted: false },
      include: stockInclude,
      orderBy: [{ date: 'desc' }, { id: 'asc' }],
    });
  }

  async createMovement(dto: CreateIsraelStockMovementDto, actorId: number) {
    if (!MANUAL_MOVEMENT_TYPES.includes(dto.type)) {
      throw new BadRequestException(
        `Movement type "${dto.type}" cannot be created manually.`,
      );
    }

    if (!Number.isFinite(dto.quantity) || dto.quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than zero.');
    }

    if (!Number.isFinite(dto.fieldId)) {
      throw new BadRequestException('Field is required.');
    }

    const field = await this.prisma.israelField.findUnique({
      where: { id: dto.fieldId },
    });
    if (!field) {
      throw new NotFoundException('Israel field not found.');
    }

    const category = await this.prisma.israelSortCategory.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category) {
      throw new NotFoundException('Israel sort category not found.');
    }

    if (!category.supportedGrades.includes(dto.grade)) {
      throw new BadRequestException(
        `Grade "${dto.grade}" is not supported by category "${category.name}".`,
      );
    }

    const signedQuantity = -Math.abs(dto.quantity);

    const created = await this.prisma.$transaction(async (tx) => {
      const available = await this.getAvailableQuantity(tx, {
        seasonId: dto.seasonId,
        categoryId: dto.categoryId,
        grade: dto.grade,
        pitamStatus: dto.pitamStatus,
        fieldId: dto.fieldId,
      });

      if (available + signedQuantity < 0) {
        throw new BadRequestException(
          `Not enough stock available (available: ${available}, requested: ${dto.quantity}).`,
        );
      }

      return tx.israelStock.create({
        data: {
          seasonId: dto.seasonId,
          date: dto.date,
          fieldId: dto.fieldId,
          categoryId: dto.categoryId,
          grade: dto.grade,
          pitamStatus: dto.pitamStatus,
          quantity: signedQuantity,
          type: dto.type,
          notes: dto.notes,
          updatedById: actorId,
        },
        include: stockInclude,
      });
    });

    await this.auditLog.record({
      userId: actorId,
      action: 'CREATE',
      entityType: 'IsraelStock',
      entityId: created.id,
      after: created,
    });

    return created;
  }

  async updateMovement(
    id: number,
    dto: UpdateIsraelStockMovementDto,
    actorId: number,
  ) {
    const current = await this.prisma.israelStock.findUnique({ where: { id } });
    if (!current || current.isDeleted) {
      throw new NotFoundException('Israel stock movement not found.');
    }

    if (
      !MANUAL_MOVEMENT_TYPES.includes(
        current.type as (typeof MANUAL_MOVEMENT_TYPES)[number],
      )
    ) {
      throw new BadRequestException(
        `Movement type "${current.type}" cannot be edited manually.`,
      );
    }

    const nextQuantity = dto.quantity ?? Math.abs(current.quantity);
    if (!Number.isFinite(nextQuantity) || nextQuantity <= 0) {
      throw new BadRequestException('Quantity must be greater than zero.');
    }

    const signedQuantity = -Math.abs(nextQuantity);

    const updated = await this.prisma.$transaction(async (tx) => {
      const availableExcludingCurrent = await this.getAvailableQuantity(
        tx,
        {
          seasonId: current.seasonId,
          categoryId: current.categoryId,
          grade: current.grade,
          pitamStatus: current.pitamStatus,
          fieldId: current.fieldId ?? undefined,
        },
        id,
      );

      if (availableExcludingCurrent + signedQuantity < 0) {
        throw new BadRequestException(
          `Not enough stock available (available: ${availableExcludingCurrent}, requested: ${nextQuantity}).`,
        );
      }

      return tx.israelStock.update({
        where: { id },
        data: {
          quantity: signedQuantity,
          notes: dto.notes ?? current.notes,
          updatedById: actorId,
        },
        include: stockInclude,
      });
    });

    await this.auditLog.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'IsraelStock',
      entityId: id,
      before: current,
      after: updated,
    });

    return updated;
  }

  async removeMovement(id: number, actorId: number) {
    const current = await this.prisma.israelStock.findUnique({ where: { id } });
    if (!current || current.isDeleted) {
      throw new NotFoundException('Israel stock movement not found.');
    }

    if (
      !MANUAL_MOVEMENT_TYPES.includes(
        current.type as (typeof MANUAL_MOVEMENT_TYPES)[number],
      )
    ) {
      throw new BadRequestException(
        `Movement type "${current.type}" cannot be deleted manually.`,
      );
    }

    const deleted = await this.prisma.israelStock.update({
      where: { id },
      data: { isDeleted: true, updatedById: actorId },
      include: stockInclude,
    });

    await this.auditLog.record({
      userId: actorId,
      action: 'DELETE',
      entityType: 'IsraelStock',
      entityId: id,
      before: current,
    });

    return deleted;
  }

  private async getAvailableQuantity(
    tx: Prisma.TransactionClient,
    filter: {
      seasonId: number;
      categoryId: number;
      grade: string;
      pitamStatus: PitamStatus;
      fieldId?: number;
    },
    excludeId?: number,
  ): Promise<number> {
    const result = await tx.israelStock.aggregate({
      where: {
        seasonId: filter.seasonId,
        categoryId: filter.categoryId,
        grade: filter.grade,
        pitamStatus: filter.pitamStatus,
        fieldId: filter.fieldId,
        isDeleted: false,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      _sum: { quantity: true },
    });

    return result._sum.quantity ?? 0;
  }
}
