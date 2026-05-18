import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppShell } from '../../app/layout/AppShell';
import type { NavItem } from '../../types/navigation';
import { getCurrentUser, isAuthenticated, logout } from '../../services/authService';
import { PROFILE_I18N } from './i18n';

const DEFAULT_PROFILE_ITEM_ID = 'my-profile';

export function ProfilePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [alertsCount, setAlertsCount] = useState(0);
  const currentUser = getCurrentUser();

  const lang = useMemo(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('app.language');
      if (stored && (stored === 'en' || stored === 'he')) return stored;
    }
    return 'he';
  }, []);
  const t = PROFILE_I18N[lang];

  const activeSidebarId = useMemo(() => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    const subRoute = pathParts[1];
    return subRoute || DEFAULT_PROFILE_ITEM_ID;
  }, [location.pathname]);

  const content = useMemo(() => {
    return t.emptyState[activeSidebarId] || t.emptyState.default;
  }, [activeSidebarId, t.emptyState]);

  const handleTopNavClick = (item: NavItem) => {
    navigate(`/${item.id}`);
  };

  const handleSidebarClick = (item: NavItem) => {
    navigate(item.href || `/profile/${item.id}`);
  };

  return (
    <AppShell
      direction={lang === 'he' ? 'rtl' : 'ltr'}
      brandName="Wieders etrogs"
      pageTitle={t.pageTitle}
      topNav={t.topNav}
      sidebarSections={t.sidebar}
      activeSidebarItemId={activeSidebarId}
      onTopNavClick={handleTopNavClick}
      onSidebarClick={handleSidebarClick}
      onBrandClick={() => navigate('/home')}
      topBarOptions={{
        alertsCount,
        onAlertsClick: () => setAlertsCount((value) => (value > 0 ? value - 1 : 0)),
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
    >
      <section className="shipments-empty-state">
        <h2 className="shipments-empty-title">{content.title}</h2>
        <p className="shipments-empty-desc">{content.description}</p>
      </section>
    </AppShell>
  );
}
