import type { Dispatch, SetStateAction } from 'react';
import type { AuthProfile } from '../../../services/authService';
import type { ProfileI18nLabels, ProfileLang } from '../profilePage.types';
import { useManagedProfilesActions } from './useManagedProfilesActions';
import { useManagedProfilesData } from './useManagedProfilesData';

type UseManagedProfilesControllerParams = {
  activeSidebarId: string;
  isProfilesListView: boolean;
  pathname: string;
  lang: ProfileLang;
  t: ProfileI18nLabels;
  profile: AuthProfile | null;
  setProfile: Dispatch<SetStateAction<AuthProfile | null>>;
};

export function useManagedProfilesController({
  activeSidebarId,
  isProfilesListView,
  pathname,
  lang,
  t,
  profile,
  setProfile,
}: UseManagedProfilesControllerParams) {
  const data = useManagedProfilesData({
    activeSidebarId,
    isProfilesListView,
    pathname,
    t,
  });

  const actions = useManagedProfilesActions({
    lang,
    profile,
    setProfile,
    selectedManagedProfileId: data.selectedManagedProfileId,
    setSelectedManagedProfileId: data.setSelectedManagedProfileId,
    selectedManagedProfile: data.selectedManagedProfile,
    setProfilesList: data.setProfilesList,
    setProfilesListError: data.setProfilesListError,
  });

  return {
    profilesList: data.profilesList,
    filteredProfilesList: data.filteredProfilesList,
    isLoadingProfilesList: data.isLoadingProfilesList,
    profilesListError: data.profilesListError,
    selectedManagedProfileId: data.selectedManagedProfileId,
    setSelectedManagedProfileId: data.setSelectedManagedProfileId,
    selectedManagedProfile: data.selectedManagedProfile,
    showManagerDeleteDialog: actions.showManagerDeleteDialog,
    setShowManagerDeleteDialog: actions.setShowManagerDeleteDialog,
    showManagerEditDialog: actions.showManagerEditDialog,
    setShowManagerEditDialog: actions.setShowManagerEditDialog,
    managedRole: actions.managedRole,
    setManagedRole: actions.setManagedRole,
    managedIsActive: actions.managedIsActive,
    setManagedIsActive: actions.setManagedIsActive,
    managedEditError: actions.managedEditError,
    managedEditMessage: actions.managedEditMessage,
    isUpdatingManagedProfile: actions.isUpdatingManagedProfile,
    isDeletingManagedProfile: actions.isDeletingManagedProfile,
    handleDeleteManagedProfile: actions.handleDeleteManagedProfile,
    handleOpenManagedEditDialog: actions.handleOpenManagedEditDialog,
    handleUpdateManagedProfile: actions.handleUpdateManagedProfile,
  };
}
