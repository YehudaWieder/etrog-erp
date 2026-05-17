import { useMemo, useState } from 'react';
import { FaBell, FaCalendarDays, FaCircleUser } from 'react-icons/fa6';
import { FaPlus } from 'react-icons/fa6';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppShell } from '../../app/layout/AppShell';
import { SettingsIcon } from '../../components/ui/SettingsIcon';
import { SHIPMENTS_I18N } from './i18n';
import type { NavItem } from '../../types/navigation';

const DEFAULT_SIDEBAR_ITEM_ID = 'packaging';

// Removed sidebarTextById. All text now comes from i18n object.

export function ShipmentsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTopId, setActiveTopId] = useState('shipments');
  const [alertsCount, setAlertsCount] = useState(3);
  const [lastActionText, setLastActionText] = useState<string>('');

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

  const content = useMemo(() => {
    const state = t.emptyState as Record<string, { title: string; description: string }>;
    return state[activeSidebarId] || state.default;
  }, [activeSidebarId, t]);

  const handleTopNavClick = (item: NavItem) => {
    setActiveTopId(item.id);
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
      pageTitle={t.pageTitle}
      topNav={t.topNav}
      activeTopNavId={activeTopId}
      sidebarSections={t.sidebar}
      activeSidebarItemId={activeSidebarId}
      onTopNavClick={handleTopNavClick}
      onSidebarClick={handleSidebarClick}
      topBarRightSlot={
        <div className="nav-icons">
          <button className="nav-icon-btn" type="button" aria-label={lang === 'he' ? 'לוח שנה' : 'Calendar'}>
            <FaCalendarDays />
          </button>
          <button
            className="nav-icon-btn"
            type="button"
            aria-label={lang === 'he' ? 'התראות' : 'Alerts'}
            onClick={() => setAlertsCount((value) => (value > 0 ? value - 1 : 0))}
          >
            <FaBell />
            <span className="badge">{alertsCount}</span>
          </button>
          <button className="nav-icon-btn" type="button" aria-label={lang === 'he' ? 'פרופיל משתמש' : 'User profile'}>
            <FaCircleUser />
          </button>
        </div>
      }
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
