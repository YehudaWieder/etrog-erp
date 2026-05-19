import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthForm } from '../../components/forms/AuthForm';
import { AppTopBar } from '../../components/navigation/AppTopBar';
import { SHIPMENTS_I18N } from '../shipments/i18n';
import type { NavItem } from '../../types/navigation';
import { getCurrentUser, isAuthenticated, login, logout } from '../../services/authService';
import { ApiError } from '../../services/apiClient';
import { AUTH_I18N } from './i18n';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const currentUser = getCurrentUser();

  const lang = useMemo(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('app.language');
      if (stored && (stored === 'en' || stored === 'he')) return stored;
    }
    return 'he';
  }, []);
  const t = SHIPMENTS_I18N[lang];
  const a = AUTH_I18N[lang];
  const successNotice = (() => {
    const state = location.state as { notice?: string } | null;
    return state?.notice || '';
  })();
  const authMessages = {
    requiredFields: a.requiredFields,
    loginFailed: a.loginFailed,
    connecting: a.loginConnecting,
    networkError: a.networkError,
    notFound: lang === 'he' ? 'נתיב ההתחברות לא נמצא בשרת.' : 'The login endpoint was not found on the server.',
    submitLabel: a.loginSubmit,
  };

  const handleLogin = () => navigate('/shipments');
  const handleRegister = () => navigate('/register');
  const handleLogout = async () => {
    await logout();
  };
  const handleChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) {
      return;
    }

    if (!formData.email || !formData.password) {
      setError(authMessages.requiredFields);
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      await login({ email: formData.email, password: formData.password });
      navigate('/shipments');
    } catch (submitError) {
      if (submitError instanceof ApiError && submitError.status === 404) {
        setError(authMessages.notFound);
      } else if (submitError instanceof Error && submitError.message === 'Failed to fetch') {
        setError(authMessages.networkError);
      } else {
        const msg = submitError instanceof Error ? submitError.message : '';
        setError(msg || authMessages.loginFailed);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const fields = [
    { id: 'email', name: 'email', label: a.emailLabel, type: 'email', placeholder: a.emailPlaceholder },
    { id: 'password', name: 'password', label: a.passwordLabel, type: 'password', placeholder: a.passwordPlaceholder },
  ];

  return (
    <div className="auth-page" dir={lang === 'he' ? 'rtl' : 'ltr'}>
      <AppTopBar
        links={t.topNav}
        activeId={undefined}
        onBrandClick={() => navigate('/home')}
        lang={lang}
        isAuthenticated={isAuthenticated()}
        onLogin={handleLogin}
        onRegister={handleRegister}
        onLogout={handleLogout}
        onProfile={() => navigate('/profile')}
        userName={currentUser?.name || ''}
      />
      <AuthForm
        title={a.loginTitle}
        notice={successNotice}
        error={error}
        fields={fields}
        values={formData}
        submitLabel={isSubmitting ? authMessages.connecting : authMessages.submitLabel}
        footerText={a.loginFooterText}
        footerLinkLabel={a.loginFooterLinkLabel}
        footerLinkTo="/register"
        onChange={handleChange}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
