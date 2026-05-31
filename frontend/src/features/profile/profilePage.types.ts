import type { AuthProfile } from '../../services/authService';
import type { PROFILE_I18N } from './i18n';

export type ProfileLang = 'he' | 'en';

export type ProfileI18nLabels = (typeof PROFILE_I18N)[ProfileLang];

export type ProfileRow = {
  label: string;
  value: string;
};

export type ProfileRowsSections = {
  personalRows: ProfileRow[];
  accountRows: ProfileRow[];
  systemRows: ProfileRow[];
};

export type EditProfileForm = {
  name: string;
  email: string;
  phone: string;
  currentPassword: string;
  newPassword: string;
};

export type ProfileUpdatePayload = {
  id: number;
  name?: string;
  email?: string;
  phone?: string | null;
  currentPassword?: string;
  newPassword?: string;
};

export type ProfileCounts = {
  total: number;
  current: number;
};

export type ProfileIdentity = Pick<AuthProfile, 'id' | 'name' | 'email' | 'phone' | 'role' | 'isActive' | 'slug' | 'createdAt' | 'updatedAt'>;
