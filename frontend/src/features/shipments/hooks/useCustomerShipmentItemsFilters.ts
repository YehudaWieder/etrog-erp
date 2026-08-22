import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GlobalScopedFilterConfig, GlobalScopedFiltersApi } from '../../../components/ui/GlobalScopedFilters';
import { getActiveSeason, getSeasons, type Season } from '../../../services/seasonsApi';
import { getShipmentsBySeason } from '../../../services/shipmentsApi';
import { getCustomers, type Customer } from '../../../services/customersApi';
import type { ShipmentItemsTableLabels } from '../shipments.types';
import { parseShipmentSeasonFilterId } from '../utils/shipments.util';

type CustomerShipmentItemsFilterValues = {
  seasonId: string;
  shipmentNumber: string;
  customerId: string;
  stockStatus: string;
};

type UseCustomerShipmentItemsFiltersResult = {
  filters: GlobalScopedFilterConfig[];
  activeSeasonId: number | null;
  selectedSeasonId: number | null;
  selectedShipmentNumber: 'all' | number;
  selectedCustomerId: 'all' | number;
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

export function useCustomerShipmentItemsFilters(labels: ShipmentItemsTableLabels): UseCustomerShipmentItemsFiltersResult {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [activeSeasonId, setActiveSeasonId] = useState<number | null>(null);
  const [shipmentNumbers, setShipmentNumbers] = useState<number[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filterValues, setFilterValues] = useState<CustomerShipmentItemsFilterValues>({
    seasonId: '',
    shipmentNumber: 'all',
    customerId: 'all',
    stockStatus: 'all',
  });
  const filtersApiRef = useRef<GlobalScopedFiltersApi | null>(null);

  useEffect(() => {
    let isMounted = true;

    Promise.all([getSeasons(), getActiveSeason(), getCustomers()])
      .then(([nextSeasons, nextActiveSeason, nextCustomers]) => {
        if (!isMounted) return;
        setSeasons(nextSeasons);
        setActiveSeasonId(nextActiveSeason.id);
        setCustomers(nextCustomers);
      })
      .catch(() => {
        if (!isMounted) return;
        setSeasons([]);
        setActiveSeasonId(null);
        setCustomers([]);
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

  const customerOptions = useMemo(
    () => [...customers].sort((a, b) => a.customerName.localeCompare(b.customerName, undefined, { sensitivity: 'base' })),
    [customers],
  );

  const filters = useMemo<GlobalScopedFilterConfig[]>(
    () => [
      {
        key: 'seasonId',
        label: labels.seasonFilterLabel,
        defaultValue: activeSeasonId ? String(activeSeasonId) : '',
        queryParam: 'shCustomerSummarySeason',
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
        queryParam: 'shCustomerSummaryShipmentNumber',
        options: [
          { value: 'all', label: labels.allShipmentNumbersOption },
          ...shipmentNumbers.map((shipmentNumber) => ({ value: String(shipmentNumber), label: String(shipmentNumber) })),
        ],
      },
      {
        key: 'customerId',
        label: labels.customerFilterLabel,
        defaultValue: 'all',
        queryParam: 'shCustomerSummaryCustomer',
        options: [
          { value: 'all', label: labels.allCustomersOption },
          ...customerOptions.map((customer) => ({ value: String(customer.id), label: customer.customerName })),
        ],
      },
      {
        key: 'stockStatus',
        label: labels.stockStatusFilterLabel,
        defaultValue: 'all',
        queryParam: 'shCustomerSummaryStockStatus',
        options: [
          { value: 'all', label: labels.allStockStatusOption },
          { value: 'PREPARING', label: labels.stockStatusLabels.PREPARING },
          { value: 'SHIPPED', label: labels.stockStatusLabels.SHIPPED },
          { value: 'DELIVERED', label: labels.stockStatusLabels.DELIVERED },
        ],
      },
    ],
    [activeSeasonId, customerOptions, labels, seasons, shipmentNumbers],
  );

  const handleFilterValuesChange = useCallback((values: Record<string, string>) => {
    setFilterValues({
      seasonId: values.seasonId ?? '',
      shipmentNumber: values.shipmentNumber ?? 'all',
      customerId: values.customerId ?? 'all',
      stockStatus: values.stockStatus ?? 'all',
    });
  }, []);

  const handleFiltersApiReady = useCallback((api: GlobalScopedFiltersApi) => {
    filtersApiRef.current = api;
  }, []);

  const selectedShipmentNumber = useMemo(() => parseNumericFilter(filterValues.shipmentNumber), [filterValues.shipmentNumber]);
  const selectedCustomerId = useMemo(() => parseNumericFilter(filterValues.customerId), [filterValues.customerId]);

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
    selectedCustomerId,
    selectedStockStatus,
    handleFilterValuesChange,
    handleFiltersApiReady,
  };
}
