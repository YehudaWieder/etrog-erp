import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AUTH_I18N } from '../../features/auth/i18n';
import { useAuthLanguage } from '../../features/auth/hooks/useAuthLanguage';
import { supabase } from '../../services/supabaseClient';
import { updatePassword } from '../../services/authService';

const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export function ResetPasswordRoute(): JSX.Element {
  const navigate = useNavigate();
  const lang = useAuthLanguage();
  const a = AUTH_I18N[lang];
  const dir = lang === 'he' ? 'rtl' : 'ltr';
  const exchangedRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (exchangedRef.current) return;
    exchangedRef.current = true;

    const code = new URLSearchParams(window.location.search).get('code');
    if (!code) {
      navigate('/login', { replace: true });
      return;
    }

    supabase.auth
      .exchangeCodeForSession(code)
      .then(({ error: sessionError }) => {
        if (sessionError) {
          setError(a.resetPasswordInvalidLink);
        } else {
          setReady(true);
        }
      })
      .catch(() => setError(a.resetPasswordLinkError));
  }, [navigate, a]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!PASSWORD_REGEX.test(newPassword)) {
      setError(a.passwordRulesHint);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(a.passwordMismatch);
      return;
    }

    try {
      setIsSubmitting(true);
      await updatePassword(newPassword);
      await supabase.auth.signOut();
      navigate('/login', { replace: true, state: { notice: a.resetPasswordSuccessNotice } });
    } catch (err) {
      setError(err instanceof Error ? err.message : a.resetPasswordUpdateFailed);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (error && !ready) {
    return (
      <div className="login-container" dir={dir}>
        <div className="login-card">
          <div className="login-error">{error}</div>
          <button className="btn btn-login" style={{ marginTop: '1rem' }} onClick={() => navigate('/login')}>
            {a.resetPasswordBackToLogin}
          </button>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="login-container">
        <div className="login-card">
          <p style={{ textAlign: 'center', padding: '2rem' }}>{a.resetPasswordLoading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container" dir={dir}>
      <div className="login-card">
        <div className="login-header">
          <h1 className="login-title">{a.resetPasswordTitle}</h1>
          <p className="login-subtitle">{a.resetPasswordSubtitle}</p>
        </div>

        {error ? <div className="login-error">{error}</div> : null}

        <form onSubmit={(e) => { void handleSubmit(e); }} className="login-form">
          <div className="form-group">
            <label htmlFor="newPassword" className="form-label">{a.newPasswordLabel}</label>
            <input
              id="newPassword"
              type="password"
              className="form-input"
              placeholder={a.newPasswordPlaceholder}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">{a.confirmPasswordLabel}</label>
            <input
              id="confirmPassword"
              type="password"
              className="form-input"
              placeholder={a.confirmPasswordPlaceholder}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-login" disabled={isSubmitting}>
            <span className="btn-text">{isSubmitting ? a.resetPasswordUpdating : a.resetPasswordSubmit}</span>
            <span className="btn-arrow" aria-hidden="true">←</span>
          </button>
        </form>
      </div>
    </div>
  );
}
