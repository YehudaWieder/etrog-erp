import { useEffect, useState } from 'react';

export function useUnreadAlertsCount() {
  const [alertsCount, setAlertsCount] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;

    void import('../../../services/messagesApi')
      .then(({ fetchUnreadCount }) => fetchUnreadCount())
      .then((res) => {
        if (!isMounted) {
          return;
        }

        setAlertsCount(res.count);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setAlertsCount(0);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return alertsCount;
}
