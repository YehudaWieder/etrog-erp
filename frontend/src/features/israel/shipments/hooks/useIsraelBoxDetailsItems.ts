import { useEffect, useState } from 'react';
import { getIsraelShipmentItemsByBox, type IsraelShipmentItemRecord } from '../../../../services/israel/israelShipmentItemsApi';

type UseIsraelBoxDetailsItemsResult = {
  items: IsraelShipmentItemRecord[];
  isLoading: boolean;
  error: string;
};

export function useIsraelBoxDetailsItems(boxId: number | null, errorMessage: string): UseIsraelBoxDetailsItemsResult {
  const [items, setItems] = useState<IsraelShipmentItemRecord[]>([]);
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

    getIsraelShipmentItemsByBox(boxId)
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
