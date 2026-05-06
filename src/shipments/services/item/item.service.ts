// src/shipments/services/item/item.service.ts

import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from 'src/generated/prisma';
import { BoxOwnership, Grade, ItemOwnership, MovementType, PitamStatus, SourceType } from '@prisma/client';
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

    if (data.ownershipType === undefined) {
      throw new BadRequestException('ownershipType is required');
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

  private ensureAllowedBoxOwnership(boxOwnership: BoxOwnership) {
    if (boxOwnership === BoxOwnership.UNASSIGNED || boxOwnership === BoxOwnership.CUSTOM) {
      throw new BadRequestException(
        `Box ownership ${boxOwnership} is not supported yet for item packing.`,
      );
    }
  }

  private assertItemFitsBoxOwnership(params: {
    boxOwnership: BoxOwnership;
    boxTraderId: number | null;
    boxCustomerId: number | null;
    itemOwnership: ItemOwnership;
    itemTraderId: number | null;
    itemCustomerId: number | null;
  }) {
    const {
      boxOwnership,
      boxTraderId,
      boxCustomerId,
      itemOwnership,
      itemTraderId,
      itemCustomerId,
    } = params;

    if (boxOwnership === BoxOwnership.TRADER) {
      if (itemOwnership !== ItemOwnership.TRADER || itemTraderId !== boxTraderId) {
        throw new BadRequestException('Only items from the box trader can be packed into a TRADER box');
      }
      return;
    }

    if (boxOwnership === BoxOwnership.CUSTOMER) {
      if (itemOwnership !== ItemOwnership.CUSTOMER || itemCustomerId !== boxCustomerId) {
        throw new BadRequestException('Only items from the box customer can be packed into a CUSTOMER box');
      }
      return;
    }

    if (boxOwnership === BoxOwnership.SHARED) {
      if (itemOwnership !== ItemOwnership.TRADER && itemOwnership !== ItemOwnership.CUSTOMER) {
        throw new BadRequestException('In SHARED box, item ownership must be TRADER or CUSTOMER');
      }
    }
  }

  private async ensureEnoughAvailableStock(
    tx: Prisma.TransactionClient,
    params: {
      seasonId: number;
      itemOwnership: ItemOwnership;
      itemTraderId: number | null;
      itemCustomerId: number | null;
      traderCategoryId: number | null;
      customerCategoryId: number | null;
      grade: Grade | null;
      pitamStatus: PitamStatus;
      quantity: number;
    },
  ) {
    if (params.itemOwnership === ItemOwnership.TRADER) {
      if (!params.itemTraderId || !params.traderCategoryId || !params.grade) {
        throw new BadRequestException('Trader-packed items require traderId, traderCategoryId and grade');
      }

      const traderBalance = await tx.traderStock.aggregate({
        where: {
          seasonId: params.seasonId,
          isDeleted: false,
          traderId: params.itemTraderId,
          traderCategoryId: params.traderCategoryId,
          grade: params.grade,
          pitamStatus: params.pitamStatus,
        },
        _sum: { quantity: true },
      });

      const available = traderBalance._sum.quantity || 0;
      if (available < params.quantity) {
        throw new BadRequestException(
          `Not enough trader stock available for packing. Requested=${params.quantity}, available=${available}`,
        );
      }

      return;
    }

    if (params.itemOwnership === ItemOwnership.CUSTOMER) {
      if (!params.itemCustomerId || !params.customerCategoryId) {
        throw new BadRequestException('Customer-packed items require customerId and customerCategoryId');
      }

      const customerBalance = await tx.customerAllocation.aggregate({
        where: {
          seasonId: params.seasonId,
          isDeleted: false,
          customerId: params.itemCustomerId,
          customerCategoryId: params.customerCategoryId,
          pitamStatus: params.pitamStatus,
        },
        _sum: { quantity: true },
      });

      const available = customerBalance._sum.quantity || 0;
      if (available < params.quantity) {
        throw new BadRequestException(
          `Not enough customer stock available for packing. Requested=${params.quantity}, available=${available}`,
        );
      }

      return;
    }

    throw new BadRequestException('Item ownership is not supported for packing into this box');
  }

  private async deletePackedMovementsByItemId(tx: Prisma.TransactionClient, itemId: number) {
    await Promise.all([
      tx.traderStock.deleteMany({
        where: {
          MovementReferenceId: itemId,
          type: MovementType.PACKED_SHIPPED,
        },
      }),
      tx.customerAllocation.deleteMany({
        where: {
          MovementReferenceId: itemId,
          type: MovementType.PACKED_SHIPPED,
        },
      }),
    ]);
  }

  private async createPackedMovement(
    tx: Prisma.TransactionClient,
    params: {
      itemId: number;
      seasonId: number;
      shipmentId: number;
      boxId: number;
      quantity: number;
      pitamStatus: PitamStatus;
      traderId: number | null;
      customerId: number | null;
      traderCategoryId: number | null;
      customerCategoryId: number | null;
      grade: Grade | null;
      itemOwnership: ItemOwnership;
      updatedById: number;
    },
  ) {
    if (params.itemOwnership === ItemOwnership.TRADER) {
      if (!params.traderId || !params.traderCategoryId || !params.grade) {
        throw new BadRequestException('Trader packed movement requires traderId, traderCategoryId and grade');
      }

      await tx.traderStock.create({
        data: {
          seasonId: params.seasonId,
          date: new Date(),
          traderId: params.traderId,
          traderCategoryId: params.traderCategoryId,
          grade: params.grade,
          pitamStatus: params.pitamStatus,
          quantity: -Math.abs(params.quantity),
          isModulo: false,
          type: MovementType.PACKED_SHIPPED,
          MovementReferenceId: params.itemId,
          shipmentId: params.shipmentId,
          boxId: params.boxId,
          notes: `Packed from shipment item #${params.itemId}`,
          updatedById: params.updatedById,
        },
      });
      return;
    }

    if (params.itemOwnership === ItemOwnership.CUSTOMER) {
      if (!params.customerId || !params.customerCategoryId) {
        throw new BadRequestException('Customer packed movement requires customerId and customerCategoryId');
      }

      await tx.customerAllocation.create({
        data: {
          seasonId: params.seasonId,
          date: new Date(),
          dateHebrew: new Date().toLocaleDateString('he-IL'),
          customerId: params.customerId,
          customerCategoryId: params.customerCategoryId,
          pitamStatus: params.pitamStatus,
          quantity: -Math.abs(params.quantity),
          type: MovementType.PACKED_SHIPPED,
          takenFrom: SourceType.GENERAL,
          traderId: null,
          MovementReferenceId: params.itemId,
          shipmentId: params.shipmentId,
          boxId: params.boxId,
          notes: `Packed from shipment item #${params.itemId}`,
          updatedById: params.updatedById,
        },
      });
      return;
    }

    throw new BadRequestException('Unsupported item ownership for packed movement creation');
  }

  // Creates a shipment item and triggers totals recalculation for Box and Shipment.
  // Uses a transaction to ensure all updates succeed or fail together.
  async create(data: Prisma.ShipmentItemUncheckedCreateInput) {
    this.validateCreateInput(data);

    const itemOwnership = data.ownershipType as ItemOwnership;

    const { id: seasonId } = await this.seasonsService.findActiveSeason();

    return this.prisma.$transaction(async (tx) => {
      const box = await tx.box.findFirst({
        where: { id: data.boxId, seasonId, isDeleted: false },
        select: { id: true, shipmentId: true, ownershipType: true, traderId: true, customerId: true },
      });

      if (!box) {
        throw new NotFoundException(`Box ${data.boxId} not found in active season`);
      }

      this.ensureAllowedBoxOwnership(box.ownershipType);
      this.assertItemFitsBoxOwnership({
        boxOwnership: box.ownershipType,
        boxTraderId: box.traderId,
        boxCustomerId: box.customerId,
        itemOwnership,
        itemTraderId: data.traderId ?? null,
        itemCustomerId: data.customerId ?? null,
      });

      await this.ensureEnoughAvailableStock(tx, {
        seasonId,
        itemOwnership,
        itemTraderId: data.traderId ?? null,
        itemCustomerId: data.customerId ?? null,
        traderCategoryId: data.traderCategoryId ?? null,
        customerCategoryId: data.customerCategoryId ?? null,
        grade: data.grade ?? null,
        pitamStatus: data.pitamStatus,
        quantity: data.quantity,
      });

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

      await this.createPackedMovement(tx, {
        itemId: newItem.id,
        seasonId,
        shipmentId: box.shipmentId,
        boxId: newItem.boxId,
        quantity: newItem.quantity,
        pitamStatus: newItem.pitamStatus,
        traderId: newItem.traderId,
        customerId: newItem.customerId,
        traderCategoryId: newItem.traderCategoryId,
        customerCategoryId: newItem.customerCategoryId,
        grade: newItem.grade,
        itemOwnership: newItem.ownershipType,
        updatedById: newItem.updatedById,
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
        select: {
          id: true,
          boxId: true,
          shipmentId: true,
          seasonId: true,
          quantity: true,
          pitamStatus: true,
          traderId: true,
          customerId: true,
          traderCategoryId: true,
          customerCategoryId: true,
          grade: true,
          ownershipType: true,
          updatedById: true,
        },
      });

      if (!currentItem) {
        throw new NotFoundException(`Shipment item #${id} not found`);
      }

      const nextBoxId = Number(data.boxId ?? currentItem.boxId);
      const nextQuantity = Number(data.quantity ?? currentItem.quantity);
      const nextPitamStatus = (data.pitamStatus ?? currentItem.pitamStatus) as PitamStatus;
      const nextTraderId = (data.traderId ?? currentItem.traderId) as number | null;
      const nextCustomerId = (data.customerId ?? currentItem.customerId) as number | null;
      const nextTraderCategoryId = (data.traderCategoryId ?? currentItem.traderCategoryId) as number | null;
      const nextCustomerCategoryId = (data.customerCategoryId ?? currentItem.customerCategoryId) as number | null;
      const nextGrade = (data.grade ?? currentItem.grade) as Grade | null;
      const nextOwnershipType = (data.ownershipType ?? currentItem.ownershipType) as ItemOwnership;
      const nextUpdatedById = Number(data.updatedById ?? currentItem.updatedById);

      let nextShipmentId = currentItem.shipmentId;
      let targetBox = await tx.box.findFirst({
        where: { id: nextBoxId, seasonId: currentItem.seasonId, isDeleted: false },
        select: { id: true, shipmentId: true, ownershipType: true, traderId: true, customerId: true },
      });

      if (data.boxId) {
        if (!targetBox) {
          throw new NotFoundException(`Box ${nextBoxId} not found in active season`);
        }

        nextShipmentId = targetBox.shipmentId;
      }

      if (!targetBox) {
        throw new NotFoundException(`Box ${nextBoxId} not found in active season`);
      }

      this.ensureAllowedBoxOwnership(targetBox.ownershipType);
      this.assertItemFitsBoxOwnership({
        boxOwnership: targetBox.ownershipType,
        boxTraderId: targetBox.traderId,
        boxCustomerId: targetBox.customerId,
        itemOwnership: nextOwnershipType,
        itemTraderId: nextTraderId,
        itemCustomerId: nextCustomerId,
      });

      await this.deletePackedMovementsByItemId(tx, currentItem.id);

      await this.ensureEnoughAvailableStock(tx, {
        seasonId: currentItem.seasonId,
        itemOwnership: nextOwnershipType,
        itemTraderId: nextTraderId,
        itemCustomerId: nextCustomerId,
        traderCategoryId: nextTraderCategoryId,
        customerCategoryId: nextCustomerCategoryId,
        grade: nextGrade,
        pitamStatus: nextPitamStatus,
        quantity: nextQuantity,
      });

      const updatedItem = await tx.shipmentItem.update({
        where: { id },
        data: {
          ...data,
          shipmentId: nextShipmentId,
        },
      });

      await this.createPackedMovement(tx, {
        itemId: updatedItem.id,
        seasonId: currentItem.seasonId,
        shipmentId: updatedItem.shipmentId,
        boxId: updatedItem.boxId,
        quantity: updatedItem.quantity,
        pitamStatus: updatedItem.pitamStatus,
        traderId: updatedItem.traderId,
        customerId: updatedItem.customerId,
        traderCategoryId: updatedItem.traderCategoryId,
        customerCategoryId: updatedItem.customerCategoryId,
        grade: updatedItem.grade,
        itemOwnership: updatedItem.ownershipType,
        updatedById: nextUpdatedById,
      });

      // Re-sync totals for the associated box and shipment
      await this.syncTotals(tx, currentItem.boxId, currentItem.shipmentId);

      if (currentItem.boxId !== updatedItem.boxId || currentItem.shipmentId !== updatedItem.shipmentId) {
        await this.syncTotals(tx, updatedItem.boxId, updatedItem.shipmentId);
      }

      return updatedItem;
    });
  }

  // Hard deletes an item and updates totals accordingly.
  async remove(id: number) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.shipmentItem.findFirst({
        where: { id, isDeleted: false },
        select: { boxId: true, shipmentId: true },
      });

      if (!existing) {
        throw new NotFoundException(`Shipment item #${id} not found`);
      }

      await this.deletePackedMovementsByItemId(tx, id);

      const item = await tx.shipmentItem.delete({
        where: { id },
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