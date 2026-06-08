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
    moduloPackedDeduction: number;
    traderToModuloAssignments: Array<{ traderId: number; quantity: number }>;
  }> {

    const shares = await tx.traderCategoryShare.findMany({
      where: {
        seasonId: params.seasonId,
        traderCategoryId: params.traderCategoryId,
      },
      select: { traderId: true, percent: true },
      orderBy: { traderId: 'asc' },
    });

    if (shares.length === 0) {
      throw new BadRequestException('No trader shares defined for this category in the current season');
    }

    const positiveShares = shares
      .map((share) => ({ traderId: share.traderId, percent: Number(share.percent), percentText: share.percent.toString() }))
      .filter((share) => share.percent > 0);

    if (positiveShares.length === 0) {
      throw new BadRequestException('All configured trader shares are zero or negative for this category');
    }
    const totalPercent = positiveShares.reduce((sum, share) => sum + share.percent, 0);
    const canUseExactShareGross = Math.abs(totalPercent - 100) <= 1e-9;

    // --- Allocation: integer-only by exact ratio blocks; remainder goes to modulo ---
    let baseAllocations: Array<{ traderId: number; percent: number; quantity: number }>;
    let remainder: number;

    if (canUseExactShareGross) {
      const grossForTraders = this.calculateLargestExactShareGross(
        params.quantity,
        positiveShares.map((share) => share.percentText),
      );

      baseAllocations = positiveShares.map((share) => ({
        traderId: share.traderId,
        percent: share.percent,
        quantity: this.calculateExactShareQuantity(grossForTraders, share.percentText),
      }));

      remainder = params.quantity - grossForTraders;
    } else {
      // Fallback for misconfigured shares that do not sum to 100.
      baseAllocations = positiveShares.map((share) => ({
        traderId: share.traderId,
        percent: share.percent,
        quantity: Math.floor((params.quantity * share.percent) / 100),
      }));

      const traderBaseTotal = baseAllocations.reduce((sum, a) => sum + a.quantity, 0);
      remainder = params.quantity - traderBaseTotal;
    }

    // 2. No distribution of remainder to traders, all goes to modulo
    const traderDeductions = baseAllocations.filter(a => a.quantity > 0).map(a => ({ traderId: a.traderId, quantity: a.quantity }));
    const moduloPackedDeduction = remainder; // All remainder goes to modulo

    const moduloAvailable = await this.inventoryAvailabilityService.getTraderUnshippedBalance(tx, {
      seasonId: params.seasonId,
      traderId: null,
      traderCategoryId: params.traderCategoryId,
      grade: params.grade,
      pitamStatus: params.pitamStatus,
      isModulo: true,
    });

    const deficitAfterModulo = Math.max(0, moduloPackedDeduction - moduloAvailable);
    if (deficitAfterModulo <= 0) {
      return {
        traderDeductions,
        moduloPackedDeduction,
        traderToModuloAssignments: [],
      };
    }

    const availabilityRows = await this.getTraderAvailabilityForDistribution(tx, {
      seasonId: params.seasonId,
      traderCategoryId: params.traderCategoryId,
      grade: params.grade,
      pitamStatus: params.pitamStatus,
    });

    const remainingAvailabilityByTrader = new Map<number, number>();
    for (const row of availabilityRows) {
      remainingAvailabilityByTrader.set(row.traderId, row.available);
    }

    for (const deduction of traderDeductions) {
      const current = remainingAvailabilityByTrader.get(deduction.traderId) ?? 0;
      remainingAvailabilityByTrader.set(deduction.traderId, Math.max(0, current - deduction.quantity));
    }

    if (canUseExactShareGross) {
      const grossFromTraders = this.calculateMinimalGrossByShares(
        deficitAfterModulo,
        positiveShares.map((share) => share.percentText),
      );

      const proportionalAssignments = positiveShares
        .map((share) => ({
          traderId: share.traderId,
          quantity: this.calculateExactShareQuantity(grossFromTraders, share.percentText),
        }))
        .filter((allocation) => allocation.quantity > 0);

      const hasEnoughForAll = proportionalAssignments.every((allocation) => {
        const available = remainingAvailabilityByTrader.get(allocation.traderId) ?? 0;
        return available >= allocation.quantity;
      });

      if (hasEnoughForAll) {
        return {
          traderDeductions,
          moduloPackedDeduction,
          traderToModuloAssignments: proportionalAssignments,
        };
      }
    }

    // Fund any modulo deficit from trader stocks, prioritizing higher percent first.
    const fundingOrder = [...positiveShares].sort((left, right) => {
      if (right.percent !== left.percent) {
        return right.percent - left.percent;
      }
      return left.traderId - right.traderId;
    });

    const roundRobinAssignments = new Map<number, number>();
    let remainingDeficit = deficitAfterModulo;

    while (remainingDeficit > 0) {
      let assignedInRound = false;

      for (const share of fundingOrder) {
        if (remainingDeficit <= 0) {
          break;
        }

        const alreadyAssigned = roundRobinAssignments.get(share.traderId) ?? 0;
        const available = remainingAvailabilityByTrader.get(share.traderId) ?? 0;
        if (available - alreadyAssigned <= 0) {
          continue;
        }

        roundRobinAssignments.set(share.traderId, alreadyAssigned + 1);
        remainingDeficit -= 1;
        assignedInRound = true;
      }

      if (!assignedInRound) {
        break;
      }
    }

    if (remainingDeficit > 0) {
      throw new BadRequestException(
        `Packing UNASSIGNED item: insufficient unshipped trader stock to cover modulo remainder. Required=${deficitAfterModulo}, available=${deficitAfterModulo - remainingDeficit}`,
      );
    }

    const traderToModuloAssignments = Array.from(roundRobinAssignments.entries())
      .map(([traderId, quantity]) => ({ traderId, quantity }))
      .filter((allocation) => allocation.quantity > 0)
      .sort((left, right) => left.traderId - right.traderId);

    return {
      traderDeductions,
      moduloPackedDeduction,
      traderToModuloAssignments,
    };
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
        const { traderDeductions, moduloPackedDeduction, traderToModuloAssignments } = await this.buildUnassignedTraderDeductions(tx, {
          seasonId: params.seasonId,
          traderCategoryId: params.traderCategoryId,
          grade: params.grade,
          pitamStatus: params.pitamStatus,
          quantity: params.quantity,
        });

        const assignmentByTrader = new Map<number, number>();
        for (const assignment of traderToModuloAssignments) {
          assignmentByTrader.set(assignment.traderId, (assignmentByTrader.get(assignment.traderId) ?? 0) + assignment.quantity);
        }

        // Check each trader has enough stock for base packed deduction and any trader->modulo assignment.
        for (const deduction of traderDeductions) {
          const assignment = assignmentByTrader.get(deduction.traderId) ?? 0;
          await this.inventoryAvailabilityService.assertTraderHasUnshippedStock(tx, {
            seasonId: params.seasonId,
            traderId: deduction.traderId,
            traderCategoryId: params.traderCategoryId,
            grade: params.grade,
            pitamStatus: params.pitamStatus,
            isModulo: false,
            requiredQuantity: deduction.quantity + assignment,
            contextLabel: `Packing UNASSIGNED item (trader share portion)`,
          });
        }

        for (const assignment of traderToModuloAssignments) {
          if (traderDeductions.some((deduction) => deduction.traderId === assignment.traderId)) {
            continue;
          }

          await this.inventoryAvailabilityService.assertTraderHasUnshippedStock(tx, {
            seasonId: params.seasonId,
            traderId: assignment.traderId,
            traderCategoryId: params.traderCategoryId,
            grade: params.grade,
            pitamStatus: params.pitamStatus,
            isModulo: false,
            requiredQuantity: assignment.quantity,
            contextLabel: `Packing UNASSIGNED item (trader round-robin funding)`,
          });
        }

        if (moduloPackedDeduction > 0) {
          const moduloCredit = traderToModuloAssignments.reduce((sum, assignment) => sum + assignment.quantity, 0);
          await this.inventoryAvailabilityService.assertTraderHasUnshippedStock(tx, {
            seasonId: params.seasonId,
            traderId: null,
            traderCategoryId: params.traderCategoryId,
            grade: params.grade,
            pitamStatus: params.pitamStatus,
            isModulo: true,
            requiredQuantity: moduloPackedDeduction,
            creditQuantity: moduloCredit,
            contextLabel: 'Packing UNASSIGNED item (modulo remainder)',
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
            notes: `Packed from modulo for shipment item #${params.itemId} [packing-movement]`,
            updatedById: params.updatedById,
          },
        });
        return;
      }

      if (params.boxOwnership === BoxOwnership.UNASSIGNED) {
        const { traderDeductions, moduloPackedDeduction, traderToModuloAssignments } = await this.buildUnassignedTraderDeductions(tx, {
          seasonId: params.seasonId,
          traderCategoryId: params.traderCategoryId,
          grade: params.grade,
          pitamStatus: params.pitamStatus,
          quantity: params.quantity,
        });

        // Deduct from each trader's individual stock (their share portion)
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

        // If modulo doesn't have enough for remainder, fund it from traders first.
        for (const assignment of traderToModuloAssignments) {
          await tx.traderStock.create({
            data: {
              seasonId: params.seasonId,
              date: new Date(),
              traderId: assignment.traderId,
              traderCategoryId: params.traderCategoryId,
              grade: params.grade,
              pitamStatus: params.pitamStatus,
              quantity: -Math.abs(assignment.quantity),
              isModulo: false,
              type: MovementType.ASSIGNED,
              MovementReferenceId: params.itemId,
              shipmentId: params.shipmentId,
              boxId: params.boxId,
              notes: `Assigned to modulo for shipment item #${params.itemId} [packing-movement]`,
              updatedById: params.updatedById,
            },
          });
        }

        const totalModuloFunding = traderToModuloAssignments.reduce((sum, assignment) => sum + assignment.quantity, 0);
        if (totalModuloFunding > 0) {
          await tx.traderStock.create({
            data: {
              seasonId: params.seasonId,
              date: new Date(),
              traderId: null,
              traderCategoryId: params.traderCategoryId,
              grade: params.grade,
              pitamStatus: params.pitamStatus,
              quantity: totalModuloFunding,
              isModulo: true,
              type: MovementType.ASSIGNED,
              MovementReferenceId: params.itemId,
              shipmentId: params.shipmentId,
              boxId: params.boxId,
              notes: `Funded modulo for shipment item #${params.itemId} [packing-movement]`,
              updatedById: params.updatedById,
            },
          });
        }

        if (moduloPackedDeduction > 0) {
          await tx.traderStock.create({
            data: {
              seasonId: params.seasonId,
              date: new Date(),
              traderId: null,
              traderCategoryId: params.traderCategoryId,
              grade: params.grade,
              pitamStatus: params.pitamStatus,
              quantity: -Math.abs(moduloPackedDeduction),
              isModulo: true,
              type: MovementType.PACKED_SHIPPED,
              MovementReferenceId: params.itemId,
              shipmentId: params.shipmentId,
              boxId: params.boxId,
              notes: `Packed from modulo remainder for shipment item #${params.itemId} [packing-movement]`,
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