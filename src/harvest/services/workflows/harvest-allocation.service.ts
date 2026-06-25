import { BadRequestException, Injectable } from '@nestjs/common';
import { AssignmentType, MovementType, Prisma } from '@prisma/client';
import { ClassificationBulkItemDto } from 'src/harvest/services/harvest-core/dto/harvest.dto';

@Injectable()
export class HarvestAllocationService {
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
      grade: NonNullable<ClassificationBulkItemDto['grade']>;
      pitamStatus: ClassificationBulkItemDto['pitamStatus'];
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

  async processAllocationsForClassification(
    tx: Prisma.TransactionClient,
    params: {
      seasonId: number;
      classificationId: number;
      classificationItem: ClassificationBulkItemDto;
      harvestDate: Date;
      updatedById: number;
    },
  ) {
    const classItem = params.classificationItem;

    if (classItem.assignmentType === AssignmentType.CUSTOMER) {
      await tx.customerAllocation.create({
        data: {
          seasonId: params.seasonId,
          date: params.harvestDate,
          dateHebrew: new Date(params.harvestDate).toLocaleDateString('he-IL'),
          customerId: classItem.customerId!,
          customerCategoryId: classItem.customerCategoryId!,
          pitamStatus: classItem.pitamStatus,
          quantity: classItem.quantity,
          type: MovementType.HARVEST_IN,
          takenFrom: 'GENERAL',
          MovementReferenceId: params.classificationId,
          updatedById: params.updatedById,
          notes: classItem.notes,
        },
      });
      return;
    }

    if (classItem.assignmentType === AssignmentType.TRADER) {
      if (!classItem.traderId) {
        throw new BadRequestException('traderId is required for TRADER classifications');
      }

      if (!classItem.traderCategoryId) {
        throw new BadRequestException('traderCategoryId is required for TRADER classifications');
      }

      if (!classItem.grade) {
        throw new BadRequestException('grade is required for TRADER classifications');
      }

      await tx.traderStock.create({
        data: {
          seasonId: params.seasonId,
          date: params.harvestDate,
          traderId: classItem.traderId,
          traderCategoryId: classItem.traderCategoryId,
          grade: classItem.grade,
          pitamStatus: classItem.pitamStatus,
          quantity: classItem.quantity,
          isModulo: false,
          type: MovementType.PRIVATE_SELECTION,
          MovementReferenceId: params.classificationId,
          updatedById: params.updatedById,
          notes: classItem.notes,
        },
      });
      return;
    }

    if (classItem.assignmentType !== AssignmentType.GENERAL) {
      throw new BadRequestException(
        `Unsupported assignmentType for allocation processing: ${classItem.assignmentType}`,
      );
    }

    if (!classItem.traderCategoryId) {
      throw new BadRequestException('traderCategoryId is required for GENERAL classifications');
    }

    if (!classItem.grade) {
      throw new BadRequestException('grade is required for GENERAL classifications');
    }

    const shares = await this.getTraderCategoryShares(tx, params.seasonId, classItem.traderCategoryId);
    if (shares.length === 0) {
      throw new BadRequestException(
        `No trader shares found for category ${classItem.traderCategoryId} in season ${params.seasonId}`,
      );
    }

    const allocations = this.calculateShareAllocations(classItem.quantity, shares);
    const canDistributeToAll = allocations.every((allocation) => allocation.quantity > 0);
    let didAddModulo = false;

    if (!canDistributeToAll) {
      await tx.traderStock.create({
        data: {
          seasonId: params.seasonId,
          date: params.harvestDate,
          traderId: null,
          traderCategoryId: classItem.traderCategoryId,
          grade: classItem.grade,
          pitamStatus: classItem.pitamStatus,
          quantity: classItem.quantity,
          isModulo: true,
          type: MovementType.HARVEST_IN,
          MovementReferenceId: params.classificationId,
          updatedById: params.updatedById,
          notes: classItem.notes,
        },
      });
      didAddModulo = true;
    } else {
      let totalAllocated = 0;

      for (const allocation of allocations) {
        await tx.traderStock.create({
          data: {
            seasonId: params.seasonId,
            date: params.harvestDate,
            traderId: allocation.share.traderId,
            traderCategoryId: classItem.traderCategoryId,
            grade: classItem.grade,
            pitamStatus: classItem.pitamStatus,
            quantity: allocation.quantity,
            isModulo: false,
            type: MovementType.HARVEST_IN,
            MovementReferenceId: params.classificationId,
            updatedById: params.updatedById,
            notes: classItem.notes,
          },
        });

        totalAllocated += allocation.quantity;
      }

      const remainder = classItem.quantity - totalAllocated;
      if (remainder > 0) {
        await tx.traderStock.create({
          data: {
            seasonId: params.seasonId,
            date: params.harvestDate,
            traderId: null,
            traderCategoryId: classItem.traderCategoryId,
            grade: classItem.grade,
            pitamStatus: classItem.pitamStatus,
            quantity: remainder,
            isModulo: true,
            type: MovementType.HARVEST_IN,
            MovementReferenceId: params.classificationId,
            updatedById: params.updatedById,
            notes: classItem.notes,
          },
        });
        didAddModulo = true;
      }
    }

    if (didAddModulo) {
      await this.tryAssignFromModuloPool(tx, {
        seasonId: params.seasonId,
        date: params.harvestDate,
        traderCategoryId: classItem.traderCategoryId,
        grade: classItem.grade,
        pitamStatus: classItem.pitamStatus,
        updatedById: params.updatedById,
        notes: classItem.notes,
        movementReferenceId: params.classificationId,
      });
    }
  }

  async deleteLinkedMovements(tx: Prisma.TransactionClient, classificationId: number) {
    await tx.customerAllocation.deleteMany({
      where: {
        MovementReferenceId: classificationId,
        type: MovementType.HARVEST_IN,
        shipmentId: null,
        boxId: null,
      },
    });

    await tx.traderStock.deleteMany({
      where: {
        MovementReferenceId: classificationId,
        type: { in: [MovementType.HARVEST_IN, MovementType.ASSIGNED, MovementType.PRIVATE_SELECTION] },
        shipmentId: null,
        boxId: null,
      },
    });
  }
}
