import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GlobalScopedFilterConfig, GlobalScopedFiltersApi } from '../../../../components/ui/GlobalScopedFilters';
import { getActiveSeason, getSeasons, type Season } from '../../../../services/seasonsApi';
import { getIsraelShipmentsBySeason } from '../../../../services/israel/israelShipmentsApi';
import { getIsraelFields, type IsraelField } from '../../../../services/israel/israelFieldsApi';
import type { IsraelShipmentItemsTableLabels } from '../israelShipments.types';
import { parseIsraelShipmentSeasonFilterId } from '../utils/israelShipments.util';

type ItemsFilterValues = {
  seasonId: string;
  shipmentNumber: string;
  boxNumber: string;
  fieldId: string;
};

type UseIsraelShipmentItemsFiltersResult = {
  filters: GlobalScopedFilterConfig[];
  activeSeasonId: number | null;
  selectedSeasonId: number | null;
  selectedShipmentNumber: 'all' | number;
  selectedBoxNumber: string;
  selectedFieldId: 'all' | number;
  filterDisplayValues: { seasonLabel: string | null; shipmentNumberLabel: string | null; boxNumberLabel: string | null; fieldLabel: string | null };
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
  const [fields, setFields] = useState<IsraelField[]>([]);
  const [filterValues, setFilterValues] = useState<ItemsFilterValues>({ seasonId: '', shipmentNumber: 'all', boxNumber: '', fieldId: 'all' });
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
      {
        key: 'fieldId',
        label: labels.fieldFilterLabel,
        defaultValue: 'all',
        queryParam: 'ishItemsField',
        options: [
          { value: 'all', label: labels.allFieldsOption },
          ...[...fields]
            .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
            .map((field) => ({ value: String(field.id), label: field.name })),
        ],
      },
    ];
  }, [activeSeasonId, fields, labels, seasons, shipmentNumbers]);

  const handleFilterValuesChange = useCallback((values: Record<string, string>) => {
    setFilterValues({
      seasonId: values.seasonId ?? '',
      shipmentNumber: values.shipmentNumber ?? 'all',
      boxNumber: values.boxNumber ?? '',
      fieldId: values.fieldId ?? 'all',
    });
  }, []);

  const handleFiltersApiReady = useCallback((api: GlobalScopedFiltersApi) => {
    filtersApiRef.current = api;
  }, []);

  const selectedShipmentNumber = useMemo(() => parseShipmentNumberFilter(filterValues.shipmentNumber), [filterValues.shipmentNumber]);
  const selectedBoxNumber = useMemo(() => filterValues.boxNumber.trim(), [filterValues.boxNumber]);
  const selectedFieldId = useMemo(() => parseFieldFilter(filterValues.fieldId), [filterValues.fieldId]);

  const filterDisplayValues = useMemo(() => {
    const seasonRecord = filterValues.seasonId ? seasons.find((s) => String(s.id) === filterValues.seasonId) : null;
    const seasonLabel = seasonRecord ? String(seasonRecord.yearName) : null;
    const shipmentNumberLabel = filterValues.shipmentNumber !== 'all' ? filterValues.shipmentNumber : null;
    const boxNumberLabel = filterValues.boxNumber.trim() ? filterValues.boxNumber.trim() : null;
    const fieldLabel =
      filterValues.fieldId !== 'all' ? (fields.find((f) => String(f.id) === filterValues.fieldId)?.name ?? null) : null;
    return { seasonLabel, shipmentNumberLabel, boxNumberLabel, fieldLabel };
  }, [filterValues, seasons, fields]);

  return {
    filters,
    activeSeasonId,
    selectedSeasonId,
    selectedShipmentNumber,
    selectedBoxNumber,
    selectedFieldId,
    filterDisplayValues,
    handleFilterValuesChange,
    handleFiltersApiReady,
  };
}
