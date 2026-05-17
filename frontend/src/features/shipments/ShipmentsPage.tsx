import { useMemo, useState } from 'react';
import { FaBell, FaCalendarDays, FaCircleUser } from 'react-icons/fa6';
import { FaPlus } from 'react-icons/fa6';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppShell } from '../../app/layout/AppShell';
import { SHIPMENTS_SIDEBAR, SHIPMENTS_TOP_NAV } from './shipments-navigation';
import type { NavItem } from '../../types/navigation';

const DEFAULT_SIDEBAR_ITEM_ID = 'packaging';

const sidebarTextById: Record<string, { title: string; description: string }> = {
  packaging: {
    title: 'אין משלוחים באריזה להצגה',
    description: 'לחץ על "משלוח חדש" כדי להתחיל להוסיף משלוחים.',
  },
  completed: {
    title: 'אין משלוחים שהושלמו להצגה',
    description: 'כשתסיים אריזה ומשלוח, הרשומות יופיעו כאן.',
  },
  'not-sent-boxes': {
    title: 'אין קרטונים שלא נשלחו',
    description: 'ניתן לפתוח קרטון חדש ולהתחיל שיבוץ פריטים.',
  },
  'sent-boxes': {
    title: 'אין קרטונים שנשלחו',
    description: 'כאן יוצגו קרטונים שכבר יצאו למשלוח.',
  },
  'closed-boxes': {
    title: 'אין קרטונים סגורים',
    description: 'סגור קרטונים פעילים כדי לראות אותם כאן.',
  },
  'open-boxes': {
    title: 'אין קרטונים פתוחים',
    description: 'פתח קרטון חדש כדי להתחיל לארוז.',
  },
  'sent-items': {
    title: 'אין פריטים שנשלחו',
    description: 'כאן יופיעו כל הפריטים שנשלחו ללקוחות.',
  },
  'pending-items': {
    title: 'אין פריטים שממתינים למשלוח',
    description: 'כשיוזנו פריטים חדשים הם יופיעו כאן.',
  },
};

export function ShipmentsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTopId, setActiveTopId] = useState('shipments');
  const [alertsCount, setAlertsCount] = useState(3);
  const [lastActionText, setLastActionText] = useState<string>('');

  const activeSidebarId = useMemo(() => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    const subRoute = pathParts[1];
    return subRoute || DEFAULT_SIDEBAR_ITEM_ID;
  }, [location.pathname]);

  const content = useMemo(() => {
    return (
      sidebarTextById[activeSidebarId] || {
        title: 'אין נתונים להצגה',
        description: 'בחר פריט מהתפריט הצידי כדי לראות מידע רלוונטי.',
      }
    );
  }, [activeSidebarId]);

  const handleTopNavClick = (item: NavItem) => {
    setActiveTopId(item.id);
  };

  const handleSidebarClick = (item: NavItem) => {
    navigate(item.href || `/shipments/${item.id}`);
  };

  const handleCreateAction = (label: string) => {
    setLastActionText(`נבחרה פעולה: ${label}`);
  };

  return (
    <AppShell
      direction="rtl"
      brandName="Wieders etrogs"
      pageTitle="כל המשלוחים"
      topNav={SHIPMENTS_TOP_NAV}
      activeTopNavId={activeTopId}
      sidebarSections={SHIPMENTS_SIDEBAR}
      activeSidebarItemId={activeSidebarId}
      onTopNavClick={handleTopNavClick}
      onSidebarClick={handleSidebarClick}
      topBarRightSlot={
        <div className="nav-icons">
          <button className="nav-icon-btn" type="button" aria-label="לוח שנה">
            <FaCalendarDays />
          </button>
          <button
            className="nav-icon-btn"
            type="button"
            aria-label="התראות"
            onClick={() => setAlertsCount((value) => (value > 0 ? value - 1 : 0))}
          >
            <FaBell />
            <span className="badge">{alertsCount}</span>
          </button>
          <button className="nav-icon-btn" type="button" aria-label="פרופיל משתמש">
            <FaCircleUser />
          </button>
        </div>
      }
      sidebarFooterSlot={
        <button type="button" className="app-shell__sidebar-item">
          הגדרות
        </button>
      }
    >
      <div className="app-shell__content-header">
        <div className="action-buttons">
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => handleCreateAction('פריט חדש')}
          >
            <FaPlus />
            <span>פריט חדש</span>
          </button>
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => handleCreateAction('קרטון חדש')}
          >
            <FaPlus />
            <span>קרטון חדש</span>
          </button>
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => handleCreateAction('משלוח חדש')}
          >
            <FaPlus />
            <span>משלוח חדש</span>
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
