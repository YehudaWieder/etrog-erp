import { useEffect, useState } from 'react';
import { fetchTraderInventorySummary } from '../services/traderInventorySummary.service';
import type { TraderInventorySummaryFilters, TraderInventorySummaryResponse } from '../traderInventory.types';

const EMPTY_SUMMARY: TraderInventorySummaryResponse = {
  rows: [],
  totals: {
    totalQuantity: 0,
    moduloQuantity: 0,
    traderQuantity: 0,
  },
};

export function useTraderInventorySummary(enabled: boolean, filters: TraderInventorySummaryFilters) {
  const [summary, setSummary] = useState<TraderInventorySummaryResponse>(EMPTY_SUMMARY);
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

    fetchTraderInventorySummary(filters)
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

        setError(nextError instanceof Error ? nextError.message : 'Failed to load trader inventory summary.');
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
  }, [enabled, filters.ownerScope, filters.seasonId, filters.traderId, reloadKey]);

  return {
    rows: summary.rows,
    totals: summary.totals,
    isLoading,
    error,
    reload: () => setReloadKey((currentValue) => currentValue + 1),
  };
}