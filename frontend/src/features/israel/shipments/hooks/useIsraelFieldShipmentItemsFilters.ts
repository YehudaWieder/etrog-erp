import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GlobalScopedFilterConfig, GlobalScopedFiltersApi } from '../../../../components/ui/GlobalScopedFilters';
import { getActiveSeason, getSeasons, type Season } from '../../../../services/seasonsApi';
import { getIsraelShipmentsBySeason } from '../../../../services/israel/israelShipmentsApi';
import type { IsraelShipmentStatus } from '../../../../services/israel/israelShipmentsApi';
import { getIsraelFields, type IsraelField } from '../../../../services/israel/israelFieldsApi';
import type { IsraelFieldShipmentItemsTableLabels } from '../israelShipments.types';
import { parseIsraelShipmentSeasonFilterId, parseIsraelShipmentStatusFilter } from '../utils/israelShipments.util';

type FieldShipmentItemsFilterValues = {
  seasonId: string;
  shipmentNumber: string;
  fieldId: string;
  shipmentStatus: string;
};

type UseIsraelFieldShipmentItemsFiltersResult = {
  filters: GlobalScopedFilterConfig[];
  activeSeasonId: number | null;
  selectedSeasonId: number | null;
  selectedShipmentNumber: 'all' | number;
  selectedFieldId: 'all' | number;
  selectedShipmentStatus: 'all' | IsraelShipmentStatus;
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

const SHIPMENT_STATUSES: IsraelShipmentStatus[] = ['PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

export function useIsraelFieldShipmentItemsFilters(
  labels: IsraelFieldShipmentItemsTableLabels,
): UseIsraelFieldShipmentItemsFiltersResult {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [activeSeasonId, setActiveSeasonId] = useState<number | null>(null);
  const [shipmentNumbers, setShipmentNumbers] = useState<number[]>([]);
  const [fields, setFields] = useState<IsraelField[]>([]);
  const [filterValues, setFilterValues] = useState<FieldShipmentItemsFilterValues>({
    seasonId: '',
    shipmentNumber: 'all',
    fieldId: 'all',
    shipmentStatus: 'all',
  });
  const filtersApiRef = useRef<GlobalScopedFiltersApi | null>(null);

  useEffect(() => {
    let isMounted = true;

    Promise.all([getSeasons(), getActiveSeason(), getIsraelFields()])
      .then(([nextSeasons, nextActiveSeason, nextFields]) => {
        if (!isMounted) return;
        setSeasons(nextSeasons);
        setActiveSeasonId(nextActiveSeason.id);
        setFields(nextFields);
      })
      .catch(() => {
        if (!isMounted) return;
        setSeasons([]);
        setActiveSeasonId(null);
        setFields([]);
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

  const fieldOptions = useMemo(
    () => [...fields].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
    [fields],
  );

  const filters = useMemo<GlobalScopedFilterConfig[]>(
    () => [
      {
        key: 'seasonId',
        label: labels.seasonFilterLabel,
        defaultValue: activeSeasonId ? String(activeSeasonId) : '',
        queryParam: 'ishFieldSummarySeason',
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
        queryParam: 'ishFieldSummaryShipmentNumber',
        options: [
          { value: 'all', label: labels.allShipmentNumbersOption },
          ...shipmentNumbers.map((shipmentNumber) => ({ value: String(shipmentNumber), label: String(shipmentNumber) })),
        ],
      },
      {
        key: 'fieldId',
        label: labels.fieldFilterLabel,
        defaultValue: 'all',
        queryParam: 'ishFieldSummaryField',
        options: [
          { value: 'all', label: labels.allFieldsOption },
          ...fieldOptions.map((field) => ({ value: String(field.id), label: field.name })),
        ],
      },
      {
        key: 'shipmentStatus',
        label: labels.shipmentStatusFilterLabel,
        defaultValue: 'all',
        queryParam: 'ishFieldSummaryShipmentStatus',
        options: [
          { value: 'all', label: labels.allShipmentStatusesOption },
          ...SHIPMENT_STATUSES.map((status) => ({ value: status, label: labels.shipmentStatusLabels[status] })),
        ],
      },
    ],
    [activeSeasonId, fieldOptions, labels, seasons, shipmentNumbers],
  );

  const handleFilterValuesChange = useCallback((values: Record<string, string>) => {
    setFilterValues({
      seasonId: values.seasonId ?? '',
      shipmentNumber: values.shipmentNumber ?? 'all',
      fieldId: values.fieldId ?? 'all',
      shipmentStatus: values.shipmentStatus ?? 'all',
    });
  }, []);

  const handleFiltersApiReady = useCallback((api: GlobalScopedFiltersApi) => {
    filtersApiRef.current = api;
  }, []);

  const selectedShipmentNumber = useMemo(() => parseNumericFilter(filterValues.shipmentNumber), [filterValues.shipmentNumber]);
  const selectedFieldId = useMemo(() => parseNumericFilter(filterValues.fieldId), [filterValues.fieldId]);

  const selectedShipmentStatus = useMemo(
    () => parseIsraelShipmentStatusFilter(filterValues.shipmentStatus),
    [filterValues.shipmentStatus],
  );

  return {
    filters,
    activeSeasonId,
    selectedSeasonId,
    selectedShipmentNumber,
    selectedFieldId,
    selectedShipmentStatus,
    handleFilterValuesChange,
    handleFiltersApiReady,
  };
}
