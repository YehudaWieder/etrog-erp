import { Injectable } from '@nestjs/common';
import { InventoryMovementScope } from 'src/inventory/types/inventory-query.types';
import {
  CustomerInventorySortBy,
  CustomerInventorySortOrder,
  CustomerInventorySummaryQuery,
  CustomerInventorySummaryResult,
  CustomerInventorySummaryRow,
} from './dto/customer-inventory-summary.dto';
import { SeasonsService } from 'src/seasons/seasons.service';
import {
  validateCustomerSummaryQuery,
} from 'src/inventory/services/validation/summary-query-rules';
import { CustomerAllocationSummaryRepository } from './customer-allocation-summary.repository';
import { buildCustomerAllocationSummaryWhere } from './utils/customer-allocation-summary-query.util';

@Injectable()
export class CustomerAllocationSummaryService {
  constructor(
    private readonly repository: CustomerAllocationSummaryRepository,
    private readonly seasonsService: SeasonsService,
  ) {}

  async getSummary(
    query: CustomerInventorySummaryQuery,
  ): Promise<CustomerInventorySummaryResult> {
    const seasonId = query.seasonId ?? (await this.seasonsService.findActiveSeason()).id;
    await this.seasonsService.assertSeasonExists(seasonId);

    const shipmentScope = query.shipmentScope ?? 'ALL';
    const sortBy = query.sortBy ?? 'customer';
    const sortOrder = query.sortOrder ?? 'asc';

    validateCustomerSummaryQuery(shipmentScope, sortBy, sortOrder);

    const where = buildCustomerAllocationSummaryWhere(
      query,
      seasonId,
      shipmentScope as InventoryMovementScope,
    );

    const rows = await this.repository.groupSummary(where);

    const filteredRows = rows.filter((row) => (row._sum.quantity ?? 0) !== 0);
    const customerIds = [...new Set(filteredRows.map((row) => row.customerId))];
    const categoryIds = [...new Set(filteredRows.map((row) => row.customerCategoryId))];

    const [customers, categories] = await Promise.all([
      this.repository.findCustomersByIds(customerIds),
      this.repository.findCategoriesByIds(categoryIds),
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
        totalQuantity: sorted.reduce((accumulator, row) => accumulator + row.quantity, 0),
      },
    };
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
          return this.compareValues(
            left.customerCategoryName ?? '',
            right.customerCategoryName ?? '',
            factor,
          );
        case 'quantity':
          return this.compareValues(left.quantity, right.quantity, factor);
        case 'pitamStatus':
          return this.compareValues(left.pitamStatus, right.pitamStatus, factor);
        case 'updatedAt':
          return this.compareValues(
            left.lastUpdatedAt?.getTime() ?? 0,
            right.lastUpdatedAt?.getTime() ?? 0,
            factor,
          );
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
