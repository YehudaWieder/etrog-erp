import { BadRequestException, Injectable } from '@nestjs/common';
import { Grade, MovementType, PitamStatus, Prisma } from '@prisma/client';
import {
  calculateExactShareQuantity,
  calculateMaximalDistributableByShares,
  calculateMinimalGrossByShares,
} from '../validation/share-math';
import { InventoryAvailabilityService } from '../inventory-availability.service';

@Injectable()
export class GeneralShareAllocationService {
  constructor(private readonly inventoryAvailabilityService: InventoryAvailabilityService) {}

  private async getTraderCategoryShares(
    tx: Prisma.TransactionClient,
    seasonId: number,
    traderCategoryId: number,
  ) {
    return tx.traderCategoryShare.findMany({
      where: {
        seasonId,
        traderCategoryId,
      },
      orderBy: { traderId: 'asc' },
    });
  }

  // Splits `quantity` into whole "fair packages" only (e.g. for 40/40/20 shares, every full
  // group of 5 splits exactly into 2/2/1). Whatever doesn't complete a full package stays
  // undistributed so the caller can route it to modulo instead of rounding it away unevenly.
  private calculateShareAllocations(
    quantity: number,
    shares: Array<{ traderId: number; percent: Prisma.Decimal | number | string }>,
  ) {
    const percentTexts = shares.map((share) => new Prisma.Decimal(share.percent).toString());
    const distributable = calculateMaximalDistributableByShares(quantity, percentTexts);

    return shares.map((share, index) => ({
      share,
      quantity: distributable === 0 ? 0 : calculateExactShareQuantity(distributable, percentTexts[index]),
    }));
  }

  async tryAssignFromModuloPool(
    tx: Prisma.TransactionClient,
    params: {
      seasonId: number;
      date: Date;
      traderCategoryId: number;
      grade: Grade;
      pitamStatus: PitamStatus;
      updatedById: number;
      notes?: string;
      movementReferenceId?: number;
    },
  ) {
    const moduloBalance = await tx.traderStock.aggregate({
      _sum: { quantity: true },
      where: {
        seasonId: params.seasonId,
        traderId: null,
        isModulo: true,
        traderCategoryId: params.traderCategoryId,
        grade: params.grade,
        pitamStatus: params.pitamStatus,
        isDeleted: false,
      },
    });

    const availableQty = moduloBalance._sum.quantity ?? 0;
    if (availableQty <= 0) {
      return;
    }

    const shares = await this.getTraderCategoryShares(tx, params.seasonId, params.traderCategoryId);
    if (shares.length === 0) {
      return;
    }

    const allocations = this.calculateShareAllocations(availableQty, shares).map((allocation) => ({
      traderId: allocation.share.traderId,
      quantity: allocation.quantity,
    }));

    const canAssignToAll = allocations.every((allocation) => allocation.quantity > 0);
    if (!canAssignToAll) {
      return;
    }

    const totalAssigned = allocations.reduce((sum, allocation) => sum + allocation.quantity, 0);
    const moduloRemainder = availableQty - totalAssigned;

    if (totalAssigned <= 0) {
      return;
    }

    if (moduloRemainder < 0) {
      throw new BadRequestException(
        `Invalid trader shares configuration for category ${params.traderCategoryId}: total assigned (${totalAssigned}) exceeds available modulo (${availableQty})`,
      );
    }

    for (const allocation of allocations) {
      await tx.traderStock.create({
        data: {
          seasonId: params.seasonId,
          date: params.date,
          traderId: allocation.traderId,
          traderCategoryId: params.traderCategoryId,
          grade: params.grade,
          pitamStatus: params.pitamStatus,
          quantity: allocation.quantity,
          isModulo: false,
          type: MovementType.ASSIGNED,
          MovementReferenceId: params.movementReferenceId,
          updatedById: params.updatedById,
          notes: params.notes,
        },
      });
    }

    await tx.traderStock.create({
      data: {
        seasonId: params.seasonId,
        date: params.date,
        traderId: null,
        traderCategoryId: params.traderCategoryId,
        grade: params.grade,
        pitamStatus: params.pitamStatus,
        quantity: -totalAssigned,
        isModulo: true,
        type: MovementType.ASSIGNED,
        MovementReferenceId: params.movementReferenceId,
        updatedById: params.updatedById,
        notes: params.notes,
      },
    });
  }

  // Splits `quantity` across every trader in `traderCategoryId` by their configured
  // TraderCategoryShare percent (floor per share), dumping any remainder into the modulo
  // (unassigned) pool - or, when the shares can't all get a positive amount, the entire quantity
  // goes to modulo instead. Immediately attempts to sweep the modulo pool afterward in case the
  // new remainder now completes a full round for every trader. All created rows are HARVEST_IN.
  async allocateGeneralQuantity(
    tx: Prisma.TransactionClient,
    params: {
      seasonId: number;
      date: Date;
      traderCategoryId: number;
      grade: Grade;
      pitamStatus: PitamStatus;
      quantity: number;
      type?: MovementType;
      movementReferenceId?: number;
      updatedById: number;
      notes?: string;
    },
  ) {
    const type = params.type ?? MovementType.HARVEST_IN;
    const shares = await this.getTraderCategoryShares(tx, params.seasonId, params.traderCategoryId);
    if (shares.length === 0) {
      throw new BadRequestException(
        `No trader shares found for category ${params.traderCategoryId} in season ${params.seasonId}`,
      );
    }

    const allocations = this.calculateShareAllocations(params.quantity, shares);
    const canDistributeToAll = allocations.every((allocation) => allocation.quantity > 0);
    let didAddModulo = false;

    if (!canDistributeToAll) {
      await tx.traderStock.create({
        data: {
          seasonId: params.seasonId,
          date: params.date,
          traderId: null,
          traderCategoryId: params.traderCategoryId,
          grade: params.grade,
          pitamStatus: params.pitamStatus,
          quantity: params.quantity,
          isModulo: true,
          type,
          MovementReferenceId: params.movementReferenceId,
          updatedById: params.updatedById,
          notes: params.notes,
        },
      });
      didAddModulo = true;
    } else {
      let totalAllocated = 0;

      for (const allocation of allocations) {
        await tx.traderStock.create({
          data: {
            seasonId: params.seasonId,
            date: params.date,
            traderId: allocation.share.traderId,
            traderCategoryId: params.traderCategoryId,
            grade: params.grade,
            pitamStatus: params.pitamStatus,
            quantity: allocation.quantity,
            isModulo: false,
            type,
            MovementReferenceId: params.movementReferenceId,
            updatedById: params.updatedById,
            notes: params.notes,
          },
        });

        totalAllocated += allocation.quantity;
      }

      const remainder = params.quantity - totalAllocated;
      if (remainder > 0) {
        await tx.traderStock.create({
          data: {
            seasonId: params.seasonId,
            date: params.date,
            traderId: null,
            traderCategoryId: params.traderCategoryId,
            grade: params.grade,
            pitamStatus: params.pitamStatus,
            quantity: remainder,
            isModulo: true,
            type,
            MovementReferenceId: params.movementReferenceId,
            updatedById: params.updatedById,
            notes: params.notes,
          },
        });
        didAddModulo = true;
      }
    }

    if (didAddModulo) {
      await this.tryAssignFromModuloPool(tx, {
        seasonId: params.seasonId,
        date: params.date,
        traderCategoryId: params.traderCategoryId,
        grade: params.grade,
        pitamStatus: params.pitamStatus,
        updatedById: params.updatedById,
        notes: params.notes,
        movementReferenceId: params.movementReferenceId,
      });
    }
  }

  // Mirror image of allocateGeneralQuantity: drains MODULO first, then splits any deficit
  // across traders by their TraderCategoryShare percent (exact BigInt math, rounded up to the
  // minimal gross that splits evenly), excluding each trader's private-selection stock. A
  // rounding overage from the fair-share step is returned to MODULO as a positive ASSIGNED row.
  // Returns every row created so the caller can link them into its own batch.
  async deductGeneralQuantity(
    tx: Prisma.TransactionClient,
    params: {
      seasonId: number;
      date: Date;
      traderCategoryId: number;
      grade: Grade;
      pitamStatus: PitamStatus;
      quantity: number;
      type: MovementType;
      contextLabel: string;
      excludePrivateSelection?: boolean;
      movementReferenceId?: number;
      updatedById: number;
      notes?: string | null;
    },
  ): Promise<{ rows: { id: number }[] }> {
    const excludePrivateSelection = params.excludePrivateSelection ?? true;

    const moduloAvailable = Math.max(
      0,
      await this.inventoryAvailabilityService.getTraderUnshippedBalance(tx, {
        seasonId: params.seasonId,
        traderId: null,
        traderCategoryId: params.traderCategoryId,
        grade: params.grade,
        pitamStatus: params.pitamStatus,
        isModulo: true,
      }),
    );
    const moduloUsed = Math.min(moduloAvailable, params.quantity);
    const deficit = params.quantity - moduloUsed;

    const rows: { id: number }[] = [];

    if (moduloUsed > 0) {
      rows.push(
        await tx.traderStock.create({
          data: {
            seasonId: params.seasonId,
            date: params.date,
            traderId: null,
            traderCategoryId: params.traderCategoryId,
            grade: params.grade,
            pitamStatus: params.pitamStatus,
            quantity: -moduloUsed,
            isModulo: true,
            type: params.type,
            MovementReferenceId: params.movementReferenceId,
            updatedById: params.updatedById,
            notes: params.notes,
          },
        }),
      );
    }

    if (deficit > 0) {
      const shares = await tx.traderCategoryShare.findMany({
        where: { seasonId: params.seasonId, traderCategoryId: params.traderCategoryId },
        orderBy: { traderId: 'asc' },
      });

      if (shares.length === 0) {
        throw new BadRequestException(`No trader shares found for category ${params.traderCategoryId} in season ${params.seasonId}`);
      }

      const normalizedShares = shares.map((share) => ({
        traderId: share.traderId,
        percent: Number(share.percent),
        percentText: share.percent.toString(),
      }));

      const totalPercent = normalizedShares.reduce((sum, share) => sum + share.percent, 0);
      if (Math.abs(totalPercent - 100) > 1e-9) {
        throw new BadRequestException(
          `Invalid trader shares configuration for category ${params.traderCategoryId}: total percent is ${totalPercent}, expected 100`,
        );
      }

      const grossFromTraders = calculateMinimalGrossByShares(
        deficit,
        normalizedShares.map((share) => share.percentText),
      );
      const traderAllocations = normalizedShares.map((share) => ({
        traderId: share.traderId,
        quantity: calculateExactShareQuantity(grossFromTraders, share.percentText),
      }));

      if (traderAllocations.some((allocation) => allocation.quantity <= 0)) {
        throw new BadRequestException(
          'Invalid trader shares configuration: at least one trader would receive a non-positive quantity for the requested deficit',
        );
      }

      for (const allocation of traderAllocations) {
        await this.inventoryAvailabilityService.assertTraderHasUnshippedStock(tx, {
          seasonId: params.seasonId,
          traderId: allocation.traderId,
          traderCategoryId: params.traderCategoryId,
          grade: params.grade,
          pitamStatus: params.pitamStatus,
          isModulo: false,
          requiredQuantity: allocation.quantity,
          excludePrivateSelection,
          contextLabel: `${params.contextLabel} (trader ${allocation.traderId})`,
        });
      }

      for (const allocation of traderAllocations) {
        rows.push(
          await tx.traderStock.create({
            data: {
              seasonId: params.seasonId,
              date: params.date,
              traderId: allocation.traderId,
              traderCategoryId: params.traderCategoryId,
              grade: params.grade,
              pitamStatus: params.pitamStatus,
              quantity: -allocation.quantity,
              isModulo: false,
              type: params.type,
              MovementReferenceId: params.movementReferenceId,
              updatedById: params.updatedById,
              notes: params.notes,
            },
          }),
        );
      }

      const traderTakenTotal = traderAllocations.reduce((sum, allocation) => sum + allocation.quantity, 0);
      const moduloRemainder = traderTakenTotal - deficit;

      if (moduloRemainder > 0) {
        rows.push(
          await tx.traderStock.create({
            data: {
              seasonId: params.seasonId,
              date: params.date,
              traderId: null,
              traderCategoryId: params.traderCategoryId,
              grade: params.grade,
              pitamStatus: params.pitamStatus,
              quantity: moduloRemainder,
              isModulo: true,
              type: MovementType.ASSIGNED,
              MovementReferenceId: params.movementReferenceId,
              updatedById: params.updatedById,
              notes: params.notes,
            },
          }),
        );

        await this.tryAssignFromModuloPool(tx, {
          seasonId: params.seasonId,
          date: params.date,
          traderCategoryId: params.traderCategoryId,
          grade: params.grade,
          pitamStatus: params.pitamStatus,
          updatedById: params.updatedById,
          notes: params.notes ?? undefined,
          movementReferenceId: params.movementReferenceId,
        });
      }
    }

    if (rows.length === 0) {
      throw new BadRequestException(
        `No quantity was deducted for category ${params.traderCategoryId} in season ${params.seasonId}. Either the requested quantity is zero or there is no available stock to deduct.`,
      );
    }

    return { rows };
  }
}
