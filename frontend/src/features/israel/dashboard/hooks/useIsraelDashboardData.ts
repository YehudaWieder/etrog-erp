import { useState, useEffect } from 'react';
import type { IsraelDashboardData } from '../israelTypes';
import { getIsraelDashboardData } from '../israelDashboardApi';

type UseIsraelDashboardDataResult = {
  data: IsraelDashboardData | null;
  loading: boolean;
  error: string | null;
};

export function useIsraelDashboardData(seasonId?: string): UseIsraelDashboardDataResult {
  const [data, setData] = useState<IsraelDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getIsraelDashboardData(seasonId)
      .then((res) => {
        if (!cancelled) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message || 'שגיאה בטעינת הנתונים');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [seasonId]);

  return { data, loading, error };
}
