import { FaFloppyDisk, FaPenToSquare, FaTrashCan } from 'react-icons/fa6';
import type { ProfileLang, ProfileI18nLabels } from '../profilePage.types';

type ProfilePageHeaderActionsProps = {
  lang: ProfileLang;
  t: ProfileI18nLabels;
  activeSidebarId: string;
  isProfilesListView: boolean;
  canManageProfilesCurrentUser: boolean;
  selectedManagedProfileId: number | null;
  isLoadingProfile: boolean;
  isUpdatingProfile: boolean;
  isDeletingProfile: boolean;
  isLoadingProfilesList: boolean;
  isDeletingManagedProfile: boolean;
  isUpdatingManagedProfile: boolean;
  onOpenEditProfile: () => void;
  onOpenDeleteProfile: () => void;
  onOpenManagedProfileEdit: () => void;
  onOpenManagedProfileDelete: () => void;
};

export function ProfilePageHeaderActions({
  lang,
  t,
  activeSidebarId,
  isProfilesListView,
  canManageProfilesCurrentUser,
  selectedManagedProfileId,
  isLoadingProfile,
  isUpdatingProfile,
  isDeletingProfile,
  isLoadingProfilesList,
  isDeletingManagedProfile,
  isUpdatingManagedProfile,
  onOpenEditProfile,
  onOpenDeleteProfile,
  onOpenManagedProfileEdit,
  onOpenManagedProfileDelete,
}: ProfilePageHeaderActionsProps) {
  return (
    <>
      {activeSidebarId === 'my-profile' ? (
        <div className="settings-seasons-header-buttons">
          <button
            className="settings-seasons-header-btn settings-seasons-header-btn--success"
            type="button"
            onClick={onOpenEditProfile}
            disabled={isUpdatingProfile || isDeletingProfile || isLoadingProfile}
          >
            <FaPenToSquare />
            <span>{t.editProfile.actions.update}</span>
          </button>
          <button
            className="settings-seasons-header-btn settings-seasons-header-btn--danger"
            type="button"
            onClick={onOpenDeleteProfile}
            disabled={isUpdatingProfile || isDeletingProfile || isLoadingProfile}
          >
            <FaTrashCan />
            <span>{isDeletingProfile ? t.editProfile.actions.deleting : t.editProfile.actions.delete}</span>
          </button>
        </div>
      ) : null}

      {isProfilesListView && canManageProfilesCurrentUser ? (
        <div className="settings-seasons-header-buttons">
          <button
            className="settings-seasons-header-btn settings-seasons-header-btn--success"
            type="button"
            onClick={onOpenManagedProfileEdit}
            disabled={!selectedManagedProfileId || isLoadingProfilesList || isDeletingManagedProfile || isUpdatingManagedProfile}
          >
            <FaFloppyDisk />
            <span>{lang === 'he' ? 'עדכון פרופיל נבחר' : 'Update Selected Profile'}</span>
          </button>
          <button
            className="settings-seasons-header-btn settings-seasons-header-btn--danger"
            type="button"
            onClick={onOpenManagedProfileDelete}
            disabled={!selectedManagedProfileId || isLoadingProfilesList || isDeletingManagedProfile}
          >
            <FaTrashCan />
            <span>{lang === 'he' ? 'מחיקת פרופיל נבחר' : 'Delete Selected Profile'}</span>
          </button>
        </div>
      ) : null}
    </>
  );
}
