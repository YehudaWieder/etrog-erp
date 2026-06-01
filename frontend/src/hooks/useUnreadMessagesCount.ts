import { useEffect, useState } from 'react';
import { fetchUnreadCount } from '../services/messagesApi';

type UseUnreadMessagesCountResult = {
  unreadCount: number;
};

export function useUnreadMessagesCount(alertsCount?: number): UseUnreadMessagesCountResult {
  const [fetchedUnreadCount, setFetchedUnreadCount] = useState<number>(0);

  useEffect(() => {
    if (typeof alertsCount === 'number') {
      return;
    }

    let isMounted = true;
    const pollIntervalMs = 2 * 60 * 1000;

    const refreshUnreadCount = async () => {
      try {
        const res = await fetchUnreadCount();
        if (isMounted) {
          setFetchedUnreadCount(res.count);
        }
      } catch {
        if (isMounted) {
          setFetchedUnreadCount(0);
        }
      }
    };

    void refreshUnreadCount();

    const intervalId = window.setInterval(() => {
      void refreshUnreadCount();
    }, pollIntervalMs);

    const handleWindowFocus = () => {
      void refreshUnreadCount();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refreshUnreadCount();
      }
    };

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [alertsCount]);

  return {
    unreadCount: typeof alertsCount === 'number' ? alertsCount : fetchedUnreadCount,
  };
}