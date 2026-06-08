import { useEffect, useState } from 'react';
import { fetchCustomerInventorySummary } from '../services/customerInventorySummary.service';
import type {
  CustomerInventorySummaryFilters,
  CustomerInventorySummaryResponse,
} from '../customerInventory.types';

const EMPTY_SUMMARY: CustomerInventorySummaryResponse = {
  rows: [],
  totals: {
    totalQuantity: 0,
  },
};

export function useCustomerInventorySummary(
  enabled: boolean,
  filters: CustomerInventorySummaryFilters,
) {
  const [summary, setSummary] = useState<CustomerInventorySummaryResponse>(EMPTY_SUMMARY);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setSummary(EMPTY_SUMMARY);
      setIsLoading(false);
      setError(null);
      return;
    }

    let isActive = true;
    setIsLoading(true);
    setError(null);

    fetchCustomerInventorySummary(filters)
      .then((nextSummary) => {
        if (!isActive) {
          return;
        }

        setSummary(nextSummary);
      })
      .catch((nextError: unknown) => {
        if (!isActive) {
          return;
        }

        setError(
          nextError instanceof Error
            ? nextError.message
            : 'Failed to load customer inventory summary.',
        );
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
  }, [enabled, filters.customerId, filters.seasonId, filters.shipmentScope, reloadKey]);

  return {
    rows: summary.rows,
    totals: summary.totals,
    isLoading,
    error,
    reload: () => setReloadKey((currentValue) => currentValue + 1),
  };
}
