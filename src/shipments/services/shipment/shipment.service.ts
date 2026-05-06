// src/shipments/services/shipment/shipment.service.ts

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ShipmentStatus } from '@prisma/client';
import { SeasonsService } from 'src/seasons/seasons.service';
import { ShipmentsService } from '../../shipments.service';

type CreateShipmentInput = {
  updatedById: number;
  status?: ShipmentStatus;
  shippedAt?: Date | string;
  notes?: string;
};

type UpdateShipmentInput = {
  updatedById?: number;
  status?: ShipmentStatus;
  shippedAt?: Date | string;
  notes?: string | null;
};

@Injectable()
export class ShipmentService {
  constructor(
    private prisma: PrismaService,
    private seasonsService: SeasonsService,
    private shipmentsService: ShipmentsService,
  ) {}

  private resolveShippedAt(status: ShipmentStatus | undefined, shippedAt: Date | string | null | undefined) {
    if (status === ShipmentStatus.SHIPPED) {
      return shippedAt ? new Date(shippedAt) : new Date();
    }

    return null;
  }

  private assertPositiveInt(value: unknown, fieldName: string) {
    if (!Number.isInteger(value) || Number(value) <= 0) {
      throw new BadRequestException(`${fieldName} must be a positive integer`);
    }
  }

  private assertValidDate(value: unknown, fieldName: string) {
    if (value === undefined || value === null) {
      return;
    }

    const parsedDate = new Date(value as string | Date);
    if (Number.isNaN(parsedDate.getTime())) {
      throw new BadRequestException(`${fieldName} must be a valid date`);
    }
  }

  private assertOnlyAllowedFields(
    data: Record<string, unknown>,
    allowedFields: string[],
    blockedMessage: string,
  ) {
    const invalidKeys = Object.keys(data).filter((key) => !allowedFields.includes(key));
    if (invalidKeys.length > 0) {
      throw new BadRequestException(blockedMessage);
    }
  }

  private validateCreateInput(data: CreateShipmentInput) {
    this.assertOnlyAllowedFields(
      data as Record<string, unknown>,
      ['updatedById', 'status', 'shippedAt', 'notes'],
      'Only updatedById, status, shippedAt, and notes are allowed. seasonId, shipmentNumber, totals, slug, and isDeleted are managed by the server',
    );

    this.assertPositiveInt(data.updatedById, 'updatedById');

    if (data.status !== undefined && !Object.values(ShipmentStatus).includes(data.status as ShipmentStatus)) {
      throw new BadRequestException('status is invalid');
    }

    this.assertValidDate(data.shippedAt, 'shippedAt');

    if (data.notes !== undefined && typeof data.notes !== 'string') {
      throw new BadRequestException('notes must be a string');
    }
  }

  private validateUpdateInput(data: UpdateShipmentInput) {
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('At least one shipment field must be provided for update');
    }

    this.assertOnlyAllowedFields(
      data as Record<string, unknown>,
      ['updatedById', 'status', 'shippedAt', 'notes'],
      'Only updatedById, status, shippedAt, and notes can be updated here',
    );

    if (data.updatedById !== undefined) {
      this.assertPositiveInt(data.updatedById, 'updatedById');
    }

    if (data.status !== undefined && !Object.values(ShipmentStatus).includes(data.status as ShipmentStatus)) {
      throw new BadRequestException('status is invalid');
    }

    this.assertValidDate(data.shippedAt, 'shippedAt');

    if (data.notes !== undefined && data.notes !== null && typeof data.notes !== 'string') {
      throw new BadRequestException('notes must be a string');
    }
  }

  // Create a new shipment shell
  async create(data: CreateShipmentInput) {
    this.validateCreateInput(data);

    const { id: seasonId } = await this.seasonsService.findActiveSeason();
    const year = new Date().getFullYear();
    const randomSuffix = Math.random().toString(36).slice(2, 8);
    const temporarySlug = `shipment-tmp-${Date.now()}-${randomSuffix}`;

    const requestedStatus = data.status as ShipmentStatus | undefined;
    const normalizedStatus = requestedStatus ?? (data.shippedAt ? ShipmentStatus.SHIPPED : ShipmentStatus.PREPARING);
    const normalizedShippedAt = this.resolveShippedAt(
      normalizedStatus,
      data.shippedAt as Date | string | null | undefined,
    );

    // create shipment first to get the auto-incremented shipmentNumber for slug generation
    const shipment = await this.prisma.shipment.create({
      data: {
        seasonId,
        status: normalizedStatus,
        shippedAt: normalizedShippedAt,
        notes: data.notes,
        updatedById: data.updatedById,
        totalBoxes: 0,
        totalQuantity: 0,
        slug: temporarySlug,
      },
    });

    const slug = `SHP-${year}-${shipment.shipmentNumber}`;

    return this.prisma.shipment.update({
      where: { id: shipment.id },
      data: { slug },
    });
  }

  // Find by the new unique constraint (Season + Number)
  async findByNumber(seasonId: number, shipmentNumber: number) {
    const shipment = await this.prisma.shipment.findUnique({
      where: {
        seasonId_shipmentNumber: { seasonId, shipmentNumber },
      },
      include: {
        boxes: { where: { isDeleted: false } },
        items: { where: { isDeleted: false } },
      },
    });

    if (!shipment || shipment.isDeleted) throw new NotFoundException(`Shipment #${shipmentNumber} not found in this season`);
    return shipment;
  }

  // Get all shipments for a season
  async findAllBySeason(seasonId: number) {
    return this.prisma.shipment.findMany({
      where: { seasonId, isDeleted: false },
      include: {
        updatedBy: { select: { name: true } },
        _count: {
          select: { boxes: true, items: true }
        }
      },
      orderBy: { shipmentNumber: 'desc' },
    });
  }

  // Get full shipment details including boxes and items
  async findOne(id: number) {
    const shipment = await this.prisma.shipment.findFirst({
      where: { id, isDeleted: false },
      include: {
        boxes: { where: { isDeleted: false } },
        items: {
          where: { isDeleted: false },
          include: {
            trader: { select: { name: true } },
            customer: { select: { customerName: true } }
          }
        },
        updatedBy: { select: { name: true } }
      },
    });

    if (!shipment) throw new NotFoundException(`Shipment #${id} not found`);
    return shipment;
  }

  // Update shipment status or details
  async update(id: number, data: UpdateShipmentInput) {
    this.validateUpdateInput(data);

    const existing = await this.prisma.shipment.findFirst({
      where: { id, isDeleted: false },
      select: { id: true, status: true, shippedAt: true },
    });

    if (!existing) {
      throw new NotFoundException(`Shipment #${id} not found`);
    }

    const updatableData = { ...data };

    let normalizedStatus = updatableData.status as ShipmentStatus | undefined;
    if (!normalizedStatus && updatableData.shippedAt) {
      normalizedStatus = ShipmentStatus.SHIPPED;
    }

    const effectiveStatus = normalizedStatus ?? existing.status;
    const nextShippedAt = this.resolveShippedAt(
      effectiveStatus,
      (updatableData.shippedAt as Date | string | null | undefined) ?? existing.shippedAt,
    );

    return this.prisma.shipment.update({
      where: { id },
      data: {
        ...updatableData,
        status: effectiveStatus,
        shippedAt: nextShippedAt,
      },
    });
  }

  // Recalculate totals (call this when items/boxes are added/removed)
  async updateTotals(id: number) {
    return this.prisma.$transaction(async (tx) => {
      return this.shipmentsService.syncShipmentTotals(tx, id);
    });
  }

  // Soft delete
  async remove(id: number) {
    return this.prisma.shipment.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  // Hard (permanent) delete – removes all items and boxes first, then the shipment
  async removeHard(id: number) {
    return this.prisma.$transaction(async (tx) => {
      const shipment = await tx.shipment.findFirst({
        where: { id },
        select: { id: true },
      });

      if (!shipment) throw new NotFoundException(`Shipment #${id} not found`);

      await tx.shipmentItem.deleteMany({ where: { shipmentId: id } });
      await tx.box.deleteMany({ where: { shipmentId: id } });
      await tx.shipment.delete({ where: { id } });

      return { deleted: true, id };
    });
  }
}