import { useEffect, useMemo, useState } from 'react';
import { FaFileInvoice } from 'react-icons/fa6';
import { type GlobalDataTableColumn } from '../../../../components/ui/GlobalDataTable';
import { getIsraelShipmentItemsBySeason } from '../../../../services/israel/israelShipmentItemsApi';
import type { IsraelShipmentItemsTableLabels, IsraelShipmentItemsTableRow } from '../israelShipments.types';
import styles from '../components/all-items/IsraelShipmentItemsSection.module.css';

type UseIsraelShipmentItemsTableResult = {
  rows: IsraelShipmentItemsTableRow[];
  columns: GlobalDataTableColumn<IsraelShipmentItemsTableRow>[];
  isLoading: boolean;
  error: string;
};

export function useIsraelShipmentItemsTable(
  labels: IsraelShipmentItemsTableLabels,
  seasonId: number | null,
  shipmentNumber: 'all' | number,
  boxNumber: string,
  refreshKey?: number,
  onOpenDetails?: (row: IsraelShipmentItemsTableRow) => void,
): UseIsraelShipmentItemsTableResult {
  const [rawRows, setRawRows] = useState<IsraelShipmentItemsTableRow[]>([]);
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

    getIsraelShipmentItemsBySeason(seasonId)
      .then((items) => {
        if (!isMounted) return;
        setRawRows(
          items.map((item) => ({
            id: item.id,
            boxId: item.boxId,
            boxNumber: item.box?.boxNumber ?? 0,
            shipmentNumber: item.box?.shipment?.shipmentNumber ?? null,
            categoryId: item.categoryId,
            category: item.category?.name ?? '—',
            grade: item.grade,
            pitamStatus: item.pitamStatus,
            quantity: item.quantity,
            notes: item.notes,
            updatedByName: item.updatedBy?.name ?? '—',
          })),
        );
      })
      .catch(() => {
        if (!isMounted) return;
        setError(labels.error);
        setRawRows([]);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [labels.error, refreshKey, seasonId]);

  const rows = useMemo<IsraelShipmentItemsTableRow[]>(() => {
    const boxNumberQuery = boxNumber.trim();

    return rawRows
      .filter((row) => shipmentNumber === 'all' || row.shipmentNumber === shipmentNumber)
      .filter((row) => !boxNumberQuery || String(row.boxNumber).includes(boxNumberQuery));
  }, [boxNumber, rawRows, shipmentNumber]);

  const columns = useMemo<GlobalDataTableColumn<IsraelShipmentItemsTableRow>[]>(() => [
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
      sortAccessor: (row) => row.shipmentNumber ?? -1,
      align: 'center',
      render: (row) => row.shipmentNumber ?? labels.unassignedShipmentLabel,
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
      sortAccessor: (row) => row.grade,
      align: 'center',
      render: (row) => row.grade,
    },
    {
      id: 'pitamStatus',
      header: labels.colPitamStatus,
      headerLabel: labels.colPitamStatus,
      sortKey: 'pitamStatus',
      sortAccessor: (row) => row.pitamStatus,
      align: 'center',
      render: (row) => labels.pitamStatusLabels[row.pitamStatus],
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
  ], [labels, onOpenDetails]);

  return { rows, columns, isLoading, error };
}
