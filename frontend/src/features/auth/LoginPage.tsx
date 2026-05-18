import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthForm } from '../../components/forms/AuthForm';
import { AppTopBar } from '../../components/navigation/AppTopBar';
import { SHIPMENTS_I18N } from '../shipments/i18n';
import type { NavItem } from '../../types/navigation';
import { getCurrentUser, isAuthenticated, login, logout } from '../../services/authService';
import { AUTH_I18N } from './i18n';

export function LoginPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTopId, setActiveTopId] = useState('shipments');
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

  const handleLogin = () => navigate('/shipments');
  const handleRegister = () => navigate('/register');
  const handleLogout = async () => {
    await logout();
  };
  const handleTopNavClick = (item: NavItem) => {
    setActiveTopId(item.id);
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
      setError(a.requiredFields);
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      await login({ email: formData.email, password: formData.password });
      navigate('/shipments');
    } catch (submitError) {
      const msg = submitError instanceof Error ? submitError.message : '';
      if (msg === 'Failed to fetch') {
        setError(a.networkError);
      } else {
        setError(msg || a.loginFailed);
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
        activeId={activeTopId}
        onNavigate={handleTopNavClick}
        onBrandClick={() => navigate('/home')}
        lang={lang}
        isAuthenticated={isAuthenticated()}
        onLogin={handleLogin}
        onRegister={handleRegister}
        onLogout={handleLogout}
        onProfile={() => {}}
        userName={currentUser?.name || ''}
      />
      <AuthForm
        title={a.loginTitle}
        error={error}
        fields={fields}
        values={formData}
        submitLabel={isSubmitting ? a.loginConnecting : a.loginSubmit}
        footerText={a.loginFooterText}
        footerLinkLabel={a.loginFooterLinkLabel}
        footerLinkTo="/register"
        onChange={handleChange}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
