import type { GlobalScopedFilterConfig } from '../../../components/ui/GlobalScopedFilters';

type SeasonFilterItem = {
  id: number;
  yearName: number;
  isActive: boolean;
};

export function parseSeasonFilterId(value: string): number | null {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : null;
}

export function buildTraderSeasonSettingsFiltersConfig(params: {
  activeSeasonId: number | null;
  seasons: SeasonFilterItem[];
  seasonFilterLabel: string;
  activeSeasonBadge: string;
  noActiveSeason: string;
}): GlobalScopedFilterConfig[] {
  const { activeSeasonId, seasons, seasonFilterLabel, activeSeasonBadge, noActiveSeason } = params;

  return [
    {
      key: 'seasonId',
      label: seasonFilterLabel,
      defaultValue: activeSeasonId ? String(activeSeasonId) : '',
      queryParam: 'tssSeason',
      options:
        seasons.length > 0
          ? seasons.map((season) => ({
              value: String(season.id),
              label: `${season.yearName}${season.isActive ? ` (${activeSeasonBadge})` : ''}`,
            }))
          : [{ value: '', label: noActiveSeason }],
    },
  ];
}
