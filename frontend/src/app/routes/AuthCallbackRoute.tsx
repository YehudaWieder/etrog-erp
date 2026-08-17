import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AUTH_I18N } from '../../features/auth/i18n';
import { useAuthLanguage } from '../../features/auth/hooks/useAuthLanguage';
import { AUTH_TOKEN_STORAGE_KEY, persistAuthSession } from '../../services/apiClient';
import { type AuthProfile } from '../../services/authService';
import { supabase } from '../../services/supabaseClient';
import { getLastActiveModule } from '../../utils/activeModule';

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined ?? '/api').replace(/\/+$/, '');

// Direct fetch — bypasses apiClient's session-expiry side effects.
async function authFetch<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
  });
  if (!res.ok) throw new Error(String(res.status));
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

export function AuthCallbackRoute(): JSX.Element {
  const navigate = useNavigate();
  const lang = useAuthLanguage();
  const a = AUTH_I18N[lang];
  const handledRef = useRef(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    const run = async () => {
      const code = new URLSearchParams(window.location.search).get('code');

      let sessionToken: string;
      let userMetadata: Record<string, unknown> = {};
      let userEmail: string | undefined;

      if (code) {
        // PKCE flow — code in query string (?code=xxx)
        const { error: sessionError, data } = await supabase.auth.exchangeCodeForSession(code);
        if (sessionError) throw new Error(sessionError.message);
        if (!data.session?.access_token) throw new Error(a.callbackNoSession);
        sessionToken = data.session.access_token;
        userMetadata = (data.user?.user_metadata ?? {}) as Record<string, unknown>;
        userEmail = data.user?.email;
      } else {
        // Implicit flow — Supabase processes hash tokens (#access_token=xxx) automatically.
        // Wait briefly for onAuthStateChange to fire and write the token.
        await new Promise((resolve) => setTimeout(resolve, 400));
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session?.access_token) {
          // No session at all — this is a bare /auth/callback navigation with nothing to process.
          navigate('/login', { replace: true });
          return;
        }
        sessionToken = sessionData.session.access_token;
        userMetadata = (sessionData.session.user?.user_metadata ?? {}) as Record<string, unknown>;
        userEmail = sessionData.session.user?.email;
      }

      // Write token so getAuthToken() is immediately up-to-date.
      window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, sessionToken);

      // Check for an existing profile (returning user or Google login).
      let profile: AuthProfile | null = null;
      try {
        profile = await authFetch<AuthProfile>('/auth/me', sessionToken);
      } catch {
        // 401 = no profile yet; fall through to create one.
      }

      if (profile) {
        if (profile.isActive) {
          persistAuthSession({
            id: profile.id,
            name: profile.name,
            email: profile.email,
            role: profile.role,
            isActive: profile.isActive,
          });
          navigate(`/${getLastActiveModule()}/home`, { replace: true });
        } else {
          navigate('/login', {
            replace: true,
            state: { notice: a.callbackAwaitingActivation },
          });
        }
        return;
      }

      // No profile — resolve name from sessionStorage (same-tab) or Supabase metadata.
      const name =
        sessionStorage.getItem('auth.pending_name') ??
        (userMetadata.name as string | undefined) ??
        (userMetadata.full_name as string | undefined) ??
        userEmail?.split('@')[0] ??
        'User';
      const phone = sessionStorage.getItem('auth.pending_phone') ?? undefined;

      await authFetch('/users', sessionToken, {
        method: 'POST',
        body: JSON.stringify({ name, ...(phone ? { phone } : {}) }),
      });

      sessionStorage.removeItem('auth.pending_name');
      sessionStorage.removeItem('auth.pending_phone');

      navigate('/login', {
        replace: true,
        state: { notice: a.callbackAccountCreated },
      });
    };

    run().catch((err: unknown) => {
      const message = err instanceof Error ? err.message : a.callbackError;
      setError(message);
    });
  }, [navigate, a]);

  if (error) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-error">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <p style={{ textAlign: 'center', padding: '2rem' }}>{a.callbackLoading}</p>
      </div>
    </div>
  );
}
