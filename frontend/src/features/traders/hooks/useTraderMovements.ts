import { useEffect, useState } from 'react';
import { apiClient } from '../../../services/apiClient';

export interface TraderMovement {
  id: number;
  date: string;
  type: string;
  traderId?: number | null;
  traderName?: string;
  categoryName: string;
  grade: string;
  pitamStatus: string;
  quantity: number;
  notes?: string | null;
  isModulo: boolean;
}

interface UseTraderMovementsResult {
  rows: TraderMovement[];
  isLoading: boolean;
  error: string | null;
  reload: () => void;
}

export function useTraderMovements(
  seasonId: number | null,
  traderId?: number | null,
  movementStatus?: string,
  ownerScope?: 'ALL' | 'TRADER' | 'MODULO',
): UseTraderMovementsResult {
  const [rows, setRows] = useState<TraderMovement[]>([]);
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
    
    // Handle owner scope filter
    if (ownerScope) {
      params.set('ownerScope', ownerScope);
    }
    
    // Handle trader filter - only send when ownerScope is TRADER
    if (ownerScope === 'TRADER' && traderId && traderId !== 0) {
      params.set('traderId', String(traderId));
    }
    
    // Handle movement status filter - map to shipmentScope
    if (movementStatus && movementStatus !== 'ALL') {
      if (movementStatus === 'SHIPMENT') {
        // SHIPMENT includes PACKED_SHIPPED and SELF_PICKUP
        params.set('shipmentScope', 'SHIPPED');
      } else if (movementStatus === 'NON_SHIPMENT') {
        // NON_SHIPMENT - exclude shipment movements
        params.set('shipmentScope', 'UNSHIPPED');
      }
    }

    const queryString = params.toString();
    console.log('[useTraderMovements] API call params:', { seasonId, traderId, movementStatus, ownerScope });
    console.log('[useTraderMovements] Query string:', queryString);

    apiClient<TraderMovement[]>(`/inventory/movements?${queryString}`, {
      suppressGlobalFeedback: true,
    })
      .then((data) => {
        if (!isActive) return;
        setRows(Array.isArray(data) ? data : []);
        setError(null);
      })
      .catch((err) => {
        if (!isActive) return;
        setError(err instanceof Error ? err.message : 'Unknown error');
      })
      .finally(() => {
        if (!isActive) return;
        setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  };

  useEffect(() => {
    const cleanup = reload();
    return () => cleanup?.();
  }, [seasonId, traderId, movementStatus, ownerScope]);

  return { rows, isLoading, error, reload };
}
