// src/shipments/services/item/item.service.ts

import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from 'src/generated/prisma';
import { ItemOwnership, PitamStatus } from '@prisma/client';
import { SeasonsService } from 'src/seasons/seasons.service';

@Injectable()
export class ItemService {
  constructor(
    private prisma: PrismaService,
    private seasonsService: SeasonsService,
  ) {}

  private assertPositiveInt(value: unknown, fieldName: string) {
    if (!Number.isInteger(value) || Number(value) <= 0) {
      throw new BadRequestException(`${fieldName} must be a positive integer`);
    }
  }

  private validateOwnership(ownershipType: unknown, traderId: unknown, customerId: unknown) {
    if (ownershipType !== undefined && !Object.values(ItemOwnership).includes(ownershipType as ItemOwnership)) {
      throw new BadRequestException('ownershipType is invalid');
    }

    if (traderId !== undefined && traderId !== null) {
      this.assertPositiveInt(traderId, 'traderId');
    }

    if (customerId !== undefined && customerId !== null) {
      this.assertPositiveInt(customerId, 'customerId');
    }

    if (ownershipType === ItemOwnership.TRADER && (traderId === undefined || traderId === null)) {
      throw new BadRequestException('traderId is required when ownershipType=TRADER');
    }

    if (ownershipType === ItemOwnership.CUSTOMER && (customerId === undefined || customerId === null)) {
      throw new BadRequestException('customerId is required when ownershipType=CUSTOMER');
    }

    if (ownershipType !== ItemOwnership.TRADER && traderId !== undefined && traderId !== null) {
      throw new BadRequestException('traderId must be empty unless ownershipType=TRADER');
    }

    if (ownershipType !== ItemOwnership.CUSTOMER && customerId !== undefined && customerId !== null) {
      throw new BadRequestException('customerId must be empty unless ownershipType=CUSTOMER');
    }
  }

  private validateCreateInput(data: Prisma.ShipmentItemUncheckedCreateInput) {
    this.assertPositiveInt(data.boxId, 'boxId');
    this.assertPositiveInt(data.quantity, 'quantity');
    this.assertPositiveInt(data.updatedById, 'updatedById');

    if (data.shipmentId !== undefined || data.seasonId !== undefined) {
      throw new BadRequestException('shipmentId and seasonId are managed by the server');
    }

    if (!Object.values(PitamStatus).includes(data.pitamStatus as PitamStatus)) {
      throw new BadRequestException('pitamStatus is invalid');
    }

    if (data.traderCategoryId !== undefined && data.traderCategoryId !== null) {
      this.assertPositiveInt(data.traderCategoryId, 'traderCategoryId');
    }

    if (data.customerCategoryId !== undefined && data.customerCategoryId !== null) {
      this.assertPositiveInt(data.customerCategoryId, 'customerCategoryId');
    }

    if (data.notes !== undefined && typeof data.notes !== 'string') {
      throw new BadRequestException('notes must be a string');
    }

    this.validateOwnership(data.ownershipType, data.traderId, data.customerId);
  }

  private validateUpdateInput(data: Prisma.ShipmentItemUncheckedUpdateInput) {
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('At least one shipment item field must be provided for update');
    }

    if (data.shipmentId !== undefined || data.seasonId !== undefined || data.isDeleted !== undefined) {
      throw new BadRequestException('shipmentId, seasonId, and isDeleted cannot be updated here');
    }

    if (data.boxId !== undefined) {
      this.assertPositiveInt(data.boxId, 'boxId');
    }

    if (data.quantity !== undefined) {
      this.assertPositiveInt(data.quantity, 'quantity');
    }

    if (data.updatedById !== undefined) {
      this.assertPositiveInt(data.updatedById, 'updatedById');
    }

    if (data.pitamStatus !== undefined && !Object.values(PitamStatus).includes(data.pitamStatus as PitamStatus)) {
      throw new BadRequestException('pitamStatus is invalid');
    }

    if (data.traderCategoryId !== undefined && data.traderCategoryId !== null) {
      this.assertPositiveInt(data.traderCategoryId, 'traderCategoryId');
    }

    if (data.customerCategoryId !== undefined && data.customerCategoryId !== null) {
      this.assertPositiveInt(data.customerCategoryId, 'customerCategoryId');
    }

    if (data.notes !== undefined && data.notes !== null && typeof data.notes !== 'string') {
      throw new BadRequestException('notes must be a string');
    }

    this.validateOwnership(data.ownershipType, data.traderId, data.customerId);
  }

  // Creates a shipment item and triggers totals recalculation for Box and Shipment.
  // Uses a transaction to ensure all updates succeed or fail together.
  async create(data: Prisma.ShipmentItemUncheckedCreateInput) {
    this.validateCreateInput(data);

    const { id: seasonId } = await this.seasonsService.findActiveSeason();

    return this.prisma.$transaction(async (tx) => {
      const box = await tx.box.findFirst({
        where: { id: data.boxId, seasonId, isDeleted: false },
        select: { id: true, shipmentId: true },
      });

      if (!box) {
        throw new NotFoundException(`Box ${data.boxId} not found in active season`);
      }

      // 1. Check for duplicate based on the complex unique constraint
      const existing = await tx.shipmentItem.findFirst({
        where: {
          seasonId,
          boxId: data.boxId,
          traderCategoryId: data.traderCategoryId,
          customerCategoryId: data.customerCategoryId,
          grade: data.grade,
          pitamStatus: data.pitamStatus,
          ownershipType: data.ownershipType,
          traderId: data.traderId,
          customerId: data.customerId,
          isDeleted: false,
        },
      });

      if (existing) {
        throw new ConflictException('A matching shipment item already exists in this box');
      }

      // 2. Create the shipment item
      const newItem = await tx.shipmentItem.create({
        data: {
          ...data,
          seasonId,
          shipmentId: box.shipmentId,
        },
      });

      await this.syncTotals(tx, box.id, box.shipmentId);

      return newItem;
    });
  }

  // Retrieves all items for a given box, excluding soft-deleted items, and includes related trader and customer info.
  async findByBox(boxId: number) {
    return this.prisma.shipmentItem.findMany({
      where: { boxId, isDeleted: false },
      include: {
        trader: { select: { name: true } },
        customer: { select: { customerName: true } },
        traderCategory: { select: { name: true } },
      },
    });
  }

  // Updates an item and ensures totals are recalculated for the associated Box and Shipment.
  async update(id: number, data: Prisma.ShipmentItemUncheckedUpdateInput) {
    this.validateUpdateInput(data);

    return this.prisma.$transaction(async (tx) => {
      const currentItem = await tx.shipmentItem.findFirst({
        where: { id, isDeleted: false },
        select: { id: true, boxId: true, shipmentId: true, seasonId: true },
      });

      if (!currentItem) {
        throw new NotFoundException(`Shipment item #${id} not found`);
      }

      const nextBoxId = Number(data.boxId ?? currentItem.boxId);

      let nextShipmentId = currentItem.shipmentId;
      if (data.boxId) {
        const nextBox = await tx.box.findFirst({
          where: { id: nextBoxId, seasonId: currentItem.seasonId, isDeleted: false },
          select: { shipmentId: true },
        });

        if (!nextBox) {
          throw new NotFoundException(`Box ${nextBoxId} not found in active season`);
        }

        nextShipmentId = nextBox.shipmentId;
      }

      const updatedItem = await tx.shipmentItem.update({
        where: { id },
        data: {
          ...data,
          shipmentId: nextShipmentId,
        },
      });

      // Re-sync totals for the associated box and shipment
      await this.syncTotals(tx, currentItem.boxId, currentItem.shipmentId);

      if (currentItem.boxId !== updatedItem.boxId || currentItem.shipmentId !== updatedItem.shipmentId) {
        await this.syncTotals(tx, updatedItem.boxId, updatedItem.shipmentId);
      }

      return updatedItem;
    });
  }

  // Soft deletes an item and updates totals accordingly.
  async remove(id: number) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.shipmentItem.findFirst({
        where: { id, isDeleted: false },
        select: { boxId: true, shipmentId: true },
      });

      if (!existing) {
        throw new NotFoundException(`Shipment item #${id} not found`);
      }

      const item = await tx.shipmentItem.update({
        where: { id },
        data: { isDeleted: true },
      });

      await this.syncTotals(tx, existing.boxId, existing.shipmentId);

      return item;
    });
  }

  // Helper method to synchronize totals for Box and Shipment after item changes
  private async syncTotals(tx: Prisma.TransactionClient, boxId: number, shipmentId: number) {
    const [boxSum, shipmentSum, boxCount] = await Promise.all([
      tx.shipmentItem.aggregate({
        where: { boxId, isDeleted: false },
        _sum: { quantity: true },
      }),
      tx.shipmentItem.aggregate({
        where: { shipmentId, isDeleted: false },
        _sum: { quantity: true },
      }),
      tx.box.count({
        where: { shipmentId, isDeleted: false },
      }),
    ]);

    await tx.box.update({
      where: { id: boxId },
      data: { totalQuantity: boxSum._sum.quantity || 0 },
    });

    await tx.shipment.update({
      where: { id: shipmentId },
      data: {
        totalQuantity: shipmentSum._sum.quantity || 0,
        totalBoxes: boxCount,
      },
    });
  }
}