import { useEffect, useState } from 'react';
import { getBoxesByShipment, type BoxRecord } from '../../../services/boxesApi';

type UseShipmentDetailsBoxesResult = {
  boxes: BoxRecord[];
  isLoading: boolean;
  error: string;
};

export function useShipmentDetailsBoxes(shipmentId: number | null, errorMessage: string): UseShipmentDetailsBoxesResult {
  const [boxes, setBoxes] = useState<BoxRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (shipmentId === null) {
      setBoxes([]);
      setError('');
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError('');

    getBoxesByShipment(shipmentId)
      .then((result) => {
        if (isMounted) {
          setBoxes(result);
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
  }, [shipmentId, errorMessage]);

  return { boxes, isLoading, error };
}
