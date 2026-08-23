import { useEffect, useState } from 'react';
import { fetchTraderInventorySummary } from '../services/traderInventorySummary.service';
import type { TraderInventorySummaryFilters, TraderInventorySummaryResponse } from '../traderInventory.types';

const EMPTY_SUMMARY: TraderInventorySummaryResponse = {
  rows: [],
  totals: {
    totalQuantity: 0,
    moduloQuantity: 0,
    traderQuantity: 0,
    remainsInItalyQuantity: 0,
    privateSelectionQuantity: 0,
  },
};

export function useTraderInventorySummary(enabled: boolean, filters: TraderInventorySummaryFilters) {
  const [summary, setSummary] = useState<TraderInventorySummaryResponse>(EMPTY_SUMMARY);
  // Tracks which shipmentScope the data in `summary` was actually fetched for, updated atomically
  // alongside setSummary - so consumers deciding what a scope-specific value means (e.g. hiding the
  // trader/modulo split for TRANSFERRED_TO_CUSTOMER) can key off the data's real scope instead of
  // the just-selected filter, which would otherwise flash the previous scope's stale totals while
  // the new filter's request is still in flight.
  const [loadedShipmentScope, setLoadedShipmentScope] = useState(filters.shipmentScope);
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
    const requestedShipmentScope = filters.shipmentScope;

    setIsLoading(true);
    setError(null);

    fetchTraderInventorySummary(filters)
      .then((nextSummary) => {
        if (!isActive) {
          return;
        }

        setSummary(nextSummary);
        setLoadedShipmentScope(requestedShipmentScope);
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
  }, [enabled, filters.ownerScope, filters.seasonId, filters.traderId, filters.shipmentScope, filters.sourceScope, filters.shareConditionScope, filters.shareConditionId, reloadKey]);

  return {
    rows: summary.rows,
    totals: summary.totals,
    loadedShipmentScope,
    isLoading,
    error,
    reload: () => setReloadKey((currentValue) => currentValue + 1),
  };
}