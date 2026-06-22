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
  status: string;
  ownership: string;
};

type UseAllBoxesFiltersResult = {
  filters: GlobalScopedFilterConfig[];
  selectedSeasonId: number | null;
  selectedShipmentNumber: 'all' | number;
  selectedStatus: 'all' | BoxStatus;
  selectedOwnership: 'all' | string;
  filterDisplayValues: { seasonLabel: string | null; shipmentNumberLabel: string | null; statusLabel: string | null; ownershipLabel: string | null };
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
  const [ownershipOptions, setOwnershipOptions] = useState<string[]>([]);
  const [filterValues, setFilterValues] = useState<AllBoxesFilterValues>({
    seasonId: '',
    shipmentNumber: 'all',
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
      setOwnershipOptions([]);
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

        const uniqueOwnerships = Array.from(
          new Set(boxesByShipment.flat().map((box) => resolveOwnershipLabel(box, labels))),
        ).sort((a, b) => a.localeCompare(b));
        setOwnershipOptions(uniqueOwnerships);
      } catch {
        if (!isMounted) {
          return;
        }

        setShipmentNumbers([]);
        setOwnershipOptions([]);
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
          { value: OWNERSHIP_GROUP_TRADERS, label: labels.allTradersOption },
          { value: OWNERSHIP_GROUP_CUSTOMERS, label: labels.allCustomersOption },
          ...ownershipOptions.map((ownership) => ({
            value: ownership,
            label: ownership,
          })),
        ],
      },
    ];
  }, [activeSeasonId, labels, ownershipOptions, seasons, shipmentNumbers]);

  const handleFilterValuesChange = useCallback((values: Record<string, string>) => {
    setFilterValues({
      seasonId: values.seasonId ?? '',
      shipmentNumber: values.shipmentNumber ?? 'all',
      status: values.status ?? 'all',
      ownership: values.ownership ?? 'all',
    });
  }, []);

  const handleFiltersApiReady = useCallback((api: GlobalScopedFiltersApi) => {
    filtersApiRef.current = api;
  }, []);

  const selectedShipmentNumber = useMemo(() => parseShipmentNumberFilter(filterValues.shipmentNumber), [filterValues.shipmentNumber]);

  const selectedStatus = useMemo(() => parseBoxStatusFilter(filterValues.status), [filterValues.status]);

  const selectedOwnership = useMemo(
    () => parseBoxOwnershipFilter(filterValues.ownership, ownershipOptions),
    [filterValues.ownership, ownershipOptions],
  );

  const filterDisplayValues = useMemo(() => {
    const seasonRecord = filterValues.seasonId ? seasons.find((s) => String(s.id) === filterValues.seasonId) : null;
    const seasonLabel = seasonRecord ? String(seasonRecord.yearName) : null;
    const shipmentNumberLabel = filterValues.shipmentNumber !== 'all' ? filterValues.shipmentNumber : null;
    const statusLabel = filterValues.status !== 'all' ? (labels.statusLabels[filterValues.status as BoxStatus] ?? null) : null;
    let ownershipLabel: string | null = null;
    if (filterValues.ownership !== 'all') {
      if (filterValues.ownership === OWNERSHIP_GROUP_TRADERS) ownershipLabel = labels.allTradersOption;
      else if (filterValues.ownership === OWNERSHIP_GROUP_CUSTOMERS) ownershipLabel = labels.allCustomersOption;
      else ownershipLabel = filterValues.ownership;
    }
    return { seasonLabel, shipmentNumberLabel, statusLabel, ownershipLabel };
  }, [filterValues, seasons, labels]);

  return {
    filters,
    selectedSeasonId,
    selectedShipmentNumber,
    selectedStatus,
    selectedOwnership,
    filterDisplayValues,
    handleFilterValuesChange,
    handleFiltersApiReady,
  };
}
