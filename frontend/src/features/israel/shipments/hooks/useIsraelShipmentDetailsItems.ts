import { useEffect, useState } from 'react';
import { getIsraelShipmentItemsBySeason, type IsraelShipmentItemRecord } from '../../../../services/israel/israelShipmentItemsApi';

type UseIsraelShipmentDetailsItemsResult = {
  items: IsraelShipmentItemRecord[];
  isLoading: boolean;
  error: string;
};

export function useIsraelShipmentDetailsItems(
  seasonId: number | null,
  shipmentId: number | null,
  errorMessage: string,
): UseIsraelShipmentDetailsItemsResult {
  const [items, setItems] = useState<IsraelShipmentItemRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (seasonId === null || shipmentId === null) {
      setItems([]);
      setError('');
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError('');

    getIsraelShipmentItemsBySeason(seasonId)
      .then((result) => {
        if (isMounted) {
          setItems(result.filter((item) => item.box?.shipment?.id === shipmentId));
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
  }, [seasonId, shipmentId, errorMessage]);

  return { items, isLoading, error };
}
