import { useEffect, useMemo, useState } from 'react';
import { FaPlus } from 'react-icons/fa6';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppShell } from '../../app/layout/AppShell';
import { SettingsIcon } from '../../components/ui/SettingsIcon';
import { SHIPMENTS_I18N } from './i18n';
import type { NavItem } from '../../types/navigation';
import { getCurrentUser, isAuthenticated, logout } from '../../services/authService';

const DEFAULT_SIDEBAR_ITEM_ID = 'packaging';

// Removed sidebarTextById. All text now comes from i18n object.

export function ShipmentsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTopId, setActiveTopId] = useState('shipments');
  const [alertsCount, setAlertsCount] = useState<number>(0);

  useEffect(() => {
    // טען כמות הודעות שלא נקראו
    import('../../services/messagesApi').then(({ fetchUnreadCount }) => {
      fetchUnreadCount().then((res) => setAlertsCount(res.count)).catch(() => setAlertsCount(0));
    });
  }, []);
  const [lastActionText, setLastActionText] = useState<string>('');
  const currentUser = getCurrentUser();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
    }
  }, [navigate]);

  const handleLogin = () => navigate('/login');
  const handleRegister = () => alert('הרשמה');
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };
  const handleProfile = () => navigate('/profile');

  // Detect language from localStorage or default to 'he'
  const lang = useMemo(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('app.language');
      if (stored && (stored === 'en' || stored === 'he')) return stored;
    }
    return 'he';
  }, []);
  const t = SHIPMENTS_I18N[lang];

  const activeSidebarId = useMemo(() => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    const subRoute = pathParts[1];
    return subRoute || DEFAULT_SIDEBAR_ITEM_ID;
  }, [location.pathname]);

  const pageTitle = useMemo(() => {
    for (const section of t.sidebar) {
      if (section.id === activeSidebarId) {
        return section.title;
      }

      const activeItem = section.items.find((item) => item.id === activeSidebarId);
      if (activeItem) {
        return activeItem.label;
      }
    }

    return t.pageTitle;
  }, [activeSidebarId, t.sidebar, t.pageTitle]);

  const content = useMemo(() => {
    const state = t.emptyState as Record<string, { title: string; description: string }>;
    return state[activeSidebarId] || state.default;
  }, [activeSidebarId, t]);

  const handleTopNavClick = (item: NavItem) => {
    setActiveTopId(item.id);
    navigate(`/${item.id}`);
  };

  const handleSidebarClick = (item: NavItem) => {
    navigate(item.href || `/shipments/${item.id}`);
  };

  const handleCreateAction = (label: string) => {
    setLastActionText(lang === 'he' ? `נבחרה פעולה: ${label}` : `Action selected: ${label}`);
  };

  return (
    <AppShell
      direction={lang === 'he' ? 'rtl' : 'ltr'}
      brandName="Wieders etrogs"
      pageTitle={pageTitle}
      topNav={t.topNav}
      activeTopNavId={activeTopId}
      sidebarSections={t.sidebar}
      activeSidebarItemId={activeSidebarId}
      onTopNavClick={handleTopNavClick}
      onSidebarClick={handleSidebarClick}
      onBrandClick={() => navigate('/home')}
      topBarOptions={{
        alertsCount,
        onAlertsClick: () => navigate('/messages'),
        isAuthenticated: isAuthenticated(),
        onLogin: handleLogin,
        onRegister: handleRegister,
        onLogout: handleLogout,
        onProfile: handleProfile,
        userName: currentUser?.name || 'הפרופיל שלי',
      }}
      sidebarFooterSlot={
        <button type="button" className="app-shell__sidebar-item app-shell__sidebar-settings">
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
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => handleCreateAction(t.addItem)}
          >
            <FaPlus />
            <span>{t.addItem}</span>
          </button>
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => handleCreateAction(t.addBox)}
          >
            <FaPlus />
            <span>{t.addBox}</span>
          </button>
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => handleCreateAction(t.addShipment)}
          >
            <FaPlus />
            <span>{t.addShipment}</span>
          </button>
        </div>
      </div>

      <section className="shipments-empty-state">
        <h2 className="shipments-empty-title">{content.title}</h2>
        <p className="shipments-empty-desc">{content.description}</p>
        {lastActionText ? <p className="shipments-last-action">{lastActionText}</p> : null}
      </section>
    </AppShell>
  );
}
