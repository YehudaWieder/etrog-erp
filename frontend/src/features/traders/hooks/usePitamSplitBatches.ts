import { useEffect, useState } from 'react';
import { fetchPitamSplitBatches, type PitamSplitBatch } from '../../../services/inventoryMovementsApi';

export function usePitamSplitBatches(
  enabled: boolean,
  filters: { seasonId: number | null; traderCategoryId?: number; grade?: string },
) {
  const [batches, setBatches] = useState<PitamSplitBatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!enabled || !filters.seasonId) {
      setBatches([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    let isActive = true;

    setIsLoading(true);
    setError(null);

    fetchPitamSplitBatches({
      seasonId: filters.seasonId,
      traderCategoryId: filters.traderCategoryId,
      grade: filters.grade,
    })
      .then((nextBatches) => {
        if (!isActive) return;
        setBatches(nextBatches);
      })
      .catch((nextError: unknown) => {
        if (!isActive) return;
        setBatches([]);
        setError(nextError instanceof Error ? nextError.message : 'Failed to load pitam split batches.');
      })
      .finally(() => {
        if (!isActive) return;
        setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [enabled, filters.seasonId, filters.traderCategoryId, filters.grade, reloadKey]);

  return {
    batches,
    isLoading,
    error,
    reload: () => setReloadKey((currentValue) => currentValue + 1),
  };
}
