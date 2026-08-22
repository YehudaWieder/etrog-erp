import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GlobalScopedFilterConfig, GlobalScopedFiltersApi } from '../../../../components/ui/GlobalScopedFilters';
import { getActiveSeason, getSeasons, type Season } from '../../../../services/seasonsApi';
import { getIsraelShipmentsBySeason } from '../../../../services/israel/israelShipmentsApi';
import type { IsraelShipmentItemsTableLabels } from '../israelShipments.types';
import { parseIsraelShipmentSeasonFilterId } from '../utils/israelShipments.util';

type ItemsFilterValues = {
  seasonId: string;
  shipmentNumber: string;
  boxNumber: string;
};

type UseIsraelShipmentItemsFiltersResult = {
  filters: GlobalScopedFilterConfig[];
  activeSeasonId: number | null;
  selectedSeasonId: number | null;
  selectedShipmentNumber: 'all' | number;
  selectedBoxNumber: string;
  handleFilterValuesChange: (values: Record<string, string>) => void;
  handleFiltersApiReady: (api: GlobalScopedFiltersApi) => void;
};

function parseShipmentNumberFilter(value: string): 'all' | number {
  if (value === 'all') {
    return 'all';
  }

  const parsedValue = Number.parseInt(value, 10);
  if (Number.isNaN(parsedValue) || parsedValue <= 0) {
    return 'all';
  }

  return parsedValue;
}

export function useIsraelShipmentItemsFilters(labels: IsraelShipmentItemsTableLabels): UseIsraelShipmentItemsFiltersResult {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [activeSeasonId, setActiveSeasonId] = useState<number | null>(null);
  const [shipmentNumbers, setShipmentNumbers] = useState<number[]>([]);
  const [filterValues, setFilterValues] = useState<ItemsFilterValues>({ seasonId: '', shipmentNumber: 'all', boxNumber: '' });
  const filtersApiRef = useRef<GlobalScopedFiltersApi | null>(null);

  useEffect(() => {
    let isMounted = true;

    Promise.all([getSeasons(), getActiveSeason()])
      .then(([nextSeasons, nextActiveSeason]) => {
        if (!isMounted) return;
        setSeasons(nextSeasons);
        setActiveSeasonId(nextActiveSeason.id);
      })
      .catch(() => {
        if (!isMounted) return;
        setSeasons([]);
        setActiveSeasonId(null);
      });

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

  const selectedSeasonId = useMemo(
    () => parseIsraelShipmentSeasonFilterId(filterValues.seasonId || (activeSeasonId ? String(activeSeasonId) : '')),
    [activeSeasonId, filterValues.seasonId],
  );

  useEffect(() => {
    if (!selectedSeasonId) {
      setShipmentNumbers([]);
      return;
    }

    let isMounted = true;

    getIsraelShipmentsBySeason(selectedSeasonId)
      .then((shipments) => {
        if (!isMounted) return;
        setShipmentNumbers(Array.from(new Set(shipments.map((s) => s.shipmentNumber))).sort((a, b) => b - a));
      })
      .catch(() => {
        if (isMounted) setShipmentNumbers([]);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedSeasonId]);

  const filters = useMemo<GlobalScopedFilterConfig[]>(() => {
    return [
      {
        key: 'seasonId',
        label: labels.seasonFilterLabel,
        defaultValue: activeSeasonId ? String(activeSeasonId) : '',
        queryParam: 'ishItemsSeason',
        options:
          seasons.length > 0
            ? seasons.map((season) => ({
                value: String(season.id),
                label: `${season.yearName}${season.isActive ? ` (${labels.activeSeasonBadge})` : ''}`,
              }))
            : [{ value: '', label: labels.noActiveSeason }],
      },
      {
        key: 'shipmentNumber',
        label: labels.shipmentNumberFilterLabel,
        defaultValue: 'all',
        queryParam: 'ishItemsShipmentNumber',
        options: [
          { value: 'all', label: labels.allShipmentNumbersOption },
          ...shipmentNumbers.map((shipmentNumber) => ({ value: String(shipmentNumber), label: String(shipmentNumber) })),
        ],
      },
      {
        key: 'boxNumber',
        label: labels.boxNumberFilterLabel,
        defaultValue: '',
        queryParam: 'ishItemsBoxNumber',
        type: 'text',
        options: [],
      },
    ];
  }, [activeSeasonId, labels, seasons, shipmentNumbers]);

  const handleFilterValuesChange = useCallback((values: Record<string, string>) => {
    setFilterValues({
      seasonId: values.seasonId ?? '',
      shipmentNumber: values.shipmentNumber ?? 'all',
      boxNumber: values.boxNumber ?? '',
    });
  }, []);

  const handleFiltersApiReady = useCallback((api: GlobalScopedFiltersApi) => {
    filtersApiRef.current = api;
  }, []);

  const selectedShipmentNumber = useMemo(() => parseShipmentNumberFilter(filterValues.shipmentNumber), [filterValues.shipmentNumber]);
  const selectedBoxNumber = useMemo(() => filterValues.boxNumber.trim(), [filterValues.boxNumber]);

  return {
    filters,
    activeSeasonId,
    selectedSeasonId,
    selectedShipmentNumber,
    selectedBoxNumber,
    handleFilterValuesChange,
    handleFiltersApiReady,
  };
}
