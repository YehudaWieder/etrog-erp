import type { Dispatch, SetStateAction } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import type { AuthProfile } from '../../../services/authService';
import type { EditProfileForm, ProfileI18nLabels, ProfileLang } from '../profilePage.types';
import { useMyProfileActions } from './useMyProfileActions';
import { useMyProfileData } from './useMyProfileData';

type UseMyProfileControllerParams = {
  activeSidebarId: string;
  navigate: NavigateFunction;
  lang: ProfileLang;
  t: ProfileI18nLabels;
  initialProfile: AuthProfile | null;
};

type UseMyProfileControllerResult = {
  profile: AuthProfile | null;
  setProfile: Dispatch<SetStateAction<AuthProfile | null>>;
  isLoadingProfile: boolean;
  profileError: string;
  editForm: EditProfileForm;
  editMessage: string;
  editError: string;
  isUpdatingProfile: boolean;
  isDeletingProfile: boolean;
  showDeleteDialog: boolean;
  isEditProfileModalOpen: boolean;
  isSelfAdmin: boolean;
  setShowDeleteDialog: Dispatch<SetStateAction<boolean>>;
  setIsEditProfileModalOpen: Dispatch<SetStateAction<boolean>>;
  handleEditFieldChange: (field: keyof EditProfileForm, value: string) => void;
  handleUpdateProfile: () => Promise<void>;
  handleDeleteProfile: () => Promise<void>;
};

export function useMyProfileController({
  activeSidebarId,
  navigate,
  lang,
  t,
  initialProfile,
}: UseMyProfileControllerParams): UseMyProfileControllerResult {
  const data = useMyProfileData({
    activeSidebarId,
    navigate,
    t,
    initialProfile,
  });

  const actions = useMyProfileActions({
    navigate,
    lang,
    t,
    profile: data.profile,
    editForm: data.editForm,
    setProfile: data.setProfile,
    setEditForm: data.setEditForm,
    setEditMessage: data.setEditMessage,
    setEditError: data.setEditError,
  });

  return {
    profile: data.profile,
    setProfile: data.setProfile,
    isLoadingProfile: data.isLoadingProfile,
    profileError: data.profileError,
    editForm: data.editForm,
    editMessage: data.editMessage,
    editError: data.editError,
    isUpdatingProfile: actions.isUpdatingProfile,
    isDeletingProfile: actions.isDeletingProfile,
    showDeleteDialog: data.showDeleteDialog,
    isEditProfileModalOpen: data.isEditProfileModalOpen,
    isSelfAdmin: data.isSelfAdmin,
    setShowDeleteDialog: data.setShowDeleteDialog,
    setIsEditProfileModalOpen: data.setIsEditProfileModalOpen,
    handleEditFieldChange: data.handleEditFieldChange,
    handleUpdateProfile: actions.handleUpdateProfile,
    handleDeleteProfile: actions.handleDeleteProfile,
  };
}
