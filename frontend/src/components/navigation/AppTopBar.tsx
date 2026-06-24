
import { FaEnvelope, FaGauge } from 'react-icons/fa6';
import type { NavItem } from '../../types/navigation';
import { CalendarPopover } from './CalendarPopover';
import { ProfileMenu, type ProfileMenuProps } from './ProfileMenu';
import { TopBar } from './TopBar';
import { useUnreadMessagesCount } from '../../hooks/useUnreadMessagesCount';
import navStyles from './styles/NavigationControls.module.css';

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
  const { unreadCount } = useUnreadMessagesCount(alertsCount);

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
        <div className={navStyles.iconGroup}>
          <CalendarPopover lang={lang} />
          <button
            className={navStyles.iconButton}
            type="button"
            aria-label={lang === 'he' ? 'דשבורד' : 'Dashboard'}
            onClick={onBrandClick}
          >
            <FaGauge />
          </button>
          <button
            className={navStyles.iconButton}
            type="button"
            aria-label={lang === 'he' ? 'הודעות' : 'Messages'}
            onClick={onAlertsClick}
          >
            <FaEnvelope />
            {unreadCount > 0 ? <span className={navStyles.badge}>{unreadCount}</span> : null}
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
