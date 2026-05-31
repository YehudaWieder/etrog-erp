import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { isAuthenticated } from '../../../../services/authService';

type UseHarvestPageLifecycleParams = {
  navigate: (path: string) => void;
  setIsDragSelecting: Dispatch<SetStateAction<boolean>>;
};

export function useHarvestPageLifecycle({
  navigate,
  setIsDragSelecting,
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

  useEffect(() => {
    const stopSelecting = () => {
      setIsDragSelecting(false);
    };

    window.addEventListener('pointerup', stopSelecting);

    return () => {
      window.removeEventListener('pointerup', stopSelecting);
    };
  }, [setIsDragSelecting]);

  return alertsCount;
}
