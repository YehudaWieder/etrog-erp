import { Injectable } from '@nestjs/common';
import {
  CombinedInventorySummaryQuery,
} from 'src/inventory/dto/combined-inventory-summary.dto';
import { SeasonsService } from 'src/seasons/seasons.service';
import { validateCombinedSummaryQuery } from 'src/inventory/services/validation/summary-query-rules';
import { CombinedSummaryRepository } from './combined-summary.repository';
import {
  buildCombinedCustomerWhere,
  buildCombinedTraderWhere,
} from './utils/combined-summary-query.util';

@Injectable()
export class CombinedSummaryService {
  constructor(
    private readonly repository: CombinedSummaryRepository,
    private readonly seasonsService: SeasonsService,
  ) {}

  async getSummary(query: CombinedInventorySummaryQuery) {
    const seasonId = query.seasonId ?? (await this.seasonsService.findActiveSeason()).id;
    await this.seasonsService.assertSeasonExists(seasonId);

    const ownerScope = query.ownerScope ?? 'ALL';
    const movementScope = query.movementScope ?? 'ALL';

    validateCombinedSummaryQuery(query, ownerScope, movementScope);

    const traderWhere = buildCombinedTraderWhere(query, seasonId, ownerScope, movementScope);
    const customerWhere = buildCombinedCustomerWhere(query, seasonId, movementScope);

    const [traderGrouped, customerGrouped] = await Promise.all([
      this.repository.groupTraderSummary(traderWhere),
      this.repository.groupCustomerSummary(customerWhere),
    ]);

    const traderRows = traderGrouped.filter((row) => (row._sum.quantity ?? 0) !== 0);
    const customerRows = customerGrouped.filter((row) => (row._sum.quantity ?? 0) !== 0);

    const traderIds = traderRows
      .map((row) => row.traderId)
      .filter((id): id is number => id !== null);
    const traderCategoryIds = [...new Set(traderRows.map((row) => row.traderCategoryId))];
    const customerIds = [...new Set(customerRows.map((row) => row.customerId))];
    const customerCategoryIds = [...new Set(customerRows.map((row) => row.customerCategoryId))];

    const [traders, traderCategories, customers, customerCategories] = await Promise.all([
      this.repository.findTradersByIds(traderIds),
      this.repository.findTraderCategoriesByIds(traderCategoryIds),
      this.repository.findCustomersByIds(customerIds),
      this.repository.findCustomerCategoriesByIds(customerCategoryIds),
    ]);

    const traderMap = new Map(traders.map((trader): [number, string] => [trader.id, trader.name]));
    const traderCategoryMap = new Map(
      traderCategories.map((category): [number, string] => [category.id, category.name]),
    );
    const customerMap = new Map(
      customers.map((customer): [number, string] => [customer.id, customer.customerName]),
    );
    const customerCategoryMap = new Map(
      customerCategories.map(
        (category): [number, { name: string; grade: string | null }] => [
          category.id,
          { name: category.name, grade: category.grade },
        ],
      ),
    );

    const mappedTraderRows = traderRows.map((row) => ({
      traderId: row.traderId,
      traderName: row.isModulo
        ? 'MODULO'
        : row.traderId
          ? (traderMap.get(row.traderId) ?? null)
          : null,
      isModulo: row.isModulo,
      traderCategoryId: row.traderCategoryId,
      traderCategoryName: traderCategoryMap.get(row.traderCategoryId) ?? null,
      grade: row.grade,
      pitamStatus: row.pitamStatus,
      quantity: row._sum.quantity ?? 0,
      lastUpdatedAt: row._max.updatedAt,
    }));

    const mappedCustomerRows = customerRows.map((row) => {
      const category = customerCategoryMap.get(row.customerCategoryId);
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

    const traderSubtotals = mappedTraderRows.reduce(
      (accumulator, row) => {
        accumulator.totalQuantity += row.quantity;
        if (row.isModulo) accumulator.moduloQuantity += row.quantity;
        else accumulator.traderQuantity += row.quantity;
        return accumulator;
      },
      { totalQuantity: 0, moduloQuantity: 0, traderQuantity: 0 },
    );

    const customerSubtotals = {
      totalQuantity: mappedCustomerRows.reduce(
        (accumulator, row) => accumulator + row.quantity,
        0,
      ),
    };

    return {
      trader: { rows: mappedTraderRows, subtotals: traderSubtotals },
      customer: { rows: mappedCustomerRows, subtotals: customerSubtotals },
      grandTotal: traderSubtotals.totalQuantity + customerSubtotals.totalQuantity,
    };
  }

}
