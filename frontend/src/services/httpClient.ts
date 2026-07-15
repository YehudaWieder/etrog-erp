import {
  buildNetworkErrorMessage,
  buildSafeErrorMessage,
  buildSuccessMessage,
  dispatchApiFeedback,
  shouldNotifySuccess,
} from './apiFeedback';
import { clearAuthSession, getAuthToken, signalSessionExpired } from './authSession';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/+$/, '');

export const API_LOADING_EVENT = 'api:loading-change';

let activeRequestCount = 0;

function updateActiveRequestCount(delta: number): void {
  const wasLoading = activeRequestCount > 0;
  activeRequestCount = Math.max(0, activeRequestCount + delta);
  const isLoading = activeRequestCount > 0;

  if (wasLoading !== isLoading) {
    window.dispatchEvent(new CustomEvent(API_LOADING_EVENT, { detail: { isLoading } }));
  }
}

export type ApiClientInit = RequestInit & {
  suppressGlobalFeedback?: boolean;
  suppressGlobalLoading?: boolean;
  successMessage?: string;
  errorMessage?: string;
};

export class ApiError extends Error {
  status: number;
  serverMessage: string | undefined;

  constructor(message: string, status: number, serverMessage?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.serverMessage = serverMessage;
  }
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
    suppressGlobalLoading,
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

  if (!suppressGlobalLoading) {
    updateActiveRequestCount(1);
  }

  try {
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
      const isSessionExpiry = response.status === 401 && requestHadAuthToken;

      if (isSessionExpiry) {
        clearAuthSession();
        signalSessionExpired();
      }

      const rawMessage =
        data && typeof data === 'object' && 'message' in data
          ? (data as { message?: string | string[] }).message
          : undefined;
      const serverMessage = Array.isArray(rawMessage) ? rawMessage.join(', ') : rawMessage;

      const safeMessage = buildSafeErrorMessage(response.status, serverMessage, errorMessage, isSessionExpiry);

      if (!suppressGlobalFeedback) {
        dispatchApiFeedback({
          variant: 'error',
          message: safeMessage,
        });
      }

      throw new ApiError(safeMessage || `Request failed with status ${response.status}`, response.status, serverMessage);
    }

    if (!suppressGlobalFeedback && shouldNotifySuccess(requestMethod)) {
      dispatchApiFeedback({
        variant: 'success',
        message: successMessage || buildSuccessMessage(requestMethod, path),
      });
    }

    return data as T;
  } finally {
    if (!suppressGlobalLoading) {
      updateActiveRequestCount(-1);
    }
  }
}