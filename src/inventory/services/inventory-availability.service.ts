import { BadRequestException, Injectable } from '@nestjs/common';
import { Grade, PitamStatus, Prisma } from 'src/generated/prisma';
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
    },
  ) {
    const aggregation = await client.traderStock.aggregate({
      where: {
        seasonId: query.seasonId,
        isDeleted: false,
        traderId: query.traderId,
        traderCategoryId: query.traderCategoryId,
        grade: query.grade,
        pitamStatus: query.pitamStatus,
        isModulo: query.isModulo,
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
    },
  ) {
    const available = await this.getTraderUnshippedBalance(client, {
      seasonId: params.seasonId,
      traderId: params.traderId,
      traderCategoryId: params.traderCategoryId,
      grade: params.grade,
      pitamStatus: params.pitamStatus,
      isModulo: params.isModulo,
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
}
