import {
  apiClient,
  clearAuthSession,
  getStoredAuthUser,
  isAuthenticated,
  patchStoredAuthUser,
  persistAuthSession,
  type StoredAuthUser,
} from './apiClient';

type LoginPayload = {
  email: string;
  password: string;
};

type RegisterPayload = {
  name: string;
  email: string;
  phone?: string;
  password: string;
};

type LoginResponse = {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
  user: StoredAuthUser;
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
  email?: string;
  phone?: string | null;
  currentPassword?: string;
  newPassword?: string;
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

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const result = await apiClient<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  persistAuthSession(result.accessToken, result.user);
  return result;
}

export async function register(payload: RegisterPayload): Promise<AuthProfile> {
  return apiClient<AuthProfile>('/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function logout(): Promise<void> {
  try {
    if (isAuthenticated()) {
      await apiClient('/auth/logout', { method: 'POST' });
    }
  } finally {
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
  await apiClient(`/users/${id}`, {
    method: 'DELETE',
  });
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
