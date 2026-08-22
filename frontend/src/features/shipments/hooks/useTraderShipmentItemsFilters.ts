import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GlobalScopedFilterConfig, GlobalScopedFiltersApi } from '../../../components/ui/GlobalScopedFilters';
import { getActiveSeason, getSeasons, type Season } from '../../../services/seasonsApi';
import { getShipmentsBySeason } from '../../../services/shipmentsApi';
import { getTraders, type Trader } from '../../../services/tradersApi';
import type { ShipmentItemsTableLabels } from '../shipments.types';
import { parseShipmentSeasonFilterId } from '../utils/shipments.util';

type TraderShipmentItemsFilterValues = {
  seasonId: string;
  shipmentNumber: string;
  traderId: string;
  stockSource: string;
  stockStatus: string;
};

type UseTraderShipmentItemsFiltersResult = {
  filters: GlobalScopedFilterConfig[];
  activeSeasonId: number | null;
  selectedSeasonId: number | null;
  selectedShipmentNumber: 'all' | number;
  selectedTraderId: 'all' | number;
  selectedStockSource: 'all' | 'GENERAL' | 'PRIVATE_SELECTION';
  selectedStockStatus: 'all' | 'PREPARING' | 'SHIPPED' | 'DELIVERED';
  handleFilterValuesChange: (values: Record<string, string>) => void;
  handleFiltersApiReady: (api: GlobalScopedFiltersApi) => void;
};

function parseNumericFilter(value: string): 'all' | number {
  if (value === 'all') {
    return 'all';
  }

  const parsedValue = Number.parseInt(value, 10);
  if (Number.isNaN(parsedValue) || parsedValue <= 0) {
    return 'all';
  }

  return parsedValue;
}

export function useTraderShipmentItemsFilters(labels: ShipmentItemsTableLabels): UseTraderShipmentItemsFiltersResult {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [activeSeasonId, setActiveSeasonId] = useState<number | null>(null);
  const [shipmentNumbers, setShipmentNumbers] = useState<number[]>([]);
  const [traders, setTraders] = useState<Trader[]>([]);
  const [filterValues, setFilterValues] = useState<TraderShipmentItemsFilterValues>({
    seasonId: '',
    shipmentNumber: 'all',
    traderId: 'all',
    stockSource: 'all',
    stockStatus: 'all',
  });
  const filtersApiRef = useRef<GlobalScopedFiltersApi | null>(null);

  useEffect(() => {
    let isMounted = true;

    Promise.all([getSeasons(), getActiveSeason(), getTraders()])
      .then(([nextSeasons, nextActiveSeason, nextTraders]) => {
        if (!isMounted) return;
        setSeasons(nextSeasons);
        setActiveSeasonId(nextActiveSeason.id);
        setTraders(nextTraders);
      })
      .catch(() => {
        if (!isMounted) return;
        setSeasons([]);
        setActiveSeasonId(null);
        setTraders([]);
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
    () => parseShipmentSeasonFilterId(filterValues.seasonId || (activeSeasonId ? String(activeSeasonId) : '')),
    [activeSeasonId, filterValues.seasonId],
  );

  useEffect(() => {
    if (!selectedSeasonId) {
      setShipmentNumbers([]);
      return;
    }

    let isMounted = true;

    getShipmentsBySeason(selectedSeasonId)
      .then((shipments) => {
        if (!isMounted) return;
        setShipmentNumbers(Array.from(new Set(shipments.map((shipment) => shipment.shipmentNumber))).sort((a, b) => b - a));
      })
      .catch(() => {
        if (!isMounted) return;
        setShipmentNumbers([]);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedSeasonId]);

  const traderOptions = useMemo(
    () => [...traders].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
    [traders],
  );

  const filters = useMemo<GlobalScopedFilterConfig[]>(
    () => [
      {
        key: 'seasonId',
        label: labels.seasonFilterLabel,
        defaultValue: activeSeasonId ? String(activeSeasonId) : '',
        queryParam: 'shTraderSummarySeason',
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
        queryParam: 'shTraderSummaryShipmentNumber',
        options: [
          { value: 'all', label: labels.allShipmentNumbersOption },
          ...shipmentNumbers.map((shipmentNumber) => ({ value: String(shipmentNumber), label: String(shipmentNumber) })),
        ],
      },
      {
        key: 'traderId',
        label: labels.traderFilterLabel,
        defaultValue: 'all',
        queryParam: 'shTraderSummaryTrader',
        options: [
          { value: 'all', label: labels.allTradersOption },
          ...traderOptions.map((trader) => ({ value: String(trader.id), label: trader.name })),
        ],
      },
      {
        key: 'stockSource',
        label: labels.stockSourceFilterLabel,
        defaultValue: 'all',
        queryParam: 'shTraderSummaryStockSource',
        options: [
          { value: 'all', label: labels.allStockSourceOption },
          { value: 'GENERAL', label: labels.stockSourceLabels.GENERAL },
          { value: 'PRIVATE_SELECTION', label: labels.stockSourceLabels.PRIVATE_SELECTION },
        ],
      },
      {
        key: 'stockStatus',
        label: labels.stockStatusFilterLabel,
        defaultValue: 'all',
        queryParam: 'shTraderSummaryStockStatus',
        options: [
          { value: 'all', label: labels.allStockStatusOption },
          { value: 'PREPARING', label: labels.stockStatusLabels.PREPARING },
          { value: 'SHIPPED', label: labels.stockStatusLabels.SHIPPED },
          { value: 'DELIVERED', label: labels.stockStatusLabels.DELIVERED },
        ],
      },
    ],
    [activeSeasonId, labels, seasons, shipmentNumbers, traderOptions],
  );

  const handleFilterValuesChange = useCallback((values: Record<string, string>) => {
    setFilterValues({
      seasonId: values.seasonId ?? '',
      shipmentNumber: values.shipmentNumber ?? 'all',
      traderId: values.traderId ?? 'all',
      stockSource: values.stockSource ?? 'all',
      stockStatus: values.stockStatus ?? 'all',
    });
  }, []);

  const handleFiltersApiReady = useCallback((api: GlobalScopedFiltersApi) => {
    filtersApiRef.current = api;
  }, []);

  const selectedShipmentNumber = useMemo(() => parseNumericFilter(filterValues.shipmentNumber), [filterValues.shipmentNumber]);
  const selectedTraderId = useMemo(() => parseNumericFilter(filterValues.traderId), [filterValues.traderId]);

  const selectedStockSource = useMemo<'all' | 'GENERAL' | 'PRIVATE_SELECTION'>(() => {
    if (filterValues.stockSource === 'GENERAL' || filterValues.stockSource === 'PRIVATE_SELECTION') {
      return filterValues.stockSource;
    }
    return 'all';
  }, [filterValues.stockSource]);

  const selectedStockStatus = useMemo<'all' | 'PREPARING' | 'SHIPPED' | 'DELIVERED'>(() => {
    if (filterValues.stockStatus === 'PREPARING' || filterValues.stockStatus === 'SHIPPED' || filterValues.stockStatus === 'DELIVERED') {
      return filterValues.stockStatus;
    }
    return 'all';
  }, [filterValues.stockStatus]);

  return {
    filters,
    activeSeasonId,
    selectedSeasonId,
    selectedShipmentNumber,
    selectedTraderId,
    selectedStockSource,
    selectedStockStatus,
    handleFilterValuesChange,
    handleFiltersApiReady,
  };
}
