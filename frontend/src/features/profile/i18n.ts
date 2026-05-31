import type { SidebarSection, NavItem } from '../../types/navigation';
import { PROFILE_I18N_EN } from './i18n.en';
import { PROFILE_I18N_HE } from './i18n.he';

type EmptyStateContent = {
  title: string;
  description: string;
};

export type ProfileI18n = {
  userNameFallback: string;
  common: {
    cancel: string;
  };
  topNav: NavItem[];
  sidebar: SidebarSection[];
  pageTitle: string;
  settings: string;
  emptyState: Record<string, EmptyStateContent>;
  editProfile: {
    title: string;
    description: string;
    permissionsHint: string;
    cannotEditRoleStatus: string;
    closeButtonLabel: string;
    fields: {
      name: string;
      email: string;
      phone: string;
      currentPassword: string;
      newPassword: string;
    };
    placeholders: {
      name: string;
      email: string;
      phone: string;
      currentPassword: string;
      newPassword: string;
    };
    actions: {
      update: string;
      deleting: string;
      delete: string;
      updating: string;
    };
    messages: {
      nameRequired: string;
      invalidEmail: string;
      invalidPhone: string;
      noChanges: string;
      updateSuccess: string;
      updateFailed: string;
      passwordNeedsCurrent: string;
      deleteConfirm: string;
      cannotDeleteWithDependencies: string;
      deleteFailed: string;
    };
  };
  profileCard: {
    title: string;
    description: string;
    personalSectionTitle: string;
    accountSectionTitle: string;
    systemSectionTitle: string;
    avatarFallback: string;
    loading: string;
    fallbackError: string;
    fields: {
      id: string;
      name: string;
      email: string;
      phone: string;
      role: string;
      status: string;
      slug: string;
      createdAt: string;
      updatedAt: string;
    };
    active: string;
    inactive: string;
    emptyValue: string;
  };
  profilesList: {
    loading: string;
    empty: string;
    error: string;
    restrictedInfoHint: string;
      deleteDialogTitle: string;
      deleteDialogMessage: string;
      deleteDialogConfirm: string;
      selectedUpdate: string;
      selectedDelete: string;
  };
  managedEditProfile: {
    ariaLabel: string;
    closeLabel: string;
    title: string;
    fallbackMessage: string;
    update: string;
    updating: string;
    roleLabels: {
      worker: string;
      editor: string;
      manager: string;
      owner: string;
    };
  };
};

export const PROFILE_I18N: Record<'he' | 'en', ProfileI18n> = {
  he: PROFILE_I18N_HE,
  en: PROFILE_I18N_EN,
};
