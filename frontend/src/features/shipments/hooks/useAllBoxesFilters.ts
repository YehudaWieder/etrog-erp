import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GlobalScopedFilterConfig, GlobalScopedFiltersApi } from '../../../components/ui/GlobalScopedFilters';
import { getBoxesByShipment, type BoxRecord, type BoxStatus } from '../../../services/boxesApi';
import { getActiveSeason, getSeasons, type Season } from '../../../services/seasonsApi';
import { getShipmentsBySeason } from '../../../services/shipmentsApi';
import type { BoxesTableLabels } from '../shipments.types';
import { parseShipmentSeasonFilterId } from '../utils/shipments.util';

type AllBoxesFilterValues = {
  seasonId: string;
  shipmentNumber: string;
  boxNumber: string;
  status: string;
  ownership: string;
};

type UseAllBoxesFiltersResult = {
  filters: GlobalScopedFilterConfig[];
  activeSeasonId: number | null;
  selectedSeasonId: number | null;
  selectedShipmentNumber: 'all' | number;
  selectedBoxNumber: string;
  selectedStatus: 'all' | BoxStatus;
  selectedOwnership: 'all' | string;
  filterDisplayValues: { seasonLabel: string | null; shipmentNumberLabel: string | null; boxNumberLabel: string | null; statusLabel: string | null; ownershipLabel: string | null };
  handleFilterValuesChange: (values: Record<string, string>) => void;
  handleFiltersApiReady: (api: GlobalScopedFiltersApi) => void;
};

const BOX_STATUS_VALUES: BoxStatus[] = ['OPEN', 'CLOSED', 'SHIPPED', 'DELIVERED'];
const OWNERSHIP_GROUP_TRADERS = 'type:TRADER';
const OWNERSHIP_GROUP_CUSTOMERS = 'type:CUSTOMER';

function resolveOwnershipLabel(row: BoxRecord, labels: BoxesTableLabels): string {
  if (row.ownershipType === 'TRADER') {
    return row.trader?.name || labels.ownershipLabels.TRADER;
  }

  if (row.ownershipType === 'CUSTOMER') {
    return row.customer?.customerName || labels.ownershipLabels.CUSTOMER;
  }

  return labels.ownershipLabels[row.ownershipType];
}

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

function parseBoxStatusFilter(value: string): 'all' | BoxStatus {
  if (value === 'all') {
    return 'all';
  }

  return BOX_STATUS_VALUES.includes(value as BoxStatus) ? (value as BoxStatus) : 'all';
}

function parseBoxOwnershipFilter(value: string, availableOwnerships: string[]): 'all' | string {
  if (value === 'all') {
    return 'all';
  }

  if (value === OWNERSHIP_GROUP_TRADERS || value === OWNERSHIP_GROUP_CUSTOMERS) {
    return value;
  }

  return availableOwnerships.includes(value) ? value : 'all';
}

export function useAllBoxesFilters(labels: BoxesTableLabels): UseAllBoxesFiltersResult {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [activeSeasonId, setActiveSeasonId] = useState<number | null>(null);
  const [shipmentNumbers, setShipmentNumbers] = useState<number[]>([]);
  const [traderOptions, setTraderOptions] = useState<string[]>([]);
  const [customerOptions, setCustomerOptions] = useState<string[]>([]);
  const [otherOwnershipOptions, setOtherOwnershipOptions] = useState<string[]>([]);
  const [filterValues, setFilterValues] = useState<AllBoxesFilterValues>({
    seasonId: '',
    shipmentNumber: 'all',
    boxNumber: '',
    status: 'all',
    ownership: 'all',
  });
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

  const selectedSeasonId = useMemo(
    () => parseShipmentSeasonFilterId(filterValues.seasonId || (activeSeasonId ? String(activeSeasonId) : '')),
    [activeSeasonId, filterValues.seasonId],
  );

  useEffect(() => {
    if (!selectedSeasonId) {
      setShipmentNumbers([]);
      setTraderOptions([]);
      setCustomerOptions([]);
      setOtherOwnershipOptions([]);
      return;
    }

    let isMounted = true;

    const loadShipmentNumbers = async () => {
      try {
        const shipments = await getShipmentsBySeason(selectedSeasonId);
        if (!isMounted) {
          return;
        }

        const uniqueShipmentNumbers = Array.from(new Set(shipments.map((shipment) => shipment.shipmentNumber))).sort(
          (a, b) => b - a,
        );
        setShipmentNumbers(uniqueShipmentNumbers);

        const boxesByShipment = await Promise.all(
          shipments.map(async (shipment) => getBoxesByShipment(shipment.id)),
        );

        if (!isMounted) {
          return;
        }

        const traders = new Set<string>();
        const customers = new Set<string>();
        const others = new Set<string>();
        for (const box of boxesByShipment.flat()) {
          if (box.ownershipType === 'TRADER') {
            traders.add(resolveOwnershipLabel(box, labels));
          } else if (box.ownershipType === 'CUSTOMER') {
            customers.add(resolveOwnershipLabel(box, labels));
          } else {
            others.add(resolveOwnershipLabel(box, labels));
          }
        }
        setTraderOptions(Array.from(traders).sort((a, b) => a.localeCompare(b)));
        setCustomerOptions(Array.from(customers).sort((a, b) => a.localeCompare(b)));
        setOtherOwnershipOptions(Array.from(others).sort((a, b) => a.localeCompare(b)));
      } catch {
        if (!isMounted) {
          return;
        }

        setShipmentNumbers([]);
        setTraderOptions([]);
        setCustomerOptions([]);
        setOtherOwnershipOptions([]);
      }
    };

    loadShipmentNumbers();

    return () => {
      isMounted = false;
    };
  }, [labels, selectedSeasonId]);

  const filters = useMemo<GlobalScopedFilterConfig[]>(() => {
    return [
      {
        key: 'seasonId',
        label: labels.seasonFilterLabel,
        defaultValue: activeSeasonId ? String(activeSeasonId) : '',
        queryParam: 'shBoxesSeason',
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
        queryParam: 'shBoxesShipmentNumber',
        options: [
          { value: 'all', label: labels.allShipmentNumbersOption },
          ...shipmentNumbers.map((shipmentNumber) => ({
            value: String(shipmentNumber),
            label: String(shipmentNumber),
          })),
        ],
      },
      {
        key: 'boxNumber',
        label: labels.boxNumberFilterLabel,
        defaultValue: '',
        queryParam: 'shBoxesBoxNumber',
        type: 'text',
        placeholder: labels.boxNumberFilterPlaceholder,
        options: [],
      },
      {
        key: 'status',
        label: labels.boxStatusFilterLabel,
        defaultValue: 'all',
        queryParam: 'shBoxesStatus',
        options: [
          { value: 'all', label: labels.allBoxStatusesOption },
          ...BOX_STATUS_VALUES.map((status) => ({
            value: status,
            label: labels.statusLabels[status],
          })),
        ],
      },
      {
        key: 'ownership',
        label: labels.ownershipFilterLabel,
        defaultValue: 'all',
        queryParam: 'shBoxesOwnership',
        options: [
          { value: 'all', label: labels.allOwnershipOption },
          ...otherOwnershipOptions.map((ownership) => ({
            value: ownership,
            label: ownership,
          })),
          { value: OWNERSHIP_GROUP_TRADERS, label: labels.allTradersOption, group: labels.tradersGroupLabel },
          ...traderOptions.map((ownership) => ({
            value: ownership,
            label: ownership,
            group: labels.tradersGroupLabel,
          })),
          { value: OWNERSHIP_GROUP_CUSTOMERS, label: labels.allCustomersOption, group: labels.customersGroupLabel },
          ...customerOptions.map((ownership) => ({
            value: ownership,
            label: ownership,
            group: labels.customersGroupLabel,
          })),
        ],
      },
    ];
  }, [activeSeasonId, customerOptions, labels, otherOwnershipOptions, seasons, shipmentNumbers, traderOptions]);

  const handleFilterValuesChange = useCallback((values: Record<string, string>) => {
    setFilterValues({
      seasonId: values.seasonId ?? '',
      shipmentNumber: values.shipmentNumber ?? 'all',
      boxNumber: values.boxNumber ?? '',
      status: values.status ?? 'all',
      ownership: values.ownership ?? 'all',
    });
  }, []);

  const handleFiltersApiReady = useCallback((api: GlobalScopedFiltersApi) => {
    filtersApiRef.current = api;
  }, []);

  const selectedShipmentNumber = useMemo(() => parseShipmentNumberFilter(filterValues.shipmentNumber), [filterValues.shipmentNumber]);

  const selectedBoxNumber = useMemo(() => filterValues.boxNumber.trim(), [filterValues.boxNumber]);

  const selectedStatus = useMemo(() => parseBoxStatusFilter(filterValues.status), [filterValues.status]);

  const allOwnershipOptions = useMemo(
    () => [...traderOptions, ...customerOptions, ...otherOwnershipOptions],
    [traderOptions, customerOptions, otherOwnershipOptions],
  );

  const selectedOwnership = useMemo(
    () => parseBoxOwnershipFilter(filterValues.ownership, allOwnershipOptions),
    [filterValues.ownership, allOwnershipOptions],
  );

  const filterDisplayValues = useMemo(() => {
    const seasonRecord = filterValues.seasonId ? seasons.find((s) => String(s.id) === filterValues.seasonId) : null;
    const seasonLabel = seasonRecord ? String(seasonRecord.yearName) : null;
    const shipmentNumberLabel = filterValues.shipmentNumber !== 'all' ? filterValues.shipmentNumber : null;
    const boxNumberLabel = filterValues.boxNumber.trim() ? filterValues.boxNumber.trim() : null;
    const statusLabel = filterValues.status !== 'all' ? (labels.statusLabels[filterValues.status as BoxStatus] ?? null) : null;
    let ownershipLabel: string | null = null;
    if (filterValues.ownership !== 'all') {
      if (filterValues.ownership === OWNERSHIP_GROUP_TRADERS) ownershipLabel = labels.allTradersOption;
      else if (filterValues.ownership === OWNERSHIP_GROUP_CUSTOMERS) ownershipLabel = labels.allCustomersOption;
      else ownershipLabel = filterValues.ownership;
    }
    return { seasonLabel, shipmentNumberLabel, boxNumberLabel, statusLabel, ownershipLabel };
  }, [filterValues, seasons, labels]);

  return {
    filters,
    activeSeasonId,
    selectedSeasonId,
    selectedShipmentNumber,
    selectedBoxNumber,
    selectedStatus,
    selectedOwnership,
    filterDisplayValues,
    handleFilterValuesChange,
    handleFiltersApiReady,
  };
}
