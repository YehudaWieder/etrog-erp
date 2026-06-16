import { useEffect, useState } from 'react';
import type { BoxRecord } from '../../../services/boxesApi';
import { getShipmentItemsByBox, type ShipmentItemRecord } from '../../../services/shipmentItemsApi';

type UseShipmentDetailsItemsResult = {
  items: ShipmentItemRecord[];
  isLoading: boolean;
  error: string;
};

export function useShipmentDetailsItems(
  boxes: BoxRecord[],
  isReady: boolean,
  errorMessage: string,
): UseShipmentDetailsItemsResult {
  const [items, setItems] = useState<ShipmentItemRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isReady || boxes.length === 0) {
      setItems([]);
      setError('');
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError('');

    Promise.all(boxes.map((box) => getShipmentItemsByBox(box.id)))
      .then((itemsByBox) => {
        if (isMounted) {
          setItems(itemsByBox.flat());
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
  }, [boxes, isReady, errorMessage]);

  return { items, isLoading, error };
}
