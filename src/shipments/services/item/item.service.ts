// src/shipments/services/item/item.service.ts

import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ItemService {
  constructor(private prisma: PrismaService) {}

  // Creates a shipment item and triggers totals recalculation for Box and Shipment.
  // Uses a transaction to ensure all updates succeed or fail together.
  async create(data: Prisma.ShipmentItemUncheckedCreateInput) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Check for duplicate based on the complex unique constraint
      const existing = await tx.shipmentItem.findFirst({
        where: {
          seasonId: data.seasonId,
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
      const newItem = await tx.shipmentItem.create({ data });

      // 3. Recalculate Box total quantity
      const boxItems = await tx.shipmentItem.aggregate({
        where: { boxId: data.boxId, isDeleted: false },
        _sum: { quantity: true },
      });

      await tx.box.update({
        where: { id: data.boxId },
        data: { totalQuantity: boxItems._sum.quantity || 0 },
      });

      // 4. Recalculate Shipment total quantity
      const shipmentItems = await tx.shipmentItem.aggregate({
        where: { shipmentId: data.shipmentId, isDeleted: false },
        _sum: { quantity: true },
      });

      await tx.shipment.update({
        where: { id: data.shipmentId },
        data: { totalQuantity: shipmentItems._sum.quantity || 0 },
      });

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
    return this.prisma.$transaction(async (tx) => {
      const updatedItem = await tx.shipmentItem.update({
        where: { id },
        data,
      });

      // Re-sync totals for the associated box and shipment
      await this.syncTotals(tx, updatedItem.boxId, updatedItem.shipmentId);

      return updatedItem;
    });
  }

  // Soft deletes an item and updates totals accordingly.
  async remove(id: number) {
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.shipmentItem.update({
        where: { id },
        data: { isDeleted: true },
      });

      await this.syncTotals(tx, item.boxId, item.shipmentId);

      return item;
    });
  }

  // Helper method to synchronize totals for Box and Shipment after item changes
  private async syncTotals(tx: Prisma.TransactionClient, boxId: number, shipmentId: number) {
    const boxSum = await tx.shipmentItem.aggregate({
      where: { boxId, isDeleted: false },
      _sum: { quantity: true },
    });

    await tx.box.update({
      where: { id: boxId },
      data: { totalQuantity: boxSum._sum.quantity || 0 },
    });

    const shipmentSum = await tx.shipmentItem.aggregate({
      where: { shipmentId, isDeleted: false },
      _sum: { quantity: true },
    });

    await tx.shipment.update({
      where: { id: shipmentId },
      data: { totalQuantity: shipmentSum._sum.quantity || 0 },
    });
  }
}