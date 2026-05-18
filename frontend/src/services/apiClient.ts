// Default to the NestJS backend. Override with VITE_API_BASE_URL when needed.
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000').replace(/\/+$/, '');

export const AUTH_TOKEN_STORAGE_KEY = 'auth.accessToken';
export const AUTH_USER_STORAGE_KEY = 'auth.user';

export type StoredAuthUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

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
}

export function clearAuthSession(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
}

function buildUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function apiClient<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(init.headers);

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const isBodyObject = init.body && !(init.body instanceof FormData);
  if (isBodyObject && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(buildUrl(path), {
    ...init,
    headers,
  });

  const rawText = await response.text();
  let data: unknown = null;

  if (rawText.length > 0) {
    try {
      data = JSON.parse(rawText) as unknown;
    } catch {
      data = rawText;
    }
  }

  if (!response.ok) {
    const rawMessage =
      data && typeof data === 'object' && 'message' in data
        ? (data as { message?: string | string[] }).message
        : undefined;
    const serverMessage = Array.isArray(rawMessage) ? rawMessage.join(', ') : rawMessage;

    throw new ApiError(serverMessage || `Request failed with status ${response.status}`, response.status);
  }

  return data as T;
}
