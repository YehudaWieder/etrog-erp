import type { ProfileLang } from '../profilePage.types';

export const DEFAULT_PROFILE_ITEM_ID = 'my-profile';
export const PROFILE_LIST_VIEW_IDS = new Set(['all-profiles', 'active-profiles', 'inactive-profiles']);

const MANAGER_ROLES = new Set(['manager', 'owner', 'admin']);

export function getStoredProfileLanguage(): ProfileLang {
  if (typeof window !== 'undefined') {
    const stored = window.localStorage.getItem('app.language');
    if (stored === 'en' || stored === 'he') {
      return stored;
    }
  }

  return 'he';
}

export function normalizeIsActive(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') {
      return true;
    }
    if (normalized === 'false' || normalized === '0') {
      return false;
    }
  }

  if (typeof value === 'number') {
    if (value === 1) {
      return true;
    }
    if (value === 0) {
      return false;
    }
  }

  return undefined;
}

export function canManageProfiles(role?: string): boolean {
  if (!role) {
    return false;
  }

  return MANAGER_ROLES.has(role.trim().toLowerCase());
}

export function formatProfileDate(value: string | undefined, locale: string, emptyValue: string): string {
  if (!value) {
    return emptyValue;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return emptyValue;
  }

  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(parsed);
}

export function getProfileInitials(name: string | undefined, fallback = 'U'): string {
  if (!name) {
    return fallback;
  }

  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase() || fallback
  );
}
