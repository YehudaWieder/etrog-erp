// src/shipments/services/item/item.service.ts

import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { BoxOwnership, Grade, ItemOwnership, MovementType, PitamStatus, SourceType } from '@prisma/client';
import { SeasonsService } from 'src/seasons/seasons.service';
import { ShipmentsService } from '../../shipments.service';
import { InventoryAvailabilityService } from 'src/inventory/services/inventory-availability.service';
import {
  validateCreateShipmentItemInput,
  validateItemOwnership,
  validateUpdateShipmentItemInput,
} from './utils/item.utils';
import { distributeQuantityByTraderSharesCapped } from 'src/inventory/services/validation/trader-share-distribution';
import { AuditLogService } from 'src/audit/audit.service';

@Injectable()
export class ItemService {
  constructor(
    private prisma: PrismaService,
    private seasonsService: SeasonsService,
    private shipmentsService: ShipmentsService,
    private inventoryAvailabilityService: InventoryAvailabilityService,
    private auditLog: AuditLogService,
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
        throw new BadRequestException('SHARED box supports only TRADER, CUSTOMER, or GENERAL item ownership');
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

    if (boxOwnership === BoxOwnership.GENERAL) {
      const effectiveOwnership = itemOwnership ?? ItemOwnership.GENERAL;
      if (effectiveOwnership !== ItemOwnership.GENERAL) {
        throw new BadRequestException('GENERAL box accepts only GENERAL items');
      }

      return {
        ownershipType: ItemOwnership.GENERAL,
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

    return distributeQuantityByTraderSharesCapped({
      quantity: params.quantity,
      shares: positiveShares,
      availability,
    });
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

    if (params.itemOwnership === ItemOwnership.GENERAL) {
      if (!params.traderCategoryId || !params.grade) {
        throw new BadRequestException('Unassigned packed items require traderCategoryId and grade');
      }

      if (params.boxOwnership === BoxOwnership.SHARED || params.boxOwnership === BoxOwnership.GENERAL) {
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
            contextLabel: 'Packing GENERAL item (trader portion)',
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
            contextLabel: 'Packing GENERAL item (modulo fallback)',
          });
        }

        return;
      }
    }

    throw new BadRequestException('Item ownership is not supported for packing into this box');
  }

  private async deletePackedMovementsByItemId(tx: Prisma.TransactionClient, itemId: number) {
    const noteMarker = `shipment item #${itemId}`;
    await Promise.all([
      tx.traderStock.deleteMany({
        where: {
          type: { in: [MovementType.PACKED_SHIPPED, MovementType.ASSIGNED] },
          OR: [
            { MovementReferenceId: itemId },
            { MovementReferenceId: null, notes: { contains: noteMarker } },
          ],
        },
      }),
      tx.customerAllocation.deleteMany({
        where: {
          type: MovementType.PACKED_SHIPPED,
          OR: [
            { MovementReferenceId: itemId },
            { MovementReferenceId: null, notes: { contains: noteMarker } },
          ],
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
      isPrivateSelection?: boolean;
    },
  ): Promise<Array<{ traderId: number | null; traderName: string | null; quantity: number }> | null> {
    if (params.boxOwnership === BoxOwnership.CUSTOM || params.itemOwnership === ItemOwnership.CUSTOM) {
      return null;
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
          isFromPrivateSelection: params.isPrivateSelection === true,
          type: MovementType.PACKED_SHIPPED,
          MovementReferenceId: params.itemId,
          shipmentId: params.shipmentId,
          boxId: params.boxId,
          notes: `Packed from shipment item #${params.itemId} [packing-movement]`,
          updatedById: params.updatedById,
        },
      });
      return null;
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
      return null;
    }

    if (params.itemOwnership === ItemOwnership.GENERAL) {
      if (!params.traderCategoryId || !params.grade) {
        throw new BadRequestException('Unassigned packed movement requires traderCategoryId and grade');
      }

      if (params.boxOwnership === BoxOwnership.SHARED || params.boxOwnership === BoxOwnership.GENERAL) {
        const { traderDeductions, moduloDeduction } = await this.buildUnassignedTraderDeductions(tx, {
          seasonId: params.seasonId,
          traderCategoryId: params.traderCategoryId,
          grade: params.grade,
          pitamStatus: params.pitamStatus,
          quantity: params.quantity,
        });

        const traderIds = traderDeductions.map((d) => d.traderId);
        const traderRows = traderIds.length > 0
          ? await tx.trader.findMany({ where: { id: { in: traderIds } }, select: { id: true, name: true } })
          : [];
        const traderNameMap = new Map(traderRows.map((t) => [t.id, t.name]));

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

        const breakdown: Array<{ traderId: number | null; traderName: string | null; quantity: number }> = [
          ...traderDeductions.map((d) => ({
            traderId: d.traderId,
            traderName: traderNameMap.get(d.traderId) ?? null,
            quantity: d.quantity,
          })),
          ...(moduloDeduction > 0 ? [{ traderId: null, traderName: null, quantity: moduloDeduction }] : []),
        ];

        return breakdown;
      }
    }

    throw new BadRequestException('Unsupported item ownership for packed movement creation');
  }

  // Shared activation logic used by both create and restore.
  // Validates the box state, enforces capacity, checks for duplicate active items (excluding the item itself),
  // verifies available stock, then creates the packed inventory movement.
  // Returns generalSourceBreakdown (or null) to be persisted on the item record by the caller.
  private async applyItemToBox(
    tx: Prisma.TransactionClient,
    item: {
      id: number;
      seasonId: number;
      boxId: number;
      shipmentId: number;
      ownershipType: ItemOwnership;
      traderId: number | null;
      customerId: number | null;
      traderCategoryId: number | null;
      customerCategoryId: number | null;
      grade: string | null;
      pitamStatus: string;
      quantity: number | Prisma.Decimal;
      isPrivateSelection: boolean;
      updatedById: number | null;
    },
    box: {
      ownershipType: BoxOwnership;
      status: string;
      boxType: string;
      totalQuantity: number | null;
    },
  ) {
    if (box.status !== 'OPEN') {
      throw new BadRequestException('Cannot add items to a box that is not OPEN');
    }

    if (box.ownershipType === 'EXTERNAL_TRADER') {
      throw new BadRequestException('Cannot add items to an external-trader box');
    }

    if (box.boxType !== 'CUSTOM') {
      const systemConfig = await tx.systemConfig.findFirst({ where: { seasonId: item.seasonId } });
      const capacityMap: Record<string, number | null | undefined> = {
        SMALL: systemConfig?.smallBoxCapacity,
        MEDIUM: systemConfig?.mediumBoxCapacity,
        LARGE: systemConfig?.largeBoxCapacity,
      };
      const capacity = capacityMap[box.boxType];
      if (capacity != null) {
        const currentTotal = box.totalQuantity ?? 0;
        if (currentTotal + Number(item.quantity) > capacity) {
          throw new BadRequestException(
            `Box capacity exceeded: box can hold ${capacity} items, currently has ${currentTotal}, adding ${item.quantity} would exceed the limit`,
          );
        }
      }
    }

    const duplicate = await tx.shipmentItem.findFirst({
      where: {
        id: { not: item.id },
        seasonId: item.seasonId,
        boxId: item.boxId,
        traderCategoryId: item.traderCategoryId,
        customerCategoryId: item.customerCategoryId,
        grade: item.grade as Grade | null,
        pitamStatus: item.pitamStatus as PitamStatus,
        ownershipType: item.ownershipType,
        traderId: item.traderId,
        customerId: item.customerId,
        isPrivateSelection: item.isPrivateSelection,
        isDeleted: false,
      },
    });
    if (duplicate) throw new ConflictException('A matching shipment item already exists in this box');

    await this.ensureEnoughAvailableStock(tx, {
      seasonId: item.seasonId,
      boxOwnership: box.ownershipType,
      itemOwnership: item.ownershipType,
      itemTraderId: item.traderId,
      itemCustomerId: item.customerId,
      traderCategoryId: item.traderCategoryId,
      customerCategoryId: item.customerCategoryId,
      grade: item.grade as Grade | null,
      pitamStatus: item.pitamStatus as PitamStatus,
      quantity: Number(item.quantity),
      isPrivateSelection: item.isPrivateSelection,
    });

    return this.createPackedMovement(tx, {
      itemId: item.id,
      seasonId: item.seasonId,
      boxOwnership: box.ownershipType,
      shipmentId: item.shipmentId,
      boxId: item.boxId,
      quantity: Number(item.quantity),
      pitamStatus: item.pitamStatus as PitamStatus,
      traderId: item.traderId,
      customerId: item.customerId,
      traderCategoryId: item.traderCategoryId,
      customerCategoryId: item.customerCategoryId,
      grade: item.grade as Grade | null,
      itemOwnership: item.ownershipType,
      updatedById: item.updatedById ?? 0,
      isPrivateSelection: item.isPrivateSelection,
    });
  }

  // Creates a shipment item and triggers totals recalculation for Box and Shipment.
  // Uses a transaction to ensure all updates succeed or fail together.
  async create(data: Prisma.ShipmentItemUncheckedCreateInput, actorId: number) {
    const { id: seasonId } = await this.seasonsService.findActiveSeason();

    return this.prisma.$transaction((tx) => this.createInTx(tx, data, actorId, seasonId), { timeout: 300_000 });
  }

  // Tx-scoped body of create(), reusable by callers that already hold an open transaction
  // (e.g. BoxPackingWorkflowService, which updates a box and creates its items atomically).
  async createInTx(
    tx: Prisma.TransactionClient,
    data: Prisma.ShipmentItemUncheckedCreateInput,
    actorId: number,
    seasonId: number,
  ) {
    const createPayload = {
      ...data,
      updatedById: actorId,
    };

    validateCreateShipmentItemInput(createPayload);

    const box = await tx.box.findFirst({
      where: { id: createPayload.boxId, seasonId, isDeleted: false },
      select: { id: true, shipmentId: true, ownershipType: true, traderId: true, customerId: true, status: true, boxType: true, totalQuantity: true },
    });

    if (!box) throw new NotFoundException(`Box ${createPayload.boxId} not found in active season`);

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

    // A soft-deleted item with the same natural key would otherwise sit in the trash
    // indefinitely as "restorable" even though new data now supersedes it. Purge it.
    await tx.shipmentItem.deleteMany({
      where: {
        seasonId,
        boxId: createPayload.boxId,
        traderCategoryId: createPayload.traderCategoryId ?? null,
        customerCategoryId: createPayload.customerCategoryId ?? null,
        grade: (createPayload.grade as Grade | null | undefined) ?? null,
        pitamStatus: createPayload.pitamStatus as PitamStatus,
        ownershipType: normalizedOwnership.ownershipType,
        traderId: normalizedOwnership.traderId,
        customerId: normalizedOwnership.customerId,
        isPrivateSelection: Boolean(createPayload.isPrivateSelection),
        isDeleted: true,
      },
    });

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

    const generalSourceBreakdown = await this.applyItemToBox(tx, {
      ...newItem,
      isPrivateSelection: Boolean(newItem.isPrivateSelection),
      quantity: newItem.quantity,
    }, box);

    let finalItem = newItem;
    if (generalSourceBreakdown !== null) {
      finalItem = await tx.shipmentItem.update({ where: { id: newItem.id }, data: { generalSourceBreakdown } });
    }

    await this.shipmentsService.syncBoxAndShipmentTotals(tx, box.id, box.shipmentId);

    await this.auditLog.record({
      userId: actorId,
      action: 'CREATE',
      entityType: 'ShipmentItem',
      entityId: finalItem.id,
      after: finalItem,
    });

    return finalItem;
  }

  // Returns all soft-deleted shipment items with related entity details.
  async findDeleted() {
    return this.prisma.shipmentItem.findMany({
      where: { isDeleted: true },
      include: {
        trader: { select: { name: true } },
        customer: { select: { customerName: true } },
        traderCategory: { select: { name: true } },
        customerCategory: { select: { name: true, grade: true } },
        updatedBy: { select: { name: true } },
        box: { select: { boxNumber: true, boxType: true, ownershipType: true } },
        shipment: { select: { shipmentNumber: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  // Permanently deletes a soft-deleted item record. No inventory effects (already reversed at soft-delete time).
  async hardDelete(id: number, actorId: number) {
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.shipmentItem.findFirst({ where: { id, isDeleted: true } });
      if (!item) throw new NotFoundException(`Soft-deleted shipment item #${id} not found`);
      const deleted = await tx.shipmentItem.delete({ where: { id } });

      await this.auditLog.record({
        userId: actorId,
        action: 'DELETE',
        entityType: 'ShipmentItem',
        entityId: id,
        before: item,
      });

      return deleted;
    });
  }

  // Restores a soft-deleted item: re-runs the packed-movement creation and syncs box/shipment totals.
  async restore(id: number, actorId: number) {
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.shipmentItem.findFirst({
        where: { id, isDeleted: true },
        select: {
          id: true, seasonId: true, boxId: true, shipmentId: true,
          ownershipType: true, traderId: true, customerId: true,
          traderCategoryId: true, customerCategoryId: true,
          grade: true, pitamStatus: true, quantity: true,
          isPrivateSelection: true,
        },
      });

      if (!item) throw new NotFoundException(`Soft-deleted shipment item #${id} not found`);

      const box = await tx.box.findFirst({
        where: { id: item.boxId, isDeleted: false },
        select: { ownershipType: true, status: true, boxType: true, totalQuantity: true, shipmentId: true },
      });

      if (!box) throw new BadRequestException(`Box #${item.boxId} no longer exists or was deleted`);

      const generalSourceBreakdown = await this.applyItemToBox(tx, {
        ...item,
        isPrivateSelection: Boolean(item.isPrivateSelection),
        updatedById: actorId,
      }, box);

      const restored = await tx.shipmentItem.update({
        where: { id },
        data: {
          isDeleted: false,
          updatedById: actorId,
          ...(generalSourceBreakdown !== null ? { generalSourceBreakdown } : {}),
        },
      });

      await this.shipmentsService.syncBoxAndShipmentTotals(tx, item.boxId, item.shipmentId);

      await this.auditLog.record({
        userId: actorId,
        action: 'UPDATE',
        entityType: 'ShipmentItem',
        entityId: id,
        before: item,
        after: restored,
      });

      return restored;
    }, { timeout: 300_000 });
  }

  // Retrieves all items for a given box, excluding soft-deleted items, and includes related trader and customer info.
  async findByBox(boxId: number) {
    return this.prisma.shipmentItem.findMany({
      where: { boxId, isDeleted: false },
      include: {
        trader: { select: { name: true } },
        customer: { select: { customerName: true } },
        traderCategory: { select: { name: true } },
        customerCategory: { select: { name: true, grade: true } },
        updatedBy: { select: { name: true } },
      },
    });
  }

  // Updates an item and ensures totals are recalculated for the associated Box and Shipment.
  async update(id: number, data: Prisma.ShipmentItemUncheckedUpdateInput, actorId: number) {
    return this.prisma.$transaction((tx) => this.updateInTx(tx, id, data, actorId), {
      // Reverses and recreates inventory movements, checks stock/capacity, and re-syncs box/shipment
      // totals — several sequential queries that can run well past Prisma's default 5s transaction
      // timeout when the DB is under load. Give it a lot of headroom rather than fail outright.
      timeout: 300_000,
    });
  }

  // Tx-scoped body of update(), reusable by callers that already hold an open transaction
  // (e.g. BoxPackingWorkflowService, which packs a box's edits and new items atomically).
  async updateInTx(
    tx: Prisma.TransactionClient,
    id: number,
    data: Prisma.ShipmentItemUncheckedUpdateInput,
    actorId: number,
  ) {
    const updatePayload = {
      ...data,
      updatedById: actorId,
    };

    validateUpdateShipmentItemInput(updatePayload);

    {
      const currentItem = await tx.shipmentItem.findFirst({
        where: { id, isDeleted: false },
      });

      if (!currentItem) {
        throw new NotFoundException(`Shipment item #${id} not found`);
      }

      const currentBox = await tx.box.findUnique({
        where: { id: currentItem.boxId },
        select: { status: true },
      });

      if (currentBox && (currentBox.status === 'SHIPPED' || currentBox.status === 'DELIVERED')) {
        throw new BadRequestException('לא ניתן לערוך פריט שנמצא בקרטון שנשלח או נמסר');
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
        select: { id: true, shipmentId: true, ownershipType: true, traderId: true, customerId: true, boxType: true, totalQuantity: true },
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

      // Enforce box capacity on quantity change (skip for CUSTOM box type)
      if (targetBox.boxType !== 'CUSTOM') {
        const systemConfig = await tx.systemConfig.findFirst({ where: { seasonId: currentItem.seasonId } });
        const capacityMap: Record<string, number | null | undefined> = {
          SMALL: systemConfig?.smallBoxCapacity,
          MEDIUM: systemConfig?.mediumBoxCapacity,
          LARGE: systemConfig?.largeBoxCapacity,
        };
        const capacity = capacityMap[targetBox.boxType];
        if (capacity != null) {
          const newTotal = targetBox.totalQuantity - currentItem.quantity + nextQuantity;
          if (newTotal > capacity) {
            throw new BadRequestException(
              `Box capacity exceeded: box can hold ${capacity} items, current total is ${targetBox.totalQuantity}, changing quantity from ${currentItem.quantity} to ${nextQuantity} would bring total to ${newTotal}`,
            );
          }
        }
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
        : currentItem.isPrivateSelection;

      if (currentItem.ownershipType !== ItemOwnership.CUSTOM) {
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
      }

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

      const generalSourceBreakdown = await this.createPackedMovement(tx, {
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
        isPrivateSelection: nextIsPrivateSelection,
      });

      let finalItem = updatedItem;
      if (generalSourceBreakdown !== null) {
        finalItem = await tx.shipmentItem.update({ where: { id: updatedItem.id }, data: { generalSourceBreakdown } });
      }

      // Re-sync totals for the associated box and shipment
      await this.shipmentsService.syncBoxAndShipmentTotals(tx, currentItem.boxId, currentItem.shipmentId);

      if (currentItem.boxId !== updatedItem.boxId || currentItem.shipmentId !== updatedItem.shipmentId) {
        await this.shipmentsService.syncBoxAndShipmentTotals(tx, updatedItem.boxId, updatedItem.shipmentId);
      }

      await this.auditLog.record({
        userId: actorId,
        action: 'UPDATE',
        entityType: 'ShipmentItem',
        entityId: id,
        before: currentItem,
        after: finalItem,
      });

      return finalItem;
    }
  }

  // Returns the maximum quantity constraints for editing a shipment item.
  async getItemEditLimits(itemId: number) {
    const item = await this.prisma.shipmentItem.findFirst({
      where: { id: itemId, isDeleted: false },
      select: {
        id: true,
        seasonId: true,
        boxId: true,
        quantity: true,
        ownershipType: true,
        traderId: true,
        customerId: true,
        traderCategoryId: true,
        customerCategoryId: true,
        grade: true,
        pitamStatus: true,
        isPrivateSelection: true,
      },
    });

    if (!item) {
      throw new NotFoundException(`Shipment item #${itemId} not found`);
    }

    const box = await this.prisma.box.findFirst({
      where: { id: item.boxId, isDeleted: false },
      select: { boxType: true, totalQuantity: true },
    });

    if (!box) {
      throw new NotFoundException(`Box not found for item #${itemId}`);
    }

    // Actual free space in the box right now (null = unlimited / CUSTOM box)
    let boxSpaceFree: number | null = null;
    let boxMaxQuantity: number | null = null;
    if (box.boxType !== 'CUSTOM') {
      const systemConfig = await this.prisma.systemConfig.findFirst({ where: { seasonId: item.seasonId } });
      const capacityMap: Record<string, number | null | undefined> = {
        SMALL: systemConfig?.smallBoxCapacity,
        MEDIUM: systemConfig?.mediumBoxCapacity,
        LARGE: systemConfig?.largeBoxCapacity,
      };
      const capacity = capacityMap[box.boxType];
      if (capacity != null) {
        boxSpaceFree = capacity - box.totalQuantity;
        // When editing, the current item's quantity is freed first, so max = currentQuantity + freeSpace
        boxMaxQuantity = item.quantity + boxSpaceFree;
      }
    }

    // How much inventory will actually be freed when this item's packed movements are deleted.
    // Cannot assume item.quantity — the packed movement may not exist (CUSTOM path, old data, etc.).
    const noteMarker = `shipment item #${item.id}`;
    const [traderFreedAgg, customerFreedAgg] = await Promise.all([
      this.prisma.traderStock.aggregate({
        where: {
          type: { in: [MovementType.PACKED_SHIPPED, MovementType.ASSIGNED] },
          OR: [
            { MovementReferenceId: item.id },
            { MovementReferenceId: null, notes: { contains: noteMarker } },
          ],
        },
        _sum: { quantity: true },
      }),
      this.prisma.customerAllocation.aggregate({
        where: {
          type: MovementType.PACKED_SHIPPED,
          OR: [
            { MovementReferenceId: item.id },
            { MovementReferenceId: null, notes: { contains: noteMarker } },
          ],
        },
        _sum: { quantity: true },
      }),
    ]);
    // Packed movements are stored as negative quantities; negate to get the freed amount.
    const freedQuantity = Math.abs((traderFreedAgg._sum.quantity ?? 0) + (customerFreedAgg._sum.quantity ?? 0));

    // Inventory availability: net balance (inventory minus already packed) — for display
    // maxInventory: balance + freedQuantity — the actual amount available after freeing this item
    let inventoryAvailable: number | null = null;
    let maxInventory: number | null = null;
    if (item.ownershipType === ItemOwnership.TRADER && item.traderId && item.traderCategoryId && item.grade && item.pitamStatus) {
      const balance = await this.inventoryAvailabilityService.getTraderUnshippedBalance(this.prisma, {
        seasonId: item.seasonId,
        traderId: item.traderId,
        traderCategoryId: item.traderCategoryId,
        grade: item.grade as Grade,
        pitamStatus: item.pitamStatus as PitamStatus,
        isModulo: false,
        onlyPrivateSelection: item.isPrivateSelection === true,
        excludePrivateSelection: item.isPrivateSelection === false,
      });
      inventoryAvailable = balance;
      maxInventory = balance + freedQuantity;
    } else if (item.ownershipType === ItemOwnership.CUSTOMER && item.customerId && item.customerCategoryId && item.pitamStatus) {
      const balance = await this.inventoryAvailabilityService.getCustomerUnshippedBalance(this.prisma, {
        seasonId: item.seasonId,
        customerId: item.customerId,
        customerCategoryId: item.customerCategoryId,
        pitamStatus: item.pitamStatus as PitamStatus,
      });
      inventoryAvailable = balance;
      maxInventory = balance + freedQuantity;
    } else if (item.ownershipType === ItemOwnership.GENERAL && item.traderCategoryId && item.grade && item.pitamStatus) {
      const [traderAvailabilities, moduloBalance] = await Promise.all([
        this.inventoryAvailabilityService.getTraderUnshippedAvailabilityByCategory(this.prisma, {
          seasonId: item.seasonId,
          traderCategoryId: item.traderCategoryId,
          grade: item.grade as Grade,
          pitamStatus: item.pitamStatus as PitamStatus,
          excludePrivateSelection: true,
        }),
        this.inventoryAvailabilityService.getTraderUnshippedBalance(this.prisma, {
          seasonId: item.seasonId,
          traderId: null,
          traderCategoryId: item.traderCategoryId,
          grade: item.grade as Grade,
          pitamStatus: item.pitamStatus as PitamStatus,
          isModulo: true,
        }),
      ]);
      const balance = traderAvailabilities.reduce((sum, t) => sum + t.available, 0) + moduloBalance;
      inventoryAvailable = balance;
      maxInventory = balance + freedQuantity;
    }

    const limits = [boxMaxQuantity, maxInventory].filter((v): v is number => v !== null);
    const maxQuantity = limits.length > 0 ? Math.max(1, Math.min(...limits)) : null;

    return {
      currentQuantity: item.quantity,
      maxQuantity,
      boxSpaceFree,
      inventoryAvailable,
    };
  }

  // Soft-deletes an item (sets isDeleted=true) and hard-deletes its inventory movements, then syncs totals.
  async remove(id: number, actorId: number) {
    return await this.prisma.$transaction((tx) => this.removeInTx(tx, id, actorId), { timeout: 300_000 });
  }

  // Tx-scoped body of remove(), reusable by callers that already hold an open transaction
  // (e.g. BoxPackingWorkflowService, when a packing edit brings an item's quantity down to 0).
  async removeInTx(tx: Prisma.TransactionClient, id: number, actorId: number) {
    const existing = await tx.shipmentItem.findFirst({
      where: { id, isDeleted: false },
    });

    if (!existing) {
      throw new NotFoundException(`Shipment item #${id} not found`);
    }

    const box = await tx.box.findUnique({
      where: { id: existing.boxId },
      select: { status: true },
    });

    if (box && (box.status === 'SHIPPED' || box.status === 'DELIVERED')) {
      throw new BadRequestException('לא ניתן למחוק פריט שנמצא בקרטון שנשלח או נמסר');
    }

    await this.deletePackedMovementsByItemId(tx, id);

    const item = await tx.shipmentItem.update({
      where: { id },
      data: { isDeleted: true },
    });

    await this.shipmentsService.syncBoxAndShipmentTotals(tx, existing.boxId, existing.shipmentId);

    await this.auditLog.record({
      userId: actorId,
      action: 'DELETE',
      entityType: 'ShipmentItem',
      entityId: id,
      before: existing,
    });

    return item;
  }
}