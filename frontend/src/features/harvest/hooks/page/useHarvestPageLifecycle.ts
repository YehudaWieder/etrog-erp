import { useEffect, useState } from 'react';
import { isAuthenticated } from '../../../../services/authService';

type UseHarvestPageLifecycleParams = {
  navigate: (path: string) => void;
};

export function useHarvestPageLifecycle({
  navigate,
}: UseHarvestPageLifecycleParams): number {
  const [alertsCount, setAlertsCount] = useState<number>(0);

  useEffect(() => {
    import('../../../../services/messagesApi').then(({ fetchUnreadCount }) => {
      fetchUnreadCount().then((res: { count: number }) => setAlertsCount(res.count)).catch(() => setAlertsCount(0));
    });
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
    }
  }, [navigate]);

  return alertsCount;
}
