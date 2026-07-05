import { supabase } from './supabaseClient';
import {
  AUTH_TOKEN_STORAGE_KEY,
  apiClient,
  clearAuthSession,
  getStoredAuthUser,
  isAuthenticated,
  patchStoredAuthUser,
  persistAuthSession,
  type StoredAuthUser,
} from './apiClient';

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined ?? '/api').replace(/\/+$/, '');

type RegisterPayload = {
  name: string;
  phone?: string;
};

export type AuthProfile = StoredAuthUser & {
  phone?: string | null;
  slug?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type UpdateMyProfilePayload = {
  id: number;
  name?: string;
  phone?: string | null;
};

export type AuthUserListItem = {
  id: number;
  name: string;
  email?: string;
  phone?: string | null;
  role?: string;
  isActive?: boolean;
  slug?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type UpdateManagedProfilePayload = {
  id: number;
  role?: string;
  isActive?: boolean;
};

export async function requestPasswordReset(email: string): Promise<void> {
  const redirectTo = `${window.location.origin}/auth/reset-password`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw new Error(error.message);
}

export async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
}

export async function login(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);

  // Fetch our profile after Supabase login
  const profile = await apiClient<AuthProfile>('/auth/me');
  persistAuthSession({
    id: profile.id,
    name: profile.name,
    email: profile.email,
    role: profile.role,
    isActive: profile.isActive,
  });
}

export async function signInWithGoogle(): Promise<void> {
  const redirectTo = `${window.location.origin}/auth/callback`;
  const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
  if (error) throw new Error(error.message);
}

// Returns true when email confirmation is required (email sent).
// Returns false when email confirmation is disabled — profile created immediately.
export async function register(email: string, password: string, payload: RegisterPayload): Promise<boolean> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
      data: {
        name: payload.name,
        ...(payload.phone ? { phone: payload.phone } : {}),
      },
    },
  });
  if (error) throw new Error(error.message);

  if (data.session) {
    // Email confirmation is disabled — Supabase returned an immediate session.
    // Create the profile now; the /auth/callback will never be called.
    const token = data.session.access_token;
    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
    await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ name: payload.name, ...(payload.phone ? { phone: payload.phone } : {}) }),
    });
    return false;
  }

  // Email confirmation enabled — store for /auth/callback after the user clicks the link.
  sessionStorage.setItem('auth.pending_name', payload.name);
  if (payload.phone) sessionStorage.setItem('auth.pending_phone', payload.phone);
  else sessionStorage.removeItem('auth.pending_phone');
  return true;
}

export async function logout(): Promise<void> {
  try {
    if (isAuthenticated()) {
      await apiClient('/auth/logout', { method: 'POST' });
    }
  } finally {
    await supabase.auth.signOut();
    clearAuthSession();
  }
}

export function getCurrentUser(): StoredAuthUser | null {
  return getStoredAuthUser();
}

export async function getMyProfile(): Promise<AuthProfile> {
  return apiClient<AuthProfile>('/auth/me');
}

export async function updateMyProfile(payload: UpdateMyProfilePayload): Promise<AuthProfile> {
  const updated = await apiClient<AuthProfile>('/users', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

  patchStoredAuthUser({
    name: updated.name,
    email: updated.email,
    role: updated.role,
    isActive: updated.isActive,
  });

  return updated;
}

export async function deleteMyProfile(id: number): Promise<void> {
  await apiClient(`/users/${id}`, { method: 'DELETE' });
}

export async function getAllProfiles(): Promise<AuthUserListItem[]> {
  return apiClient<AuthUserListItem[]>('/users');
}

export async function getProfileById(id: number): Promise<AuthProfile> {
  return apiClient<AuthProfile>(`/users/${id}`);
}

export async function updateManagedProfile(payload: UpdateManagedProfilePayload): Promise<AuthProfile> {
  return apiClient<AuthProfile>('/users', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export { isAuthenticated };

const MANAGER_ROLES = new Set(['manager', 'owner', 'admin']);
const WORKER_ROLE = 'worker';

export function isManagerRole(role: string | undefined): boolean {
  return MANAGER_ROLES.has((role ?? '').trim().toLowerCase());
}

export function isWorkerRole(role: string | undefined): boolean {
  return (role ?? '').trim().toLowerCase() === WORKER_ROLE;
}
