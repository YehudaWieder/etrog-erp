import { useState, type Dispatch, type SetStateAction } from 'react';
import { deleteMyProfile, updateManagedProfile, type AuthProfile, type AuthUserListItem } from '../../../services/authService';
import type { ProfileLang } from '../profilePage.types';

type UseManagedProfilesActionsParams = {
  lang: ProfileLang;
  profile: AuthProfile | null;
  setProfile: Dispatch<SetStateAction<AuthProfile | null>>;
  selectedManagedProfileId: number | null;
  setSelectedManagedProfileId: Dispatch<SetStateAction<number | null>>;
  selectedManagedProfile: AuthUserListItem | null;
  setProfilesList: Dispatch<SetStateAction<AuthUserListItem[]>>;
  setProfilesListError: Dispatch<SetStateAction<string>>;
};

export function useManagedProfilesActions({
  lang,
  profile,
  setProfile,
  selectedManagedProfileId,
  setSelectedManagedProfileId,
  selectedManagedProfile,
  setProfilesList,
  setProfilesListError,
}: UseManagedProfilesActionsParams) {
  const [showManagerDeleteDialog, setShowManagerDeleteDialog] = useState(false);
  const [showManagerEditDialog, setShowManagerEditDialog] = useState(false);
  const [managedRole, setManagedRole] = useState('WORKER');
  const [managedIsActive, setManagedIsActive] = useState(true);
  const [managedEditError, setManagedEditError] = useState('');
  const [managedEditMessage, setManagedEditMessage] = useState('');
  const [isUpdatingManagedProfile, setIsUpdatingManagedProfile] = useState(false);
  const [isDeletingManagedProfile, setIsDeletingManagedProfile] = useState(false);

  const handleDeleteManagedProfile = async () => {
    if (!selectedManagedProfileId) {
      return;
    }

    setIsDeletingManagedProfile(true);
    setProfilesListError('');

    try {
      await deleteMyProfile(selectedManagedProfileId);
      setProfilesList((prev) => prev.filter((item) => item.id !== selectedManagedProfileId));
      setSelectedManagedProfileId(null);
    } catch {
      setProfilesListError(lang === 'he' ? 'לא ניתן למחוק את הפרופיל שנבחר.' : 'Could not delete the selected profile.');
    } finally {
      setIsDeletingManagedProfile(false);
    }
  };

  const handleOpenManagedEditDialog = () => {
    if (!selectedManagedProfile) {
      return;
    }

    setManagedRole((selectedManagedProfile.role || 'WORKER').toUpperCase());
    setManagedIsActive(Boolean(selectedManagedProfile.isActive));
    setManagedEditError('');
    setManagedEditMessage('');
    setShowManagerEditDialog(true);
  };

  const handleUpdateManagedProfile = async () => {
    if (!selectedManagedProfileId) {
      return;
    }

    setIsUpdatingManagedProfile(true);
    setManagedEditError('');
    setManagedEditMessage('');

    try {
      const updated = await updateManagedProfile({
        id: selectedManagedProfileId,
        role: managedRole,
        isActive: managedIsActive,
      });

      setProfilesList((prev) =>
        prev.map((item) =>
          item.id === updated.id
            ? {
                ...item,
                role: updated.role,
                isActive: updated.isActive,
                updatedAt: updated.updatedAt,
              }
            : item,
        ),
      );

      if (profile && profile.id === updated.id) {
        setProfile((prev) => (prev ? { ...prev, role: updated.role, isActive: updated.isActive, updatedAt: updated.updatedAt } : prev));
      }

      setManagedEditMessage(lang === 'he' ? 'הפרופיל עודכן בהצלחה.' : 'Profile updated successfully.');
    } catch {
      setManagedEditError(lang === 'he' ? 'העדכון נכשל. בדוק הרשאות ונסה שוב.' : 'Update failed. Check permissions and try again.');
    } finally {
      setIsUpdatingManagedProfile(false);
    }
  };

  return {
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
  };
}
