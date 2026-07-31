// src/shipments/services/shipment/shipment.service.ts

import { BadRequestException, Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { BoxType, Prisma, ShipmentStatus } from '@prisma/client';
import { SeasonsService } from 'src/seasons/seasons.service';
import { ShipmentsService } from '../../shipments.service';
import {
  CreateShipmentInput,
  resolveShippedAt,
  UpdateShipmentInput,
  validateCreateShipmentInput,
  validateUpdateShipmentInput,
} from './utils/shipment.utils';

@Injectable()
export class ShipmentService {
  constructor(
    private prisma: PrismaService,
    private seasonsService: SeasonsService,
    private shipmentsService: ShipmentsService,
  ) {}

  // Create a new shipment shell
  async create(data: CreateShipmentInput, actorId: number) {
    validateCreateShipmentInput(data);

    const { id: seasonId } = await this.seasonsService.findActiveSeason();

    const existing = await this.prisma.shipment.findFirst({
      where: {
        seasonId,
        shipmentNumber: data.shipmentNumber,
      },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException(`Shipment number ${data.shipmentNumber} already exists in the active season`);
    }

    const randomSuffix = Math.random().toString(36).slice(2, 8);
    const temporarySlug = `shipment-tmp-${Date.now()}-${randomSuffix}`;

    // create shipment first to get the auto-incremented shipmentNumber for slug generation
    const shipment = await this.prisma.shipment.create({
      data: {
        seasonId,
        shipmentNumber: data.shipmentNumber,
        status: ShipmentStatus.PREPARING,
        shippedAt: null,
        notes: data.notes,
        updatedById: actorId,
        totalBoxes: 0,
        totalQuantity: 0,
        slug: temporarySlug,
      },
    });

    const slug = `SHP-S${seasonId}-${shipment.shipmentNumber}`;

    return this.prisma.shipment.update({
      where: { id: shipment.id },
      data: { slug },
    });
  }

  // Find by the new unique constraint (Season + Number)
  async findByNumber(seasonId: number, shipmentNumber: number) {
    await this.seasonsService.assertSeasonExists(seasonId);

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
    await this.seasonsService.assertSeasonExists(seasonId);

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
  async update(id: number, data: UpdateShipmentInput, actorId: number) {
    validateUpdateShipmentInput(data);

    const existing = await this.prisma.shipment.findFirst({
      where: { id, isDeleted: false },
      select: { id: true, status: true, shippedAt: true, seasonId: true, shipmentNumber: true },
    });

    if (!existing) {
      throw new NotFoundException(`Shipment #${id} not found`);
    }

    const updatableData = { ...data };
    let newSlug: string | undefined;

    if (data.shipmentNumber !== undefined && data.shipmentNumber !== existing.shipmentNumber) {
      const conflict = await this.prisma.shipment.findFirst({
        where: { seasonId: existing.seasonId, shipmentNumber: data.shipmentNumber, isDeleted: false, NOT: { id } },
        select: { id: true },
      });

      if (conflict) {
        throw new BadRequestException(`Shipment number ${data.shipmentNumber} already exists in this season`);
      }

      newSlug = `SHP-S${existing.seasonId}-${data.shipmentNumber}`;
    }

    let normalizedStatus = updatableData.status as ShipmentStatus | undefined;
    if (!normalizedStatus && updatableData.shippedAt) {
      normalizedStatus = ShipmentStatus.SHIPPED;
    }

    const effectiveStatus = normalizedStatus ?? existing.status;
    const nextShippedAt = resolveShippedAt(
      effectiveStatus,
      (updatableData.shippedAt as Date | string | null | undefined) ?? existing.shippedAt,
    );

    if (effectiveStatus === ShipmentStatus.SHIPPED && nextShippedAt) {
      const season = await this.seasonsService.findOne(existing.seasonId);
      const shippedYear = new Date(nextShippedAt).getFullYear();
      if (shippedYear !== season.yearName) {
        throw new BadRequestException(
          `Shipped date year (${shippedYear}) does not match the shipment's season year (${season.yearName})`,
        );
      }
    }

    // If marking as SHIPPED, update all boxes to SHIPPED in the same transaction
    if (effectiveStatus === ShipmentStatus.SHIPPED) {
      return this.prisma.$transaction(async (tx) => {
        await tx.box.updateMany({
          where: { shipmentId: id, status: { not: 'SHIPPED' }, isDeleted: false },
          data: { status: 'SHIPPED' },
        });
        return tx.shipment.update({
          where: { id },
          data: {
            ...updatableData,
            ...(newSlug !== undefined ? { slug: newSlug } : {}),
            updatedById: actorId,
            status: effectiveStatus,
            shippedAt: nextShippedAt,
          },
        });
      });
    }

    // If reverting to PREPARING, restore each box status based on fill level
    if (effectiveStatus === ShipmentStatus.PREPARING) {
      return this.prisma.$transaction(async (tx) => {
        const systemConfig = await tx.systemConfig.findFirst({
          where: { seasonId: existing.seasonId },
          select: { smallBoxCapacity: true, mediumBoxCapacity: true, largeBoxCapacity: true },
        });

        const capacityMap: Record<string, number | null | undefined> = {
          [BoxType.SMALL]: systemConfig?.smallBoxCapacity,
          [BoxType.MEDIUM]: systemConfig?.mediumBoxCapacity,
          [BoxType.LARGE]: systemConfig?.largeBoxCapacity,
        };

        const boxes = await tx.box.findMany({
          where: { shipmentId: id, isDeleted: false },
          select: { id: true, boxType: true, totalQuantity: true, status: true },
        });

        for (const box of boxes) {
          const capacity = capacityMap[box.boxType];
          // CUSTOM boxes or boxes without a defined capacity → always OPEN
          const isFull = capacity != null && (box.totalQuantity ?? 0) >= capacity;
          await tx.box.update({
            where: { id: box.id },
            data: { status: isFull ? 'CLOSED' : 'OPEN' },
          });
        }

        return tx.shipment.update({
          where: { id },
          data: {
            ...updatableData,
            ...(newSlug !== undefined ? { slug: newSlug } : {}),
            updatedById: actorId,
            status: effectiveStatus,
            shippedAt: nextShippedAt,
          },
        });
      });
    }

    // If marking as DELIVERED, update all boxes to DELIVERED in the same transaction
    if (effectiveStatus === ShipmentStatus.DELIVERED) {
      return this.prisma.$transaction(async (tx) => {
        await tx.box.updateMany({
          where: { shipmentId: id, isDeleted: false },
          data: { status: 'DELIVERED' },
        });
        return tx.shipment.update({
          where: { id },
          data: {
            ...updatableData,
            ...(newSlug !== undefined ? { slug: newSlug } : {}),
            updatedById: actorId,
            status: effectiveStatus,
            shippedAt: nextShippedAt,
          },
        });
      });
    }

    // Otherwise, just update the shipment
    return this.prisma.shipment.update({
      where: { id },
      data: {
        ...updatableData,
        ...(newSlug !== undefined ? { slug: newSlug } : {}),
        updatedById: actorId,
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
    try {
      return await this.prisma.$transaction(async (tx) => {
        const shipment = await tx.shipment.findFirst({
          where: { id },
          select: { id: true },
        });

        if (!shipment) throw new NotFoundException(`Shipment #${id} not found`);

        const boxCount = await tx.box.count({ where: { shipmentId: id, isDeleted: false } });
        if (boxCount > 0) {
          throw new BadRequestException(`Cannot delete shipment #${id} — it has ${boxCount} associated box${boxCount === 1 ? '' : 'es'}. Remove them first.`);
        }

        const itemCount = await tx.shipmentItem.count({ where: { shipmentId: id, isDeleted: false } });
        if (itemCount > 0) {
          throw new BadRequestException(`Cannot delete shipment #${id} — it has ${itemCount} associated item${itemCount === 1 ? '' : 's'}. Remove them first.`);
        }

        await tx.shipmentItem.deleteMany({ where: { shipmentId: id } });
        await tx.box.deleteMany({ where: { shipmentId: id } });
        await tx.shipment.delete({ where: { id } });

        return { deleted: true, id };
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException('Cannot delete shipment because related records exist in the system.');
      }

      throw error;
    }
  }
}