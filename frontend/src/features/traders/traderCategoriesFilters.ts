import type { GlobalScopedFilterConfig } from '../../components/ui/GlobalScopedFilters';

type SeasonFilterItem = {
  id: number;
  yearName: number;
  isActive: boolean;
};

type TraderFilterItem = {
  id: number;
  name: string;
};

type TraderCategoriesFilterText = {
  seasonFilterLabel: string;
  traderFilterLabel: string;
  activeSeasonBadge: string;
  allTradersOption: string;
  noActiveSeason: string;
};

export function parseTraderCategorySeasonFilterId(value: string): number | null {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : null;
}

export function parseTraderFilterId(value: string): number | 'all' {
  if (value === 'all') {
    return 'all';
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 'all';
}

export function buildTraderCategoriesFiltersConfig(params: {
  activeSeasonId: number | null;
  seasons: SeasonFilterItem[];
  traders: TraderFilterItem[];
  t: TraderCategoriesFilterText;
}): GlobalScopedFilterConfig[] {
  const { activeSeasonId, seasons, traders, t } = params;

  return [
    {
      key: 'seasonId',
      label: t.seasonFilterLabel,
      defaultValue: activeSeasonId ? String(activeSeasonId) : '',
      queryParam: 'tcSeason',
      options:
        seasons.length > 0
          ? seasons.map((season) => ({
              value: String(season.id),
              label: `${season.yearName}${season.isActive ? ` (${t.activeSeasonBadge})` : ''}`,
            }))
          : [{ value: '', label: t.noActiveSeason }],
    },
    {
      key: 'traderId',
      label: t.traderFilterLabel,
      defaultValue: 'all',
      queryParam: 'tcTrader',
      options: [
        { value: 'all', label: t.allTradersOption },
        ...traders.map((trader) => ({
          value: String(trader.id),
          label: trader.name,
        })),
      ],
    },
  ];
}
