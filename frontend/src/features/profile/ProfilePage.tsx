import { useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppShell } from '../../app/layout/AppShell';
import { useActiveModule } from '../../hooks/useActiveModule';
import { isAuthenticated, getCurrentUser, logout } from '../../services/authService';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { PROFILE_I18N } from './i18n';
import { EditMyProfileModal } from './components/EditMyProfileModal';
import { ManagedProfileEditModal } from './components/ManagedProfileEditModal';
import { ProfileOverviewSection } from './components/ProfileOverviewSection';
import { ProfilePageHeaderActions } from './components/ProfilePageHeaderActions';
import { ProfilesListSection } from './components/ProfilesListSection';
import { ProfileSettingsSidebarButton } from './components/ProfileSettingsSidebarButton';
import { useManagedProfilesController } from './hooks/useManagedProfilesController';
import { useMyProfileController } from './hooks/useMyProfileController';
import { useProfilePageNavigationState } from './hooks/useProfilePageNavigationState';
import { useProfileLanguage } from './hooks/useProfileLanguage';
import { useUnreadAlertsCount } from './hooks/useUnreadAlertsCount';
import { buildProfileRows, splitProfileRows } from './services/profileRows.service';
import {
  canManageProfiles,
  formatProfileDate,
  getProfileInitials,
} from './utils/profilePage.utils';

export function ProfilePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const activeModule = useActiveModule();
  const alertsCount = useUnreadAlertsCount();
  const currentUser = getCurrentUser();

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
    }
  }, [navigate]);

  const lang = useProfileLanguage();
  const t = PROFILE_I18N[lang];

  const {
    activeSidebarId,
    isProfilesListView,
    pageTitle,
    content,
    handleTopNavClick,
    handleSidebarClick,
  } = useProfilePageNavigationState({
    pathname: location.pathname,
    navigate,
    t,
  });

  const {
    profile,
    setProfile,
    isLoadingProfile,
    profileError,
    editForm,
    editMessage,
    editError,
    isUpdatingProfile,
    isDeletingProfile,
    showDeleteDialog,
    isEditProfileModalOpen,
    isSelfAdmin,
    setShowDeleteDialog,
    setIsEditProfileModalOpen,
    handleEditFieldChange,
    handleUpdateProfile,
    handleDeleteProfile,
  } = useMyProfileController({
    activeSidebarId,
    navigate,
    lang,
    t,
    initialProfile: currentUser,
  });

  const canManageProfilesCurrentUser = canManageProfiles(profile?.role || currentUser?.role);

  const {
    filteredProfilesList,
    isLoadingProfilesList,
    profilesListError,
    selectedManagedProfileId,
    setSelectedManagedProfileId,
    selectedManagedProfile,
    showManagerDeleteDialog,
    setShowManagerDeleteDialog,
    showManagerEditDialog,
    setShowManagerEditDialog,
    managedRole,
    setManagedRole,
    managedIsActive,
    setManagedIsActive,
    managedEditError,
    managedEditMessage,
    isUpdatingManagedProfile,
    isDeletingManagedProfile,
    handleDeleteManagedProfile,
    handleOpenManagedEditDialog,
    handleUpdateManagedProfile,
  } = useManagedProfilesController({
    activeSidebarId,
    isProfilesListView,
    pathname: location.pathname,
    lang,
    t,
    profile,
    setProfile,
  });

  const pageTitleWithCount = useMemo(() => {
    if (!isProfilesListView) {
      return pageTitle;
    }

    return `${pageTitle} (${filteredProfilesList.length})`;
  }, [filteredProfilesList.length, isProfilesListView, pageTitle]);

  const locale = lang === 'he' ? 'he-IL' : 'en-US';
  const formatDate = (value?: string) => formatProfileDate(value, locale, t.profileCard.emptyValue);

  const profileRows = useMemo(() => buildProfileRows(profile, t, locale), [locale, profile, t]);
  const { personalRows, accountRows, systemRows } = useMemo(() => splitProfileRows(profileRows, t), [profileRows, t]);

  const fullName = profile?.name || t.profileCard.avatarFallback;
  const profileStatus = profile?.isActive ? t.profileCard.active : t.profileCard.inactive;
  const profileInitials = getProfileInitials(fullName, 'U');

  return (
    <AppShell
      direction={lang === 'he' ? 'rtl' : 'ltr'}
      brandName="Wieders etrogs"
      pageTitle={pageTitleWithCount}
      pageHeaderActions={
        <ProfilePageHeaderActions
          lang={lang}
          t={t}
          activeSidebarId={activeSidebarId}
          isProfilesListView={isProfilesListView}
          canManageProfilesCurrentUser={canManageProfilesCurrentUser}
          selectedManagedProfileId={selectedManagedProfileId}
          isLoadingProfile={isLoadingProfile}
          isUpdatingProfile={isUpdatingProfile}
          isDeletingProfile={isDeletingProfile}
          isLoadingProfilesList={isLoadingProfilesList}
          isDeletingManagedProfile={isDeletingManagedProfile}
          isUpdatingManagedProfile={isUpdatingManagedProfile}
          onOpenEditProfile={() => setIsEditProfileModalOpen(true)}
          onOpenDeleteProfile={() => setShowDeleteDialog(true)}
          onOpenManagedProfileEdit={handleOpenManagedEditDialog}
          onOpenManagedProfileDelete={() => setShowManagerDeleteDialog(true)}
        />
      }
      topNav={t.topNav}
      sidebarSections={t.sidebar}
      activeSidebarItemId={activeSidebarId}
      onTopNavClick={handleTopNavClick}
      onSidebarClick={handleSidebarClick}
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
        userName: currentUser?.name || t.userNameFallback,
      }}
      sidebarFooterSlot={<ProfileSettingsSidebarButton lang={lang} label={t.settings} onClick={() => navigate(`/${activeModule}/settings`)} />}
    >
      {activeSidebarId === 'my-profile' ? (
        <ProfileOverviewSection
          profile={profile}
          profileInitials={profileInitials}
          fullName={fullName}
          profileStatus={profileStatus}
          profileError={profileError}
          isLoadingProfile={isLoadingProfile}
          t={t}
          personalRows={personalRows}
          accountRows={accountRows}
          systemRows={systemRows}
        />
      ) : isProfilesListView ? (
        <ProfilesListSection
          lang={lang}
          t={t}
          content={content}
          isLoadingProfilesList={isLoadingProfilesList}
          profilesListError={profilesListError}
          filteredProfilesList={filteredProfilesList}
          selectedManagedProfileId={selectedManagedProfileId}
          canManageProfilesCurrentUser={canManageProfilesCurrentUser}
          formatDate={formatDate}
          showManagerDeleteDialog={showManagerDeleteDialog}
          setShowManagerDeleteDialog={setShowManagerDeleteDialog}
          onToggleSelectedProfile={(id) => {
            setSelectedManagedProfileId((prev: number | null) => (prev === id ? null : id));
          }}
          onDeleteManagedProfile={() => {
            void handleDeleteManagedProfile();
          }}
        />
      ) : (
        <section className="shipments-empty-state">
          <h2 className="shipments-empty-title">{content.title}</h2>
          <p className="shipments-empty-desc">{content.description}</p>
        </section>
      )}

      <EditMyProfileModal
        lang={lang}
        t={t}
        isOpen={isEditProfileModalOpen}
        isSelfAdmin={isSelfAdmin}
        editForm={editForm}
        editMessage={editMessage}
        editError={editError}
        isUpdatingProfile={isUpdatingProfile}
        isDeletingProfile={isDeletingProfile}
        isLoadingProfile={isLoadingProfile}
        onClose={() => setIsEditProfileModalOpen(false)}
        onUpdate={() => {
          void handleUpdateProfile();
        }}
        onFieldChange={handleEditFieldChange}
      />

      <ConfirmDialog
        open={showDeleteDialog}
        title={t.editProfile.actions.delete}
        message={t.editProfile.messages.deleteConfirm}
        confirmLabel={t.editProfile.actions.delete}
        cancelLabel={t.common.cancel}
        onConfirm={() => {
          setShowDeleteDialog(false);
          void handleDeleteProfile();
        }}
        onCancel={() => setShowDeleteDialog(false)}
      />

      <ManagedProfileEditModal
        lang={lang}
        t={t}
        isOpen={showManagerEditDialog}
        selectedManagedProfile={selectedManagedProfile}
        selectedManagedProfileId={selectedManagedProfileId}
        managedRole={managedRole}
        managedIsActive={managedIsActive}
        managedEditMessage={managedEditMessage}
        managedEditError={managedEditError}
        isUpdatingManagedProfile={isUpdatingManagedProfile}
        onClose={() => setShowManagerEditDialog(false)}
        onUpdate={() => {
          void handleUpdateManagedProfile();
        }}
        onRoleChange={setManagedRole}
        onStatusChange={setManagedIsActive}
      />
    </AppShell>
  );
}
