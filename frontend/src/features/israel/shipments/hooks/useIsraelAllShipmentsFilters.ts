import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GlobalScopedFilterConfig, GlobalScopedFiltersApi } from '../../../../components/ui/GlobalScopedFilters';
import { getActiveSeason, getSeasons, type Season } from '../../../../services/seasonsApi';
import type { IsraelShipmentStatus } from '../../../../services/israel/israelShipmentsApi';
import { getIsraelFields, type IsraelField } from '../../../../services/israel/israelFieldsApi';
import type { IsraelAllShipmentsTableLabels } from '../israelShipments.types';
import { parseIsraelShipmentSeasonFilterId, parseIsraelShipmentStatusFilter } from '../utils/israelShipments.util';

type AllShipmentsFilterValues = {
  seasonId: string;
  status: string;
  fieldId: string;
};

type UseIsraelAllShipmentsFiltersResult = {
  filters: GlobalScopedFilterConfig[];
  seasons: Season[];
  activeSeasonId: number | null;
  selectedSeasonId: number | null;
  selectedStatus: 'all' | IsraelShipmentStatus;
  selectedFieldId: 'all' | number;
  filterDisplayValues: { seasonLabel: string | null; statusLabel: string | null; fieldLabel: string | null };
  handleFilterValuesChange: (values: Record<string, string>) => void;
  handleFiltersApiReady: (api: GlobalScopedFiltersApi) => void;
};

function parseFieldFilter(value: string): 'all' | number {
  if (value === 'all') {
    return 'all';
  }

  const parsedValue = Number.parseInt(value, 10);
  if (Number.isNaN(parsedValue) || parsedValue <= 0) {
    return 'all';
  }

  return parsedValue;
}

export function useIsraelAllShipmentsFilters(labels: IsraelAllShipmentsTableLabels): UseIsraelAllShipmentsFiltersResult {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [activeSeasonId, setActiveSeasonId] = useState<number | null>(null);
  const [fields, setFields] = useState<IsraelField[]>([]);
  const [filterValues, setFilterValues] = useState<AllShipmentsFilterValues>({ seasonId: '', status: 'all', fieldId: 'all' });
  const filtersApiRef = useRef<GlobalScopedFiltersApi | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadSeasons = async () => {
      try {
        const [nextSeasons, nextActiveSeason, nextFields] = await Promise.all([getSeasons(), getActiveSeason(), getIsraelFields()]);

        if (!isMounted) {
          return;
        }

        setSeasons(nextSeasons);
        setActiveSeasonId(nextActiveSeason.id);
        setFields(nextFields);
      } catch {
        if (!isMounted) {
          return;
        }

        setSeasons([]);
        setActiveSeasonId(null);
        setFields([]);
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

  const fieldOptions = useMemo(
    () => [...fields].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
    [fields],
  );

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
        key: 'fieldId',
        label: labels.fieldFilterLabel,
        defaultValue: 'all',
        queryParam: 'ishField',
        options: [
          { value: 'all', label: labels.allFieldsOption },
          ...fieldOptions.map((field) => ({ value: String(field.id), label: field.name })),
        ],
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
  }, [activeSeasonId, fieldOptions, labels, seasons]);

  const handleFilterValuesChange = useCallback((values: Record<string, string>) => {
    setFilterValues({
      seasonId: values.seasonId ?? '',
      status: values.status ?? 'all',
      fieldId: values.fieldId ?? 'all',
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

  const selectedFieldId = useMemo(() => parseFieldFilter(filterValues.fieldId), [filterValues.fieldId]);

  const filterDisplayValues = useMemo(() => {
    const seasonRecord = filterValues.seasonId
      ? seasons.find((s) => String(s.id) === filterValues.seasonId)
      : null;
    const seasonLabel = seasonRecord ? String(seasonRecord.yearName) : null;
    const statusLabel =
      filterValues.status && filterValues.status !== 'all'
        ? (labels.statusLabels[filterValues.status as IsraelShipmentStatus] ?? null)
        : null;
    const fieldLabel =
      filterValues.fieldId && filterValues.fieldId !== 'all'
        ? (fields.find((f) => String(f.id) === filterValues.fieldId)?.name ?? null)
        : null;
    return { seasonLabel, statusLabel, fieldLabel };
  }, [filterValues, seasons, labels, fields]);

  return {
    filters,
    seasons,
    activeSeasonId,
    selectedSeasonId,
    selectedStatus,
    selectedFieldId,
    filterDisplayValues,
    handleFilterValuesChange,
    handleFiltersApiReady,
  };
}
