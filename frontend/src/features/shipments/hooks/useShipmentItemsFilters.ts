import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GlobalScopedFilterConfig, GlobalScopedFiltersApi } from '../../../components/ui/GlobalScopedFilters';
import { getBoxesByShipment } from '../../../services/boxesApi';
import { getActiveSeason, getSeasons, type Season } from '../../../services/seasonsApi';
import { getShipmentItemsByBox, type ShipmentItemRecord } from '../../../services/shipmentItemsApi';
import { getShipmentsBySeason } from '../../../services/shipmentsApi';
import type { ShipmentItemsTableLabels } from '../shipments.types';
import { parseShipmentSeasonFilterId } from '../utils/shipments.util';

type ShipmentItemsFilterValues = {
  seasonId: string;
  boxNumber: string;
  shipmentNumber: string;
  ownership: string;
};

type UseShipmentItemsFiltersResult = {
  filters: GlobalScopedFilterConfig[];
  selectedSeasonId: number | null;
  selectedBoxNumber: 'all' | number;
  selectedShipmentNumber: 'all' | number;
  selectedOwnership: 'all' | string;
  handleFilterValuesChange: (values: Record<string, string>) => void;
  handleFiltersApiReady: (api: GlobalScopedFiltersApi) => void;
};

const OWNERSHIP_GROUP_TRADERS = 'type:TRADER';
const OWNERSHIP_GROUP_CUSTOMERS = 'type:CUSTOMER';

function resolveOwnershipLabel(item: ShipmentItemRecord, labels: ShipmentItemsTableLabels): string {
  if (item.ownershipType === 'TRADER') {
    return item.trader?.name || labels.ownershipLabels.TRADER;
  }

  if (item.ownershipType === 'CUSTOMER') {
    return item.customer?.customerName || labels.ownershipLabels.CUSTOMER;
  }

  return labels.ownershipLabels[item.ownershipType];
}

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

function parseOwnershipFilter(value: string, availableOwnerships: string[]): 'all' | string {
  if (value === 'all') {
    return 'all';
  }

  if (value === OWNERSHIP_GROUP_TRADERS || value === OWNERSHIP_GROUP_CUSTOMERS) {
    return value;
  }

  return availableOwnerships.includes(value) ? value : 'all';
}

export function useShipmentItemsFilters(labels: ShipmentItemsTableLabels): UseShipmentItemsFiltersResult {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [activeSeasonId, setActiveSeasonId] = useState<number | null>(null);
  const [boxNumbers, setBoxNumbers] = useState<number[]>([]);
  const [shipmentNumbers, setShipmentNumbers] = useState<number[]>([]);
  const [traderOptions, setTraderOptions] = useState<string[]>([]);
  const [customerOptions, setCustomerOptions] = useState<string[]>([]);
  const [filterValues, setFilterValues] = useState<ShipmentItemsFilterValues>({
    seasonId: '',
    boxNumber: 'all',
    shipmentNumber: 'all',
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
      setBoxNumbers([]);
      setShipmentNumbers([]);
      setTraderOptions([]);
      setCustomerOptions([]);
      return;
    }

    let isMounted = true;

    const loadFilterOptions = async () => {
      try {
        const shipments = await getShipmentsBySeason(selectedSeasonId);
        if (!isMounted) {
          return;
        }

        const uniqueShipmentNumbers = Array.from(new Set(shipments.map((shipment) => shipment.shipmentNumber))).sort(
          (a, b) => b - a,
        );
        setShipmentNumbers(uniqueShipmentNumbers);

        const boxesByShipment = await Promise.all(shipments.map(async (shipment) => getBoxesByShipment(shipment.id)));
        if (!isMounted) {
          return;
        }

        const boxes = boxesByShipment.flat();
        const uniqueBoxNumbers = Array.from(new Set(boxes.map((box) => box.boxNumber))).sort((a, b) => b - a);
        setBoxNumbers(uniqueBoxNumbers);

        const itemsByBox = await Promise.all(boxes.map(async (box) => getShipmentItemsByBox(box.id)));
        if (!isMounted) {
          return;
        }

        const traders = new Set<string>();
        const customers = new Set<string>();
        for (const item of itemsByBox.flat()) {
          if (item.ownershipType === 'TRADER') {
            traders.add(resolveOwnershipLabel(item, labels));
          } else if (item.ownershipType === 'CUSTOMER') {
            customers.add(resolveOwnershipLabel(item, labels));
          }
        }
        setTraderOptions(Array.from(traders).sort((a, b) => a.localeCompare(b)));
        setCustomerOptions(Array.from(customers).sort((a, b) => a.localeCompare(b)));
      } catch {
        if (!isMounted) {
          return;
        }

        setBoxNumbers([]);
        setShipmentNumbers([]);
        setTraderOptions([]);
        setCustomerOptions([]);
      }
    };

    loadFilterOptions();

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
        queryParam: 'shItemsSeason',
        options:
          seasons.length > 0
            ? seasons.map((season) => ({
                value: String(season.id),
                label: `${season.yearName}${season.isActive ? ` (${labels.activeSeasonBadge})` : ''}`,
              }))
            : [{ value: '', label: labels.noActiveSeason }],
      },
      {
        key: 'boxNumber',
        label: labels.boxNumberFilterLabel,
        defaultValue: 'all',
        queryParam: 'shItemsBoxNumber',
        options: [
          { value: 'all', label: labels.allBoxNumbersOption },
          ...boxNumbers.map((boxNumber) => ({
            value: String(boxNumber),
            label: String(boxNumber),
          })),
        ],
      },
      {
        key: 'shipmentNumber',
        label: labels.shipmentNumberFilterLabel,
        defaultValue: 'all',
        queryParam: 'shItemsShipmentNumber',
        options: [
          { value: 'all', label: labels.allShipmentNumbersOption },
          ...shipmentNumbers.map((shipmentNumber) => ({
            value: String(shipmentNumber),
            label: String(shipmentNumber),
          })),
        ],
      },
      {
        key: 'ownership',
        label: labels.ownershipFilterLabel,
        defaultValue: 'all',
        queryParam: 'shItemsOwnership',
        options: [
          { value: 'all', label: labels.allOwnershipOption },
          { value: OWNERSHIP_GROUP_TRADERS, label: labels.allTradersOption, group: labels.tradersGroupLabel },
          ...traderOptions.map((o) => ({ value: o, label: o, group: labels.tradersGroupLabel })),
          { value: OWNERSHIP_GROUP_CUSTOMERS, label: labels.allCustomersOption, group: labels.customersGroupLabel },
          ...customerOptions.map((o) => ({ value: o, label: o, group: labels.customersGroupLabel })),
        ],
      },
    ];
  }, [activeSeasonId, boxNumbers, customerOptions, labels, seasons, shipmentNumbers, traderOptions]);

  const handleFilterValuesChange = useCallback((values: Record<string, string>) => {
    setFilterValues({
      seasonId: values.seasonId ?? '',
      boxNumber: values.boxNumber ?? 'all',
      shipmentNumber: values.shipmentNumber ?? 'all',
      ownership: values.ownership ?? 'all',
    });
  }, []);

  const handleFiltersApiReady = useCallback((api: GlobalScopedFiltersApi) => {
    filtersApiRef.current = api;
  }, []);

  const selectedBoxNumber = useMemo(() => parseNumericFilter(filterValues.boxNumber), [filterValues.boxNumber]);

  const selectedShipmentNumber = useMemo(
    () => parseNumericFilter(filterValues.shipmentNumber),
    [filterValues.shipmentNumber],
  );

  const selectedOwnership = useMemo(
    () => parseOwnershipFilter(filterValues.ownership, [...traderOptions, ...customerOptions]),
    [customerOptions, filterValues.ownership, traderOptions],
  );

  return {
    filters,
    selectedSeasonId,
    selectedBoxNumber,
    selectedShipmentNumber,
    selectedOwnership,
    handleFilterValuesChange,
    handleFiltersApiReady,
  };
}
