import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppShell } from '../../app/layout/AppShell';
import type { NavItem } from '../../types/navigation';
import { getCurrentUser, getMyProfile, isAuthenticated, logout, type AuthProfile } from '../../services/authService';
import { PROFILE_I18N } from './i18n';

const DEFAULT_PROFILE_ITEM_ID = 'my-profile';

export function ProfilePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [alertsCount, setAlertsCount] = useState(0);
  const currentUser = getCurrentUser();
  const [profile, setProfile] = useState<AuthProfile | null>(currentUser);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');

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

  useEffect(() => {
    let isMounted = true;

    if (!isAuthenticated()) {
      setProfile(null);
      return;
    }

    setIsLoadingProfile(true);
    setProfileError('');

    void getMyProfile()
      .then((result) => {
        if (!isMounted) {
          return;
        }

        setProfile(result);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setProfileError(t.profileCard.fallbackError);
      })
      .finally(() => {
        if (!isMounted) {
          return;
        }

        setIsLoadingProfile(false);
      });

    return () => {
      isMounted = false;
    };
  }, [t.profileCard.fallbackError]);

  const profileRows = useMemo(() => {
    if (!profile) {
      return [];
    }

    return [
      { label: t.profileCard.fields.id, value: String(profile.id) },
      { label: t.profileCard.fields.name, value: profile.name },
      { label: t.profileCard.fields.email, value: profile.email },
      { label: t.profileCard.fields.phone, value: profile.phone || t.profileCard.emptyValue },
      { label: t.profileCard.fields.role, value: profile.role },
      { label: t.profileCard.fields.status, value: profile.isActive ? t.profileCard.active : t.profileCard.inactive },
      { label: t.profileCard.fields.slug, value: profile.slug || t.profileCard.emptyValue },
    ];
  }, [profile, t.profileCard]);

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
      {activeSidebarId === 'my-profile' ? (
        <section className="profile-card">
          <div className="profile-card__header">
            <h2 className="profile-card__title">{t.profileCard.title}</h2>
            <p className="profile-card__description">{t.profileCard.description}</p>
          </div>

          {profileError ? <p className="profile-card__notice">{profileError}</p> : null}
          {isLoadingProfile ? <p className="profile-card__loading">{t.profileCard.loading}</p> : null}

          <div className="profile-card__grid">
            {profileRows.map((row) => (
              <div key={row.label} className="profile-card__item">
                <span className="profile-card__label">{row.label}</span>
                <strong className="profile-card__value">{row.value}</strong>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="shipments-empty-state">
          <h2 className="shipments-empty-title">{content.title}</h2>
          <p className="shipments-empty-desc">{content.description}</p>
        </section>
      )}
    </AppShell>
  );
}
