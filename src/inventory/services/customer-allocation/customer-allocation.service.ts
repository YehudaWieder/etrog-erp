// src/inventory/services/customer-allocation/customer-allocation.service.ts

import { BadRequestException, Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma, MovementType, PitamStatus } from 'src/generated/prisma';
import { SeasonsService } from 'src/seasons/seasons.service';
import { InventoryAvailabilityService } from '../inventory-availability.service';
import { CustomerInventorySummaryQuery } from './dto/customer-inventory-summary.dto';
import { CustomerAllocationSummaryService } from './customer-allocation-summary.service';
import { validateCustomerSummaryQuery, buildMovementFilter } from 'src/inventory/services/validation/summary-query-rules';
import {
  normalizeAdjustmentQuantity,
  requireAdjustmentQuantity,
  validateAdjustmentType,
} from 'src/inventory/services/inventory-core/utils/adjustment-movement.util';

@Injectable()
export class CustomerAllocationService {
  constructor(
    private prisma: PrismaService,
    private seasonsService: SeasonsService,
    private inventoryAvailabilityService: InventoryAvailabilityService,
    private customerAllocationSummaryService: CustomerAllocationSummaryService,
  ) {}

  // Create a new allocation record
  async create(data: Prisma.CustomerAllocationUncheckedCreateInput, actorId: number) {
    const createPayload: Prisma.CustomerAllocationUncheckedCreateInput = {
      ...data,
      updatedById: actorId,
    };

    const { id: seasonId } = await this.seasonsService.findActiveSeason();

    await this.assertNegativeCustomerMovementHasStock(this.prisma, {
      ...createPayload,
      seasonId,
    });

    return this.prisma.customerAllocation.create({
      data: {
        ...createPayload,
        seasonId,
      },
    });
  }

  // Get the total allocated quantity for a customer in a season, optionally filtered by category and pitam status
  async getBalance(query: {
    seasonId: number;
    customerId: number;
    customerCategoryId: number;
    pitamStatus: PitamStatus;
  }) {
    const aggregation = await this.prisma.customerAllocation.aggregate({
      where: {
        ...query,
        isDeleted: false,
      },
      _sum: {
        quantity: true,
      },
    });

    return aggregation._sum.quantity || 0;
  }

  // Find all allocations for a specific customer in a season
  async findAllByCustomer(customerId: number, seasonId: number) {
    await this.seasonsService.assertSeasonExists(seasonId);

    return this.prisma.customerAllocation.findMany({
      where: { customerId, seasonId, isDeleted: false },
      include: {
        customerCategory: { select: { name: true, grade: true } },
        traderSourceName: { select: { name: true } }, // The trader who provided the goods
        updatedBy: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
    });
  }

   // Get full ledger for transparency
  async getLedger(seasonId: number, customerId: number) {
    await this.seasonsService.assertSeasonExists(seasonId);

    return this.prisma.customerAllocation.findMany({
    where: { seasonId, customerId, isDeleted: false },
    include: {
        customerCategory: { select: { name: true, grade: true } },
        traderSourceName: { select: { name: true } },
        updatedBy: { select: { name: true } },
    },
    orderBy: { date: 'desc' },
    });
  }

  // Find by reference (e.g., linked to a specific classification or trader stock)
  async findByReference(referenceId: number) {
    return this.prisma.customerAllocation.findMany({
      where: { MovementReferenceId: referenceId, isDeleted: false },
    });
  }

  async update(id: number, data: Prisma.CustomerAllocationUncheckedUpdateInput) {
    return this.prisma.customerAllocation.update({
      where: { id },
      data,
    });
  }

  async getInventorySummary(query: CustomerInventorySummaryQuery) {
    return this.customerAllocationSummaryService.getSummary(query);
  }

  async getMovements(query: {
    seasonId?: number;
    customerId?: number;
    shipmentScope?: CustomerInventorySummaryQuery['shipmentScope'];
  }) {
    const seasonId = query.seasonId ?? (await this.seasonsService.findActiveSeason()).id;
    await this.seasonsService.assertSeasonExists(seasonId);

    const shipmentScope = query.shipmentScope ?? 'ALL';
    validateCustomerSummaryQuery(shipmentScope, 'updatedAt', 'desc');

    const typeFilter = buildMovementFilter(shipmentScope);

    return this.prisma.customerAllocation.findMany({
      where: {
        seasonId,
        isDeleted: false,
        customerId: query.customerId,
        ...(typeFilter !== undefined ? { type: typeFilter } : {}),
      },
      include: {
        customer: {
          select: {
            customerName: true,
          },
        },
        customerCategory: {
          select: {
            name: true,
            grade: true,
          },
        },
      },
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
    });
  }

  async createAdjustment(data: Prisma.CustomerAllocationUncheckedCreateInput, actorId: number) {
    const createPayload: Prisma.CustomerAllocationUncheckedCreateInput = {
      ...data,
      updatedById: actorId,
    };

    validateAdjustmentType(createPayload.type);
    const { id: seasonId } = await this.seasonsService.findActiveSeason();
    const movementType = createPayload.type as MovementType;
    const quantity = requireAdjustmentQuantity(createPayload.quantity);
    const normalizedQuantity = normalizeAdjustmentQuantity(movementType, quantity);

    return this.prisma.$transaction(async (tx) => {
      await this.assertNegativeCustomerMovementHasStock(tx, {
        ...createPayload,
        seasonId,
        quantity: normalizedQuantity,
      });

      return tx.customerAllocation.create({
        data: {
          ...createPayload,
          seasonId,
          quantity: normalizedQuantity,
          shipmentId: null,
          boxId: null,
        },
      });
    });
  }

  async updateAdjustment(id: number, data: Prisma.CustomerAllocationUncheckedUpdateInput, actorId: number) {
    const updatePayload: Prisma.CustomerAllocationUncheckedUpdateInput = {
      ...data,
      updatedById: actorId,
    };

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.customerAllocation.findFirst({
        where: {
          id,
          isDeleted: false,
          type: { in: [MovementType.WASTE, MovementType.ADJUSTMENT, MovementType.SELF_PICKUP] },
        },
      });

      if (!existing) {
        throw new NotFoundException(`Customer adjustment ${id} not found`);
      }

      const nextType = (updatePayload.type ?? existing.type) as MovementType;
      validateAdjustmentType(nextType);

      const nextQuantityRaw =
        updatePayload.quantity === undefined ? existing.quantity : Number(updatePayload.quantity);
      const nextQuantity =
        updatePayload.quantity === undefined
          ? existing.quantity
          : normalizeAdjustmentQuantity(nextType, nextQuantityRaw);

      await this.assertNegativeCustomerMovementHasStock(tx, {
        seasonId: existing.seasonId,
        customerId: Number(updatePayload.customerId ?? existing.customerId),
        customerCategoryId: Number(updatePayload.customerCategoryId ?? existing.customerCategoryId),
        pitamStatus: (updatePayload.pitamStatus ?? existing.pitamStatus) as PitamStatus,
        quantity: nextQuantity,
      }, Math.abs(existing.quantity));

      return tx.customerAllocation.update({
        where: { id },
        data: {
          ...updatePayload,
          shipmentId: null,
          boxId: null,
          quantity: updatePayload.quantity === undefined ? undefined : nextQuantity,
        },
      });
    });
  }

  async removeAdjustment(id: number) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.customerAllocation.findFirst({
        where: {
          id,
          isDeleted: false,
          type: { in: [MovementType.WASTE, MovementType.ADJUSTMENT, MovementType.SELF_PICKUP] },
        },
      });

      if (!existing) {
        throw new NotFoundException(`Customer adjustment ${id} not found`);
      }

      return tx.customerAllocation.update({
        where: { id },
        data: { isDeleted: true },
      });
    });
  }

  // Hard delete
  async remove(id: number) {
    try {
      return await this.prisma.customerAllocation.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException('Cannot delete customer allocation movement because related records exist in the system.');
      }

      throw error;
    }
  }

  private async assertNegativeCustomerMovementHasStock(
    client: Prisma.TransactionClient | PrismaService,
    data: {
      seasonId: number;
      customerId?: number;
      customerCategoryId?: number;
      pitamStatus?: PitamStatus;
      quantity?: number;
    },
    creditQuantity: number = 0,
  ) {
    const quantity = Number(data.quantity ?? 0);
    if (!Number.isFinite(quantity) || quantity >= 0) {
      return;
    }

    if (!data.customerId || !data.customerCategoryId || !data.pitamStatus) {
      throw new BadRequestException(
        'Negative customer movement requires customerId, customerCategoryId, and pitamStatus',
      );
    }

    await this.inventoryAvailabilityService.assertCustomerHasUnshippedStock(client, {
      seasonId: data.seasonId,
      customerId: data.customerId,
      customerCategoryId: data.customerCategoryId,
      pitamStatus: data.pitamStatus,
      requiredQuantity: Math.abs(quantity),
      creditQuantity,
      contextLabel: 'Customer movement validation',
    });
  }

}