
import { useEffect, useState } from 'react';
import { FaEnvelope, FaCalendarDays } from 'react-icons/fa6';
import type { NavItem } from '../../types/navigation';
import { HomeIcon } from '../ui/HomeIcon';
import { ProfileMenu, type ProfileMenuProps } from './ProfileMenu';
import { TopBar } from './TopBar';

type AppTopBarProps = {
  links: NavItem[];
  activeId?: string;
  onNavigate?: (item: NavItem) => void;
  brandName?: string;
  lang: 'he' | 'en';
  alertsCount?: number; // deprecated, will be ignored
  onAlertsClick?: () => void;
  onBrandClick?: () => void;
} & ProfileMenuProps;

export function AppTopBar({
  links,
  activeId,
  onNavigate,
  brandName = 'Wieders etrogs',
  lang,
  onAlertsClick,
  onBrandClick,
  isAuthenticated,
  onLogin,
  onRegister,
  onLogout,
  onProfile,
  userName,
}: AppTopBarProps) {
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;
    import('../../services/messagesApi').then(({ fetchUnreadCount }) => {
      fetchUnreadCount().then((res) => {
        if (isMounted) setUnreadCount(res.count);
      }).catch(() => {
        if (isMounted) setUnreadCount(0);
      });
    });
    return () => { isMounted = false; };
  }, []);

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
          <HomeIcon style={{ fontSize: 22, marginInlineEnd: 6 }} />
          {brandName}
        </button>
      }
      rightSlot={
        <div className="nav-icons">
          <button className="nav-icon-btn" type="button" aria-label={lang === 'he' ? 'לוח שנה' : 'Calendar'}>
            <FaCalendarDays />
          </button>
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
