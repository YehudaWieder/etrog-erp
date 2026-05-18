import {
  apiClient,
  clearAuthSession,
  getStoredAuthUser,
  isAuthenticated,
  persistAuthSession,
  type StoredAuthUser,
} from './apiClient';

type LoginPayload = {
  email: string;
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

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const result = await apiClient<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  persistAuthSession(result.accessToken, result.user);
  return result;
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

export { isAuthenticated };
