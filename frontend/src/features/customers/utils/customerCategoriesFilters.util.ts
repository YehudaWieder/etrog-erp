import type { GlobalScopedFilterConfig } from '../../../components/ui/GlobalScopedFilters';
import type { CustomerCategoriesFilterText } from '../customersPage.types';

type SeasonFilterItem = {
  id: number;
  yearName: number;
  isActive: boolean;
};

type CustomerFilterItem = {
  id: number;
  customerName: string;
};

export function parseSeasonFilterId(value: string): number | null {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : null;
}

export function parseCustomerFilterId(value: string): number | 'all' {
  if (value === 'all') {
    return 'all';
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 'all';
}

export function buildCustomerCategoriesFiltersConfig(params: {
  activeSeasonId: number | null;
  seasons: SeasonFilterItem[];
  customers: CustomerFilterItem[];
  t: CustomerCategoriesFilterText;
}): GlobalScopedFilterConfig[] {
  const { activeSeasonId, seasons, customers, t } = params;

  return [
    {
      key: 'seasonId',
      label: t.seasonFilterLabel,
      defaultValue: activeSeasonId ? String(activeSeasonId) : '',
      queryParam: 'ccSeason',
      options:
        seasons.length > 0
          ? seasons.map((season) => ({
              value: String(season.id),
              label: `${season.yearName}${season.isActive ? ` (${t.activeSeasonBadge})` : ''}`,
            }))
          : [{ value: '', label: t.noActiveSeason }],
    },
    {
      key: 'customerId',
      label: t.customerFilterLabel,
      defaultValue: 'all',
      queryParam: 'ccCustomer',
      options: [
        { value: 'all', label: t.allCustomersOption },
        ...customers.map((customer) => ({
          value: String(customer.id),
          label: customer.customerName,
        })),
      ],
    },
  ];
}
