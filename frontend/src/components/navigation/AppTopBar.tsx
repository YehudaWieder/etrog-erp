
import { useEffect, useState } from 'react';
import { FaEnvelope } from 'react-icons/fa6';
import type { NavItem } from '../../types/navigation';
import { CalendarPopover } from './CalendarPopover';
import { ProfileMenu, type ProfileMenuProps } from './ProfileMenu';
import { TopBar } from './TopBar';
import { fetchUnreadCount } from '../../services/messagesApi';

type AppTopBarProps = {
  links: NavItem[];
  activeId?: string;
  onNavigate?: (item: NavItem) => void;
  brandName?: string;
  logoSrc?: string;
  lang: 'he' | 'en';
  alertsCount?: number;
  onAlertsClick?: () => void;
  onBrandClick?: () => void;
} & ProfileMenuProps;

export function AppTopBar({
  links,
  activeId,
  onNavigate,
  brandName = 'Wieders etrogs',
  lang,
  alertsCount,
  onAlertsClick,
  onBrandClick,
  isAuthenticated,
  onLogin,
  onRegister,
  onLogout,
  onProfile,
  userName,
}: AppTopBarProps) {
  const [fetchedUnreadCount, setFetchedUnreadCount] = useState<number>(0);

  const unreadCount = typeof alertsCount === 'number' ? alertsCount : fetchedUnreadCount;

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

  return (
    <TopBar
      links={links}
      activeId={activeId}
      onNavigate={onNavigate}
      leftSlot={
        <button
          type="button"
          onClick={onBrandClick}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'inherit',
            fontSize: 'inherit',
            fontWeight: 'inherit',
            padding: 0,
          }}
          aria-label={lang === 'he' ? 'לעמוד הבית' : 'Go to home'}
        >
          {brandName}
        </button>
      }
      rightSlot={
        <div className="nav-icons">
          <CalendarPopover lang={lang} />
          <button
            className="nav-icon-btn"
            type="button"
            aria-label={lang === 'he' ? 'הודעות' : 'Messages'}
            onClick={onAlertsClick}
          >
            <FaEnvelope />
            {unreadCount > 0 ? <span className="badge">{unreadCount}</span> : null}
          </button>
          <ProfileMenu
            isAuthenticated={isAuthenticated}
            onLogin={onLogin}
            onRegister={onRegister}
            onLogout={onLogout}
            onProfile={onProfile}
            userName={userName}
          />
        </div>
      }
    />
  );
}
