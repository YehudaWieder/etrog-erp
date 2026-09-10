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
      // Excludes rows manually parked as UNASSIGNED via remains-in-Italy withdrawal - those may
      // only leave the modulo pool via an explicit cancel or manual assign-by-share action, never
      // as a side effect of an unrelated GENERAL sweep/deduction.
      excludeUnassigned?: boolean;
      // Scopes the balance to exactly one movement type (e.g. checking a single withdrawal's own
      // UNASSIGNED-tagged balance) instead of the whole modulo pool for the tuple.
      type?: MovementType;
    },
  ) {
    // A "private selection pool" record is either:
    //   (a) a positive entry from harvest allocation (type = PRIVATE_SELECTION), or
    //   (b) a negative deduction explicitly tagged as taken from that pool.
    const conditions: Prisma.TraderStockWhereInput[] = [];
    if (query.onlyPrivateSelection) {
      conditions.push({ OR: [{ type: MovementType.PRIVATE_SELECTION }, { isFromPrivateSelection: true }] });
    } else if (query.excludePrivateSelection) {
      conditions.push({ type: { not: MovementType.PRIVATE_SELECTION }, isFromPrivateSelection: false });
    }
    if (query.excludeUnassigned) {
      conditions.push({ type: { not: MovementType.UNASSIGNED } });
    }
    if (query.type) {
      conditions.push({ type: query.type });
    }

    const aggregation = await client.traderStock.aggregate({
      where: {
        seasonId: query.seasonId,
        isDeleted: false,
        traderId: query.traderId,
        traderCategoryId: query.traderCategoryId,
        grade: query.grade,
        pitamStatus: query.pitamStatus,
        isModulo: query.isModulo,
        ...(conditions.length > 0 ? { AND: conditions } : {}),
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
      excludeUnassigned?: boolean;
      type?: MovementType;
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
      excludeUnassigned: params.excludeUnassigned,
      type: params.type,
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
      excludeUnassigned?: boolean;
      type?: MovementType;
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
      excludeUnassigned: params.excludeUnassigned,
      type: params.type,
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
