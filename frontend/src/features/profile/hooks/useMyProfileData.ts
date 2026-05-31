import { useEffect, useState } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import { getMyProfile, type AuthProfile } from '../../../services/authService';
import type { EditProfileForm, ProfileI18nLabels } from '../profilePage.types';

type UseMyProfileDataParams = {
  activeSidebarId: string;
  navigate: NavigateFunction;
  t: ProfileI18nLabels;
  initialProfile: AuthProfile | null;
};

export function useMyProfileData({ activeSidebarId, navigate, t, initialProfile }: UseMyProfileDataParams) {
  const [profile, setProfile] = useState<AuthProfile | null>(initialProfile);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [editForm, setEditForm] = useState<EditProfileForm>({
    name: '',
    email: '',
    phone: '',
    currentPassword: '',
    newPassword: '',
  });
  const [editMessage, setEditMessage] = useState('');
  const [editError, setEditError] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

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

  useEffect(() => {
    if (activeSidebarId === 'edit-my-profile') {
      setIsEditProfileModalOpen(true);
      navigate('/profile/my-profile', { replace: true });
      return;
    }

    setIsEditProfileModalOpen(false);
  }, [activeSidebarId, navigate]);

  const handleEditFieldChange = (field: keyof EditProfileForm, value: string) => {
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

  const isSelfAdmin = profile?.role === 'admin' && initialProfile?.id === profile?.id;

  return {
    profile,
    setProfile,
    isLoadingProfile,
    profileError,
    editForm,
    setEditForm,
    editMessage,
    setEditMessage,
    editError,
    setEditError,
    showDeleteDialog,
    setShowDeleteDialog,
    isEditProfileModalOpen,
    setIsEditProfileModalOpen,
    handleEditFieldChange,
    isSelfAdmin,
  };
}
