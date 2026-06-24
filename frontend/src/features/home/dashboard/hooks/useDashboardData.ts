import { useState, useEffect } from 'react';
import type { DashboardData } from '../types';
import { getDashboardData } from '../dashboardApi';

type UseDashboardDataResult = {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
};

export function useDashboardData(seasonId?: string): UseDashboardDataResult {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getDashboardData(seasonId)
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
