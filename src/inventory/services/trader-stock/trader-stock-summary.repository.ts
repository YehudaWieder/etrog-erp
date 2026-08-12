import { Injectable } from '@nestjs/common';
import { Grade, MovementType, PitamStatus, Prisma, SourceType } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { InventoryMovementScope } from 'src/inventory/services/inventory-core/types/inventory-query.types';

@Injectable()
export class TraderStockSummaryRepository {
  constructor(private readonly prisma: PrismaService) {}

  // REMAINS_IN_ITALY withdrawals (see RemainsInItalyWithdrawalService) record the negative anchor
  // in traderStock and, when the destination is a customer, a linked positive customerAllocation
  // row via MovementReferenceId - there's no field on the anchor row itself that says where it
  // went, so the TRANSFERRED_TO_CUSTOMER status filter needs this lookup to find those anchors.
  async findRemainsInItalyCustomerAnchorIds(
    seasonId: number,
    filters: { traderCategoryId?: number; grade?: Grade; pitamStatus?: PitamStatus },
  ): Promise<number[]> {
    const anchors = await this.prisma.traderStock.findMany({
      where: {
        seasonId,
        isDeleted: false,
        type: MovementType.REMAINS_IN_ITALY,
        quantity: { lt: 0 },
        traderCategoryId: filters.traderCategoryId,
        grade: filters.grade,
        pitamStatus: filters.pitamStatus,
      },
      select: { id: true },
    });

    if (anchors.length === 0) {
      return [];
    }

    const anchorIds = anchors.map((anchor) => anchor.id);

    const customerLinks = await this.prisma.customerAllocation.findMany({
      where: {
        MovementReferenceId: { in: anchorIds },
        isDeleted: false,
        type: MovementType.HARVEST_IN,
      },
      select: { MovementReferenceId: true },
    });

    return customerLinks
      .map((link) => link.MovementReferenceId)
      .filter((id): id is number => id !== null);
  }

  // CustomerGeneralTransferService rounds the amount it draws from traders UP to the smallest
  // quantity that splits into whole numbers by each trader's share (see calculateMinimalGrossByShares),
  // then credits the excess back to modulo as a positive isModulo ASSIGNED row sharing the same
  // MovementReferenceId as the customer allocation. That excess never reached a customer, so the
  // TRANSFERRED_TO_CUSTOMER filter needs to include these specific rows (grouped in as a normal
  // MODULO line, netting against any moduloUsed row from the same operation) so the per-category
  // breakdown table and the grand total agree - both are derived from the same rows.
  async findTransferredToCustomerModuloRefundIds(
    seasonId: number,
    filters: { traderCategoryId?: number; grade?: Grade; pitamStatus?: PitamStatus },
  ): Promise<number[]> {
    const generalTransferGroups = await this.prisma.customerAllocation.findMany({
      where: {
        seasonId,
        isDeleted: false,
        type: MovementType.INTERNAL_TRANSFER,
        takenFrom: SourceType.GENERAL,
      },
      select: { id: true },
    });

    if (generalTransferGroups.length === 0) {
      return [];
    }

    const groupIds = generalTransferGroups.map((group) => group.id);

    const refundRows = await this.prisma.traderStock.findMany({
      where: {
        MovementReferenceId: { in: groupIds },
        isDeleted: false,
        isModulo: true,
        traderId: null,
        type: MovementType.ASSIGNED,
        quantity: { gt: 0 },
        traderCategoryId: filters.traderCategoryId,
        grade: filters.grade,
        pitamStatus: filters.pitamStatus,
      },
      select: { id: true },
    });

    return refundRows.map((row) => row.id);
  }

  groupSummary(where: Prisma.TraderStockWhereInput, shipmentScope?: InventoryMovementScope) {
    // PACKED_SHIPPED, SHIPPED, and UNSHIPPED need box-status awareness; all other scopes use a simple groupBy.
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
        // Items in boxes with SHIPPED or DELIVERED status
        return ts.boxId !== null && (ts.box?.status === 'SHIPPED' || ts.box?.status === 'DELIVERED');
      }
      if (shipmentScope === 'UNSHIPPED') {
        // Include all source records (no boxId: HARVEST_IN, ASSIGNED, INTERNAL_TRANSFER,
        // SELF_PICKUP, WASTE, etc.) plus PACKED_SHIPPED deductions (negative, have a boxId).
        // All movement types reduce this view so the result is true remaining inventory.
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

  async sumQuantity(where: Prisma.TraderStockWhereInput): Promise<number> {
    const result = await this.prisma.traderStock.aggregate({
      where,
      _sum: { quantity: true },
    });

    return result._sum.quantity ?? 0;
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
