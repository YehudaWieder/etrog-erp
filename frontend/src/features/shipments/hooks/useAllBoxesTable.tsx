import { useEffect, useMemo, useState } from 'react';
import { FaFileInvoice } from 'react-icons/fa6';
import { type GlobalDataTableColumn } from '../../../components/ui/GlobalDataTable';
import { getBoxesByShipment, type BoxOwnership, type BoxRecord, type BoxStatus } from '../../../services/boxesApi';
import { getShipmentsBySeason } from '../../../services/shipmentsApi';
import type { BoxesTableLabels, BoxesTableRow } from '../shipments.types';
import { resolveBoxStatusClass } from '../utils/shipments.util';
import styles from '../components/styles/AllShipmentsTable.module.css';

type UseAllBoxesTableResult = {
  rows: BoxesTableRow[];
  columns: GlobalDataTableColumn<BoxesTableRow>[];
  isLoading: boolean;
  error: string;
};

function resolveOwnershipLabel(row: BoxRecord, labels: BoxesTableLabels): string {
  if (row.ownershipType === 'TRADER') {
    return row.trader?.name || labels.ownershipLabels.TRADER;
  }

  if (row.ownershipType === 'CUSTOMER') {
    return row.customer?.customerName || labels.ownershipLabels.CUSTOMER;
  }

  return labels.ownershipLabels[row.ownershipType];
}

export function useAllBoxesTable(
  labels: BoxesTableLabels,
  seasonId: number | null,
  shipmentNumber: 'all' | number,
  boxNumber: string,
  status: 'all' | BoxStatus,
  ownership: 'all' | string,
  refreshKey?: number,
  onOpenDetails?: (row: BoxesTableRow) => void,
): UseAllBoxesTableResult {
  const [rawRows, setRawRows] = useState<(BoxesTableRow & { ownershipType: BoxOwnership })[]>([]);
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

        const boxesByShipment = await Promise.all(
          shipments.map(async (shipment) => {
            const boxes = await getBoxesByShipment(shipment.id);
            return boxes.map((box) => ({
              id: box.id,
              boxNumber: box.boxNumber,
              shipmentNumber: shipment.shipmentNumber,
              boxType: box.boxType,
              totalQuantity: box.totalQuantity,
              status: box.status,
              ownership: resolveOwnershipLabel(box, labels),
              ownershipType: box.ownershipType,
              updatedByName: box.updatedBy?.name ?? '—',
              notes: box.notes,
            }));
          }),
        );

        if (!isMounted) {
          return;
        }

        setRawRows(boxesByShipment.flat());
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
  }, [labels, refreshKey, seasonId]);

  const rows = useMemo<BoxesTableRow[]>(() => {
    const boxNumberQuery = boxNumber.trim();

    return rawRows
      .filter((row) => shipmentNumber === 'all' || row.shipmentNumber === shipmentNumber)
      .filter((row) => !boxNumberQuery || String(row.boxNumber).includes(boxNumberQuery))
      .filter((row) => status === 'all' || row.status === status)
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
      .map(({ ownershipType: _ownershipType, ...row }) => row);
  }, [boxNumber, ownership, rawRows, shipmentNumber, status]);

  const columns = useMemo<GlobalDataTableColumn<BoxesTableRow>[]>(() => [
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
      sortAccessor: (row) => row.shipmentNumber,
      align: 'center',
      render: (row) => row.shipmentNumber,
    },
    {
      id: 'boxType',
      header: labels.colBoxType,
      headerLabel: labels.colBoxType,
      sortKey: 'boxType',
      sortAccessor: (row) => row.boxType,
      align: 'center',
      render: (row) => labels.boxTypeLabels[row.boxType] ?? row.boxType,
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
        <span className={`shipments-status-badge shipments-status-badge--${resolveBoxStatusClass(row.status)}`}>
          {labels.statusLabels[row.status]}
        </span>
      ),
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
  ], [labels, onOpenDetails]);

  return { rows, columns, isLoading, error };
}
