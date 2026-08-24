import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBoxArchive, FaBoxesPacking, FaGear, FaLeaf, FaSort, FaTruck } from 'react-icons/fa6';
import { AppShell } from '../../app/layout/AppShell';
import { SHIPMENTS_I18N } from '../shipments/i18n';
import { HOME_I18N } from './i18n';
import type { NavItem } from '../../types/navigation';
import { getCurrentUser, isAuthenticated, isWorkerRole, logout } from '../../services/authService';
import { NoPermissionBanner } from '../../components/ui/NoPermissionBanner';
import { HomeDashboard } from './dashboard/components/HomeDashboard';
import { IsraelHomeDashboard } from '../israel/dashboard/components/IsraelHomeDashboard';
import { DashboardHeaderActions } from './dashboard/components/DashboardHeaderActions';
import { useActiveModule } from '../../hooks/useActiveModule';

export function HomePage() {
  const navigate = useNavigate();
  const activeModule = useActiveModule();
  const [activeTopId, setActiveTopId] = useState('home');
  const currentUser = getCurrentUser();
  const isWorker = isWorkerRole(currentUser?.role);
  const [alertsCount, setAlertsCount] = useState<number>(0);

  useEffect(() => {
    // טען כמות הודעות שלא נקראו
    import('../../services/messagesApi').then(({ fetchUnreadCount }) => {
      fetchUnreadCount().then((res) => setAlertsCount(res.count)).catch(() => setAlertsCount(0));
    });
  }, []);

  // Redirect to login if not authenticated
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
  const t = SHIPMENTS_I18N[lang];
  const home = HOME_I18N[lang];

  const dashboardLabels = activeModule === 'israel'
    ? (lang === 'he'
        ? { title: 'דשבורד א"י', subtitle: 'סיכום ביצועים שוטף לעונה הנוכחית' }
        : { title: 'Israel Dashboard', subtitle: 'Live performance summary for the current season' })
    : (lang === 'he'
        ? { title: 'דשבורד עונה', subtitle: 'סיכום ביצועים שוטף לעונה הנוכחית' }
        : { title: 'Season Dashboard', subtitle: 'Live performance summary for the current season' });

  const qa = home.quickActions;

  if (!isAuthenticated()) {
    return null;
  }

  const quickActions = activeModule === 'israel'
    ? [
        { label: qa.addHarvest, icon: <FaLeaf />, onClick: () => navigate('/israel/harvest', { state: { openHarvestForm: true } }) },
        { label: qa.packItems, icon: <FaBoxesPacking />, onClick: () => navigate('/israel/shipments', { state: { openPacking: true } }) },
        { label: qa.settings, icon: <FaGear />, onClick: () => navigate('/israel/settings') },
      ]
    : [
        { label: qa.addHarvest, icon: <FaLeaf />, onClick: () => navigate('/italy/harvest', { state: { openHarvestForm: true } }) },
        { label: qa.addSorting, icon: <FaSort />, onClick: () => navigate('/italy/harvest', { state: { openSortingForm: true } }) },
        { label: qa.newShipment, icon: <FaTruck />, onClick: () => navigate('/italy/shipments', { state: { openNewShipment: true } }) },
        { label: qa.newBox, icon: <FaBoxArchive />, onClick: () => navigate('/italy/shipments', { state: { openNewBox: true } }) },
        { label: qa.packItems, icon: <FaBoxesPacking />, onClick: () => navigate('/italy/shipments', { state: { openPacking: true } }) },
        { label: qa.settings, icon: <FaGear />, onClick: () => navigate('/italy/settings') },
      ];

  const handleTopNavClick = (item: NavItem) => {
    setActiveTopId(item.id);
    navigate(item.href || `/${item.id}`);
  };

  return (
    <AppShell
      direction={lang === 'he' ? 'rtl' : 'ltr'}
      brandName="Wieders etrogs"
      pageTitle={dashboardLabels.title}
      pageSubtitle={dashboardLabels.subtitle}
      pageHeaderActions={
        !isWorker ? (
          <DashboardHeaderActions
            quickActionsLabel={qa.label}
            actions={quickActions}
          />
        ) : null
      }
      topNav={t.topNav}
      activeTopNavId={activeTopId}
      sidebarSections={t.sidebar}
      activeSidebarItemId="packaging"
      onTopNavClick={handleTopNavClick}
      onSidebarClick={() => {}}
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
      hideSidebar={true}
    >
      {isWorker ? (
        <NoPermissionBanner message={lang === 'he' ? 'אין לך הרשאת גישה לאזור זה.' : "You don't have permission to access this area."} />
      ) : activeModule === 'israel' ? (
        <IsraelHomeDashboard lang={lang} />
      ) : (
        <HomeDashboard lang={lang} />
      )}
    </AppShell>
  );
}
