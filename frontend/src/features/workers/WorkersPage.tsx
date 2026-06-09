import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../../app/layout/AppShell';
import { SHIPMENTS_I18N } from '../shipments/i18n';
import type { NavItem } from '../../types/navigation';
import { getCurrentUser, isAuthenticated, logout } from '../../services/authService';

export function WorkersPage() {
  const navigate = useNavigate();
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
  const t = SHIPMENTS_I18N[lang];

  const handleTopNavClick = (item: NavItem) => {
    setActiveTopId(item.id);
    navigate(`/${item.id}`);
  };

  return (
    <AppShell
      direction={lang === 'he' ? 'rtl' : 'ltr'}
      brandName="Wieders etrogs"
      pageTitle={undefined}
      topNav={t.topNav}
      activeTopNavId={activeTopId}
      sidebarSections={t.sidebar}
      activeSidebarItemId=""
      onTopNavClick={handleTopNavClick}
      onSidebarClick={() => {}}
      onBrandClick={() => navigate('/home')}
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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <span style={{ fontSize: '4rem', fontWeight: 'bold' }}>בקרוב...</span>
      </div>
    </AppShell>
  );
}
