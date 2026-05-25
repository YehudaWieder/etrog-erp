// Default to the NestJS backend. Override with VITE_API_BASE_URL when needed.
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000').replace(/\/+$/, '');

export const AUTH_TOKEN_STORAGE_KEY = 'auth.accessToken';
export const AUTH_USER_STORAGE_KEY = 'auth.user';
export const AUTH_SESSION_EXPIRED_EVENT = 'auth:session-expired';
export const API_FEEDBACK_EVENT = 'app:api-feedback';

let hasSignaledSessionExpiry = false;

export type StoredAuthUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
};

export type ApiFeedbackVariant = 'success' | 'error';

export type ApiFeedbackDetail = {
  variant: ApiFeedbackVariant;
  message: string;
  timestamp: number;
};

export type ApiClientInit = RequestInit & {
  suppressGlobalFeedback?: boolean;
  successMessage?: string;
  errorMessage?: string;
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
  hasSignaledSessionExpiry = false;
}

export function clearAuthSession(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
}

function signalSessionExpired(): void {
  if (typeof window === 'undefined' || hasSignaledSessionExpiry) {
    return;
  }

  hasSignaledSessionExpiry = true;
  window.dispatchEvent(new CustomEvent(AUTH_SESSION_EXPIRED_EVENT));
}

function getCurrentLanguage(): 'he' | 'en' {
  if (typeof window === 'undefined') {
    return 'he';
  }

  const stored = window.localStorage.getItem('app.language');
  return stored === 'en' ? 'en' : 'he';
}

function dispatchApiFeedback(detail: Omit<ApiFeedbackDetail, 'timestamp'>): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<ApiFeedbackDetail>(API_FEEDBACK_EVENT, {
      detail: {
        ...detail,
        timestamp: Date.now(),
      },
    }),
  );
}

function shouldNotifySuccess(method: string): boolean {
  return method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';
}

type ResourceLabel = {
  he: string;
  en: string;
};

const RESOURCE_LABELS: Record<string, ResourceLabel> = {
  season: { he: 'העונה', en: 'Season' },
  field: { he: 'השדה', en: 'Field' },
  trader: { he: 'הסוחר', en: 'Trader' },
  traderCategory: { he: 'קטגוריית הסוחר', en: 'Trader category' },
  defaultTraderCategory: { he: 'קטגוריית ברירת המחדל', en: 'Default trader category' },
  customer: { he: 'הלקוח', en: 'Customer' },
  customerCategory: { he: 'קטגוריית הלקוח', en: 'Customer category' },
  message: { he: 'ההודעה', en: 'Message' },
  user: { he: 'המשתמש', en: 'User' },
};

function resolveResourceKey(path: string): keyof typeof RESOURCE_LABELS | null {
  const cleanPath = path.split('?')[0].replace(/^https?:\/\/[^/]+/, '').replace(/^\/+/, '');
  const [first, second] = cleanPath.split('/');

  if (first === 'seasons') return 'season';
  if (first === 'fields') return 'field';
  if (first === 'traders' && second === 'categories') return 'traderCategory';
  if (first === 'traders' && second === 'default-categories') return 'defaultTraderCategory';
  if (first === 'traders') return 'trader';
  if (first === 'customer-categories') return 'customerCategory';
  if (first === 'customers' && second === 'categories') return 'customerCategory';
  if (first === 'customers') return 'customer';
  if (first === 'messages') return 'message';
  if (first === 'users') return 'user';

  return null;
}

function buildSuccessMessage(method: string, path: string): string {
  const lang = getCurrentLanguage();
  const resourceKey = resolveResourceKey(path);
  const resourceLabel = resourceKey ? RESOURCE_LABELS[resourceKey] : null;

  if (resourceLabel) {
    if (lang === 'en') {
      if (resourceKey === 'message' && method === 'POST') {
        return 'Message sent successfully.';
      }

      if (method === 'DELETE') {
        return `${resourceLabel.en} deleted successfully.`;
      }

      if (method === 'PUT' || method === 'PATCH') {
        return `${resourceLabel.en} updated successfully.`;
      }

      return `${resourceLabel.en} added successfully.`;
    }

    if (resourceKey === 'message' && method === 'POST') {
      return 'ההודעה נשלחה בהצלחה.';
    }

    if (method === 'DELETE') {
      return `${resourceLabel.he} נמחק בהצלחה.`;
    }

    if (method === 'PUT' || method === 'PATCH') {
      return `${resourceLabel.he} עודכן בהצלחה.`;
    }

    return `${resourceLabel.he} נוסף בהצלחה.`;
  }

  if (lang === 'en') {
    if (method === 'DELETE') {
      return 'Deleted successfully.';
    }

    if (method === 'PUT' || method === 'PATCH') {
      return 'Changes saved successfully.';
    }

    return 'Operation completed successfully.';
  }

  if (method === 'DELETE') {
    return 'הפריט נמחק בהצלחה.';
  }

  if (method === 'PUT' || method === 'PATCH') {
    return 'השינויים נשמרו בהצלחה.';
  }

  return 'הפעולה הושלמה בהצלחה.';
}

function buildSafeErrorMessage(status: number, serverMessage?: string, explicitMessage?: string): string {
  if (explicitMessage && explicitMessage.trim()) {
    return explicitMessage;
  }

  if (status === 400 || status === 422) {
    return serverMessage || (getCurrentLanguage() === 'en' ? 'Missing or invalid input.' : 'יש נתונים חסרים או לא תקינים.');
  }

  if (status === 401) {
    return getCurrentLanguage() === 'en' ? 'Your session expired. Please sign in again.' : 'פג תוקף ההתחברות. התחבר מחדש כדי להמשיך.';
  }

  if (status === 403) {
    return getCurrentLanguage() === 'en' ? 'You do not have permission to perform this action.' : 'אין לך הרשאה לבצע פעולה זו.';
  }

  if (status === 404) {
    return serverMessage || (getCurrentLanguage() === 'en' ? 'Requested resource was not found.' : 'המידע המבוקש לא נמצא.');
  }

  if (status >= 500) {
    return getCurrentLanguage() === 'en'
      ? 'We could not complete the request right now. Please try again.'
      : 'לא הצלחנו להשלים את הבקשה כרגע. נסה שוב.';
  }

  return serverMessage || (getCurrentLanguage() === 'en' ? 'Operation failed. Please try again.' : 'הפעולה נכשלה. נסה שוב.');
}

function buildNetworkErrorMessage(explicitMessage?: string): string {
  if (explicitMessage && explicitMessage.trim()) {
    return explicitMessage;
  }

  return getCurrentLanguage() === 'en'
    ? 'No connection to server. Please check your network and try again.'
    : 'אין חיבור לשרת. בדוק את הרשת ונסה שוב.';
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

function buildUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function apiClient<T>(path: string, init: ApiClientInit = {}): Promise<T> {
  const {
    suppressGlobalFeedback,
    successMessage,
    errorMessage,
    ...requestInit
  } = init;
  const token = getAuthToken();
  const requestHadAuthToken = Boolean(token);
  const headers = new Headers(requestInit.headers);
  const requestMethod = (requestInit.method || 'GET').toUpperCase();

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const isBodyObject = requestInit.body && !(requestInit.body instanceof FormData);
  if (isBodyObject && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;

  try {
    response = await fetch(buildUrl(path), {
      ...requestInit,
      headers,
    });
  } catch {
    const networkMessage = buildNetworkErrorMessage(errorMessage);

    if (!suppressGlobalFeedback) {
      dispatchApiFeedback({
        variant: 'error',
        message: networkMessage,
      });
    }

    throw new ApiError(networkMessage, 0);
  }

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
    if (response.status === 401 && requestHadAuthToken) {
      clearAuthSession();
      signalSessionExpired();
    }

    const rawMessage =
      data && typeof data === 'object' && 'message' in data
        ? (data as { message?: string | string[] }).message
        : undefined;
    const serverMessage = Array.isArray(rawMessage) ? rawMessage.join(', ') : rawMessage;

    const safeMessage = buildSafeErrorMessage(response.status, serverMessage, errorMessage);

    if (!suppressGlobalFeedback) {
      dispatchApiFeedback({
        variant: 'error',
        message: safeMessage,
      });
    }

    throw new ApiError(safeMessage || `Request failed with status ${response.status}`, response.status);
  }

  if (!suppressGlobalFeedback && shouldNotifySuccess(requestMethod)) {
    dispatchApiFeedback({
      variant: 'success',
      message: successMessage || buildSuccessMessage(requestMethod, path),
    });
  }

  return data as T;
}
