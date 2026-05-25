import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FaFloppyDisk, FaXmark } from 'react-icons/fa6';
import { AppShell } from '../../app/layout/AppShell';
import type { NavItem } from '../../types/navigation';
import {
  getCurrentUser,
  getProfileById,
  isAuthenticated,
  logout,
  updateManagedProfile,
  type AuthProfile,
} from '../../services/authService';
import { PROFILE_I18N } from './i18n';
import { SettingsIcon } from '../../components/ui/SettingsIcon';

const MANAGER_ROLES = new Set(['manager', 'owner', 'admin']);

function canManageProfiles(role?: string): boolean {
  if (!role) {
    return false;
  }

  return MANAGER_ROLES.has(role.toLowerCase());
}

export function ManagerProfileEditPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const currentUser = getCurrentUser();
  const [targetProfile, setTargetProfile] = useState<AuthProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [managedRole, setManagedRole] = useState('WORKER');
  const [managedIsActive, setManagedIsActive] = useState(true);

  const lang = useMemo(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('app.language');
      if (stored && (stored === 'en' || stored === 'he')) return stored;
    }
    return 'he';
  }, []);

  const t = PROFILE_I18N[lang];
  const profileId = Number(id);

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
      return;
    }

    if (!canManageProfiles(currentUser?.role)) {
      navigate('/profile/all-profiles');
      return;
    }

    if (!Number.isInteger(profileId) || profileId <= 0) {
      navigate('/profile/all-profiles');
    }
  }, [currentUser?.role, navigate, profileId]);

  useEffect(() => {
    let isMounted = true;

    if (!Number.isInteger(profileId) || profileId <= 0 || !canManageProfiles(currentUser?.role)) {
      return () => {
        isMounted = false;
      };
    }

    setIsLoading(true);
    setError('');

    void getProfileById(profileId)
      .then((result) => {
        if (!isMounted) {
          return;
        }

        setTargetProfile(result);
        setManagedRole(result.role?.toUpperCase() || 'WORKER');
        setManagedIsActive(Boolean(result.isActive));
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setError(lang === 'he' ? 'לא ניתן לטעון את פרטי המשתמש.' : 'Could not load user details.');
      })
      .finally(() => {
        if (!isMounted) {
          return;
        }

        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentUser?.role, lang, profileId]);

  const handleSave = async () => {
    if (!targetProfile) {
      return;
    }

    setIsSaving(true);
    setError('');
    setMessage('');

    try {
      await updateManagedProfile({
        id: targetProfile.id,
        role: managedRole,
        isActive: managedIsActive,
      });

      setMessage(lang === 'he' ? 'הפרופיל עודכן בהצלחה.' : 'Profile updated successfully.');
    } catch {
      setError(lang === 'he' ? 'העדכון נכשל. בדוק הרשאות ונסה שוב.' : 'Update failed. Check permissions and try again.');
    } finally {
      setIsSaving(false);
    }
  };

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
      pageTitle={lang === 'he' ? `עדכון פרופיל #${profileId}` : `Manage Profile #${profileId}`}
      pageHeaderActions={
        <div className="action-buttons">
          <button className="btn btn-primary" type="button" onClick={handleSave} disabled={isSaving || isLoading || !targetProfile}>
            <FaFloppyDisk />
            <span>{isSaving ? (lang === 'he' ? 'מעדכן...' : 'Updating...') : (lang === 'he' ? 'עדכן פרופיל' : 'Update Profile')}</span>
          </button>
          <button className="btn btn-danger" type="button" onClick={() => navigate('/profile/all-profiles')}>
            <FaXmark />
            <span>{lang === 'he' ? 'חזרה לרשימה' : 'Back to list'}</span>
          </button>
        </div>
      }
      topNav={t.topNav}
      sidebarSections={t.sidebar}
      activeSidebarItemId="all-profiles"
      onTopNavClick={handleTopNavClick}
      onSidebarClick={handleSidebarClick}
      onBrandClick={() => navigate('/home')}
      topBarOptions={{
        alertsCount: 0,
        onAlertsClick: () => navigate('/messages'),
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
      sidebarFooterSlot={
        <button
          type="button"
          className="app-shell__sidebar-item app-shell__sidebar-settings"
          onClick={() => navigate('/settings')}
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
      <section className="profile-editor">
        {isLoading ? <p className="profile-hub__loading">{lang === 'he' ? 'טוען פרופיל...' : 'Loading profile...'}</p> : null}
        {error ? <p className="profile-editor__error">{error}</p> : null}
        {message ? <p className="profile-editor__message">{message}</p> : null}

        {targetProfile ? (
          <div className="profile-editor__form-grid">
            <label className="form-group">
              <span className="form-label">{t.profileCard.fields.name}</span>
              <input className="form-input" value={targetProfile.name} disabled />
            </label>

            <label className="form-group">
              <span className="form-label">{t.profileCard.fields.email}</span>
              <input className="form-input" value={targetProfile.email} disabled />
            </label>

            <label className="form-group">
              <span className="form-label">{t.profileCard.fields.role}</span>
              <select
                className="form-input"
                value={managedRole}
                onChange={(event) => setManagedRole(event.target.value)}
                disabled={isSaving}
              >
                <option value="WORKER">WORKER</option>
                <option value="EDITOR">EDITOR</option>
                <option value="MANAGER">MANAGER</option>
                <option value="OWNER">OWNER</option>
              </select>
            </label>

            <label className="form-group">
              <span className="form-label">{t.profileCard.fields.status}</span>
              <select
                className="form-input"
                value={managedIsActive ? 'active' : 'inactive'}
                onChange={(event) => setManagedIsActive(event.target.value === 'active')}
                disabled={isSaving}
              >
                <option value="active">{t.profileCard.active}</option>
                <option value="inactive">{t.profileCard.inactive}</option>
              </select>
            </label>
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}
