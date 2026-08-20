import { useEffect, useMemo, useState } from 'react';
import { FaFileInvoice } from 'react-icons/fa6';
import { type GlobalDataTableColumn } from '../../../../components/ui/GlobalDataTable';
import { getIsraelBoxesBySeason, type IsraelBoxStatus } from '../../../../services/israelBoxesApi';
import type { IsraelAllBoxesTableLabels, IsraelBoxesTableRow } from '../israelShipments.types';
import { resolveIsraelBoxStatusClass } from '../utils/israelShipments.util';
import styles from '../components/all-boxes/IsraelAllBoxesSection.module.css';

type UseIsraelAllBoxesTableResult = {
  rows: IsraelBoxesTableRow[];
  columns: GlobalDataTableColumn<IsraelBoxesTableRow>[];
  isLoading: boolean;
  error: string;
};

export function useIsraelAllBoxesTable(
  labels: IsraelAllBoxesTableLabels,
  seasonId: number | null,
  shipmentNumber: 'all' | 'unassigned' | number,
  boxNumber: string,
  status: 'all' | IsraelBoxStatus,
  refreshKey?: number,
  onOpenDetails?: (row: IsraelBoxesTableRow) => void,
): UseIsraelAllBoxesTableResult {
  const [rawRows, setRawRows] = useState<IsraelBoxesTableRow[]>([]);
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
        const boxes = await getIsraelBoxesBySeason(seasonId);
        if (isMounted) {
          setRawRows(
            boxes.map((box) => ({
              id: box.id,
              boxNumber: box.boxNumber,
              shipmentNumber: box.shipment?.shipmentNumber ?? null,
              itemsCount: box.itemsCount,
              status: box.status,
              updatedByName: box.updatedBy?.name ?? '—',
              notes: box.notes,
            })),
          );
        }
      } catch {
        if (isMounted) {
          setError(labels.error);
          setRawRows([]);
        }
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
  }, [labels.error, refreshKey, seasonId]);

  const rows = useMemo<IsraelBoxesTableRow[]>(() => {
    const boxNumberQuery = boxNumber.trim();

    return rawRows
      .filter((row) => {
        if (shipmentNumber === 'all') return true;
        if (shipmentNumber === 'unassigned') return row.shipmentNumber === null;
        return row.shipmentNumber === shipmentNumber;
      })
      .filter((row) => !boxNumberQuery || String(row.boxNumber).includes(boxNumberQuery))
      .filter((row) => status === 'all' || row.status === status);
  }, [boxNumber, rawRows, shipmentNumber, status]);

  const columns = useMemo<GlobalDataTableColumn<IsraelBoxesTableRow>[]>(() => [
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
      defaultSortDirection: 'asc',
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
      id: 'itemsCount',
      header: labels.colItemsCount,
      headerLabel: labels.colItemsCount,
      sortKey: 'itemsCount',
      sortAccessor: (row) => row.itemsCount,
      align: 'center',
      render: (row) => row.itemsCount.toLocaleString(),
    },
    {
      id: 'status',
      header: labels.colStatus,
      headerLabel: labels.colStatus,
      sortKey: 'status',
      sortAccessor: (row) => row.status,
      align: 'center',
      render: (row) => (
        <span className={`shipments-status-badge shipments-status-badge--${resolveIsraelBoxStatusClass(row.status)}`}>
          {labels.statusLabels[row.status]}
        </span>
      ),
    },
  ], [labels, onOpenDetails]);

  return { rows, columns, isLoading, error };
}
