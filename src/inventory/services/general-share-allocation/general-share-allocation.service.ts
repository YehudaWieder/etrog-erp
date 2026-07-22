import { BadRequestException, Injectable } from '@nestjs/common';
import { Grade, MovementType, PitamStatus, Prisma } from '@prisma/client';

@Injectable()
export class GeneralShareAllocationService {
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

  private calculateShareAllocations(
    quantity: number,
    shares: Array<{ traderId: number; percent: Prisma.Decimal | number | string }>,
  ) {
    return shares.map((share) => ({
      share,
      quantity: Math.floor((quantity * Number(share.percent)) / 100),
    }));
  }

  private async tryAssignFromModuloPool(
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
      movementReferenceId?: number;
      updatedById: number;
      notes?: string;
    },
  ) {
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
          type: MovementType.HARVEST_IN,
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
            type: MovementType.HARVEST_IN,
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
            type: MovementType.HARVEST_IN,
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
}
