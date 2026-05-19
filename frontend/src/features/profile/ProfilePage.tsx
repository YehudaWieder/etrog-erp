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

  const locale = lang === 'he' ? 'he-IL' : 'en-US';

  const formatDate = (value?: string) => {
    if (!value) {
      return t.profileCard.emptyValue;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return t.profileCard.emptyValue;
    }

    return new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(parsed);
  };

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
      { label: t.profileCard.fields.createdAt, value: formatDate(profile.createdAt) },
      { label: t.profileCard.fields.updatedAt, value: formatDate(profile.updatedAt) },
    ];
  }, [profile, t.profileCard, locale]);

  const fullName = profile?.name || t.profileCard.avatarFallback;
  const profileStatus = profile?.isActive ? t.profileCard.active : t.profileCard.inactive;
  const profileInitials = fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase();

  const personalRows = profileRows.filter((row) =>
    [t.profileCard.fields.name, t.profileCard.fields.email, t.profileCard.fields.phone].includes(row.label),
  );

  const accountRows = profileRows.filter((row) =>
    [t.profileCard.fields.id, t.profileCard.fields.role, t.profileCard.fields.status, t.profileCard.fields.slug].includes(row.label),
  );

  const systemRows = profileRows.filter((row) =>
    [t.profileCard.fields.createdAt, t.profileCard.fields.updatedAt].includes(row.label),
  );

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
        <section className="profile-hub">
          <div className="profile-hub__hero">
            <div className="profile-hub__avatar" aria-hidden="true">
              {profileInitials || 'U'}
            </div>
            <div className="profile-hub__hero-content">
              <h2 className="profile-hub__name">{fullName}</h2>
              <p className="profile-hub__subtitle">{profile?.role || t.profileCard.emptyValue}</p>
              <p className="profile-hub__description">{t.profileCard.description}</p>
            </div>
            <div className="profile-hub__status" data-active={profile?.isActive ? 'true' : 'false'}>
              {profileStatus}
            </div>
          </div>

          {profileError ? <p className="profile-hub__notice">{profileError}</p> : null}
          {isLoadingProfile ? <p className="profile-hub__loading">{t.profileCard.loading}</p> : null}

          <div className="profile-hub__grid">
            <article className="profile-panel">
              <h3 className="profile-panel__title">{t.profileCard.personalSectionTitle}</h3>
              <div className="profile-panel__list">
                {personalRows.map((row) => (
                  <div key={row.label} className="profile-detail-row">
                    <span className="profile-detail-row__label">{row.label}</span>
                    <strong className="profile-detail-row__value">{row.value}</strong>
                  </div>
                ))}
              </div>
            </article>

            <article className="profile-panel">
              <h3 className="profile-panel__title">{t.profileCard.accountSectionTitle}</h3>
              <div className="profile-panel__list">
                {accountRows.map((row) => (
                  <div key={row.label} className="profile-detail-row">
                    <span className="profile-detail-row__label">{row.label}</span>
                    <strong className="profile-detail-row__value">{row.value}</strong>
                  </div>
                ))}
              </div>
            </article>

            <article className="profile-panel profile-panel--system">
              <h3 className="profile-panel__title">{t.profileCard.systemSectionTitle}</h3>
              <div className="profile-panel__list">
                {systemRows.map((row) => (
                  <div key={row.label} className="profile-detail-row">
                    <span className="profile-detail-row__label">{row.label}</span>
                    <strong className="profile-detail-row__value">{row.value}</strong>
                  </div>
                ))}
              </div>
            </article>
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
