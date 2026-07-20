import { supabase } from './supabaseClient';

export const AUTH_TOKEN_STORAGE_KEY = 'auth.accessToken';
export const AUTH_USER_STORAGE_KEY = 'auth.user';
export const AUTH_SESSION_EXPIRED_EVENT = 'auth:session-expired';
export const AUTH_TOKEN_UPDATED_EVENT = 'auth:token-updated';

let hasSignaledSessionExpiry = false;

export type StoredAuthUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
};

// Sync Supabase session token into our localStorage key so getAuthToken() stays synchronous.
// Fires on startup (INITIAL_SESSION), login, logout, and token refresh.
supabase.auth.onAuthStateChange((event, session) => {
  if (typeof window === 'undefined') return;

  if (session?.access_token) {
    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, session.access_token);
    hasSignaledSessionExpiry = false;
    window.dispatchEvent(new CustomEvent(AUTH_TOKEN_UPDATED_EVENT));
  } else {
    window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
  }
});

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

export function getStoredAuthUser(): StoredAuthUser | null {
  if (typeof window === 'undefined') return null;

  const rawUser = window.localStorage.getItem(AUTH_USER_STORAGE_KEY);
  if (!rawUser) return null;

  try {
    return JSON.parse(rawUser) as StoredAuthUser;
  } catch {
    return null;
  }
}

// Decodes the JWT payload without verifying the signature — expiration is enforced
// server-side on every request; this is only used to avoid rendering protected UI
// with a token we already know is stale.
function getTokenExpiry(token: string): number | null {
  try {
    const payloadSegment = token.split('.')[1];
    if (!payloadSegment) return null;
    const base64 = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
    const json = window.atob(base64);
    const payload = JSON.parse(json) as { exp?: number };
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

// Expiry timestamp (ms) of the currently stored token, or null if there is none / it can't be read.
export function getTokenExpiresAt(): number | null {
  const token = getAuthToken();
  return token ? getTokenExpiry(token) : null;
}

export function isAuthenticated(): boolean {
  const token = getAuthToken();
  if (!token) return false;

  const expiresAt = getTokenExpiry(token);
  if (expiresAt !== null && expiresAt <= Date.now()) {
    clearAuthSession();
    return false;
  }

  return true;
}

export function persistAuthSession(user: StoredAuthUser): void {
  if (typeof window === 'undefined') return;
  // Token is managed by onAuthStateChange — only persist user profile here
  window.localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
  hasSignaledSessionExpiry = false;
}

export function clearAuthSession(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
}

export function signalSessionExpired(): void {
  if (typeof window === 'undefined' || hasSignaledSessionExpiry) return;
  hasSignaledSessionExpiry = true;
  window.dispatchEvent(new CustomEvent(AUTH_SESSION_EXPIRED_EVENT));
}

export function patchStoredAuthUser(patch: Partial<StoredAuthUser>): StoredAuthUser | null {
  if (typeof window === 'undefined') return null;

  const existing = getStoredAuthUser();
  if (!existing) return null;

  const updated: StoredAuthUser = { ...existing, ...patch };
  window.localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(updated));
  return updated;
}
