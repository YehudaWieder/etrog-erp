import { useEffect, useMemo, useState } from 'react';
import { FaFileInvoice } from 'react-icons/fa6';
import { type GlobalDataTableColumn } from '../../../components/ui/GlobalDataTable';
import { getShipmentsBySeason } from '../../../services/shipmentsApi';
import type { ShipmentRecord, ShipmentsTableLabels } from '../shipments.types';
import { resolveShipmentStatusClass } from '../utils/shipments.util';
import styles from '../components/styles/AllShipmentsTable.module.css';

type UseAllShipmentsTableResult = {
  rows: ShipmentRecord[];
  columns: GlobalDataTableColumn<ShipmentRecord>[];
  isLoading: boolean;
  error: string;
};

export function useAllShipmentsTable(
  labels: ShipmentsTableLabels,
  seasonId: number | null,
  statusFilter: 'all' | import('../shipments.types').ShipmentStatus,
  refreshKey?: number,
): UseAllShipmentsTableResult {
  const [rows, setRows] = useState<ShipmentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }),
    [],
  );

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
        const shipments = await getShipmentsBySeason(seasonId);
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
    if (statusFilter === 'all') {
      return rows;
    }

    return rows.filter((row) => row.status === statusFilter);
  }, [rows, statusFilter]);

  const columns = useMemo<GlobalDataTableColumn<ShipmentRecord>[]>(() => [
    {
      id: 'details',
      header: labels.colDetails,
      headerLabel: labels.colDetails,
      align: 'center',
      render: () => (
        <button type="button" className={styles.detailsTrigger} aria-label={labels.detailsButtonAriaLabel}>
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
      defaultSortDirection: 'desc',
      align: 'center',
      render: (row) => <strong>{row.shipmentNumber}</strong>,
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
        <span className={`shipments-status-badge shipments-status-badge--${resolveShipmentStatusClass(row.status)}`}>
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
      render: (row) => (row.shippedAt ? dateFormatter.format(new Date(row.shippedAt)) : '—'),
    },
  ], [dateFormatter, labels]);

  return { rows: filteredRows, columns, isLoading, error };
}
