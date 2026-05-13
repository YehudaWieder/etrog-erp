// src/shipments/services/item/item.service.ts

import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from 'src/generated/prisma';
import { BoxOwnership, Grade, ItemOwnership, MovementType, PitamStatus, SourceType } from '@prisma/client';
import { SeasonsService } from 'src/seasons/seasons.service';
import { ShipmentsService } from '../../shipments.service';
import { InventoryAvailabilityService } from 'src/inventory/services/inventory-availability.service';

@Injectable()
export class ItemService {
  constructor(
    private prisma: PrismaService,
    private seasonsService: SeasonsService,
    private shipmentsService: ShipmentsService,
    private inventoryAvailabilityService: InventoryAvailabilityService,
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

    if (ownershipType === ItemOwnership.UNASSIGNED && (traderId !== undefined && traderId !== null)) {
      throw new BadRequestException('traderId must be empty when ownershipType=UNASSIGNED');
    }

    if (ownershipType === ItemOwnership.UNASSIGNED && (customerId !== undefined && customerId !== null)) {
      throw new BadRequestException('customerId must be empty when ownershipType=UNASSIGNED');
    }

    if (ownershipType !== ItemOwnership.TRADER && ownershipType !== ItemOwnership.CUSTOM && traderId !== undefined && traderId !== null) {
      throw new BadRequestException('traderId must be empty unless ownershipType=TRADER or ownershipType=CUSTOM');
    }

    if (ownershipType !== ItemOwnership.CUSTOMER && ownershipType !== ItemOwnership.CUSTOM && customerId !== undefined && customerId !== null) {
      throw new BadRequestException('customerId must be empty unless ownershipType=CUSTOMER or ownershipType=CUSTOM');
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

    if (data.ownershipType !== undefined) {
      this.validateOwnership(data.ownershipType, data.traderId, data.customerId);
    }
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

    // Ownership consistency is validated after loading the target box and resolving effective ownership.
  }

  private normalizeItemOwnershipForBox(params: {
    boxOwnership: BoxOwnership;
    boxTraderId: number | null;
    boxCustomerId: number | null;
    itemOwnership?: ItemOwnership | null;
    itemTraderId?: number | null;
    itemCustomerId?: number | null;
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
      if (itemOwnership !== undefined && itemOwnership !== null && itemOwnership !== ItemOwnership.TRADER) {
        throw new BadRequestException('TRADER box accepts only TRADER items');
      }

      if (!boxTraderId) {
        throw new BadRequestException('TRADER box must have traderId configured');
      }

      if (itemTraderId !== undefined && itemTraderId !== null && itemTraderId !== boxTraderId) {
        throw new BadRequestException('Only items from the box trader can be packed into this TRADER box');
      }

      return {
        ownershipType: ItemOwnership.TRADER,
        traderId: boxTraderId,
        customerId: null,
      };
    }

    if (boxOwnership === BoxOwnership.CUSTOMER) {
      if (itemOwnership !== undefined && itemOwnership !== null && itemOwnership !== ItemOwnership.CUSTOMER) {
        throw new BadRequestException('CUSTOMER box accepts only CUSTOMER items');
      }

      if (!boxCustomerId) {
        throw new BadRequestException('CUSTOMER box must have customerId configured');
      }

      if (itemCustomerId !== undefined && itemCustomerId !== null && itemCustomerId !== boxCustomerId) {
        throw new BadRequestException('Only items from the box customer can be packed into this CUSTOMER box');
      }

      return {
        ownershipType: ItemOwnership.CUSTOMER,
        traderId: null,
        customerId: boxCustomerId,
      };
    }

    if (boxOwnership === BoxOwnership.SHARED) {
      if (itemOwnership === undefined || itemOwnership === null) {
        throw new BadRequestException('SHARED box requires item ownershipType per item');
      }

      if (itemOwnership === ItemOwnership.CUSTOM) {
        throw new BadRequestException('SHARED box supports only TRADER, CUSTOMER, or UNASSIGNED item ownership');
      }

      // If assigning to a TRADER, ensure the trader has a share in this category for the season
      if (itemOwnership === ItemOwnership.TRADER) {
        // This check will be enforced in buildUnassignedTraderDeductions, but we add a fast fail here for clarity
        if (!itemTraderId) {
          throw new BadRequestException('Trader ID is required for TRADER item in SHARED box');
        }
        // This method is sync, but we can only check in the transactional context. So, we will add a runtime check in buildUnassignedTraderDeductions.
        // If you want to enforce it earlier, you must refactor to make this method async and pass tx/context.
      }

      return {
        ownershipType: itemOwnership,
        traderId: itemTraderId ?? null,
        customerId: itemCustomerId ?? null,
      };
    }

    if (boxOwnership === BoxOwnership.UNASSIGNED) {
      const effectiveOwnership = itemOwnership ?? ItemOwnership.UNASSIGNED;
      if (effectiveOwnership !== ItemOwnership.UNASSIGNED) {
        throw new BadRequestException('UNASSIGNED box accepts only UNASSIGNED items');
      }

      return {
        ownershipType: ItemOwnership.UNASSIGNED,
        traderId: null,
        customerId: null,
      };
    }

    // CUSTOM box: fully manual mode.
    return {
      ownershipType: itemOwnership ?? ItemOwnership.CUSTOM,
      traderId: itemTraderId ?? null,
      customerId: itemCustomerId ?? null,
    };
  }

  private async getTraderAvailabilityForDistribution(
    tx: Prisma.TransactionClient,
    params: {
      seasonId: number;
      traderCategoryId: number;
      grade: Grade;
      pitamStatus: PitamStatus;
    },
  ) {
    return this.inventoryAvailabilityService.getTraderUnshippedAvailabilityByCategory(tx, {
      seasonId: params.seasonId,
      traderCategoryId: params.traderCategoryId,
      grade: params.grade,
      pitamStatus: params.pitamStatus,
    });
  }

  private async buildUnassignedTraderDeductions(
    tx: Prisma.TransactionClient,
    params: {
      seasonId: number;
      traderCategoryId: number;
      grade: Grade;
      pitamStatus: PitamStatus;
      quantity: number;
    },
  ): Promise<Array<{ traderId: number; quantity: number }>> {

    const traders = await this.getTraderAvailabilityForDistribution(tx, {
      seasonId: params.seasonId,
      traderCategoryId: params.traderCategoryId,
      grade: params.grade,
      pitamStatus: params.pitamStatus,
    });

    // Enforce: Only traders with a share in this category for this season can receive items
    const shares = await tx.traderCategoryShare.findMany({
      where: {
        seasonId: params.seasonId,
        traderCategoryId: params.traderCategoryId,
      },
      select: { traderId: true, percent: true },
    });

    const allowedTraderIds = new Set(shares.map((s) => s.traderId));
    for (const trader of traders) {
      if (!allowedTraderIds.has(trader.traderId)) {
        throw new BadRequestException(`Trader ${trader.traderId} does not have a share in category ${params.traderCategoryId} for this season`);
      }
    }

    const shareMap = new Map<number, number>();
    for (const share of shares) {
      shareMap.set(share.traderId, Number(share.percent));
    }

    const allocated = new Map<number, number>();
    for (const trader of traders) {
      allocated.set(trader.traderId, 0);
    }

    let remaining = params.quantity;

    // Phase 1: percentage-based allocation where each trader can satisfy its own share chunk.
    for (const trader of traders) {
      if (remaining <= 0) break;

      const percent = shareMap.get(trader.traderId) || 0;
      if (percent <= 0) continue;

      const planned = Math.floor((params.quantity * percent) / 100);
      if (planned <= 0) continue;

      if (trader.available >= planned) {
        const qty = Math.min(planned, remaining);
        allocated.set(trader.traderId, qty);
        remaining -= qty;
      }
    }

    // Phase 2: distribute remaining quantity equally among traders with capacity.
    while (remaining > 0) {
      const candidates = traders.filter((trader) => {
        const used = allocated.get(trader.traderId) || 0;
        return trader.available > used;
      });

      if (candidates.length === 0) {
        break;
      }

      const perTrader = Math.floor(remaining / candidates.length);
      if (perTrader <= 0) {
        break;
      }

      for (const trader of candidates) {
        const used = allocated.get(trader.traderId) || 0;
        const capacity = trader.available - used;
        if (capacity <= 0) continue;

        const toTake = Math.min(perTrader, capacity, remaining);
        if (toTake > 0) {
          allocated.set(trader.traderId, used + toTake);
          remaining -= toTake;
        }
      }
    }

    // Phase 3: remaining one-by-one from traders with the highest free stock first.
    while (remaining > 0) {
      const candidates = traders
        .map((trader) => {
          const used = allocated.get(trader.traderId) || 0;
          return {
            traderId: trader.traderId,
            free: trader.available - used,
          };
        })
        .filter((row) => row.free > 0)
        .sort((a, b) => b.free - a.free);

      if (candidates.length === 0) {
        break;
      }

      const top = candidates[0];
      allocated.set(top.traderId, (allocated.get(top.traderId) || 0) + 1);
      remaining -= 1;
    }

    if (remaining > 0) {
      throw new BadRequestException(
        `Not enough combined trader stock for unassigned packing. Missing=${remaining}`,
      );
    }

    return Array.from(allocated.entries())
      .map(([traderId, quantity]) => ({ traderId, quantity }))
      .filter((row) => row.quantity > 0);
  }

  private async ensureEnoughAvailableStock(
    tx: Prisma.TransactionClient,
    params: {
      seasonId: number;
      boxOwnership: BoxOwnership;
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
    if (params.boxOwnership === BoxOwnership.CUSTOM || params.itemOwnership === ItemOwnership.CUSTOM) {
      return;
    }

    if (params.itemOwnership === ItemOwnership.TRADER) {
      if (!params.itemTraderId || !params.traderCategoryId || !params.grade) {
        throw new BadRequestException('Trader-packed items require traderId, traderCategoryId and grade');
      }

      await this.inventoryAvailabilityService.assertTraderHasUnshippedStock(tx, {
        seasonId: params.seasonId,
        traderId: params.itemTraderId,
        traderCategoryId: params.traderCategoryId,
        grade: params.grade,
        pitamStatus: params.pitamStatus,
        isModulo: false,
        requiredQuantity: params.quantity,
        contextLabel: 'Packing TRADER item',
      });

      return;
    }

    if (params.itemOwnership === ItemOwnership.CUSTOMER) {
      if (!params.itemCustomerId || !params.customerCategoryId) {
        throw new BadRequestException('Customer-packed items require customerId and customerCategoryId');
      }

      await this.inventoryAvailabilityService.assertCustomerHasUnshippedStock(tx, {
        seasonId: params.seasonId,
        customerId: params.itemCustomerId,
        customerCategoryId: params.customerCategoryId,
        pitamStatus: params.pitamStatus,
        requiredQuantity: params.quantity,
        contextLabel: 'Packing CUSTOMER item',
      });

      return;
    }

    if (params.itemOwnership === ItemOwnership.UNASSIGNED) {
      if (!params.traderCategoryId || !params.grade) {
        throw new BadRequestException('Unassigned packed items require traderCategoryId and grade');
      }

      if (params.boxOwnership === BoxOwnership.SHARED) {
        await this.inventoryAvailabilityService.assertTraderHasUnshippedStock(tx, {
          seasonId: params.seasonId,
          traderId: null,
          traderCategoryId: params.traderCategoryId,
          grade: params.grade,
          pitamStatus: params.pitamStatus,
          isModulo: true,
          requiredQuantity: params.quantity,
          contextLabel: 'Packing UNASSIGNED item from SHARED box',
        });

        return;
      }

      if (params.boxOwnership === BoxOwnership.UNASSIGNED) {
        await this.buildUnassignedTraderDeductions(tx, {
          seasonId: params.seasonId,
          traderCategoryId: params.traderCategoryId,
          grade: params.grade,
          pitamStatus: params.pitamStatus,
          quantity: params.quantity,
        });
        return;
      }
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
      boxOwnership: BoxOwnership;
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
    if (params.boxOwnership === BoxOwnership.CUSTOM || params.itemOwnership === ItemOwnership.CUSTOM) {
      return;
    }

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

    if (params.itemOwnership === ItemOwnership.UNASSIGNED) {
      if (!params.traderCategoryId || !params.grade) {
        throw new BadRequestException('Unassigned packed movement requires traderCategoryId and grade');
      }

      if (params.boxOwnership === BoxOwnership.SHARED) {
        await tx.traderStock.create({
          data: {
            seasonId: params.seasonId,
            date: new Date(),
            traderId: null,
            traderCategoryId: params.traderCategoryId,
            grade: params.grade,
            pitamStatus: params.pitamStatus,
            quantity: -Math.abs(params.quantity),
            isModulo: true,
            type: MovementType.PACKED_SHIPPED,
            MovementReferenceId: params.itemId,
            shipmentId: params.shipmentId,
            boxId: params.boxId,
            notes: `Packed from modulo for shipment item #${params.itemId}`,
            updatedById: params.updatedById,
          },
        });
        return;
      }

      if (params.boxOwnership === BoxOwnership.UNASSIGNED) {
        const traderDeductions = await this.buildUnassignedTraderDeductions(tx, {
          seasonId: params.seasonId,
          traderCategoryId: params.traderCategoryId,
          grade: params.grade,
          pitamStatus: params.pitamStatus,
          quantity: params.quantity,
        });

        for (const deduction of traderDeductions) {
          await tx.traderStock.create({
            data: {
              seasonId: params.seasonId,
              date: new Date(),
              traderId: deduction.traderId,
              traderCategoryId: params.traderCategoryId,
              grade: params.grade,
              pitamStatus: params.pitamStatus,
              quantity: -Math.abs(deduction.quantity),
              isModulo: false,
              type: MovementType.PACKED_SHIPPED,
              MovementReferenceId: params.itemId,
              shipmentId: params.shipmentId,
              boxId: params.boxId,
              notes: `Packed by share allocation for shipment item #${params.itemId}`,
              updatedById: params.updatedById,
            },
          });
        }
        return;
      }
    }

    throw new BadRequestException('Unsupported item ownership for packed movement creation');
  }

  // Creates a shipment item and triggers totals recalculation for Box and Shipment.
  // Uses a transaction to ensure all updates succeed or fail together.
  async create(data: Prisma.ShipmentItemUncheckedCreateInput, actorId: number) {
    const createPayload = {
      ...data,
      updatedById: actorId,
    };

    this.validateCreateInput(createPayload);

    const { id: seasonId } = await this.seasonsService.findActiveSeason();

    return this.prisma.$transaction(async (tx) => {
      const box = await tx.box.findFirst({
        where: { id: createPayload.boxId, seasonId, isDeleted: false },
        select: { id: true, shipmentId: true, ownershipType: true, traderId: true, customerId: true, status: true },
      });

      if (!box) {
        throw new NotFoundException(`Box ${createPayload.boxId} not found in active season`);
      }

      // Prevent adding items to boxes that are not OPEN
      if (box.status !== 'OPEN') {
        throw new BadRequestException('Cannot add items to a box that is not OPEN');
      }

      const normalizedOwnership = this.normalizeItemOwnershipForBox({
        boxOwnership: box.ownershipType,
        boxTraderId: box.traderId,
        boxCustomerId: box.customerId,
        itemOwnership: createPayload.ownershipType as ItemOwnership | undefined,
        itemTraderId: createPayload.traderId ?? null,
        itemCustomerId: createPayload.customerId ?? null,
      });

      this.validateOwnership(
        normalizedOwnership.ownershipType,
        normalizedOwnership.traderId,
        normalizedOwnership.customerId,
      );

      await this.ensureEnoughAvailableStock(tx, {
        seasonId,
        boxOwnership: box.ownershipType,
        itemOwnership: normalizedOwnership.ownershipType,
        itemTraderId: normalizedOwnership.traderId,
        itemCustomerId: normalizedOwnership.customerId,
        traderCategoryId: createPayload.traderCategoryId ?? null,
        customerCategoryId: createPayload.customerCategoryId ?? null,
        grade: createPayload.grade ?? null,
        pitamStatus: createPayload.pitamStatus,
        quantity: createPayload.quantity,
      });

      // 1. Check for duplicate based on the complex unique constraint
      const existing = await tx.shipmentItem.findFirst({
        where: {
          seasonId,
          boxId: createPayload.boxId,
          traderCategoryId: createPayload.traderCategoryId,
          customerCategoryId: createPayload.customerCategoryId,
          grade: createPayload.grade,
          pitamStatus: createPayload.pitamStatus,
          ownershipType: normalizedOwnership.ownershipType,
          traderId: normalizedOwnership.traderId,
          customerId: normalizedOwnership.customerId,
          isDeleted: false,
        },
      });

      if (existing) {
        throw new ConflictException('A matching shipment item already exists in this box');
      }

      // 2. Create the shipment item
      const newItem = await tx.shipmentItem.create({
        data: {
          ...createPayload,
          ownershipType: normalizedOwnership.ownershipType,
          traderId: normalizedOwnership.traderId,
          customerId: normalizedOwnership.customerId,
          seasonId,
          shipmentId: box.shipmentId,
        },
      });

      await this.createPackedMovement(tx, {
        itemId: newItem.id,
        seasonId,
        boxOwnership: box.ownershipType,
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

      await this.shipmentsService.syncBoxAndShipmentTotals(tx, box.id, box.shipmentId);

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
  async update(id: number, data: Prisma.ShipmentItemUncheckedUpdateInput, actorId: number) {
    const updatePayload = {
      ...data,
      updatedById: actorId,
    };

    this.validateUpdateInput(updatePayload);

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

      const nextBoxId = Number(updatePayload.boxId ?? currentItem.boxId);
      const nextQuantity = Number(updatePayload.quantity ?? currentItem.quantity);
      const nextPitamStatus = (updatePayload.pitamStatus ?? currentItem.pitamStatus) as PitamStatus;
      const hasTraderId = Object.prototype.hasOwnProperty.call(updatePayload, 'traderId');
      const hasCustomerId = Object.prototype.hasOwnProperty.call(updatePayload, 'customerId');
      const hasOwnershipType = Object.prototype.hasOwnProperty.call(updatePayload, 'ownershipType');
      const nextTraderId = (hasTraderId ? updatePayload.traderId : currentItem.traderId) as number | null;
      const nextCustomerId = (hasCustomerId ? updatePayload.customerId : currentItem.customerId) as number | null;
      const nextTraderCategoryId = (updatePayload.traderCategoryId ?? currentItem.traderCategoryId) as number | null;
      const nextCustomerCategoryId = (updatePayload.customerCategoryId ?? currentItem.customerCategoryId) as number | null;
      const nextGrade = (updatePayload.grade ?? currentItem.grade) as Grade | null;
      const nextOwnershipType = (hasOwnershipType ? updatePayload.ownershipType : currentItem.ownershipType) as ItemOwnership;
      const nextUpdatedById = Number(updatePayload.updatedById ?? currentItem.updatedById);

      let nextShipmentId = currentItem.shipmentId;
      let targetBox = await tx.box.findFirst({
        where: { id: nextBoxId, seasonId: currentItem.seasonId, isDeleted: false },
        select: { id: true, shipmentId: true, ownershipType: true, traderId: true, customerId: true },
      });

      if (updatePayload.boxId) {
        if (!targetBox) {
          throw new NotFoundException(`Box ${nextBoxId} not found in active season`);
        }

        nextShipmentId = targetBox.shipmentId;
      }

      if (!targetBox) {
        throw new NotFoundException(`Box ${nextBoxId} not found in active season`);
      }

      const normalizedOwnership = this.normalizeItemOwnershipForBox({
        boxOwnership: targetBox.ownershipType,
        boxTraderId: targetBox.traderId,
        boxCustomerId: targetBox.customerId,
        itemOwnership: nextOwnershipType,
        itemTraderId: nextTraderId,
        itemCustomerId: nextCustomerId,
      });

      this.validateOwnership(
        normalizedOwnership.ownershipType,
        normalizedOwnership.traderId,
        normalizedOwnership.customerId,
      );

      await this.deletePackedMovementsByItemId(tx, currentItem.id);

      await this.ensureEnoughAvailableStock(tx, {
        seasonId: currentItem.seasonId,
        boxOwnership: targetBox.ownershipType,
        itemOwnership: normalizedOwnership.ownershipType,
        itemTraderId: normalizedOwnership.traderId,
        itemCustomerId: normalizedOwnership.customerId,
        traderCategoryId: nextTraderCategoryId,
        customerCategoryId: nextCustomerCategoryId,
        grade: nextGrade,
        pitamStatus: nextPitamStatus,
        quantity: nextQuantity,
      });

      const updatedItem = await tx.shipmentItem.update({
        where: { id },
        data: {
          ...updatePayload,
          ownershipType: normalizedOwnership.ownershipType,
          traderId: normalizedOwnership.traderId,
          customerId: normalizedOwnership.customerId,
          shipmentId: nextShipmentId,
        },
      });

      await this.createPackedMovement(tx, {
        itemId: updatedItem.id,
        seasonId: currentItem.seasonId,
        boxOwnership: targetBox.ownershipType,
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
      await this.shipmentsService.syncBoxAndShipmentTotals(tx, currentItem.boxId, currentItem.shipmentId);

      if (currentItem.boxId !== updatedItem.boxId || currentItem.shipmentId !== updatedItem.shipmentId) {
        await this.shipmentsService.syncBoxAndShipmentTotals(tx, updatedItem.boxId, updatedItem.shipmentId);
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

      await this.shipmentsService.syncBoxAndShipmentTotals(tx, existing.boxId, existing.shipmentId);

      return item;
    });
  }
}