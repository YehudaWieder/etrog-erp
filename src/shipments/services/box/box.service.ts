// src/shipments/services/box/box.service.ts

import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SeasonsService } from 'src/seasons/seasons.service';
import { ShipmentsService } from '../../shipments.service';
import { Box, BoxStatus, Prisma } from '@prisma/client';
import {
  BulkCreateBoxInput,
  CreateBoxInput,
  UpdateBoxInput,
  validateBulkCreateBoxInput,
  validateBulkDeleteBoxInput,
  validateCreateBoxInput,
  validateUpdateBoxInput,
} from './utils/box.utils';

@Injectable()
export class BoxService {
  constructor(
    private prisma: PrismaService,
    private seasonsService: SeasonsService,
    private shipmentsService: ShipmentsService,
  ) {}

  // Create a new box within a shipment
  async create(data: CreateBoxInput, actorId: number) {
    validateCreateBoxInput(data);

    const { id: seasonId } = await this.seasonsService.findActiveSeason();

    const shipment = await this.prisma.shipment.findFirst({
      where: { id: data.shipmentId, seasonId, isDeleted: false },
      select: { id: true, status: true },
    });

    if (!shipment) {
      throw new NotFoundException(`Shipment ${data.shipmentId} not found in active season`);
    }

    if (shipment.status === 'SHIPPED' || shipment.status === 'DELIVERED') {
      throw new BadRequestException('Cannot add a box to a shipment that has already been shipped or delivered');
    }

    // Check if boxNumber already exists in the active season.
    const existing = await this.prisma.box.findFirst({
      where: {
        seasonId,
        boxNumber: data.boxNumber,
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(`Box #${data.boxNumber} already exists in the active season`);
    }

    return this.prisma.$transaction(async (tx) => {
      let box;
      try {
        box = await tx.box.create({
          data: {
            ...data,
            boxType: data.boxType ?? 'SMALL',
            updatedById: actorId,
            seasonId,
            totalQuantity: 0,
          },
        });
      } catch (error) {
        const code = (error as { code?: string })?.code;
        if (code === 'P2002') {
          throw new ConflictException(`Box #${data.boxNumber} already exists in the active season`);
        }
        throw error;
      }

      await this.shipmentsService.syncShipmentTotals(tx, data.shipmentId);

      return box;
    });
  }

  // Create a contiguous range of boxes within a shipment, defaulting to SMALL/GENERAL.
  // Intended for bulk-numbering boxes that will be configured individually later (e.g. via the packing form).
  async bulkCreate(data: BulkCreateBoxInput, actorId: number) {
    validateBulkCreateBoxInput(data);

    const { id: seasonId } = await this.seasonsService.findActiveSeason();

    const shipment = await this.prisma.shipment.findFirst({
      where: { id: data.shipmentId, seasonId, isDeleted: false },
      select: { id: true, status: true },
    });

    if (!shipment) {
      throw new NotFoundException(`Shipment ${data.shipmentId} not found in active season`);
    }

    if (shipment.status === 'SHIPPED' || shipment.status === 'DELIVERED') {
      throw new BadRequestException('Cannot add boxes to a shipment that has already been shipped or delivered');
    }

    const boxNumbers = Array.from(
      { length: data.endNumber - data.startNumber + 1 },
      (_, i) => data.startNumber + i,
    );

    const existing = await this.prisma.box.findMany({
      where: { seasonId, boxNumber: { in: boxNumbers } },
      select: { boxNumber: true },
      orderBy: { boxNumber: 'asc' },
    });

    if (existing.length > 0) {
      const numbers = existing.map((b) => b.boxNumber).join(', ');
      throw new ConflictException(`The following box numbers already exist in the active season: ${numbers}`);
    }

    return this.prisma.$transaction(async (tx) => {
      const boxes: Box[] = [];
      for (const boxNumber of boxNumbers) {
        boxes.push(
          await tx.box.create({
            data: {
              shipmentId: data.shipmentId,
              seasonId,
              boxNumber,
              boxType: 'SMALL',
              totalQuantity: 0,
              updatedById: actorId,
            },
          }),
        );
      }

      await this.shipmentsService.syncShipmentTotals(tx, data.shipmentId);

      return boxes;
    });
  }

  // Get all boxes for a specific shipment
  async findByShipment(shipmentId: number) {
    return this.prisma.box.findMany({
      where: { shipmentId, isDeleted: false },
      include: {
        trader: { select: { name: true } },
        customer: { select: { customerName: true } },
        updatedBy: { select: { name: true } },
        _count: { select: { items: true } }
      },
      orderBy: { boxNumber: 'asc' },
    });
  }

  // Get single box details
  async findOne(id: number) {
    const box = await this.prisma.box.findFirst({
      where: { id, isDeleted: false },
      include: {
        items: true,
        shipment: { select: { slug: true, status: true } },
      },
    });

    if (!box) throw new NotFoundException(`Box #${id} not found`);
    return box;
  }

  // Update box details (status, type, etc.)
  async update(id: number, data: UpdateBoxInput, actorId: number) {
    return this.prisma.$transaction((tx) => this.updateInTx(tx, id, data, actorId));
  }

  // Tx-scoped body of update(), reusable by callers that already hold an open transaction
  // (e.g. BoxPackingWorkflowService, which updates a box and creates items atomically).
  async updateInTx(tx: Prisma.TransactionClient, id: number, data: UpdateBoxInput, actorId: number) {
    validateUpdateBoxInput(data);

    const current = await tx.box.findFirst({
      where: { id, isDeleted: false },
      select: { id: true, shipmentId: true, seasonId: true, boxNumber: true, ownershipType: true, traderId: true, customerId: true, status: true, totalQuantity: true, boxType: true },
    });

    if (!current) {
      throw new NotFoundException(`Box #${id} not found`);
    }

    if (data.boxType !== undefined && data.boxType !== current.boxType && data.boxType !== 'CUSTOM') {
      const systemConfig = await tx.systemConfig.findFirst({ where: { seasonId: current.seasonId } });
      const capacityMap: Record<string, number | null | undefined> = {
        SMALL: systemConfig?.smallBoxCapacity,
        MEDIUM: systemConfig?.mediumBoxCapacity,
        LARGE: systemConfig?.largeBoxCapacity,
      };
      const capacity = capacityMap[data.boxType];
      if (capacity != null && current.totalQuantity > capacity) {
        throw new BadRequestException(
          `Cannot change box type to ${data.boxType}: current quantity (${current.totalQuantity}) exceeds capacity (${capacity}).`,
        );
      }
    }

    const targetShipmentId = data.shipmentId ?? current.shipmentId;
    const isChangingShipment = data.shipmentId !== undefined && data.shipmentId !== current.shipmentId;

    let derivedStatus: BoxStatus | undefined;

    if (isChangingShipment) {
      const newShipment = await tx.shipment.findFirst({
        where: { id: data.shipmentId, seasonId: current.seasonId, isDeleted: false },
        select: { id: true, status: true },
      });
      if (!newShipment) {
        throw new NotFoundException(`Shipment ${data.shipmentId} not found in current season`);
      }

      if (newShipment.status === 'SHIPPED') {
        derivedStatus = 'SHIPPED';
      } else if (newShipment.status === 'DELIVERED') {
        derivedStatus = 'DELIVERED';
      } else {
        // The box's items still carry the old shipmentId at this point in the transaction — they're
        // reassigned to the new shipment further down. Check by boxId so a box with existing items
        // doesn't wrongly resolve to OPEN just because none of them have the new shipmentId yet.
        const itemCount = await tx.shipmentItem.count({ where: { boxId: id, isDeleted: false } });
        derivedStatus = itemCount > 0 ? 'CLOSED' : 'OPEN';
      }
    } else if (data.status !== undefined) {
      const currentIsShipped = current.status === 'SHIPPED' || current.status === 'DELIVERED';
      const newIsShipped = data.status === 'SHIPPED' || data.status === 'DELIVERED';

      if (currentIsShipped !== newIsShipped) {
        throw new BadRequestException(
          'Box status can only be changed between OPEN and CLOSED, or between SHIPPED and DELIVERED. Shipped and delivered statuses are set automatically via shipment status changes.',
        );
      }
    }

    const ownershipFieldsChanged =
      (data.ownershipType !== undefined && data.ownershipType !== current.ownershipType) ||
      (data.traderId !== undefined && data.traderId !== current.traderId) ||
      (data.customerId !== undefined && data.customerId !== current.customerId);

    if (ownershipFieldsChanged) {
      const itemCount = await tx.shipmentItem.count({ where: { boxId: id, isDeleted: false } });
      if (itemCount > 0) {
        throw new BadRequestException(
          `Cannot change box ownership type or owner while the box has ${itemCount} item(s). Remove all items first.`,
        );
      }
    }

    if (data.boxNumber !== undefined && data.boxNumber !== current.boxNumber) {
      const existing = await tx.box.findFirst({
        where: { seasonId: current.seasonId, boxNumber: data.boxNumber, NOT: { id } },
        select: { id: true },
      });
      if (existing) {
        throw new ConflictException(`Box #${data.boxNumber} already exists in the active season`);
      }
    }

    if (isChangingShipment) {
      await tx.shipmentItem.updateMany({
        where: { boxId: id, isDeleted: false },
        data: { shipmentId: data.shipmentId },
      });
      await tx.traderStock.updateMany({
        where: { boxId: id, isDeleted: false },
        data: { shipmentId: data.shipmentId },
      });
    }

    const { shipmentId: _shipmentId, ...restData } = data;
    const updatedBox = await tx.box.update({
      where: { id },
      data: {
        ...restData,
        ...(isChangingShipment ? { shipmentId: data.shipmentId } : {}),
        ...(derivedStatus !== undefined ? { status: derivedStatus } : {}),
        updatedById: actorId,
      },
    });

    await this.shipmentsService.syncShipmentTotals(tx, targetShipmentId);
    if (isChangingShipment) {
      await this.shipmentsService.syncShipmentTotals(tx, current.shipmentId);
    }

    return updatedBox;
  }

  // Recalculate total quantity in the box based on ShipmentItems
  async updateBoxTotal(id: number) {
    return this.prisma.$transaction(async (tx) => {
      const box = await tx.box.findFirst({
        where: { id, isDeleted: false },
        select: { id: true, shipmentId: true },
      });

      if (!box) {
        throw new NotFoundException(`Box #${id} not found`);
      }

      const aggregation = await tx.shipmentItem.aggregate({
        where: { boxId: id, isDeleted: false },
        _sum: { quantity: true },
      });

      const updatedBox = await tx.box.update({
        where: { id },
        data: {
          totalQuantity: aggregation._sum.quantity || 0,
        },
      });

      await this.shipmentsService.syncShipmentTotals(tx, box.shipmentId);

      return updatedBox;
    });
  }

  // Get all OPEN boxes for the active season (for item creation form)
  async findOpenForActiveSeason() {
    const { id: seasonId } = await this.seasonsService.findActiveSeason();

    const [boxes, systemConfig] = await Promise.all([
      this.prisma.box.findMany({
        where: { seasonId, status: 'OPEN', isDeleted: false },
        select: {
          id: true,
          boxNumber: true,
          boxType: true,
          totalQuantity: true,
          ownershipType: true,
          traderId: true,
          customerId: true,
          trader: { select: { name: true } },
          customer: { select: { customerName: true } },
          shipment: { select: { id: true, shipmentNumber: true } },
        },
        orderBy: [{ shipmentId: 'asc' }, { boxNumber: 'asc' }],
      }),
      this.prisma.systemConfig.findFirst({ where: { seasonId } }),
    ]);

    const capacityMap: Record<string, number | null> = {
      SMALL: systemConfig?.smallBoxCapacity ?? null,
      MEDIUM: systemConfig?.mediumBoxCapacity ?? null,
      LARGE: systemConfig?.largeBoxCapacity ?? null,
      CUSTOM: null,
    };

    return boxes.map((box) => ({
      ...box,
      capacity: capacityMap[box.boxType] ?? null,
    }));
  }

  // Soft delete
  async remove(id: number) {
    return this.prisma.$transaction(async (tx) => {
      const box = await tx.box.update({
        where: { id },
        data: { isDeleted: true },
      });

      await this.shipmentsService.syncShipmentTotals(tx, box.shipmentId);

      return box;
    });
  }

  // Hard (permanent) delete – blocked if any related records exist
  async removeHard(id: number) {
    return this.prisma.$transaction(async (tx) => {
      const box = await tx.box.findFirst({
        where: { id },
        select: { id: true, shipmentId: true },
      });

      if (!box) throw new NotFoundException(`Box #${id} not found`);

      const itemCount = await tx.shipmentItem.count({ where: { boxId: id, isDeleted: false } });
      if (itemCount > 0) {
        throw new ConflictException(
          `Cannot delete box #${id} — it has ${itemCount} associated item${itemCount === 1 ? '' : 's'}. Remove them first.`,
        );
      }

      const stockCount = await tx.traderStock.count({ where: { boxId: id } });
      if (stockCount > 0) {
        throw new ConflictException(
          `Cannot delete box #${id} — it has ${stockCount} linked trader stock record${stockCount === 1 ? '' : 's'}.`,
        );
      }

      // Soft-deleted items still reference this box via FK; purge them so the box can be deleted.
      await tx.shipmentItem.deleteMany({ where: { boxId: id, isDeleted: true } });

      await tx.box.delete({ where: { id } });
      await this.shipmentsService.syncShipmentTotals(tx, box.shipmentId);

      return { deleted: true, id };
    });
  }

  // Hard (permanent) delete of multiple boxes at once – blocked atomically if any of them has related records
  async removeHardBulk(ids: unknown) {
    validateBulkDeleteBoxInput(ids);

    return this.prisma.$transaction(async (tx) => {
      const boxes = await tx.box.findMany({
        where: { id: { in: ids } },
        select: { id: true, boxNumber: true, shipmentId: true },
      });

      const foundIds = new Set(boxes.map((box) => box.id));
      const missingIds = ids.filter((id) => !foundIds.has(id));
      if (missingIds.length > 0) {
        throw new NotFoundException(`Box(es) not found: ${missingIds.join(', ')}`);
      }

      const boxNumberById = new Map(boxes.map((box) => [box.id, box.boxNumber]));

      const itemCounts = await tx.shipmentItem.groupBy({
        by: ['boxId'],
        where: { boxId: { in: ids }, isDeleted: false },
        _count: { _all: true },
      });
      if (itemCounts.length > 0) {
        const boxNumbers = itemCounts.map((count) => boxNumberById.get(count.boxId) ?? count.boxId).join(', ');
        throw new ConflictException(
          `Cannot delete box(es) #${boxNumbers} — they have associated items. Remove them first.`,
        );
      }

      const stockCounts = await tx.traderStock.groupBy({
        by: ['boxId'],
        where: { boxId: { in: ids } },
        _count: { _all: true },
      });
      if (stockCounts.length > 0) {
        const boxNumbers = stockCounts.map((count) => boxNumberById.get(count.boxId as number) ?? count.boxId).join(', ');
        throw new ConflictException(
          `Cannot delete box(es) #${boxNumbers} — they have linked trader stock records.`,
        );
      }

      // Soft-deleted items still reference these boxes via FK; purge them so the boxes can be deleted.
      await tx.shipmentItem.deleteMany({ where: { boxId: { in: ids }, isDeleted: true } });

      await tx.box.deleteMany({ where: { id: { in: ids } } });

      const shipmentIds = [...new Set(boxes.map((box) => box.shipmentId))];
      for (const shipmentId of shipmentIds) {
        await this.shipmentsService.syncShipmentTotals(tx, shipmentId);
      }

      return { deleted: true, ids };
    });
  }
}
