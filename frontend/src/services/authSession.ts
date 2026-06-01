export const AUTH_TOKEN_STORAGE_KEY = 'auth.accessToken';
export const AUTH_USER_STORAGE_KEY = 'auth.user';
export const AUTH_SESSION_EXPIRED_EVENT = 'auth:session-expired';

let hasSignaledSessionExpiry = false;

export type StoredAuthUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
};

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

export function getStoredAuthUser(): StoredAuthUser | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawUser = window.localStorage.getItem(AUTH_USER_STORAGE_KEY);
  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser) as StoredAuthUser;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return Boolean(getAuthToken());
}

export function persistAuthSession(accessToken: string, user: StoredAuthUser): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, accessToken);
  window.localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
  hasSignaledSessionExpiry = false;
}

export function clearAuthSession(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
}

export function signalSessionExpired(): void {
  if (typeof window === 'undefined' || hasSignaledSessionExpiry) {
    return;
  }

  hasSignaledSessionExpiry = true;
  window.dispatchEvent(new CustomEvent(AUTH_SESSION_EXPIRED_EVENT));
}

export function patchStoredAuthUser(patch: Partial<StoredAuthUser>): StoredAuthUser | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const existing = getStoredAuthUser();
  if (!existing) {
    return null;
  }

  const updated: StoredAuthUser = {
    ...existing,
    ...patch,
  };

  window.localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(updated));
  return updated;
}