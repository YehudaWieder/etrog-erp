import { useEffect, useState } from 'react';
import { apiClient } from '../../../services/apiClient';

export interface CustomerMovement {
  id: number;
  date: string;
  type: string;
  customerId: number;
  customer: {
    customerName: string;
  };
  customerCategory: {
    name: string;
    grade: string | null;
  };
  pitamStatus: string;
  quantity: number;
}

interface UseCustomerMovementsResult {
  rows: CustomerMovement[];
  isLoading: boolean;
  error: string | null;
  reload: () => void;
}

export function useCustomerMovements(
  seasonId: number | null,
  customerId?: number | null,
  movementStatus?: string,
): UseCustomerMovementsResult {
  const [rows, setRows] = useState<CustomerMovement[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = () => {
    if (!seasonId) {
      setRows([]);
      return;
    }

    let isActive = true;
    setIsLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set('seasonId', String(seasonId));

    if (customerId && customerId !== 0) {
      params.set('customerId', String(customerId));
    }

    if (movementStatus && movementStatus !== 'ALL') {
      if (movementStatus === 'SHIPMENT') {
        params.set('shipmentScope', 'SHIPPED');
      } else if (movementStatus === 'NON_SHIPMENT') {
        params.set('shipmentScope', 'UNSHIPPED');
      }
    }

    apiClient<CustomerMovement[]>(`/customer-allocations/movements?${params.toString()}`, {
      suppressGlobalFeedback: true,
    })
      .then((data) => {
        if (!isActive) {
          return;
        }

        setRows(Array.isArray(data) ? data : []);
      })
      .catch((nextError: unknown) => {
        if (!isActive) {
          return;
        }

        setError(nextError instanceof Error ? nextError.message : 'Failed to load customer movements.');
      })
      .finally(() => {
        if (!isActive) {
          return;
        }

        setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  };

  useEffect(() => {
    const cleanup = reload();
    return () => cleanup?.();
  }, [seasonId, customerId, movementStatus]);

  return { rows, isLoading, error, reload };
}
