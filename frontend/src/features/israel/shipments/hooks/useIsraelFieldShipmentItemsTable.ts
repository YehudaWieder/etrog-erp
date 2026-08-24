import { useEffect, useMemo, useState } from 'react';
import { getIsraelShipmentItemsBySeason } from '../../../../services/israel/israelShipmentItemsApi';
import type { IsraelShipmentStatus } from '../../../../services/israel/israelShipmentsApi';
import type { IsraelFieldShipmentItemsTableLabels, IsraelFieldShipmentItemsTableRow } from '../israelShipments.types';

type UseIsraelFieldShipmentItemsTableResult = {
  rows: IsraelFieldShipmentItemsTableRow[];
  isLoading: boolean;
  error: string;
};

export function useIsraelFieldShipmentItemsTable(
  labels: IsraelFieldShipmentItemsTableLabels,
  seasonId: number | null,
  shipmentNumber: 'all' | number,
  shipmentStatus: 'all' | IsraelShipmentStatus,
  fieldId: 'all' | number,
  refreshKey?: number,
): UseIsraelFieldShipmentItemsTableResult {
  const [rawRows, setRawRows] = useState<IsraelFieldShipmentItemsTableRow[]>([]);
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
            fieldId: item.box?.fieldId ?? null,
            shipmentNumber: item.box?.shipment?.shipmentNumber ?? null,
            shipmentStatus: item.box?.shipment?.status ?? null,
            categoryId: item.categoryId,
            category: item.category?.name ?? '—',
            grade: item.grade,
            pitamStatus: item.pitamStatus,
            quantity: item.quantity,
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

  const rows = useMemo<IsraelFieldShipmentItemsTableRow[]>(
    () =>
      rawRows
        .filter((row) => shipmentNumber === 'all' || row.shipmentNumber === shipmentNumber)
        .filter((row) => shipmentStatus === 'all' || row.shipmentStatus === shipmentStatus)
        .filter((row) => fieldId === 'all' || row.fieldId === fieldId),
    [rawRows, shipmentNumber, shipmentStatus, fieldId],
  );

  return { rows, isLoading, error };
}
