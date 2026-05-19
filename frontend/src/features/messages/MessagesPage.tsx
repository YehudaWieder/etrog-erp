import { useEffect, useMemo, useState } from 'react';
import { FaPaperPlane } from 'react-icons/fa6';
import { MessagesList } from './MessagesList';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppShell } from '../../app/layout/AppShell';
import { SettingsIcon } from '../../components/ui/SettingsIcon';
import type { NavItem } from '../../types/navigation';
import { getCurrentUser, isAuthenticated, logout } from '../../services/authService';
import { MESSAGES_I18N } from './i18n';

const DEFAULT_SIDEBAR_ITEM_ID = 'all-messages';
type SidebarFilter = 'all-messages' | 'incoming-messages' | 'outgoing-messages' | 'unread-messages';

export function MessagesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [counts, setCounts] = useState({
    'all-messages': 0,
    'incoming-messages': 0,
    'outgoing-messages': 0,
    'unread-messages': 0,
  });
  const [lastActionText, setLastActionText] = useState('');
  const currentUser = getCurrentUser();

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
    }
  }, [navigate]);

  const lang = useMemo(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('app.language');
      if (stored && (stored === 'en' || stored === 'he')) return stored;
    }
    return 'he';
  }, []);

  const t = MESSAGES_I18N[lang];

  const activeSidebarId = useMemo(() => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    const subRoute = pathParts[1];
    return subRoute || DEFAULT_SIDEBAR_ITEM_ID;
  }, [location.pathname]);

  const normalizedFilter = useMemo<SidebarFilter>(() => {
    if (activeSidebarId === 'incoming-messages' || activeSidebarId === 'outgoing-messages' || activeSidebarId === 'unread-messages') {
      return activeSidebarId;
    }
    return 'all-messages';
  }, [activeSidebarId]);

  const pageTitle = useMemo(() => {
    const topSection = t.sidebar.find((s) => s.id === 'all-messages');
    const activeItem = topSection?.items.find((item) => item.id === normalizedFilter);
    const label = activeItem?.label || topSection?.title || t.pageTitle;
    const count = counts[normalizedFilter] ?? 0;
    return count > 0 ? `${label} (${count})` : label;
  }, [normalizedFilter, t.pageTitle, t.sidebar, counts]);

  const content = useMemo(() => {
    return t.emptyState[activeSidebarId] || t.emptyState.default;
  }, [activeSidebarId, t.emptyState]);

  const handleTopNavClick = (item: NavItem) => {
    navigate(`/${item.id}`);
  };

  const handleSidebarClick = (item: NavItem) => {
    navigate(item.href || `/messages/${item.id}`);
  };

  const handleAction = (actionLabel: string) => {
    setLastActionText(lang === 'he' ? `נבחרה פעולה: ${actionLabel}` : `Action selected: ${actionLabel}`);
  };

  return (
    <AppShell
      direction={lang === 'he' ? 'rtl' : 'ltr'}
      brandName="Wieders etrogs"
      pageTitle={pageTitle}
      topNav={t.topNav}
      sidebarSections={t.sidebar}
      activeSidebarItemId={activeSidebarId}
      onTopNavClick={handleTopNavClick}
      onSidebarClick={handleSidebarClick}
      onBrandClick={() => navigate('/home')}
      topBarOptions={{
        alertsCount: counts['unread-messages'] > 0 ? counts['unread-messages'] : undefined,
        onAlertsClick: () => navigate('/messages'),
        isAuthenticated: isAuthenticated(),
        onLogin: () => navigate('/login'),
        onRegister: () => navigate('/register'),
        onLogout: async () => {
          await logout();
          navigate('/login');
        },
        onProfile: () => navigate('/profile'),
        userName: currentUser?.name || (lang === 'he' ? 'הפרופיל שלי' : 'My Profile'),
      }}
      sidebarFooterSlot={
        <button
          type="button"
          className="app-shell__sidebar-item app-shell__sidebar-settings"
          onClick={() => navigate('/settings')}
        >
          {lang === 'he' ? (
            <>
              {t.settings}
              <SettingsIcon style={{ marginInlineStart: 8 }} />
            </>
          ) : (
            <>
              <SettingsIcon style={{ marginInlineEnd: 8 }} />
              {t.settings}
            </>
          )}
        </button>
      }
    >
      <div className="app-shell__content-header">
        <div className="action-buttons">
          <button className="btn btn-primary" type="button" onClick={() => handleAction(t.actions.sendNew)}>
            <FaPaperPlane />
            <span>{t.actions.sendNew}</span>
          </button>
        </div>
      </div>

      <MessagesList
        filter={normalizedFilter}
        lang={lang}
        userId={currentUser?.id}
        onCountsChange={setCounts}
        onActionFeedback={setLastActionText}
      />
      {lastActionText ? <p className="shipments-last-action">{lastActionText}</p> : null}
    </AppShell>
  );
}
