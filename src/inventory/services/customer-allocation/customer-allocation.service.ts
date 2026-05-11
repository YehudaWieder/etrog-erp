// src/inventory/services/customer-allocation/customer-allocation.service.ts

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma, MovementType, PitamStatus } from 'src/generated/prisma';
import { SeasonsService } from 'src/seasons/seasons.service';
import { InventoryAvailabilityService } from '../inventory-availability.service';

export type CustomerInventoryShipmentScope =
  | 'ALL'
  | 'SHIPPED'
  | 'UNSHIPPED'
  | 'PACKED_SHIPPED'
  | 'SELF_PICKUP'
  | 'HARVEST_IN'
  | 'INTERNAL_TRANSFER'
  | 'OWNERSHIP_TRANSFER'
  | 'ASSIGNED'
  | 'WASTE'
  | 'ADJUSTMENT';
export type CustomerInventorySortBy = 'category' | 'customer' | 'quantity' | 'pitamStatus' | 'updatedAt';
export type CustomerInventorySortOrder = 'asc' | 'desc';

export interface CustomerInventorySummaryQuery {
  seasonId?: number;
  customerId?: number;
  customerCategoryId?: number;
  pitamStatus?: PitamStatus;
  shipmentScope?: CustomerInventoryShipmentScope;
  sortBy?: CustomerInventorySortBy;
  sortOrder?: CustomerInventorySortOrder;
}

export interface CustomerInventorySummaryTotals {
  totalQuantity: number;
}

export interface CustomerInventorySummaryRow {
  customerId: number;
  customerName: string | null;
  customerCategoryId: number;
  customerCategoryName: string | null;
  categoryGrade: string | null;
  pitamStatus: PitamStatus;
  quantity: number;
  lastUpdatedAt: Date | null;
}

export interface CustomerInventorySummaryResult {
  rows: CustomerInventorySummaryRow[];
  totals: CustomerInventorySummaryTotals;
}

@Injectable()
export class CustomerAllocationService {
  constructor(
    private prisma: PrismaService,
    private seasonsService: SeasonsService,
    private inventoryAvailabilityService: InventoryAvailabilityService,
  ) {}

  // Create a new allocation record
  async create(data: Prisma.CustomerAllocationUncheckedCreateInput) {
    const { id: seasonId } = await this.seasonsService.findActiveSeason();

    await this.assertNegativeCustomerMovementHasStock(this.prisma, {
      ...data,
      seasonId,
    });

    return this.prisma.customerAllocation.create({
      data: {
        ...data,
        seasonId,
      },
    });
  }

  // Get the total allocated quantity for a customer in a season, optionally filtered by category and pitam status
  async getBalance(query: {
    seasonId: number;
    customerId: number;
    customerCategoryId: number;
    pitamStatus: any;
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

  async getInventorySummary(query: CustomerInventorySummaryQuery): Promise<CustomerInventorySummaryResult> {
    const seasonId = query.seasonId ?? (await this.seasonsService.findActiveSeason()).id;
    await this.seasonsService.assertSeasonExists(seasonId);

    const shipmentScope = query.shipmentScope ?? 'ALL';
    const sortBy = query.sortBy ?? 'customer';
    const sortOrder = query.sortOrder ?? 'asc';

    this.validateSummaryQuery(shipmentScope, sortBy, sortOrder);

    const where: Prisma.CustomerAllocationWhereInput = {
      seasonId,
      isDeleted: false,
      customerId: query.customerId,
      customerCategoryId: query.customerCategoryId,
      pitamStatus: query.pitamStatus,
    };

    this.applyShipmentScope(where, shipmentScope);

    const rows = await this.prisma.customerAllocation.groupBy({
      by: ['customerId', 'customerCategoryId', 'pitamStatus'],
      where,
      _sum: { quantity: true },
      _max: { updatedAt: true },
    });

    const filteredRows = rows.filter((row) => (row._sum.quantity ?? 0) !== 0);
    const customerIds = [...new Set(filteredRows.map((row) => row.customerId))];
    const categoryIds = [...new Set(filteredRows.map((row) => row.customerCategoryId))];

    const [customers, categories] = await Promise.all([
      customerIds.length
        ? this.prisma.customer.findMany({
            where: { id: { in: customerIds } },
            select: { id: true, customerName: true },
          })
        : Promise.resolve([]),
      categoryIds.length
        ? this.prisma.customerCategories.findMany({
            where: { id: { in: categoryIds } },
            select: { id: true, name: true, grade: true },
          })
        : Promise.resolve([]),
    ]);

    const customerMap = new Map<number, string>();
    for (const customer of customers) {
      customerMap.set(customer.id, customer.customerName);
    }

    const categoryMap = new Map<number, { name: string; grade: string | null }>();
    for (const category of categories) {
      categoryMap.set(category.id, {
        name: category.name,
        grade: category.grade,
      });
    }

    const summary: CustomerInventorySummaryRow[] = filteredRows.map((row) => {
      const category = categoryMap.get(row.customerCategoryId);

      return {
        customerId: row.customerId,
        customerName: customerMap.get(row.customerId) ?? null,
        customerCategoryId: row.customerCategoryId,
        customerCategoryName: category?.name ?? null,
        categoryGrade: category?.grade ?? null,
        pitamStatus: row.pitamStatus,
        quantity: row._sum.quantity ?? 0,
        lastUpdatedAt: row._max.updatedAt,
      };
    });

    const sorted = this.sortSummary(summary, sortBy, sortOrder);

    return {
      rows: sorted,
      totals: {
        totalQuantity: sorted.reduce((acc, row) => acc + row.quantity, 0),
      },
    };
  }

  async createAdjustment(data: Prisma.CustomerAllocationUncheckedCreateInput) {
    this.validateAdjustmentType(data.type);
    const { id: seasonId } = await this.seasonsService.findActiveSeason();
    const movementType = data.type as MovementType;
    const quantity = this.requireQuantity(data.quantity);
    const normalizedQuantity = this.normalizeAdjustmentQuantity(movementType, quantity);

    return this.prisma.$transaction(async (tx) => {
      await this.assertNegativeCustomerMovementHasStock(tx, {
        ...data,
        seasonId,
        quantity: normalizedQuantity,
      });

      return tx.customerAllocation.create({
        data: {
          ...data,
          seasonId,
          quantity: normalizedQuantity,
          shipmentId: null,
          boxId: null,
        },
      });
    });
  }

  async updateAdjustment(id: number, data: Prisma.CustomerAllocationUncheckedUpdateInput) {
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

      const nextType = (data.type ?? existing.type) as MovementType;
      this.validateAdjustmentType(nextType);

      const nextQuantityRaw =
        data.quantity === undefined ? existing.quantity : Number(data.quantity);
      const nextQuantity =
        data.quantity === undefined
          ? existing.quantity
          : this.normalizeAdjustmentQuantity(nextType, nextQuantityRaw);

      await this.assertNegativeCustomerMovementHasStock(tx, {
        seasonId: existing.seasonId,
        customerId: Number(data.customerId ?? existing.customerId),
        customerCategoryId: Number(data.customerCategoryId ?? existing.customerCategoryId),
        pitamStatus: (data.pitamStatus ?? existing.pitamStatus) as PitamStatus,
        quantity: nextQuantity,
      }, Math.abs(existing.quantity));

      return tx.customerAllocation.update({
        where: { id },
        data: {
          ...data,
          shipmentId: null,
          boxId: null,
          quantity: data.quantity === undefined ? undefined : nextQuantity,
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
    return this.prisma.customerAllocation.delete({
      where: { id },
    });
  }

  private validateAdjustmentType(type?: MovementType | null) {
    if (!type) {
      throw new BadRequestException('type is required for adjustment movement');
    }

    if (type !== MovementType.WASTE && type !== MovementType.ADJUSTMENT && type !== MovementType.SELF_PICKUP) {
      throw new BadRequestException('type must be WASTE, ADJUSTMENT, or SELF_PICKUP');
    }
  }

  private normalizeAdjustmentQuantity(type: MovementType, quantity: number) {
    if (!Number.isFinite(quantity) || quantity === 0) {
      throw new BadRequestException('quantity must be a non-zero number');
    }

    if (type === MovementType.WASTE || type === MovementType.SELF_PICKUP) {
      return -Math.abs(quantity);
    }

    return quantity;
  }

  private requireQuantity(value?: number) {
    if (value === undefined || value === null) {
      throw new BadRequestException('quantity is required for adjustment movement');
    }

    return Number(value);
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

  private validateSummaryQuery(
    shipmentScope: CustomerInventoryShipmentScope,
    sortBy: CustomerInventorySortBy,
    sortOrder: CustomerInventorySortOrder,
  ) {
    const validShipmentScopes: CustomerInventoryShipmentScope[] = [
      'ALL', 'SHIPPED', 'UNSHIPPED',
      'PACKED_SHIPPED', 'SELF_PICKUP',
      'HARVEST_IN', 'INTERNAL_TRANSFER', 'OWNERSHIP_TRANSFER', 'ASSIGNED',
      'WASTE', 'ADJUSTMENT',
    ];
    if (!validShipmentScopes.includes(shipmentScope)) {
      throw new BadRequestException(
        'shipmentScope must be one of: ALL, SHIPPED, UNSHIPPED, PACKED_SHIPPED, SELF_PICKUP, HARVEST_IN, INTERNAL_TRANSFER, OWNERSHIP_TRANSFER, ASSIGNED, WASTE, ADJUSTMENT',
      );
    }

    if (!['category', 'customer', 'quantity', 'pitamStatus', 'updatedAt'].includes(sortBy)) {
      throw new BadRequestException('sortBy must be category, customer, quantity, pitamStatus, or updatedAt');
    }

    if (!['asc', 'desc'].includes(sortOrder)) {
      throw new BadRequestException('sortOrder must be asc or desc');
    }
  }

  private applyShipmentScope(
    where: Prisma.CustomerAllocationWhereInput,
    shipmentScope: CustomerInventoryShipmentScope,
  ) {
    // Logical groups
    if (shipmentScope === 'SHIPPED') {
      where.type = { in: [MovementType.PACKED_SHIPPED, MovementType.SELF_PICKUP] };
      return;
    }
    if (shipmentScope === 'UNSHIPPED') {
      where.type = { notIn: [MovementType.PACKED_SHIPPED, MovementType.SELF_PICKUP] };
      return;
    }
    // Exact movement type matches
    const exactMap: Partial<Record<CustomerInventoryShipmentScope, MovementType>> = {
      PACKED_SHIPPED: MovementType.PACKED_SHIPPED,
      SELF_PICKUP: MovementType.SELF_PICKUP,
      HARVEST_IN: MovementType.HARVEST_IN,
      INTERNAL_TRANSFER: MovementType.INTERNAL_TRANSFER,
      OWNERSHIP_TRANSFER: MovementType.OWNERSHIP_TRANSFER,
      ASSIGNED: MovementType.ASSIGNED,
      WASTE: MovementType.WASTE,
      ADJUSTMENT: MovementType.ADJUSTMENT,
    };
    const exact = exactMap[shipmentScope];
    if (exact) {
      where.type = exact;
    }
    // ALL → no type filter applied
  }

  private sortSummary(
    summary: CustomerInventorySummaryRow[],
    sortBy: CustomerInventorySortBy,
    sortOrder: CustomerInventorySortOrder,
  ) {
    const factor = sortOrder === 'asc' ? 1 : -1;

    return summary.sort((left, right) => {
      switch (sortBy) {
        case 'category':
          return this.compareValues(left.customerCategoryName ?? '', right.customerCategoryName ?? '', factor);
        case 'quantity':
          return this.compareValues(left.quantity, right.quantity, factor);
        case 'pitamStatus':
          return this.compareValues(left.pitamStatus, right.pitamStatus, factor);
        case 'updatedAt':
          return this.compareValues(left.lastUpdatedAt?.getTime() ?? 0, right.lastUpdatedAt?.getTime() ?? 0, factor);
        case 'customer':
        default:
          return this.compareValues(left.customerName ?? '', right.customerName ?? '', factor);
      }
    });
  }

  private compareValues(left: string | number, right: string | number, factor: number) {
    if (left < right) {
      return -1 * factor;
    }

    if (left > right) {
      return 1 * factor;
    }

    return 0;
  }
}