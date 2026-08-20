import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GlobalScopedFilterConfig, GlobalScopedFiltersApi } from '../../../../components/ui/GlobalScopedFilters';
import { getActiveSeason, getSeasons, type Season } from '../../../../services/seasonsApi';
import { getIsraelShipmentsBySeason } from '../../../../services/israelShipmentsApi';
import type { IsraelBoxStatus } from '../../../../services/israelBoxesApi';
import type { IsraelAllBoxesTableLabels } from '../israelShipments.types';
import {
  parseIsraelShipmentSeasonFilterId,
  parseIsraelBoxStatusFilter,
} from '../utils/israelShipments.util';

const UNASSIGNED_SHIPMENT_VALUE = 'unassigned';

type AllBoxesFilterValues = {
  seasonId: string;
  shipmentNumber: string;
  boxNumber: string;
  status: string;
};

type UseIsraelAllBoxesFiltersResult = {
  filters: GlobalScopedFilterConfig[];
  activeSeasonId: number | null;
  selectedSeasonId: number | null;
  selectedShipmentNumber: 'all' | 'unassigned' | number;
  selectedBoxNumber: string;
  selectedStatus: 'all' | IsraelBoxStatus;
  filterDisplayValues: { seasonLabel: string | null; shipmentNumberLabel: string | null; boxNumberLabel: string | null; statusLabel: string | null };
  handleFilterValuesChange: (values: Record<string, string>) => void;
  handleFiltersApiReady: (api: GlobalScopedFiltersApi) => void;
};

function parseShipmentNumberFilter(value: string): 'all' | 'unassigned' | number {
  if (value === 'all' || value === UNASSIGNED_SHIPMENT_VALUE) {
    return value;
  }

  const parsedValue = Number.parseInt(value, 10);
  if (Number.isNaN(parsedValue) || parsedValue <= 0) {
    return 'all';
  }

  return parsedValue;
}

export function useIsraelAllBoxesFilters(labels: IsraelAllBoxesTableLabels): UseIsraelAllBoxesFiltersResult {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [activeSeasonId, setActiveSeasonId] = useState<number | null>(null);
  const [shipmentNumbers, setShipmentNumbers] = useState<number[]>([]);
  const [filterValues, setFilterValues] = useState<AllBoxesFilterValues>({
    seasonId: '',
    shipmentNumber: 'all',
    boxNumber: '',
    status: 'all',
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
        if (!isMounted) {
          return;
        }
        const uniqueShipmentNumbers = Array.from(new Set(shipments.map((shipment) => shipment.shipmentNumber))).sort(
          (a, b) => b - a,
        );
        setShipmentNumbers(uniqueShipmentNumbers);
      })
      .catch(() => {
        if (isMounted) {
          setShipmentNumbers([]);
        }
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
        queryParam: 'ishBoxesSeason',
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
        queryParam: 'ishBoxesShipmentNumber',
        options: [
          { value: 'all', label: labels.allShipmentNumbersOption },
          { value: UNASSIGNED_SHIPMENT_VALUE, label: labels.unassignedShipmentOption },
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
        queryParam: 'ishBoxesBoxNumber',
        type: 'text',
        placeholder: labels.boxNumberFilterPlaceholder,
        options: [],
      },
      {
        key: 'status',
        label: labels.boxStatusFilterLabel,
        defaultValue: 'all',
        queryParam: 'ishBoxesStatus',
        options: [
          { value: 'all', label: labels.allBoxStatusesOption },
          { value: 'OPEN', label: labels.statusLabels.OPEN },
          { value: 'CLOSED', label: labels.statusLabels.CLOSED },
          { value: 'SHIPPED', label: labels.statusLabels.SHIPPED },
          { value: 'DELIVERED', label: labels.statusLabels.DELIVERED },
        ],
      },
    ];
  }, [activeSeasonId, labels, seasons, shipmentNumbers]);

  const handleFilterValuesChange = useCallback((values: Record<string, string>) => {
    setFilterValues({
      seasonId: values.seasonId ?? '',
      shipmentNumber: values.shipmentNumber ?? 'all',
      boxNumber: values.boxNumber ?? '',
      status: values.status ?? 'all',
    });
  }, []);

  const handleFiltersApiReady = useCallback((api: GlobalScopedFiltersApi) => {
    filtersApiRef.current = api;
  }, []);

  const selectedShipmentNumber = useMemo(() => parseShipmentNumberFilter(filterValues.shipmentNumber), [filterValues.shipmentNumber]);
  const selectedBoxNumber = useMemo(() => filterValues.boxNumber.trim(), [filterValues.boxNumber]);
  const selectedStatus = useMemo(() => parseIsraelBoxStatusFilter(filterValues.status), [filterValues.status]);

  const filterDisplayValues = useMemo(() => {
    const seasonRecord = filterValues.seasonId ? seasons.find((s) => String(s.id) === filterValues.seasonId) : null;
    const seasonLabel = seasonRecord ? String(seasonRecord.yearName) : null;
    const shipmentNumberLabel =
      filterValues.shipmentNumber === UNASSIGNED_SHIPMENT_VALUE
        ? labels.unassignedShipmentOption
        : filterValues.shipmentNumber !== 'all'
          ? filterValues.shipmentNumber
          : null;
    const boxNumberLabel = filterValues.boxNumber.trim() ? filterValues.boxNumber.trim() : null;
    const statusLabel = filterValues.status !== 'all' ? (labels.statusLabels[filterValues.status as IsraelBoxStatus] ?? null) : null;
    return { seasonLabel, shipmentNumberLabel, boxNumberLabel, statusLabel };
  }, [filterValues, labels, seasons]);

  return {
    filters,
    activeSeasonId,
    selectedSeasonId,
    selectedShipmentNumber,
    selectedBoxNumber,
    selectedStatus,
    filterDisplayValues,
    handleFilterValuesChange,
    handleFiltersApiReady,
  };
}
