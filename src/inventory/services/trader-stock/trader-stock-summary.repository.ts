import { Injectable } from '@nestjs/common';
import { Prisma } from 'src/generated/prisma';
import { PrismaService } from 'src/prisma/prisma.service';
import { InventoryMovementScope } from 'src/inventory/services/inventory-core/types/inventory-query.types';

@Injectable()
export class TraderStockSummaryRepository {
  constructor(private readonly prisma: PrismaService) {}

  groupSummary(where: Prisma.TraderStockWhereInput, shipmentScope?: InventoryMovementScope) {
    // For PACKED_SHIPPED, SHIPPED, and UNSHIPPED scopes, we need to check Box.status
    if (shipmentScope === 'PACKED_SHIPPED' || shipmentScope === 'SHIPPED' || shipmentScope === 'UNSHIPPED') {
      return this.groupSummaryWithBoxStatus(where, shipmentScope);
    }

    return this.prisma.traderStock.groupBy({
      by: ['traderId', 'isModulo', 'traderCategoryId', 'grade', 'pitamStatus'],
      where,
      _sum: { quantity: true },
      _max: { updatedAt: true },
    });
  }

  private async groupSummaryWithBoxStatus(
    where: Prisma.TraderStockWhereInput,
    shipmentScope: InventoryMovementScope,
  ) {
    // Get all trader stocks that match the base filter with related box
    const traderStocks = await this.prisma.traderStock.findMany({
      where,
      include: {
        box: true,
      },
    });

    // Filter by box status
    const filtered = traderStocks.filter((ts: any) => {
      if (shipmentScope === 'PACKED_SHIPPED') {
        // Items in a box (packed) - any box status
        return ts.boxId !== null;
      }
      if (shipmentScope === 'SHIPPED') {
        // Items in boxes with SHIPPED status
        return ts.boxId !== null && ts.box?.status === 'SHIPPED';
      }
      if (shipmentScope === 'UNSHIPPED') {
        // Source records (positive) have no boxId — always include.
        // Deduction records (PACKED_SHIPPED, negative) have a boxId; include them
        // regardless of box status so that shipped deductions still reduce the pool.
        return ts.boxId === null || ts.quantity < 0;
      }
      return true;
    });

    // Group the filtered results manually
    const grouped = new Map<
      string,
      {
        traderId: number | null;
        isModulo: boolean;
        traderCategoryId: number;
        grade: string;
        pitamStatus: string;
        totalQuantity: number;
        maxUpdatedAt: Date | null;
      }
    >();

    for (const ts of filtered) {
      const key = `${ts.traderId}|${ts.isModulo}|${ts.traderCategoryId}|${ts.grade}|${ts.pitamStatus}`;
      const existing = grouped.get(key);

      if (existing) {
        existing.totalQuantity += ts.quantity;
        if (ts.updatedAt && (!existing.maxUpdatedAt || ts.updatedAt > existing.maxUpdatedAt)) {
          existing.maxUpdatedAt = ts.updatedAt;
        }
      } else {
        grouped.set(key, {
          traderId: ts.traderId,
          isModulo: ts.isModulo,
          traderCategoryId: ts.traderCategoryId,
          grade: ts.grade,
          pitamStatus: ts.pitamStatus,
          totalQuantity: ts.quantity,
          maxUpdatedAt: ts.updatedAt,
        });
      }
    }

    // Convert to the expected format
    return Array.from(grouped.values()).map((g) => ({
      traderId: g.traderId,
      isModulo: g.isModulo,
      traderCategoryId: g.traderCategoryId,
      grade: g.grade,
      pitamStatus: g.pitamStatus,
      _sum: { quantity: g.totalQuantity },
      _max: { updatedAt: g.maxUpdatedAt },
    }));
  }

  findTradersByIds(traderIds: number[]) {
    if (!traderIds.length) {
      return Promise.resolve([] as { id: number; name: string }[]);
    }

    return this.prisma.trader.findMany({
      where: { id: { in: traderIds } },
      select: { id: true, name: true },
    });
  }

  findCategoriesByIds(categoryIds: number[]) {
    if (!categoryIds.length) {
      return Promise.resolve([] as { id: number; name: string }[]);
    }

    return this.prisma.tradersCategories.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true },
    });
  }
}
