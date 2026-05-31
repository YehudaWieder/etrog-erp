import { useEffect, useMemo, useState } from 'react';
import { getAllProfiles, type AuthUserListItem } from '../../../services/authService';
import type { ProfileI18nLabels } from '../profilePage.types';
import { normalizeIsActive } from '../utils/profilePage.utils';

type UseManagedProfilesDataParams = {
  activeSidebarId: string;
  isProfilesListView: boolean;
  pathname: string;
  t: ProfileI18nLabels;
};

export function useManagedProfilesData({
  activeSidebarId,
  isProfilesListView,
  pathname,
  t,
}: UseManagedProfilesDataParams) {
  const [profilesList, setProfilesList] = useState<AuthUserListItem[]>([]);
  const [isLoadingProfilesList, setIsLoadingProfilesList] = useState(false);
  const [profilesListError, setProfilesListError] = useState('');
  const [selectedManagedProfileId, setSelectedManagedProfileId] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;

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
  }, [isProfilesListView, pathname, t.profilesList.error]);

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

  const selectedManagedProfile = useMemo(
    () => filteredProfilesList.find((item) => item.id === selectedManagedProfileId) ?? null,
    [filteredProfilesList, selectedManagedProfileId],
  );

  return {
    profilesList,
    setProfilesList,
    isLoadingProfilesList,
    profilesListError,
    setProfilesListError,
    filteredProfilesList,
    selectedManagedProfileId,
    setSelectedManagedProfileId,
    selectedManagedProfile,
  };
}
