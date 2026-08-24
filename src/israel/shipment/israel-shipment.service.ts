import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { BoxStatus, ShipmentStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { SeasonsService } from 'src/seasons/seasons.service';
import { AuditLogService } from 'src/audit/audit.service';
import { CreateIsraelShipmentDto } from './dto/create-israel-shipment.dto';
import { UpdateIsraelShipmentDto } from './dto/update-israel-shipment.dto';

function resolveShippedAt(
  status: ShipmentStatus | undefined,
  shippedAt: Date | string | null | undefined,
): Date | null {
  if (status === ShipmentStatus.SHIPPED) {
    return shippedAt ? new Date(shippedAt) : new Date();
  }

  if (status === ShipmentStatus.DELIVERED) {
    return shippedAt ? new Date(shippedAt) : null;
  }

  return null;
}

@Injectable()
export class IsraelShipmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly seasonsService: SeasonsService,
    private readonly auditLog: AuditLogService,
  ) {}

  async findAllBySeason(seasonId: number) {
    await this.seasonsService.assertSeasonExists(seasonId);

    return this.prisma.israelShipment.findMany({
      where: { seasonId },
      include: {
        field: { select: { id: true, name: true } },
        updatedBy: { select: { name: true } },
        _count: { select: { boxes: true } },
      },
      orderBy: { shipmentNumber: 'desc' },
    });
  }

  async findOne(id: number) {
    const shipment = await this.prisma.israelShipment.findUnique({
      where: { id },
      include: {
        field: { select: { id: true, name: true } },
        boxes: true,
        updatedBy: { select: { name: true } },
      },
    });

    if (!shipment) {
      throw new NotFoundException(`Israel shipment #${id} not found`);
    }

    return shipment;
  }

  private async assertFieldExists(fieldId: number) {
    const field = await this.prisma.israelField.findUnique({ where: { id: fieldId }, select: { id: true } });
    if (!field) {
      throw new NotFoundException(`Israel field #${fieldId} not found`);
    }
  }

  async create(dto: CreateIsraelShipmentDto, actorId: number) {
    if (!Number.isInteger(dto.shipmentNumber) || dto.shipmentNumber <= 0) {
      throw new BadRequestException('shipmentNumber must be a positive integer');
    }

    if (!Number.isInteger(dto.fieldId)) {
      throw new BadRequestException('fieldId is required');
    }

    if (dto.notes !== undefined && typeof dto.notes !== 'string') {
      throw new BadRequestException('notes must be a string');
    }

    await this.seasonsService.assertSeasonExists(dto.seasonId);
    await this.assertFieldExists(dto.fieldId);

    const existing = await this.prisma.israelShipment.findUnique({
      where: {
        seasonId_shipmentNumber: { seasonId: dto.seasonId, shipmentNumber: dto.shipmentNumber },
      },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException(`Shipment number ${dto.shipmentNumber} already exists in this season`);
    }

    const created = await this.prisma.israelShipment.create({
      data: {
        seasonId: dto.seasonId,
        shipmentNumber: dto.shipmentNumber,
        fieldId: dto.fieldId,
        status: ShipmentStatus.PREPARING,
        totalBoxes: 0,
        totalQuantity: 0,
        notes: dto.notes,
        updatedById: actorId,
      },
    });

    await this.auditLog.record({
      userId: actorId,
      action: 'CREATE',
      entityType: 'IsraelShipment',
      entityId: created.id,
      after: created,
    });

    return created;
  }

  async update(id: number, dto: Omit<UpdateIsraelShipmentDto, 'id'>, actorId: number) {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('At least one shipment field must be provided for update');
    }

    if (dto.shipmentNumber !== undefined && (!Number.isInteger(dto.shipmentNumber) || dto.shipmentNumber <= 0)) {
      throw new BadRequestException('shipmentNumber must be a positive integer');
    }

    if (dto.fieldId !== undefined && !Number.isInteger(dto.fieldId)) {
      throw new BadRequestException('fieldId must be a valid integer');
    }

    if (dto.status !== undefined && !Object.values(ShipmentStatus).includes(dto.status)) {
      throw new BadRequestException('status is invalid');
    }

    if (dto.notes !== undefined && dto.notes !== null && typeof dto.notes !== 'string') {
      throw new BadRequestException('notes must be a string');
    }

    if (dto.shippedAt !== undefined && dto.shippedAt !== null && Number.isNaN(new Date(dto.shippedAt).getTime())) {
      throw new BadRequestException('shippedAt must be a valid date');
    }

    const existing = await this.prisma.israelShipment.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Israel shipment #${id} not found`);
    }

    if (dto.shipmentNumber !== undefined && dto.shipmentNumber !== existing.shipmentNumber) {
      const conflict = await this.prisma.israelShipment.findUnique({
        where: {
          seasonId_shipmentNumber: { seasonId: existing.seasonId, shipmentNumber: dto.shipmentNumber },
        },
        select: { id: true },
      });

      if (conflict) {
        throw new BadRequestException(`Shipment number ${dto.shipmentNumber} already exists in this season`);
      }
    }

    if (dto.fieldId !== undefined && dto.fieldId !== existing.fieldId) {
      const boxCount = await this.prisma.israelBox.count({ where: { shipmentId: id } });
      if (boxCount > 0) {
        throw new BadRequestException('Cannot change the field of a shipment that already has boxes attached');
      }
      await this.assertFieldExists(dto.fieldId);
    }

    const effectiveStatus = dto.status ?? existing.status;
    const nextShippedAt = resolveShippedAt(effectiveStatus, dto.shippedAt !== undefined ? dto.shippedAt : existing.shippedAt);

    if (effectiveStatus === ShipmentStatus.SHIPPED && nextShippedAt) {
      const season = await this.seasonsService.findOne(existing.seasonId);
      const shippedYear = nextShippedAt.getFullYear();
      if (shippedYear !== season.yearName) {
        throw new BadRequestException(
          `Shipped date year (${shippedYear}) does not match the shipment's season year (${season.yearName})`,
        );
      }
    }

    const flatBoxStatusByShipmentStatus: Partial<Record<ShipmentStatus, BoxStatus>> = {
      [ShipmentStatus.SHIPPED]: BoxStatus.SHIPPED,
      [ShipmentStatus.DELIVERED]: BoxStatus.DELIVERED,
    };
    const nextFlatBoxStatus = flatBoxStatusByShipmentStatus[effectiveStatus];

    const updated = await this.prisma.$transaction(async (tx) => {
      if (nextFlatBoxStatus) {
        await tx.israelBox.updateMany({
          where: { shipmentId: id },
          data: { status: nextFlatBoxStatus },
        });
      } else if (effectiveStatus === ShipmentStatus.PREPARING || effectiveStatus === ShipmentStatus.CANCELLED) {
        // Reverting to preparation or cancelling: each box goes back to CLOSED or OPEN depending on
        // whether it's still at/over capacity, instead of flatly reopening every box.
        const settings = await tx.israelSettings.findFirst({ select: { cartonCapacity: true } });
        const capacity = settings?.cartonCapacity ?? 50;
        const boxes = await tx.israelBox.findMany({ where: { shipmentId: id }, select: { id: true, itemsCount: true } });
        for (const box of boxes) {
          await tx.israelBox.update({
            where: { id: box.id },
            data: { status: box.itemsCount >= capacity ? BoxStatus.CLOSED : BoxStatus.OPEN },
          });
        }
      }

      return tx.israelShipment.update({
        where: { id },
        data: {
          ...(dto.shipmentNumber !== undefined ? { shipmentNumber: dto.shipmentNumber } : {}),
          ...(dto.fieldId !== undefined ? { fieldId: dto.fieldId } : {}),
          ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
          status: effectiveStatus,
          shippedAt: nextShippedAt,
          updatedById: actorId,
        },
      });
    });

    await this.auditLog.record({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'IsraelShipment',
      entityId: id,
      before: existing,
      after: updated,
    });

    return updated;
  }

  async removeHard(id: number, actorId: number) {
    const result = await this.prisma.$transaction(async (tx) => {
      const shipment = await tx.israelShipment.findUnique({ where: { id } });
      if (!shipment) {
        throw new NotFoundException(`Israel shipment #${id} not found`);
      }

      const boxCount = await tx.israelBox.count({ where: { shipmentId: id } });
      if (boxCount > 0) {
        throw new BadRequestException(
          `Cannot delete shipment #${id} — it has ${boxCount} associated box${boxCount === 1 ? '' : 'es'}. Remove them first.`,
        );
      }

      await tx.israelShipment.delete({ where: { id } });

      return shipment;
    });

    await this.auditLog.record({
      userId: actorId,
      action: 'DELETE',
      entityType: 'IsraelShipment',
      entityId: id,
      before: result,
    });

    return { deleted: true, id };
  }
}
