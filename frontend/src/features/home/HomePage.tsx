import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../../app/layout/AppShell';
import { SHIPMENTS_I18N } from '../shipments/i18n';
import type { NavItem } from '../../types/navigation';

export function HomePage() {
  const navigate = useNavigate();
  const [activeTopId, setActiveTopId] = useState('shipments');
  const [isAuthenticated] = useState(false);
  const [userName] = useState('');

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
      pageTitle={t.pageTitle}
      topNav={t.topNav}
      activeTopNavId={activeTopId}
      sidebarSections={t.sidebar}
      activeSidebarItemId="packaging"
      onTopNavClick={handleTopNavClick}
      onSidebarClick={() => {}}
      onBrandClick={() => navigate('/home')}
      topBarOptions={{
        alertsCount: 0,
        onAlertsClick: () => {},
        isAuthenticated,
        onLogin: () => navigate('/login'),
        onRegister: () => navigate('/register'),
        onLogout: () => {},
        onProfile: () => {},
        userName,
      }}
      hideSidebar={true}
    >
      <section className="home-welcome">
        <h2>{lang === 'he' ? 'ברוכים הבאים' : 'Welcome'}</h2>
        <p>{lang === 'he' ? 'בחר פעולה מהסרגל העליון' : 'Select an action from the top bar'}</p>
      </section>
    </AppShell>
  );
}
