import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MovementType, Prisma, SourceType } from '@prisma/client';
import { CustomerGeneralAllocationRequestDto } from 'src/inventory/services/inventory-core/dto/customer-general-allocation.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { SeasonsService } from 'src/seasons/seasons.service';
import { InventoryAvailabilityService } from '../inventory-availability.service';
import { InventoryValidationService } from '../validation/inventory-validation.service';
import { GeneralShareAllocationService } from '../general-share-allocation/general-share-allocation.service';
import {
  calculateExactShareQuantity,
  calculateMinimalGrossByShares,
} from '../validation/share-math';
import { resolveTraderCategoryShares } from '../validation/trader-category-share-resolver';

@Injectable()
export class CustomerGeneralTransferService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly seasonsService: SeasonsService,
    private readonly inventoryAvailabilityService: InventoryAvailabilityService,
    private readonly inventoryValidationService: InventoryValidationService,
    private readonly generalShareAllocationService: GeneralShareAllocationService,
  ) {}

  async create(data: CustomerGeneralAllocationRequestDto, actorId: number) {
    this.inventoryValidationService.validateCustomerGeneralAllocationDto(data);
    const { id: seasonId } = await this.seasonsService.findActiveSeason();

    return this.prisma.$transaction(async (tx) => {
      const requestQuantity = Math.trunc(data.quantity);
      const customerAllocation = await tx.customerAllocation.create({
        data: {
          seasonId,
          date: new Date(data.date),
          dateHebrew: data.dateHebrew,
          customerId: data.customerId,
          customerCategoryId: data.customerCategoryId,
          pitamStatus: data.pitamStatus,
          quantity: requestQuantity,
          type: MovementType.INTERNAL_TRANSFER,
          takenFrom: SourceType.GENERAL,
          traderId: null,
          updatedById: actorId,
          notes: data.notes,
        },
      });

      const movementReferenceId = customerAllocation.id;

      await tx.customerAllocation.update({
        where: { id: customerAllocation.id },
        data: { MovementReferenceId: movementReferenceId },
      });

      const movementSummary = await this.applyMovementsTx(
        tx,
        seasonId,
        data,
        actorId,
        movementReferenceId,
        requestQuantity,
      );

      return {
        movementReferenceId,
        customerAllocationId: customerAllocation.id,
        requestedQuantity: requestQuantity,
        ...movementSummary,
      };
    });
  }

  async update(
    customerAllocationId: number,
    data: CustomerGeneralAllocationRequestDto,
    actorId: number,
  ) {
    this.inventoryValidationService.validateCustomerGeneralAllocationDto(data);
    const { id: seasonId } = await this.seasonsService.findActiveSeason();

    return this.prisma.$transaction(async (tx) => {
      const existing = await this.getOperationTx(tx, customerAllocationId);
      const movementReferenceId = existing.MovementReferenceId ?? existing.id;
      const requestQuantity = Math.trunc(data.quantity);

      await tx.traderStock.updateMany({
        where: {
          MovementReferenceId: movementReferenceId,
          isDeleted: false,
          type: { in: [MovementType.INTERNAL_TRANSFER, MovementType.ASSIGNED] },
        },
        data: { isDeleted: true },
      });

      await tx.customerAllocation.update({
        where: { id: existing.id },
        data: {
          seasonId,
          date: new Date(data.date),
          dateHebrew: data.dateHebrew,
          customerId: data.customerId,
          customerCategoryId: data.customerCategoryId,
          pitamStatus: data.pitamStatus,
          quantity: requestQuantity,
          type: MovementType.INTERNAL_TRANSFER,
          takenFrom: SourceType.GENERAL,
          traderId: null,
          updatedById: actorId,
          notes: data.notes,
          MovementReferenceId: movementReferenceId,
          isDeleted: false,
        },
      });

      const movementSummary = await this.applyMovementsTx(
        tx,
        seasonId,
        data,
        actorId,
        movementReferenceId,
        requestQuantity,
      );

      return {
        movementReferenceId,
        customerAllocationId: existing.id,
        requestedQuantity: requestQuantity,
        ...movementSummary,
      };
    });
  }

  async remove(customerAllocationId: number) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await this.getOperationTx(tx, customerAllocationId);
      const movementReferenceId = existing.MovementReferenceId ?? existing.id;

      const customerDeleted = await tx.customerAllocation.updateMany({
        where: {
          id: existing.id,
          isDeleted: false,
        },
        data: { isDeleted: true },
      });

      const traderDeleted = await tx.traderStock.updateMany({
        where: {
          MovementReferenceId: movementReferenceId,
          isDeleted: false,
          type: { in: [MovementType.INTERNAL_TRANSFER, MovementType.ASSIGNED] },
        },
        data: { isDeleted: true },
      });

      return {
        movementReferenceId,
        customerAllocationId: existing.id,
        deleted: {
          customerAllocations: customerDeleted.count,
          traderStocks: traderDeleted.count,
        },
      };
    });
  }

  private async applyMovementsTx(
    tx: Prisma.TransactionClient,
    seasonId: number,
    data: CustomerGeneralAllocationRequestDto,
    actorId: number,
    movementReferenceId: number,
    requestQuantity: number,
  ) {
    const moduloAvailable = Math.max(
      0,
      await this.inventoryAvailabilityService.getTraderUnshippedBalance(tx, {
        seasonId,
        traderId: null,
        traderCategoryId: data.traderCategoryId,
        grade: data.grade,
        pitamStatus: data.pitamStatus,
        isModulo: true,
      }),
    );
    const moduloUsed = Math.min(moduloAvailable, requestQuantity);
    const deficit = requestQuantity - moduloUsed;

    if (moduloUsed > 0) {
      await tx.traderStock.create({
        data: {
          seasonId,
          date: new Date(data.date),
          traderId: null,
          traderCategoryId: data.traderCategoryId,
          grade: data.grade,
          pitamStatus: data.pitamStatus,
          quantity: -moduloUsed,
          isModulo: true,
          type: MovementType.INTERNAL_TRANSFER,
          MovementReferenceId: movementReferenceId,
          shipmentId: null,
          boxId: null,
          updatedById: actorId,
          notes: data.notes,
        },
      });
    }

    let traderTakenTotal = 0;
    let moduloRemainder = 0;

    if (deficit > 0) {
      const { shares, shareConditionId } = await resolveTraderCategoryShares(tx, {
        seasonId,
        traderCategoryId: data.traderCategoryId,
        date: new Date(data.date),
      });

      if (shares.length === 0) {
        throw new BadRequestException(
          `No trader shares found for category ${data.traderCategoryId} in season ${seasonId}`,
        );
      }

      const normalizedShares = shares.map((share) => ({
        traderId: share.traderId,
        percent: Number(share.percent),
        percentText: share.percent.toString(),
      }));

      const totalPercent = normalizedShares.reduce(
        (sum, share) => sum + share.percent,
        0,
      );
      if (Math.abs(totalPercent - 100) > 1e-9) {
        throw new BadRequestException(
          `Invalid shares for category ${data.traderCategoryId}: sum of percents must be exactly 100`,
        );
      }

      const grossFromTraders = calculateMinimalGrossByShares(
        deficit,
        normalizedShares.map((share) => share.percentText),
      );
      const traderAllocations = normalizedShares.map((share) => ({
        traderId: share.traderId,
        quantity: calculateExactShareQuantity(
          grossFromTraders,
          share.percentText,
        ),
      }));

      if (traderAllocations.some((allocation) => allocation.quantity <= 0)) {
        throw new BadRequestException(
          'Requested quantity cannot be distributed to all traders by configured shares; increase quantity or adjust shares',
        );
      }

      for (const allocation of traderAllocations) {
        await this.inventoryAvailabilityService.assertTraderHasUnshippedStock(
          tx,
          {
            seasonId,
            traderId: allocation.traderId,
            traderCategoryId: data.traderCategoryId,
            grade: data.grade,
            pitamStatus: data.pitamStatus,
            isModulo: false,
            requiredQuantity: allocation.quantity,
            contextLabel: `Customer allocation from general (trader ${allocation.traderId})`,
          },
        );
      }

      for (const allocation of traderAllocations) {
        await tx.traderStock.create({
          data: {
            seasonId,
            date: new Date(data.date),
            traderId: allocation.traderId,
            traderCategoryId: data.traderCategoryId,
            grade: data.grade,
            pitamStatus: data.pitamStatus,
            quantity: -allocation.quantity,
            isModulo: false,
            type: MovementType.INTERNAL_TRANSFER,
            MovementReferenceId: movementReferenceId,
            shipmentId: null,
            boxId: null,
            shareConditionId,
            updatedById: actorId,
            notes: data.notes,
          },
        });
      }

      traderTakenTotal = traderAllocations.reduce((sum, allocation) => sum + allocation.quantity, 0);
      moduloRemainder = traderTakenTotal - deficit;

      if (moduloRemainder > 0) {
        await tx.traderStock.create({
          data: {
            seasonId,
            date: new Date(data.date),
            traderId: null,
            traderCategoryId: data.traderCategoryId,
            grade: data.grade,
            pitamStatus: data.pitamStatus,
            quantity: moduloRemainder,
            isModulo: true,
            type: MovementType.ASSIGNED,
            MovementReferenceId: movementReferenceId,
            shipmentId: null,
            boxId: null,
            updatedById: actorId,
            notes: data.notes,
          },
        });

        await this.generalShareAllocationService.tryAssignFromModuloPool(tx, {
          seasonId,
          date: new Date(data.date),
          traderCategoryId: data.traderCategoryId,
          grade: data.grade,
          pitamStatus: data.pitamStatus,
          updatedById: actorId,
          notes: data.notes,
          movementReferenceId,
        });
      }
    }

    return {
      usedFromModulo: moduloUsed,
      takenFromTraders: traderTakenTotal,
      returnedToModulo: moduloRemainder,
    };
  }

  private async getOperationTx(
    tx: Prisma.TransactionClient,
    customerAllocationId: number,
  ) {
    const row = await tx.customerAllocation.findFirst({
      where: {
        id: customerAllocationId,
        isDeleted: false,
        type: MovementType.INTERNAL_TRANSFER,
        takenFrom: SourceType.GENERAL,
      },
    });

    if (!row) {
      throw new NotFoundException(
        `Customer general transfer ${customerAllocationId} not found`,
      );
    }

    return row;
  }

}
