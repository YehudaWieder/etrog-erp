import { useEffect, useRef, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import {
  AUTH_SESSION_EXPIRED_EVENT,
  AUTH_TOKEN_UPDATED_EVENT,
  clearAuthSession,
  getTokenExpiresAt,
  signalSessionExpired,
} from '../services/authSession';

const WARNING_LEAD_MS = 2 * 60 * 1000;

type UseSessionExpiryWarningResult = {
  showWarning: boolean;
  isExtending: boolean;
  extendSession: () => Promise<void>;
  dismissSession: () => void;
};

// Schedules a warning shortly before the access token expires, so someone mid-task
// (e.g. filling out a long sorting form) can extend the session instead of losing it.
export function useSessionExpiryWarning(): UseSessionExpiryWarningResult {
  const [showWarning, setShowWarning] = useState(false);
  const [isExtending, setIsExtending] = useState(false);
  const warningTimerRef = useRef<number>();
  const expiryTimerRef = useRef<number>();

  useEffect(() => {
    const armTimers = () => {
      window.clearTimeout(warningTimerRef.current);
      window.clearTimeout(expiryTimerRef.current);
      setShowWarning(false);

      const expiresAt = getTokenExpiresAt();
      if (expiresAt === null) return;

      const msUntilExpiry = expiresAt - Date.now();
      if (msUntilExpiry <= 0) return;

      const msUntilWarning = msUntilExpiry - WARNING_LEAD_MS;
      if (msUntilWarning <= 0) {
        setShowWarning(true);
      } else {
        warningTimerRef.current = window.setTimeout(() => setShowWarning(true), msUntilWarning);
      }

      expiryTimerRef.current = window.setTimeout(() => {
        setShowWarning(false);
        clearAuthSession();
        signalSessionExpired();
      }, msUntilExpiry);
    };

    armTimers();
    window.addEventListener(AUTH_TOKEN_UPDATED_EVENT, armTimers);
    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, armTimers);

    return () => {
      window.clearTimeout(warningTimerRef.current);
      window.clearTimeout(expiryTimerRef.current);
      window.removeEventListener(AUTH_TOKEN_UPDATED_EVENT, armTimers);
      window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, armTimers);
    };
  }, []);

  const extendSession = async () => {
    setIsExtending(true);
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error || !data.session) {
        clearAuthSession();
        signalSessionExpired();
        return;
      }
      setShowWarning(false);
    } catch {
      clearAuthSession();
      signalSessionExpired();
    } finally {
      setIsExtending(false);
    }
  };

  const dismissSession = () => {
    setShowWarning(false);
    clearAuthSession();
    signalSessionExpired();
  };

  return { showWarning, isExtending, extendSession, dismissSession };
}
