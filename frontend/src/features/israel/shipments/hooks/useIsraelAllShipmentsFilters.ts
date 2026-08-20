import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GlobalScopedFilterConfig, GlobalScopedFiltersApi } from '../../../../components/ui/GlobalScopedFilters';
import { getActiveSeason, getSeasons, type Season } from '../../../../services/seasonsApi';
import type { IsraelShipmentStatus } from '../../../../services/israelShipmentsApi';
import type { IsraelAllShipmentsTableLabels } from '../israelShipments.types';
import { parseIsraelShipmentSeasonFilterId, parseIsraelShipmentStatusFilter } from '../utils/israelShipments.util';

type AllShipmentsFilterValues = {
  seasonId: string;
  status: string;
};

type UseIsraelAllShipmentsFiltersResult = {
  filters: GlobalScopedFilterConfig[];
  seasons: Season[];
  activeSeasonId: number | null;
  selectedSeasonId: number | null;
  selectedStatus: 'all' | IsraelShipmentStatus;
  filterDisplayValues: { seasonLabel: string | null; statusLabel: string | null };
  handleFilterValuesChange: (values: Record<string, string>) => void;
  handleFiltersApiReady: (api: GlobalScopedFiltersApi) => void;
};

export function useIsraelAllShipmentsFilters(labels: IsraelAllShipmentsTableLabels): UseIsraelAllShipmentsFiltersResult {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [activeSeasonId, setActiveSeasonId] = useState<number | null>(null);
  const [filterValues, setFilterValues] = useState<AllShipmentsFilterValues>({ seasonId: '', status: 'all' });
  const filtersApiRef = useRef<GlobalScopedFiltersApi | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadSeasons = async () => {
      try {
        const [nextSeasons, nextActiveSeason] = await Promise.all([getSeasons(), getActiveSeason()]);

        if (!isMounted) {
          return;
        }

        setSeasons(nextSeasons);
        setActiveSeasonId(nextActiveSeason.id);
      } catch {
        if (!isMounted) {
          return;
        }

        setSeasons([]);
        setActiveSeasonId(null);
      }
    };

    loadSeasons();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!activeSeasonId || !filtersApiRef.current || filterValues.seasonId) {
      return;
    }

    filtersApiRef.current.setFilterValue('seasonId', String(activeSeasonId));
  }, [activeSeasonId, filterValues.seasonId]);

  const filters = useMemo<GlobalScopedFilterConfig[]>(() => {
    return [
      {
        key: 'seasonId',
        label: labels.seasonFilterLabel,
        defaultValue: activeSeasonId ? String(activeSeasonId) : '',
        queryParam: 'ishSeason',
        options:
          seasons.length > 0
            ? seasons.map((season) => ({
                value: String(season.id),
                label: `${season.yearName}${season.isActive ? ` (${labels.activeSeasonBadge})` : ''}`,
              }))
            : [{ value: '', label: labels.noActiveSeason }],
      },
      {
        key: 'status',
        label: labels.statusFilterLabel,
        defaultValue: 'all',
        queryParam: 'ishStatus',
        options: [
          { value: 'all', label: labels.allStatusesOption },
          { value: 'PREPARING', label: labels.statusLabels.PREPARING },
          { value: 'SHIPPED', label: labels.statusLabels.SHIPPED },
          { value: 'DELIVERED', label: labels.statusLabels.DELIVERED },
          { value: 'CANCELLED', label: labels.statusLabels.CANCELLED },
        ],
      },
    ];
  }, [activeSeasonId, labels, seasons]);

  const handleFilterValuesChange = useCallback((values: Record<string, string>) => {
    setFilterValues({
      seasonId: values.seasonId ?? '',
      status: values.status ?? 'all',
    });
  }, []);

  const handleFiltersApiReady = useCallback((api: GlobalScopedFiltersApi) => {
    filtersApiRef.current = api;
  }, []);

  const selectedSeasonId = useMemo(
    () => parseIsraelShipmentSeasonFilterId(filterValues.seasonId || (activeSeasonId ? String(activeSeasonId) : '')),
    [activeSeasonId, filterValues.seasonId],
  );

  const selectedStatus = useMemo(
    () => parseIsraelShipmentStatusFilter(filterValues.status),
    [filterValues.status],
  );

  const filterDisplayValues = useMemo(() => {
    const seasonRecord = filterValues.seasonId
      ? seasons.find((s) => String(s.id) === filterValues.seasonId)
      : null;
    const seasonLabel = seasonRecord ? String(seasonRecord.yearName) : null;
    const statusLabel =
      filterValues.status && filterValues.status !== 'all'
        ? (labels.statusLabels[filterValues.status as IsraelShipmentStatus] ?? null)
        : null;
    return { seasonLabel, statusLabel };
  }, [filterValues, seasons, labels]);

  return {
    filters,
    seasons,
    activeSeasonId,
    selectedSeasonId,
    selectedStatus,
    filterDisplayValues,
    handleFilterValuesChange,
    handleFiltersApiReady,
  };
}
