import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FaFileInvoice } from 'react-icons/fa6';
import type { GlobalDataTableColumn } from '../../../components/ui/GlobalDataTable';
import type { GlobalScopedFilterConfig, GlobalScopedFiltersApi } from '../../../components/ui/GlobalScopedFilters';
import { getDeletedShipmentItems, type DeletedShipmentItemRecord } from '../../../services/shipmentItemsApi';
import { getActiveSeason, getSeasons, type Season } from '../../../services/seasonsApi';
import type { ShipmentItemsTableLabels, ShipmentItemsTableRow } from '../shipments.types';
import { parseShipmentSeasonFilterId } from '../utils/shipments.util';
import styles from '../components/styles/AllShipmentsTable.module.css';

const OWNERSHIP_GROUP_TRADERS = 'type:TRADER';
const OWNERSHIP_GROUP_CUSTOMERS = 'type:CUSTOMER';
const OWNERSHIP_GROUP_GENERAL = 'type:GENERAL';

function resolveOwnershipLabel(item: DeletedShipmentItemRecord, labels: ShipmentItemsTableLabels): string {
  if (item.ownershipType === 'TRADER') return item.trader?.name || labels.ownershipLabels.TRADER;
  if (item.ownershipType === 'CUSTOMER') return item.customer?.customerName || labels.ownershipLabels.CUSTOMER;
  return labels.ownershipLabels[item.ownershipType];
}

function resolveCategoryLabel(item: DeletedShipmentItemRecord, labels: ShipmentItemsTableLabels): string {
  if (item.traderCategory?.name) return item.traderCategory.name;
  if (item.customerCategory?.name) return item.customerCategory.name;
  if (item.customLabel) return item.customLabel;
  return labels.uncategorized;
}

function mapToRow(item: DeletedShipmentItemRecord, labels: ShipmentItemsTableLabels): ShipmentItemsTableRow {
  return {
    id: item.id,
    boxId: item.boxId,
    boxNumber: item.box?.boxNumber ?? 0,
    boxStatus: 'OPEN',
    shipmentNumber: item.shipment?.shipmentNumber ?? 0,
    shipmentStatus: 'PREPARING',
    category: resolveCategoryLabel(item, labels),
    quantity: item.quantity,
    ownership: resolveOwnershipLabel(item, labels),
    ownershipType: item.ownershipType,
    traderId: item.traderId,
    customerId: item.customerId,
    isPrivateSelection: item.isPrivateSelection,
    grade: item.grade ?? item.customerCategory?.grade ?? null,
    customGrade: item.customGrade ?? null,
    pitamStatus: item.pitamStatus ?? null,
    notes: item.notes ?? null,
    updatedByName: item.updatedBy?.name ?? '—',
    generalSourceBreakdown: item.generalSourceBreakdown ?? null,
  };
}

type UseDeletedShipmentItemsFiltersResult = {
  rows: ShipmentItemsTableRow[];
  rawItems: DeletedShipmentItemRecord[];
  columns: GlobalDataTableColumn<ShipmentItemsTableRow>[];
  filters: GlobalScopedFilterConfig[];
  activeSeasonId: number | null;
  selectedSeasonId: number | null;
  isLoading: boolean;
  error: string;
  handleFilterValuesChange: (values: Record<string, string>) => void;
  handleFiltersApiReady: (api: GlobalScopedFiltersApi) => void;
};

export function useDeletedShipmentItemsFilters(
  labels: ShipmentItemsTableLabels,
  refreshKey?: number,
  onOpenDetails?: (row: ShipmentItemsTableRow) => void,
): UseDeletedShipmentItemsFiltersResult {
  const [rawItems, setRawItems] = useState<DeletedShipmentItemRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [seasons, setSeasons] = useState<Season[]>([]);
  const [activeSeasonId, setActiveSeasonId] = useState<number | null>(null);
  const [filterValues, setFilterValues] = useState({
    seasonId: '',
    boxNumber: 'all',
    shipmentNumber: 'all',
    ownership: 'all',
  });
  const filtersApiRef = useRef<GlobalScopedFiltersApi | null>(null);

  // Fetch all deleted items
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError('');
    getDeletedShipmentItems()
      .then((items) => { if (isMounted) setRawItems(items); })
      .catch(() => { if (isMounted) { setError(labels.error); setRawItems([]); } })
      .finally(() => { if (isMounted) setIsLoading(false); });
    return () => { isMounted = false; };
  }, [labels, refreshKey]);

  // Load seasons list
  useEffect(() => {
    let isMounted = true;
    Promise.all([getSeasons(), getActiveSeason()])
      .then(([nextSeasons, activeSeason]) => {
        if (!isMounted) return;
        setSeasons(nextSeasons);
        setActiveSeasonId(activeSeason.id);
      })
      .catch(() => { if (isMounted) { setSeasons([]); setActiveSeasonId(null); } });
    return () => { isMounted = false; };
  }, []);

  // Auto-select active season when filter is empty
  useEffect(() => {
    if (!activeSeasonId || !filtersApiRef.current || filterValues.seasonId) return;
    filtersApiRef.current.setFilterValue('seasonId', String(activeSeasonId));
  }, [activeSeasonId, filterValues.seasonId]);

  const selectedSeasonId = useMemo(
    () => parseShipmentSeasonFilterId(filterValues.seasonId || (activeSeasonId ? String(activeSeasonId) : '')),
    [activeSeasonId, filterValues.seasonId],
  );

  // Filter options derived from rawItems (season-filtered)
  const seasonFilteredItems = useMemo(() => {
    if (!selectedSeasonId) return rawItems;
    return rawItems.filter((item) => item.seasonId === selectedSeasonId);
  }, [rawItems, selectedSeasonId]);

  const boxNumbers = useMemo(
    () => [...new Set(seasonFilteredItems.map((i) => i.box?.boxNumber).filter((n): n is number => n != null))].sort((a, b) => b - a),
    [seasonFilteredItems],
  );

  const shipmentNumbers = useMemo(
    () => [...new Set(seasonFilteredItems.map((i) => i.shipment?.shipmentNumber).filter((n): n is number => n != null))].sort((a, b) => b - a),
    [seasonFilteredItems],
  );

  const traderOptions = useMemo(
    () => [...new Set(seasonFilteredItems.filter((i) => i.ownershipType === 'TRADER').map((i) => i.trader?.name).filter((n): n is string => n != null))].sort((a, b) => a.localeCompare(b)),
    [seasonFilteredItems],
  );

  const customerOptions = useMemo(
    () => [...new Set(seasonFilteredItems.filter((i) => i.ownershipType === 'CUSTOMER').map((i) => i.customer?.customerName).filter((n): n is string => n != null))].sort((a, b) => a.localeCompare(b)),
    [seasonFilteredItems],
  );

  const filters = useMemo<GlobalScopedFilterConfig[]>(() => [
    {
      key: 'seasonId',
      label: labels.seasonFilterLabel,
      defaultValue: activeSeasonId ? String(activeSeasonId) : '',
      queryParam: 'trShItemsSeason',
      options: seasons.length > 0
        ? seasons.map((s) => ({ value: String(s.id), label: `${s.yearName}${s.isActive ? ` (${labels.activeSeasonBadge})` : ''}` }))
        : [{ value: '', label: labels.noActiveSeason }],
    },
    {
      key: 'boxNumber',
      label: labels.boxNumberFilterLabel,
      defaultValue: 'all',
      queryParam: 'trShItemsBoxNumber',
      options: [
        { value: 'all', label: labels.allBoxNumbersOption },
        ...boxNumbers.map((n) => ({ value: String(n), label: String(n) })),
      ],
    },
    {
      key: 'shipmentNumber',
      label: labels.shipmentNumberFilterLabel,
      defaultValue: 'all',
      queryParam: 'trShItemsShipmentNumber',
      options: [
        { value: 'all', label: labels.allShipmentNumbersOption },
        ...shipmentNumbers.map((n) => ({ value: String(n), label: String(n) })),
      ],
    },
    {
      key: 'ownership',
      label: labels.ownershipFilterLabel,
      defaultValue: 'all',
      queryParam: 'trShItemsOwnership',
      options: [
        { value: 'all', label: labels.allOwnershipOption },
        { value: OWNERSHIP_GROUP_TRADERS, label: labels.allTradersOption, group: labels.tradersGroupLabel },
        ...traderOptions.map((o) => ({ value: o, label: o, group: labels.tradersGroupLabel })),
        { value: OWNERSHIP_GROUP_CUSTOMERS, label: labels.allCustomersOption, group: labels.customersGroupLabel },
        ...customerOptions.map((o) => ({ value: o, label: o, group: labels.customersGroupLabel })),
        { value: OWNERSHIP_GROUP_GENERAL, label: labels.ownershipLabels.GENERAL },
      ],
    },
  ], [activeSeasonId, boxNumbers, customerOptions, labels, seasons, shipmentNumbers, traderOptions]);

  // Apply all filters to season-filtered items
  const rows = useMemo<ShipmentItemsTableRow[]>(() => {
    const boxNum = filterValues.boxNumber === 'all' ? 'all' : Number.parseInt(filterValues.boxNumber, 10);
    const shipNum = filterValues.shipmentNumber === 'all' ? 'all' : Number.parseInt(filterValues.shipmentNumber, 10);
    const own = filterValues.ownership;

    return seasonFilteredItems
      .filter((item) => boxNum === 'all' || item.box?.boxNumber === boxNum)
      .filter((item) => shipNum === 'all' || item.shipment?.shipmentNumber === shipNum)
      .filter((item) => {
        if (own === 'all') return true;
        if (own === OWNERSHIP_GROUP_TRADERS) return item.ownershipType === 'TRADER';
        if (own === OWNERSHIP_GROUP_CUSTOMERS) return item.ownershipType === 'CUSTOMER';
        if (own === OWNERSHIP_GROUP_GENERAL) return item.ownershipType === 'GENERAL';
        const label = resolveOwnershipLabel(item, labels);
        return label === own;
      })
      .map((item) => mapToRow(item, labels));
  }, [seasonFilteredItems, filterValues, labels]);

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

  const columns = useMemo<GlobalDataTableColumn<ShipmentItemsTableRow>[]>(() => [
    {
      id: 'details',
      header: labels.colDetails,
      headerLabel: labels.colDetails,
      align: 'center',
      render: (row) => (
        <button
          type="button"
          className={styles.detailsTrigger}
          aria-label={labels.detailsButtonAriaLabel}
          onClick={() => onOpenDetails?.(row)}
        >
          <FaFileInvoice />
        </button>
      ),
    },
    {
      id: 'boxNumber',
      header: labels.colBoxNumber,
      headerLabel: labels.colBoxNumber,
      sortKey: 'boxNumber',
      sortAccessor: (row) => row.boxNumber,
      defaultSortDirection: 'desc',
      align: 'center',
      render: (row) => <strong>{row.boxNumber}</strong>,
    },
    {
      id: 'shipmentNumber',
      header: labels.colShipmentNumber,
      headerLabel: labels.colShipmentNumber,
      sortKey: 'shipmentNumber',
      sortAccessor: (row) => row.shipmentNumber,
      align: 'center',
      render: (row) => row.shipmentNumber,
    },
    {
      id: 'category',
      header: labels.colCategory,
      headerLabel: labels.colCategory,
      sortKey: 'category',
      sortAccessor: (row) => row.category,
      align: 'center',
      render: (row) => row.category,
    },
    {
      id: 'grade',
      header: labels.colGrade,
      headerLabel: labels.colGrade,
      sortKey: 'grade',
      sortAccessor: (row) => row.customGrade ?? row.grade ?? '',
      align: 'center',
      render: (row) => row.customGrade ?? row.grade ?? labels.noGrade,
    },
    {
      id: 'quantity',
      header: labels.colQuantity,
      headerLabel: labels.colQuantity,
      sortKey: 'quantity',
      sortAccessor: (row) => row.quantity,
      align: 'center',
      render: (row) => row.quantity.toLocaleString(),
    },
    {
      id: 'ownership',
      header: labels.colOwnership,
      headerLabel: labels.colOwnership,
      sortKey: 'ownership',
      sortAccessor: (row) => row.ownership,
      align: 'center',
      render: (row) => row.ownership,
    },
    {
      id: 'stockSource',
      header: labels.colStockSource,
      headerLabel: labels.colStockSource,
      sortKey: 'stockSource',
      sortAccessor: (row) => (row.isPrivateSelection ? 1 : 0),
      align: 'center',
      render: (row) =>
        row.ownershipType === 'TRADER'
          ? (row.isPrivateSelection ? labels.stockSourceLabels.PRIVATE_SELECTION : labels.stockSourceLabels.GENERAL)
          : '—',
    },
  ], [labels, onOpenDetails]);

  return {
    rows,
    rawItems,
    columns,
    filters,
    activeSeasonId,
    selectedSeasonId,
    isLoading,
    error,
    handleFilterValuesChange,
    handleFiltersApiReady,
  };
}
