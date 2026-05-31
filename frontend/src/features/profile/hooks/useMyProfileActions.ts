import { useState, type Dispatch, type SetStateAction } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import { ApiError } from '../../../services/apiClient';
import { deleteMyProfile, logout, updateMyProfile, type AuthProfile } from '../../../services/authService';
import type { EditProfileForm, ProfileI18nLabels, ProfileLang } from '../profilePage.types';
import { buildProfileUpdatePayload } from '../services/profileUpdate.service';

type UseMyProfileActionsParams = {
  navigate: NavigateFunction;
  lang: ProfileLang;
  t: ProfileI18nLabels;
  profile: AuthProfile | null;
  editForm: EditProfileForm;
  setProfile: Dispatch<SetStateAction<AuthProfile | null>>;
  setEditForm: Dispatch<SetStateAction<EditProfileForm>>;
  setEditMessage: Dispatch<SetStateAction<string>>;
  setEditError: Dispatch<SetStateAction<string>>;
};

export function useMyProfileActions({
  navigate,
  lang,
  t,
  profile,
  editForm,
  setProfile,
  setEditForm,
  setEditMessage,
  setEditError,
}: UseMyProfileActionsParams) {
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isDeletingProfile, setIsDeletingProfile] = useState(false);

  const handleUpdateProfile = async () => {
    if (!profile) {
      return;
    }

    const { payload, hasChanges, error } = buildProfileUpdatePayload({
      profile,
      form: editForm,
      messages: {
        nameRequired: t.editProfile.messages.nameRequired,
        invalidEmail: t.editProfile.messages.invalidEmail,
        invalidPhone: t.editProfile.messages.invalidPhone,
        passwordNeedsCurrent: t.editProfile.messages.passwordNeedsCurrent,
      },
    });

    if (error) {
      setEditError(error);
      return;
    }

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
    } catch (errorCaught) {
      if (errorCaught instanceof ApiError) {
        setEditError(t.editProfile.messages.updateFailed || t.profileCard.fallbackError);
      } else {
        setEditError(t.profileCard.fallbackError);
      }
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (!profile) {
      return;
    }

    setIsDeletingProfile(true);
    setEditError('');
    setEditMessage('');

    try {
      await deleteMyProfile(profile.id);
      await logout();
      navigate('/login');
    } catch {
      setEditError(t.editProfile.messages.deleteFailed || t.editProfile.messages.cannotDeleteWithDependencies);
    } finally {
      setIsDeletingProfile(false);
    }
  };

  return {
    isUpdatingProfile,
    isDeletingProfile,
    handleUpdateProfile,
    handleDeleteProfile,
  };
}
