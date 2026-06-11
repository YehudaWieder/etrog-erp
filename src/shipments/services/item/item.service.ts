// src/shipments/services/item/item.service.ts

import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from 'src/generated/prisma';
import { BoxOwnership, Grade, ItemOwnership, MovementType, PitamStatus, SourceType } from '@prisma/client';
import { SeasonsService } from 'src/seasons/seasons.service';
import { ShipmentsService } from '../../shipments.service';
import { InventoryAvailabilityService } from 'src/inventory/services/inventory-availability.service';
import {
  validateCreateShipmentItemInput,
  validateItemOwnership,
  validateUpdateShipmentItemInput,
} from './utils/item.utils';

@Injectable()
export class ItemService {
  constructor(
    private prisma: PrismaService,
    private seasonsService: SeasonsService,
    private shipmentsService: ShipmentsService,
    private inventoryAvailabilityService: InventoryAvailabilityService,
  ) {}

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
      excludePrivateSelection: true,
    });
  }

  private decimalToFraction(value: string) {
    const normalized = value.trim();
    if (!/^\d+(\.\d+)?$/.test(normalized)) {
      throw new BadRequestException(`Invalid share percent value: ${value}`);
    }

    const parts = normalized.split('.');
    if (parts.length === 1) {
      return { numerator: BigInt(parts[0]), denominator: 1n };
    }

    const whole = parts[0];
    const frac = parts[1];
    const denominator = 10n ** BigInt(frac.length);
    const numerator = BigInt(whole + frac);
    const divisor = this.gcd(numerator, denominator);

    return {
      numerator: numerator / divisor,
      denominator: denominator / divisor,
    };
  }

  private gcd(a: bigint, b: bigint): bigint {
    let left = a < 0n ? -a : a;
    let right = b < 0n ? -b : b;

    while (right !== 0n) {
      const temp = left % right;
      left = right;
      right = temp;
    }

    return left;
  }

  private lcm(a: bigint, b: bigint): bigint {
    if (a === 0n || b === 0n) {
      return 0n;
    }

    return (a / this.gcd(a, b)) * b;
  }

  private calculateMinimalGrossByShares(deficit: number, sharePercents: string[]) {
    const deficitBig = BigInt(deficit);
    const step = this.calculateShareStep(sharePercents);

    const gross = ((deficitBig + step - 1n) / step) * step;
    if (gross > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new BadRequestException('Calculated gross quantity is too large');
    }

    return Number(gross);
  }

  private calculateShareStep(sharePercents: string[]) {
    const hundred = 100n;
    let step = 1n;

    for (const percentText of sharePercents) {
      const fraction = this.decimalToFraction(percentText);
      if (fraction.numerator <= 0n) {
        throw new BadRequestException('All trader shares must be positive numbers');
      }

      const denominator = hundred * fraction.denominator;
      const unitStep = denominator / this.gcd(fraction.numerator, denominator);
      step = this.lcm(step, unitStep);
    }

    return step;
  }

  private calculateLargestExactShareGross(total: number, sharePercents: string[]) {
    const step = this.calculateShareStep(sharePercents);
    const totalBig = BigInt(total);
    const gross = (totalBig / step) * step;

    if (gross > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new BadRequestException('Calculated share quantity is too large');
    }

    return Number(gross);
  }

  private calculateExactShareQuantity(total: number, percentText: string) {
    const totalBig = BigInt(total);
    const fraction = this.decimalToFraction(percentText);
    const numerator = totalBig * fraction.numerator;
    const denominator = 100n * fraction.denominator;

    if (numerator % denominator !== 0n) {
      throw new BadRequestException('Share distribution produced non-integer quantity');
    }

    const value = numerator / denominator;
    if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new BadRequestException('Calculated share quantity is too large');
    }

    return Number(value);
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
  ): Promise<{
    traderDeductions: Array<{ traderId: number; quantity: number }>;
    moduloDeduction: number;
  }> {
    const shares = await tx.traderCategoryShare.findMany({
      where: { seasonId: params.seasonId, traderCategoryId: params.traderCategoryId },
      select: { traderId: true, percent: true },
      orderBy: { traderId: 'asc' },
    });

    if (shares.length === 0) {
      throw new BadRequestException('No trader shares defined for this category in the current season');
    }

    const positiveShares = shares
      .map((s) => ({ traderId: s.traderId, percent: Number(s.percent) }))
      .filter((s) => s.percent > 0);

    if (positiveShares.length === 0) {
      throw new BadRequestException('All configured trader shares are zero or negative for this category');
    }

    const availabilityRows = await this.getTraderAvailabilityForDistribution(tx, {
      seasonId: params.seasonId,
      traderCategoryId: params.traderCategoryId,
      grade: params.grade,
      pitamStatus: params.pitamStatus,
    });
    const availability = new Map(availabilityRows.map((r) => [r.traderId, r.available]));

    const totalPercent = positiveShares.reduce((sum, s) => sum + s.percent, 0);

    // Floor-based initial allocation proportional to shares; pool holds the rounding remainder.
    const committed = new Map<number, number>();
    let pool = params.quantity;
    for (const s of positiveShares) {
      const qty = Math.floor((params.quantity * s.percent) / totalPercent);
      committed.set(s.traderId, qty);
      pool -= qty;
    }

    // Traders who still have capacity to absorb more than their current committed amount.
    const active = new Set(positiveShares.map((s) => s.traderId));

    // Distribute the pool proportionally among active traders (floor + round-robin for remainder).
    const distributePool = () => {
      if (pool === 0 || active.size === 0) return;

      const activeShares = positiveShares.filter((s) => active.has(s.traderId));
      const totalActivePercent = activeShares.reduce((sum, s) => sum + s.percent, 0);

      let distributed = 0;
      const extras = new Map<number, number>();
      for (const s of activeShares) {
        const extra = Math.floor((pool * s.percent) / totalActivePercent);
        extras.set(s.traderId, extra);
        distributed += extra;
      }

      // Distribute leftover integers by highest share first.
      let roundingRemainder = pool - distributed;
      const sorted = [...activeShares].sort((a, b) =>
        b.percent !== a.percent ? b.percent - a.percent : a.traderId - b.traderId,
      );
      for (const s of sorted) {
        if (roundingRemainder <= 0) break;
        extras.set(s.traderId, (extras.get(s.traderId) ?? 0) + 1);
        roundingRemainder--;
      }

      for (const [traderId, extra] of extras) {
        committed.set(traderId, (committed.get(traderId) ?? 0) + extra);
      }
      pool = 0;
    };

    // Cap over-allocated traders at their available stock; excess goes back to pool.
    // Exhausted traders are removed from active so subsequent rounds skip them.
    const capAndCollect = (): boolean => {
      let changed = false;
      for (const traderId of [...active]) {
        const avail = availability.get(traderId) ?? 0;
        const alloc = committed.get(traderId) ?? 0;
        if (alloc > avail) {
          pool += alloc - avail;
          committed.set(traderId, avail);
          active.delete(traderId);
          changed = true;
        }
      }
      return changed;
    };

    // Iterate: distribute pool → cap → repeat until stable or all traders exhausted.
    // Guaranteed to terminate: each iteration removes at least one trader from `active`.
    for (let i = 0; i <= positiveShares.length; i++) {
      distributePool();
      const changed = capAndCollect();
      if (!changed) break;
    }

    // Anything left in pool after all traders are exhausted falls back to modulo.
    const moduloDeduction = pool;

    const traderDeductions = [...committed.entries()]
      .filter(([, qty]) => qty > 0)
      .map(([traderId, quantity]) => ({ traderId, quantity }))
      .sort((a, b) => a.traderId - b.traderId);

    return { traderDeductions, moduloDeduction };
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
      isPrivateSelection?: boolean;
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
        onlyPrivateSelection: params.isPrivateSelection === true,
        excludePrivateSelection: params.isPrivateSelection === false,
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

      if (params.boxOwnership === BoxOwnership.SHARED || params.boxOwnership === BoxOwnership.UNASSIGNED) {
        const { traderDeductions, moduloDeduction } = await this.buildUnassignedTraderDeductions(tx, {
          seasonId: params.seasonId,
          traderCategoryId: params.traderCategoryId,
          grade: params.grade,
          pitamStatus: params.pitamStatus,
          quantity: params.quantity,
        });

        for (const deduction of traderDeductions) {
          await this.inventoryAvailabilityService.assertTraderHasUnshippedStock(tx, {
            seasonId: params.seasonId,
            traderId: deduction.traderId,
            traderCategoryId: params.traderCategoryId,
            grade: params.grade,
            pitamStatus: params.pitamStatus,
            isModulo: false,
            requiredQuantity: deduction.quantity,
            contextLabel: 'Packing UNASSIGNED item (trader portion)',
            excludePrivateSelection: true,
          });
        }

        if (moduloDeduction > 0) {
          await this.inventoryAvailabilityService.assertTraderHasUnshippedStock(tx, {
            seasonId: params.seasonId,
            traderId: null,
            traderCategoryId: params.traderCategoryId,
            grade: params.grade,
            pitamStatus: params.pitamStatus,
            isModulo: true,
            requiredQuantity: moduloDeduction,
            contextLabel: 'Packing UNASSIGNED item (modulo fallback)',
          });
        }

        return;
      }
    }

    throw new BadRequestException('Item ownership is not supported for packing into this box');
  }

  private async deletePackedMovementsByItemId(tx: Prisma.TransactionClient, itemId: number) {
    // Only delete movements with the unique shipment item marker in notes
    const noteMarker = `shipment item #${itemId}`;
    await Promise.all([
      tx.traderStock.deleteMany({
        where: {
          MovementReferenceId: itemId,
          type: { in: [MovementType.PACKED_SHIPPED, MovementType.ASSIGNED] },
          notes: { contains: noteMarker },
        },
      }),
      tx.customerAllocation.deleteMany({
        where: {
          MovementReferenceId: itemId,
          type: MovementType.PACKED_SHIPPED,
          notes: { contains: noteMarker },
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
          notes: `Packed from shipment item #${params.itemId} [packing-movement]`,
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
          notes: `Packed from shipment item #${params.itemId} [packing-movement]`,
          updatedById: params.updatedById,
        },
      });
      return;
    }

    if (params.itemOwnership === ItemOwnership.UNASSIGNED) {
      if (!params.traderCategoryId || !params.grade) {
        throw new BadRequestException('Unassigned packed movement requires traderCategoryId and grade');
      }

      if (params.boxOwnership === BoxOwnership.SHARED || params.boxOwnership === BoxOwnership.UNASSIGNED) {
        const { traderDeductions, moduloDeduction } = await this.buildUnassignedTraderDeductions(tx, {
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
              notes: `Packed by share allocation for shipment item #${params.itemId} [packing-movement]`,
              updatedById: params.updatedById,
            },
          });
        }

        if (moduloDeduction > 0) {
          await tx.traderStock.create({
            data: {
              seasonId: params.seasonId,
              date: new Date(),
              traderId: null,
              traderCategoryId: params.traderCategoryId,
              grade: params.grade,
              pitamStatus: params.pitamStatus,
              quantity: -Math.abs(moduloDeduction),
              isModulo: true,
              type: MovementType.PACKED_SHIPPED,
              MovementReferenceId: params.itemId,
              shipmentId: params.shipmentId,
              boxId: params.boxId,
              notes: `Packed from modulo (fallback) for shipment item #${params.itemId} [packing-movement]`,
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

    validateCreateShipmentItemInput(createPayload);

    const { id: seasonId } = await this.seasonsService.findActiveSeason();

    return this.prisma.$transaction(async (tx) => {
      const box = await tx.box.findFirst({
        where: { id: createPayload.boxId, seasonId, isDeleted: false },
        select: { id: true, shipmentId: true, ownershipType: true, traderId: true, customerId: true, status: true, boxType: true, totalQuantity: true },
      });

      if (!box) {
        throw new NotFoundException(`Box ${createPayload.boxId} not found in active season`);
      }

      // Prevent adding items to boxes that are not OPEN
      if (box.status !== 'OPEN') {
        throw new BadRequestException('Cannot add items to a box that is not OPEN');
      }

      // Enforce box capacity (skip for CUSTOM box type)
      if (box.boxType !== 'CUSTOM') {
        const systemConfig = await tx.systemConfig.findFirst({ where: { seasonId } });

        const capacityMap: Record<string, number | null | undefined> = {
          SMALL: systemConfig?.smallBoxCapacity,
          MEDIUM: systemConfig?.mediumBoxCapacity,
          LARGE: systemConfig?.largeBoxCapacity,
        };

        const capacity = capacityMap[box.boxType];

        if (capacity != null) {
          const currentTotal = box.totalQuantity ?? 0;
          if (currentTotal + Number(createPayload.quantity) > capacity) {
            throw new BadRequestException(
              `Box capacity exceeded: box can hold ${capacity} items, currently has ${currentTotal}, adding ${createPayload.quantity} would exceed the limit`,
            );
          }
        }
      }

      const normalizedOwnership = this.normalizeItemOwnershipForBox({
        boxOwnership: box.ownershipType,
        boxTraderId: box.traderId,
        boxCustomerId: box.customerId,
        itemOwnership: createPayload.ownershipType as ItemOwnership | undefined,
        itemTraderId: createPayload.traderId ?? null,
        itemCustomerId: createPayload.customerId ?? null,
      });

      validateItemOwnership(
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
        isPrivateSelection: createPayload.isPrivateSelection ?? false,
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
        customerCategory: { select: { name: true } },
      },
    });
  }

  // Updates an item and ensures totals are recalculated for the associated Box and Shipment.
  async update(id: number, data: Prisma.ShipmentItemUncheckedUpdateInput, actorId: number) {
    const updatePayload = {
      ...data,
      updatedById: actorId,
    };

    validateUpdateShipmentItemInput(updatePayload);

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

      validateItemOwnership(
        normalizedOwnership.ownershipType,
        normalizedOwnership.traderId,
        normalizedOwnership.customerId,
      );

      await this.deletePackedMovementsByItemId(tx, currentItem.id);

      const nextIsPrivateSelection = Object.prototype.hasOwnProperty.call(updatePayload, 'isPrivateSelection')
        ? Boolean(updatePayload.isPrivateSelection)
        : Boolean((currentItem as any).isPrivateSelection ?? false);

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
        isPrivateSelection: nextIsPrivateSelection,
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
    try {
      return await this.prisma.$transaction(async (tx) => {
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
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException('Cannot delete shipment item because related records exist in the system.');
      }

      throw error;
    }
  }
}