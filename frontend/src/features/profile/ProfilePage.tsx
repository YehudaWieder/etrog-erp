import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaFloppyDisk, FaTrashCan } from 'react-icons/fa6';
import { AppShell } from '../../app/layout/AppShell';
import type { NavItem } from '../../types/navigation';
import { ApiError } from '../../services/apiClient';
import {
  deleteMyProfile,
  getCurrentUser,
  getMyProfile,
  isAuthenticated,
  logout,
  updateMyProfile,
  type AuthProfile,
} from '../../services/authService';
import { PROFILE_I18N } from './i18n';
import { SettingsIcon } from '../../components/ui/SettingsIcon';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';

const DEFAULT_PROFILE_ITEM_ID = 'my-profile';

export function ProfilePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [alertsCount, setAlertsCount] = useState(0);
  const currentUser = getCurrentUser();
  const [profile, setProfile] = useState<AuthProfile | null>(currentUser);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    currentPassword: '',
    newPassword: '',
  });
  const [editMessage, setEditMessage] = useState('');
  const [editError, setEditError] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isDeletingProfile, setIsDeletingProfile] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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
  const t = PROFILE_I18N[lang];

  const activeSidebarId = useMemo(() => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    const subRoute = pathParts[1];
    return subRoute || DEFAULT_PROFILE_ITEM_ID;
  }, [location.pathname]);

  const pageTitle = useMemo(() => {
    for (const section of t.sidebar) {
      if (section.id === activeSidebarId) {
        return section.title;
      }

      const activeItem = section.items.find((item) => item.id === activeSidebarId);
      if (activeItem) {
        return activeItem.label;
      }
    }

    return t.pageTitle;
  }, [activeSidebarId, t.sidebar, t.pageTitle]);

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

  useEffect(() => {
    if (!profile) {
      return;
    }

    setEditForm((prev) => ({
      ...prev,
      name: profile.name || '',
      email: profile.email || '',
      phone: profile.phone || '',
      currentPassword: '',
      newPassword: '',
    }));
  }, [profile]);

  const handleEditFieldChange = (field: keyof typeof editForm, value: string) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (editMessage) {
      setEditMessage('');
    }
    if (editError) {
      setEditError('');
    }
  };

  // Admin cannot edit their own role/status
  const isSelfAdmin = profile?.role === 'admin' && currentUser?.id === profile?.id;

  const handleUpdateProfile = async () => {
    if (!profile) {
      return;
    }

    const trimmedName = editForm.name.trim();
    const trimmedEmail = editForm.email.trim();
    const trimmedPhone = editForm.phone.trim();

    const payload: {
      id: number;
      name?: string;
      email?: string;
      phone?: string | null;
      currentPassword?: string;
      newPassword?: string;
    } = { id: profile.id };

    if (trimmedName !== profile.name) {
      payload.name = trimmedName;
    }

    if (trimmedEmail !== profile.email) {
      payload.email = trimmedEmail;
    }

    const originalPhone = profile.phone || '';
    if (trimmedPhone !== originalPhone) {
      payload.phone = trimmedPhone.length === 0 ? null : trimmedPhone;
    }

    if (editForm.newPassword.trim().length > 0) {
      if (!editForm.currentPassword.trim()) {
        setEditError(t.editProfile.messages.passwordNeedsCurrent);
        return;
      }

      payload.currentPassword = editForm.currentPassword;
      payload.newPassword = editForm.newPassword;
    }

    const hasChanges = Object.keys(payload).length > 1;
    if (!hasChanges) {
      setEditMessage(t.editProfile.messages.noChanges);
      return;
    }

    setIsUpdatingProfile(true);
    setEditError('');
    setEditMessage('');

    try {
      const updated = await updateMyProfile(payload);
      setProfile(updated);
      setEditForm((prev) => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
      }));
      setEditMessage(t.editProfile.messages.updateSuccess);
    } catch (error) {
      // Generalize error messages
      if (error instanceof ApiError) {
        setEditError(t.editProfile.messages.updateFailed || t.profileCard.fallbackError);
      } else {
        setEditError(t.profileCard.fallbackError);
      }
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (!profile) return;
    setIsDeletingProfile(true);
    setEditError('');
    setEditMessage('');
    try {
      await deleteMyProfile(profile.id);
      await logout();
      navigate('/login');
    } catch (error) {
      // Generalize error messages
      setEditError(t.editProfile.messages.deleteFailed || t.editProfile.messages.cannotDeleteWithDependencies);
    } finally {
      setIsDeletingProfile(false);
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
      pageTitle={pageTitle}
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
      <div className="app-shell__content-header">
        {activeSidebarId === 'edit-my-profile' && (
          <div className="action-buttons">
            <button
              className="btn btn-primary"
              type="button"
              onClick={handleUpdateProfile}
              disabled={isUpdatingProfile || isDeletingProfile || isLoadingProfile}
            >
              <FaFloppyDisk />
              <span>{isUpdatingProfile ? t.editProfile.actions.updating : t.editProfile.actions.update}</span>
            </button>
            <button
              className="btn btn-danger"
              type="button"
              onClick={() => setShowDeleteDialog(true)}
              disabled={isUpdatingProfile || isDeletingProfile || isLoadingProfile}
            >
              <FaTrashCan />
              <span>{isDeletingProfile ? t.editProfile.actions.deleting : t.editProfile.actions.delete}</span>
            </button>
          </div>
        )}
      </div>
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
      ) : activeSidebarId === 'edit-my-profile' ? (
        <section className="profile-editor">
          <header className="profile-editor__header">
            <div>
              <h2 className="profile-editor__title">{t.editProfile.title}</h2>
              <p className="profile-editor__description">{t.editProfile.description}</p>
            </div>
          </header>

          <p className="profile-editor__hint">{t.editProfile.permissionsHint}</p>
          {isSelfAdmin && (
            <p className="profile-editor__hint profile-editor__hint--muted">{t.editProfile.cannotEditRoleStatus}</p>
          )}

          {editMessage ? <p className="profile-editor__message">{editMessage}</p> : null}
          {editError ? <p className="profile-editor__error">{editError}</p> : null}

          <div className="profile-editor__form-grid">
            <label className="form-group">
              <span className="form-label">{t.editProfile.fields.name}</span>
              <input
                className="form-input"
                value={editForm.name}
                onChange={(event) => handleEditFieldChange('name', event.target.value)}
                placeholder={t.editProfile.placeholders.name}
                disabled={isUpdatingProfile || isDeletingProfile || isLoadingProfile}
              />
            </label>

            <label className="form-group">
              <span className="form-label">{t.editProfile.fields.email}</span>
              <input
                className="form-input"
                type="email"
                value={editForm.email}
                onChange={(event) => handleEditFieldChange('email', event.target.value)}
                placeholder={t.editProfile.placeholders.email}
                disabled={isUpdatingProfile || isDeletingProfile || isLoadingProfile}
              />
            </label>

            <label className="form-group">
              <span className="form-label">{t.editProfile.fields.phone}</span>
              <input
                className="form-input"
                value={editForm.phone}
                onChange={(event) => handleEditFieldChange('phone', event.target.value)}
                placeholder={t.editProfile.placeholders.phone}
                disabled={isUpdatingProfile || isDeletingProfile || isLoadingProfile}
              />
            </label>

            <label className="form-group">
              <span className="form-label">{t.editProfile.fields.currentPassword}</span>
              <input
                className="form-input"
                type="password"
                value={editForm.currentPassword}
                onChange={(event) => handleEditFieldChange('currentPassword', event.target.value)}
                placeholder={t.editProfile.placeholders.currentPassword}
                disabled={isUpdatingProfile || isDeletingProfile || isLoadingProfile}
              />
            </label>

            <label className="form-group">
              <span className="form-label">{t.editProfile.fields.newPassword}</span>
              <input
                className="form-input"
                type="password"
                value={editForm.newPassword}
                onChange={(event) => handleEditFieldChange('newPassword', event.target.value)}
                placeholder={t.editProfile.placeholders.newPassword}
                disabled={isUpdatingProfile || isDeletingProfile || isLoadingProfile}
              />
            </label>
          </div>

          <ConfirmDialog
            open={showDeleteDialog}
            title={t.editProfile.actions.delete}
            message={t.editProfile.messages.deleteConfirm}
            confirmLabel={t.editProfile.actions.delete}
            cancelLabel={lang === 'he' ? 'ביטול' : 'Cancel'}
            onConfirm={() => {
              setShowDeleteDialog(false);
              handleDeleteProfile();
            }}
            onCancel={() => setShowDeleteDialog(false)}
          />
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
