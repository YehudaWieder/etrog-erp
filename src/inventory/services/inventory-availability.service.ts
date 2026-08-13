import { BadRequestException, Injectable } from '@nestjs/common';
import { Grade, MovementType, PitamStatus, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

type LedgerClient = Prisma.TransactionClient | PrismaService;

@Injectable()
export class InventoryAvailabilityService {
  async getTraderUnshippedBalance(
    client: LedgerClient,
    query: {
      seasonId: number;
      traderId: number | null;
      traderCategoryId: number;
      grade: Grade;
      pitamStatus: PitamStatus;
      isModulo: boolean;
      excludePrivateSelection?: boolean;
      onlyPrivateSelection?: boolean;
    },
  ) {
    // A "private selection pool" record is either:
    //   (a) a positive entry from harvest allocation (type = PRIVATE_SELECTION), or
    //   (b) a negative deduction explicitly tagged as taken from that pool.
    const typeFilter = query.onlyPrivateSelection
      ? { OR: [{ type: MovementType.PRIVATE_SELECTION }, { isFromPrivateSelection: true }] }
      : query.excludePrivateSelection
        ? { type: { not: MovementType.PRIVATE_SELECTION }, isFromPrivateSelection: false }
        : {};

    const aggregation = await client.traderStock.aggregate({
      where: {
        seasonId: query.seasonId,
        isDeleted: false,
        traderId: query.traderId,
        traderCategoryId: query.traderCategoryId,
        grade: query.grade,
        pitamStatus: query.pitamStatus,
        isModulo: query.isModulo,
        ...typeFilter,
      },
      _sum: { quantity: true },
    });

    return aggregation._sum.quantity ?? 0;
  }

  async getCustomerUnshippedBalance(
    client: LedgerClient,
    query: {
      seasonId: number;
      customerId: number;
      customerCategoryId: number;
      pitamStatus: PitamStatus;
    },
  ) {
    const aggregation = await client.customerAllocation.aggregate({
      where: {
        seasonId: query.seasonId,
        isDeleted: false,
        customerId: query.customerId,
        customerCategoryId: query.customerCategoryId,
        pitamStatus: query.pitamStatus,
      },
      _sum: { quantity: true },
    });

    return aggregation._sum.quantity ?? 0;
  }

  async getTraderUnshippedAvailabilityByCategory(
    client: LedgerClient,
    query: {
      seasonId: number;
      traderCategoryId: number;
      grade: Grade;
      pitamStatus: PitamStatus;
      excludePrivateSelection?: boolean;
    },
  ) {
    const grouped = await client.traderStock.groupBy({
      by: ['traderId'],
      where: {
        seasonId: query.seasonId,
        isDeleted: false,
        traderCategoryId: query.traderCategoryId,
        grade: query.grade,
        pitamStatus: query.pitamStatus,
        traderId: { not: null },
        isModulo: false,
        ...(query.excludePrivateSelection ? { type: { not: MovementType.PRIVATE_SELECTION } } : {}),
      },
      _sum: { quantity: true },
    });

    return grouped
      .filter((row) => row.traderId !== null)
      .map((row) => ({
        traderId: row.traderId as number,
        available: row._sum.quantity ?? 0,
      }))
      .filter((row) => row.available > 0);
  }

  async assertTraderHasUnshippedStock(
    client: LedgerClient,
    params: {
      seasonId: number;
      traderId: number | null;
      traderCategoryId: number;
      grade: Grade;
      pitamStatus: PitamStatus;
      isModulo: boolean;
      requiredQuantity: number;
      creditQuantity?: number;
      contextLabel: string;
      excludePrivateSelection?: boolean;
      onlyPrivateSelection?: boolean;
    },
  ) {
    const available = await this.getTraderUnshippedBalance(client, {
      seasonId: params.seasonId,
      traderId: params.traderId,
      traderCategoryId: params.traderCategoryId,
      grade: params.grade,
      pitamStatus: params.pitamStatus,
      isModulo: params.isModulo,
      excludePrivateSelection: params.excludePrivateSelection,
      onlyPrivateSelection: params.onlyPrivateSelection,
    });

    const effectiveAvailable = available + (params.creditQuantity ?? 0);
    if (effectiveAvailable < params.requiredQuantity) {
      throw new BadRequestException(
        `${params.contextLabel}: insufficient unshipped trader stock. Required=${params.requiredQuantity}, available=${effectiveAvailable}`,
      );
    }
  }

  async assertCustomerHasUnshippedStock(
    client: LedgerClient,
    params: {
      seasonId: number;
      customerId: number;
      customerCategoryId: number;
      pitamStatus: PitamStatus;
      requiredQuantity: number;
      creditQuantity?: number;
      contextLabel: string;
    },
  ) {
    const available = await this.getCustomerUnshippedBalance(client, {
      seasonId: params.seasonId,
      customerId: params.customerId,
      customerCategoryId: params.customerCategoryId,
      pitamStatus: params.pitamStatus,
    });

    const effectiveAvailable = available + (params.creditQuantity ?? 0);
    if (effectiveAvailable < params.requiredQuantity) {
      throw new BadRequestException(
        `${params.contextLabel}: insufficient unshipped customer stock. Required=${params.requiredQuantity}, available=${effectiveAvailable}`,
      );
    }
  }

  // Non-throwing counterpart to assertTraderHasUnshippedStock/assertCustomerHasUnshippedStock,
  // used to tell a caller how much of a still-pending row could safely be cancelled/reduced right
  // now (e.g. undoing a batch that's been partially packed) instead of only pass/fail.
  async getTraderAvailableToReduce(
    client: LedgerClient,
    params: {
      seasonId: number;
      traderId: number | null;
      traderCategoryId: number;
      grade: Grade;
      pitamStatus: PitamStatus;
      isModulo: boolean;
      requestedQuantity: number;
      excludePrivateSelection?: boolean;
      onlyPrivateSelection?: boolean;
    },
  ) {
    const available = await this.getTraderUnshippedBalance(client, {
      seasonId: params.seasonId,
      traderId: params.traderId,
      traderCategoryId: params.traderCategoryId,
      grade: params.grade,
      pitamStatus: params.pitamStatus,
      isModulo: params.isModulo,
      excludePrivateSelection: params.excludePrivateSelection,
      onlyPrivateSelection: params.onlyPrivateSelection,
    });

    return Math.max(0, Math.min(params.requestedQuantity, available));
  }

  async getCustomerAvailableToReduce(
    client: LedgerClient,
    params: {
      seasonId: number;
      customerId: number;
      customerCategoryId: number;
      pitamStatus: PitamStatus;
      requestedQuantity: number;
    },
  ) {
    const available = await this.getCustomerUnshippedBalance(client, {
      seasonId: params.seasonId,
      customerId: params.customerId,
      customerCategoryId: params.customerCategoryId,
      pitamStatus: params.pitamStatus,
    });

    return Math.max(0, Math.min(params.requestedQuantity, available));
  }
}
