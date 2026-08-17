import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppShell } from '../../app/layout/AppShell';
import { HARVEST_I18N } from '../harvest/i18n';
import { ISRAEL_HARVEST_I18N } from './i18n';
import type { NavItem } from '../../types/navigation';
import { getCurrentUser, isAuthenticated, logout } from '../../services/authService';
import { useActiveModule } from '../../hooks/useActiveModule';
import { SettingsIcon } from '../../components/ui/SettingsIcon';

const DEFAULT_SIDEBAR_ITEM_ID = 'harvest-summary';

export function IsraelHarvestPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const activeModule = useActiveModule();
  const [activeTopId, setActiveTopId] = useState('workers');
  const currentUser = getCurrentUser();
  const [alertsCount, setAlertsCount] = useState<number>(0);

  useEffect(() => {
    import('../../services/messagesApi').then(({ fetchUnreadCount }) => {
      fetchUnreadCount().then((res) => setAlertsCount(res.count)).catch(() => setAlertsCount(0));
    });
  }, []);

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
  const topNavT = HARVEST_I18N[lang];
  const t = ISRAEL_HARVEST_I18N[lang];

  const activeSidebarId = useMemo(() => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    const subRoute = pathParts[2];
    return subRoute || DEFAULT_SIDEBAR_ITEM_ID;
  }, [location.pathname]);

  const content = useMemo(() => {
    return t.emptyState[activeSidebarId] ?? t.emptyState.default;
  }, [activeSidebarId, t.emptyState]);

  const handleTopNavClick = (item: NavItem) => {
    setActiveTopId(item.id);
    navigate(item.href || `/${item.id}`);
  };

  const handleSidebarClick = (item: NavItem) => {
    navigate(`/${activeModule}${item.href || `/harvest/${item.id}`}`);
  };

  return (
    <AppShell
      direction={lang === 'he' ? 'rtl' : 'ltr'}
      brandName="Wieders etrogs"
      pageTitle={t.pageTitle}
      topNav={topNavT.topNav}
      activeTopNavId={activeTopId}
      sidebarSections={t.sidebar}
      activeSidebarItemId={activeSidebarId}
      onTopNavClick={handleTopNavClick}
      onSidebarClick={handleSidebarClick}
      onBrandClick={() => navigate(`/${activeModule}/home`)}
      topBarOptions={{
        alertsCount,
        onAlertsClick: () => navigate('/messages'),
        isAuthenticated: isAuthenticated(),
        onLogin: () => navigate('/login'),
        onRegister: () => navigate('/register'),
        onLogout: async () => {
          await logout();
          navigate('/login');
        },
        onProfile: () => navigate('/profile'),
        userName: currentUser?.name || '',
      }}
      sidebarFooterSlot={
        <button
          type="button"
          className="app-shell__sidebar-item app-shell__sidebar-settings"
          onClick={() => navigate(`/${activeModule}/settings`)}
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
      <section className="shipments-empty-state">
        <h2 className="shipments-empty-title">{content.title}</h2>
        <p className="shipments-empty-desc">{content.description}</p>
      </section>
    </AppShell>
  );
}
