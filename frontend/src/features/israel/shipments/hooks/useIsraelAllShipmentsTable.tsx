import { useEffect, useMemo, useState } from 'react';
import { FaFileInvoice } from 'react-icons/fa6';
import { type GlobalDataTableColumn } from '../../../../components/ui/GlobalDataTable';
import { getIsraelShipmentsBySeason, type IsraelShipmentRecord } from '../../../../services/israel/israelShipmentsApi';
import type { IsraelAllShipmentsTableLabels } from '../israelShipments.types';
import { formatIsraelShipmentDate, resolveIsraelShipmentStatusClass } from '../utils/israelShipments.util';
import styles from '../components/all-shipments/IsraelAllShipmentsSection.module.css';

type UseIsraelAllShipmentsTableResult = {
  rows: IsraelShipmentRecord[];
  columns: GlobalDataTableColumn<IsraelShipmentRecord>[];
  isLoading: boolean;
  error: string;
};

export function useIsraelAllShipmentsTable(
  labels: IsraelAllShipmentsTableLabels,
  seasonId: number | null,
  statusFilter: 'all' | import('../../../../services/israel/israelShipmentsApi').IsraelShipmentStatus,
  fieldFilter: 'all' | number,
  refreshKey?: number,
  onOpenDetails?: (row: IsraelShipmentRecord) => void,
): UseIsraelAllShipmentsTableResult {
  const [rows, setRows] = useState<IsraelShipmentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!seasonId) {
      setRows([]);
      setError('');
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError('');

    const load = async () => {
      try {
        const shipments = await getIsraelShipmentsBySeason(seasonId);
        if (isMounted) {
          setRows(shipments);
        }
      } catch {
        if (isMounted) {
          setError(labels.error);
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

  const filteredRows = useMemo(() => {
    return rows
      .filter((row) => statusFilter === 'all' || row.status === statusFilter)
      .filter((row) => fieldFilter === 'all' || row.fieldId === fieldFilter);
  }, [rows, statusFilter, fieldFilter]);

  const columns = useMemo<GlobalDataTableColumn<IsraelShipmentRecord>[]>(() => [
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
      id: 'shipmentNumber',
      header: labels.colShipmentNumber,
      headerLabel: labels.colShipmentNumber,
      sortKey: 'shipmentNumber',
      sortAccessor: (row) => row.shipmentNumber,
      defaultSortDirection: 'asc',
      align: 'center',
      render: (row) => <strong>{row.shipmentNumber}</strong>,
    },
    {
      id: 'field',
      header: labels.colField,
      headerLabel: labels.colField,
      sortKey: 'field',
      sortAccessor: (row) => row.field?.name ?? '',
      align: 'center',
      render: (row) => row.field?.name ?? '—',
    },
    {
      id: 'totalBoxes',
      header: labels.colBoxCount,
      headerLabel: labels.colBoxCount,
      sortKey: 'totalBoxes',
      sortAccessor: (row) => row.totalBoxes,
      align: 'center',
      render: (row) => row.totalBoxes,
    },
    {
      id: 'totalQuantity',
      header: labels.colQuantity,
      headerLabel: labels.colQuantity,
      sortKey: 'totalQuantity',
      sortAccessor: (row) => row.totalQuantity,
      align: 'center',
      render: (row) => row.totalQuantity.toLocaleString(),
    },
    {
      id: 'status',
      header: labels.colStatus,
      headerLabel: labels.colStatus,
      sortKey: 'status',
      sortAccessor: (row) => row.status,
      align: 'center',
      render: (row) => (
        <span className={`shipments-status-badge shipments-status-badge--${resolveIsraelShipmentStatusClass(row.status)}`}>
          {labels.statusLabels[row.status]}
        </span>
      ),
    },
    {
      id: 'shippedAt',
      header: labels.colShippedAt,
      headerLabel: labels.colShippedAt,
      sortKey: 'shippedAt',
      sortAccessor: (row) => (row.shippedAt ? new Date(row.shippedAt).getTime() : 0),
      align: 'center',
      render: (row) => (row.shippedAt ? formatIsraelShipmentDate(new Date(row.shippedAt)) : '—'),
    },
  ], [labels, onOpenDetails]);

  return { rows: filteredRows, columns, isLoading, error };
}
