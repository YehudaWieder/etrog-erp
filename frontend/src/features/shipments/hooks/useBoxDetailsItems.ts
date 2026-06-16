import { useEffect, useState } from 'react';
import { getShipmentItemsByBox, type ShipmentItemRecord } from '../../../services/shipmentItemsApi';

type UseBoxDetailsItemsResult = {
  items: ShipmentItemRecord[];
  isLoading: boolean;
  error: string;
};

export function useBoxDetailsItems(boxId: number | null, errorMessage: string): UseBoxDetailsItemsResult {
  const [items, setItems] = useState<ShipmentItemRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (boxId === null) {
      setItems([]);
      setError('');
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError('');

    getShipmentItemsByBox(boxId)
      .then((result) => {
        if (isMounted) {
          setItems(result);
        }
      })
      .catch(() => {
        if (isMounted) {
          setError(errorMessage);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [boxId, errorMessage]);

  return { items, isLoading, error };
}
