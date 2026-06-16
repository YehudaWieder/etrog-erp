import { useEffect, useMemo, useState } from 'react';
import { FaFileInvoice } from 'react-icons/fa6';
import { type GlobalDataTableColumn } from '../../../components/ui/GlobalDataTable';
import { getBoxesByShipment } from '../../../services/boxesApi';
import { getShipmentItemsByBox, type ShipmentItemRecord } from '../../../services/shipmentItemsApi';
import { getShipmentsBySeason } from '../../../services/shipmentsApi';
import type { ShipmentItemsTableLabels, ShipmentItemsTableRow } from '../shipments.types';
import styles from '../components/styles/AllShipmentsTable.module.css';

type UseShipmentItemsTableResult = {
  rows: ShipmentItemsTableRow[];
  columns: GlobalDataTableColumn<ShipmentItemsTableRow>[];
  isLoading: boolean;
  error: string;
};

function resolveOwnershipLabel(item: ShipmentItemRecord, labels: ShipmentItemsTableLabels): string {
  if (item.ownershipType === 'TRADER') {
    return item.trader?.name || labels.ownershipLabels.TRADER;
  }

  if (item.ownershipType === 'CUSTOMER') {
    return item.customer?.customerName || labels.ownershipLabels.CUSTOMER;
  }

  return labels.ownershipLabels[item.ownershipType];
}

function resolveCategoryLabel(item: ShipmentItemRecord, labels: ShipmentItemsTableLabels): string {
  if (item.traderCategory?.name) {
    return item.traderCategory.name;
  }

  if (item.customerCategory?.name) {
    return item.customerCategory.name;
  }

  if (item.customLabel) {
    return item.customLabel;
  }

  return labels.uncategorized;
}

export function useShipmentItemsTable(
  labels: ShipmentItemsTableLabels,
  seasonId: number | null,
  boxNumber: 'all' | number,
  shipmentNumber: 'all' | number,
  ownership: 'all' | string,
  refreshKey?: number,
  onOpenDetails?: (row: ShipmentItemsTableRow) => void,
): UseShipmentItemsTableResult {
  const [rawRows, setRawRows] = useState<ShipmentItemsTableRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!seasonId) {
      setRawRows([]);
      setError('');
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError('');

    const load = async () => {
      try {
        const shipments = await getShipmentsBySeason(seasonId);

        const rowsByShipment = await Promise.all(
          shipments.map(async (shipment) => {
            const boxes = await getBoxesByShipment(shipment.id);

            const itemsByBox = await Promise.all(
              boxes.map(async (box) => {
                const items = await getShipmentItemsByBox(box.id);
                return items.map((item) => ({
                  id: item.id,
                  boxId: box.id,
                  boxNumber: box.boxNumber,
                  shipmentNumber: shipment.shipmentNumber,
                  category: resolveCategoryLabel(item, labels),
                  quantity: item.quantity,
                  ownership: resolveOwnershipLabel(item, labels),
                  ownershipType: item.ownershipType,
                  isPrivateSelection: item.isPrivateSelection,
                  grade: item.grade ?? null,
                  customGrade: item.customGrade ?? null,
                  pitamStatus: item.pitamStatus ?? null,
                  notes: item.notes ?? null,
                  updatedByName: item.updatedBy?.name ?? '—',
                }));
              }),
            );

            return itemsByBox.flat();
          }),
        );

        if (!isMounted) {
          return;
        }

        setRawRows(rowsByShipment.flat());
      } catch {
        if (!isMounted) {
          return;
        }

        setError(labels.error);
        setRawRows([]);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [labels, seasonId, refreshKey]);

  const rows = useMemo<ShipmentItemsTableRow[]>(() => {
    return rawRows
      .filter((row) => boxNumber === 'all' || row.boxNumber === boxNumber)
      .filter((row) => shipmentNumber === 'all' || row.shipmentNumber === shipmentNumber)
      .filter((row) => {
        if (ownership === 'all') {
          return true;
        }

        if (ownership === 'type:TRADER') {
          return row.ownershipType === 'TRADER';
        }

        if (ownership === 'type:CUSTOMER') {
          return row.ownershipType === 'CUSTOMER';
        }

        return row.ownership === ownership;
      })
      .map((row) => row);
  }, [boxNumber, ownership, rawRows, shipmentNumber]);

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
          ? (row.isPrivateSelection
              ? labels.stockSourceLabels.PRIVATE_SELECTION
              : labels.stockSourceLabels.GENERAL)
          : '—',
    },
  ], [labels, onOpenDetails]);

  return { rows, columns, isLoading, error };
}
