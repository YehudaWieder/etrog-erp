import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaFloppyDisk, FaTrashCan } from 'react-icons/fa6';
import { AppShell } from '../../app/layout/AppShell';
import type { NavItem } from '../../types/navigation';
import { ApiError } from '../../services/apiClient';
import {
  deleteMyProfile,
  getAllProfiles,
  getCurrentUser,
  getMyProfile,
  isAuthenticated,
  logout,
  updateMyProfile,
  type AuthProfile,
  type AuthUserListItem,
} from '../../services/authService';
import { PROFILE_I18N } from './i18n';
import { SettingsIcon } from '../../components/ui/SettingsIcon';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';

const DEFAULT_PROFILE_ITEM_ID = 'my-profile';
const PROFILE_LIST_VIEW_IDS = new Set(['all-profiles', 'active-profiles', 'inactive-profiles']);
const MANAGER_ROLES = new Set(['manager', 'owner', 'admin']);

function normalizeIsActive(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') {
      return true;
    }
    if (normalized === 'false' || normalized === '0') {
      return false;
    }
  }

  if (typeof value === 'number') {
    if (value === 1) {
      return true;
    }
    if (value === 0) {
      return false;
    }
  }

  return undefined;
}

export function ProfilePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [alertsCount, setAlertsCount] = useState<number>(0);

  useEffect(() => {
    // טען כמות הודעות שלא נקראו
    import('../../services/messagesApi').then(({ fetchUnreadCount }) => {
      fetchUnreadCount().then((res) => setAlertsCount(res.count)).catch(() => setAlertsCount(0));
    });
  }, []);
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
  const [profilesList, setProfilesList] = useState<AuthUserListItem[]>([]);
  const [isLoadingProfilesList, setIsLoadingProfilesList] = useState(false);
  const [profilesListError, setProfilesListError] = useState('');
  const [selectedManagedProfileId, setSelectedManagedProfileId] = useState<number | null>(null);
  const [showManagerDeleteDialog, setShowManagerDeleteDialog] = useState(false);

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

  const isProfilesListView = PROFILE_LIST_VIEW_IDS.has(activeSidebarId);
  const canManageProfiles = MANAGER_ROLES.has((profile?.role || currentUser?.role || '').trim().toLowerCase());

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

  useEffect(() => {
    let isMounted = true;
    const isProfileRoute = location.pathname === '/profile' || location.pathname.startsWith('/profile/');

    if (!isAuthenticated() || !isProfileRoute) {
      return () => {
        isMounted = false;
      };
    }

    setIsLoadingProfilesList(true);
    setProfilesListError('');

    void getAllProfiles()
      .then((result) => {
        if (!isMounted) {
          return;
        }

        const normalized = result.map((item) => ({
          ...item,
          isActive: normalizeIsActive((item as { isActive?: unknown }).isActive),
        }));

        setProfilesList(normalized);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        // Non-manager users can be denied for /users; show error only when the list view is explicitly open.
        if (isProfilesListView) {
          setProfilesListError(t.profilesList.error);
        }
      })
      .finally(() => {
        if (!isMounted) {
          return;
        }

        setIsLoadingProfilesList(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isProfilesListView, location.pathname, t.profilesList.error]);

  const filteredProfilesList = useMemo(() => {
    if (activeSidebarId === 'active-profiles') {
      return profilesList.filter((item) => item.isActive === true);
    }

    if (activeSidebarId === 'inactive-profiles') {
      return profilesList.filter((item) => item.isActive === false);
    }

    return profilesList;
  }, [activeSidebarId, profilesList]);

  useEffect(() => {
    if (!selectedManagedProfileId) {
      return;
    }

    const stillVisible = filteredProfilesList.some((item) => item.id === selectedManagedProfileId);
    if (!stillVisible) {
      setSelectedManagedProfileId(null);
    }
  }, [filteredProfilesList, selectedManagedProfileId]);

  const profilesCounts = useMemo(() => {
    const total = profilesList.length;

    return {
      total,
      current: filteredProfilesList.length,
    };
  }, [filteredProfilesList.length, profilesList]);

  const pageTitleWithCount = useMemo(() => {
    if (!isProfilesListView) {
      return pageTitle;
    }

    return `${pageTitle} (${profilesCounts.current})`;
  }, [isProfilesListView, pageTitle, profilesCounts.current]);

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

  const handleDeleteManagedProfile = async () => {
    if (!selectedManagedProfileId) {
      return;
    }

    setIsDeletingProfile(true);
    setEditError('');

    try {
      await deleteMyProfile(selectedManagedProfileId);
      setProfilesList((prev) => prev.filter((item) => item.id !== selectedManagedProfileId));
      setSelectedManagedProfileId(null);
    } catch {
      setEditError(lang === 'he' ? 'לא ניתן למחוק את הפרופיל שנבחר.' : 'Could not delete the selected profile.');
    } finally {
      setIsDeletingProfile(false);
    }
  };

  return (
    <AppShell
      direction={lang === 'he' ? 'rtl' : 'ltr'}
      brandName="Wieders etrogs"
      pageTitle={pageTitleWithCount}
      pageHeaderActions={(
        <>
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
          {isProfilesListView && canManageProfiles && (
            <div className="action-buttons">
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => {
                  if (selectedManagedProfileId) {
                    navigate(`/profile/manage-profile/${selectedManagedProfileId}`);
                  }
                }}
                disabled={!selectedManagedProfileId || isLoadingProfilesList || isDeletingProfile}
              >
                <FaFloppyDisk />
                <span>{lang === 'he' ? 'עדכון פרופיל נבחר' : 'Update Selected Profile'}</span>
              </button>
              <button
                className="btn btn-danger"
                type="button"
                onClick={() => setShowManagerDeleteDialog(true)}
                disabled={!selectedManagedProfileId || isLoadingProfilesList || isDeletingProfile}
              >
                <FaTrashCan />
                <span>{lang === 'he' ? 'מחיקת פרופיל נבחר' : 'Delete Selected Profile'}</span>
              </button>
            </div>
          )}
        </>
      )}
      topNav={t.topNav}
      sidebarSections={t.sidebar}
      activeSidebarItemId={activeSidebarId}
      onTopNavClick={handleTopNavClick}
      onSidebarClick={handleSidebarClick}
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
      ) : isProfilesListView ? (
        <section className="profiles-list-hub">
          {isLoadingProfilesList ? <p className="profile-hub__loading">{t.profilesList.loading}</p> : null}
          {profilesListError ? <p className="profile-hub__notice">{profilesListError}</p> : null}

          {!isLoadingProfilesList && !profilesListError && filteredProfilesList.length === 0 ? (
            <div className="shipments-empty-state">
              <h2 className="shipments-empty-title">{content.title}</h2>
              <p className="shipments-empty-desc">{t.profilesList.empty}</p>
            </div>
          ) : null}

          {!isLoadingProfilesList && !profilesListError && filteredProfilesList.length > 0 ? (
            <div className="profiles-list-grid">
              {filteredProfilesList.map((item) => {
                const initials = item.name
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part) => part.charAt(0))
                  .join('')
                  .toUpperCase();

                return (
                  <article
                    key={item.id}
                    className={`profile-mini-card${item.id === selectedManagedProfileId ? ' is-selected' : ''}`}
                    onClick={() => {
                      if (canManageProfiles) {
                        setSelectedManagedProfileId((prev) => (prev === item.id ? null : item.id));
                      }
                    }}
                  >
                    <div className="profile-mini-card__header">
                      <div
                        className={`profile-mini-card__avatar${item.id === selectedManagedProfileId ? ' is-selected' : ''}`}
                        aria-hidden="true"
                      >
                        {item.id === selectedManagedProfileId ? '✓' : initials || 'U'}
                      </div>
                      <div className="profile-mini-card__identity">
                        <h3 className="profile-mini-card__name">{item.name}</h3>
                        <p className="profile-mini-card__id">{`${t.profileCard.fields.id}: ${item.id}`}</p>
                      </div>
                      {typeof item.isActive === 'boolean' ? (
                        <span className="profile-hub__status" data-active={item.isActive ? 'true' : 'false'}>
                          {item.isActive ? t.profileCard.active : t.profileCard.inactive}
                        </span>
                      ) : null}
                    </div>

                    <div className="profile-mini-card__rows">
                      {item.email ? (
                        <div className="profile-detail-row">
                          <span className="profile-detail-row__label">{t.profileCard.fields.email}</span>
                          <strong className="profile-detail-row__value">{item.email}</strong>
                        </div>
                      ) : null}
                      {item.phone ? (
                        <div className="profile-detail-row">
                          <span className="profile-detail-row__label">{t.profileCard.fields.phone}</span>
                          <strong className="profile-detail-row__value">{item.phone}</strong>
                        </div>
                      ) : null}
                      {item.role ? (
                        <div className="profile-detail-row">
                          <span className="profile-detail-row__label">{t.profileCard.fields.role}</span>
                          <strong className="profile-detail-row__value">{item.role}</strong>
                        </div>
                      ) : null}
                      {item.createdAt ? (
                        <div className="profile-detail-row">
                          <span className="profile-detail-row__label">{t.profileCard.fields.createdAt}</span>
                          <strong className="profile-detail-row__value">{formatDate(item.createdAt)}</strong>
                        </div>
                      ) : null}
                      {item.updatedAt ? (
                        <div className="profile-detail-row">
                          <span className="profile-detail-row__label">{t.profileCard.fields.updatedAt}</span>
                          <strong className="profile-detail-row__value">{formatDate(item.updatedAt)}</strong>
                        </div>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}

          <ConfirmDialog
            open={showManagerDeleteDialog}
            title={lang === 'he' ? 'מחיקת פרופיל' : 'Delete Profile'}
            message={lang === 'he' ? 'האם למחוק את הפרופיל שנבחר? פעולה זו אינה הפיכה.' : 'Delete the selected profile? This action cannot be undone.'}
            confirmLabel={lang === 'he' ? 'מחיקה' : 'Delete'}
            cancelLabel={lang === 'he' ? 'ביטול' : 'Cancel'}
            onConfirm={() => {
              setShowManagerDeleteDialog(false);
              handleDeleteManagedProfile();
            }}
            onCancel={() => setShowManagerDeleteDialog(false)}
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
