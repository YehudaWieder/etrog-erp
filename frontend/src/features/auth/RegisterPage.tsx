import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthForm } from '../../components/forms/AuthForm';
import { AppTopBar } from '../../components/navigation/AppTopBar';
import { SHIPMENTS_I18N } from '../shipments/i18n';
import type { NavItem } from '../../types/navigation';
import { getCurrentUser, isAuthenticated, logout, register } from '../../services/authService';
import { ApiError } from '../../services/apiClient';
import { AUTH_I18N } from './i18n';

export function RegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

  const handleLogin = () => navigate('/login');
  const handleRegister = () => navigate('/shipments');
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };
  const handleTopNavClick = (item: NavItem) => {
    setActiveTopId(item.id);
  };

  const handleChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
      setError(a.requiredFields);
      return;
    }

    if (!emailRegex.test(formData.email)) {
      setError(a.invalidEmail);
      return;
    }

    if (!passwordRegex.test(formData.password)) {
      setError(a.passwordRulesHint);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError(a.passwordMismatch);
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      await register({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        password: formData.password,
      });

      navigate('/login', { state: { notice: a.registerSuccess } });
    } catch (submitError) {
      if (submitError instanceof ApiError && submitError.status === 404) {
        setError(lang === 'he' ? 'נתיב ההרשמה לא נמצא בשרת.' : 'The registration endpoint was not found on the server.');
      } else if (submitError instanceof Error && submitError.message === 'Failed to fetch') {
        setError(a.networkError);
      } else {
        const msg = submitError instanceof Error ? submitError.message : '';
        setError(msg || a.registerFailed);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const fields = [
    { id: 'name', name: 'name', label: a.nameLabel, type: 'text', placeholder: a.namePlaceholder },
    { id: 'email', name: 'email', label: a.emailLabel, type: 'email', placeholder: a.emailPlaceholder },
    { id: 'phone', name: 'phone', label: a.phoneLabel, type: 'tel', placeholder: a.phonePlaceholder, required: false },
    {
      id: 'password',
      name: 'password',
      label: a.passwordLabel,
      type: showPassword ? 'text' : 'password',
      placeholder: a.passwordPlaceholder,
      helperText: a.passwordRulesHint,
      actionLabel: showPassword ? a.hidePassword : a.showPassword,
      onActionClick: () => setShowPassword((prev) => !prev),
    },
    {
      id: 'confirmPassword',
      name: 'confirmPassword',
      label: a.confirmPasswordLabel,
      type: showConfirmPassword ? 'text' : 'password',
      placeholder: a.confirmPasswordPlaceholder,
      actionLabel: showConfirmPassword ? a.hidePassword : a.showPassword,
      onActionClick: () => setShowConfirmPassword((prev) => !prev),
    },
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
        onProfile={() => navigate('/profile')}
        userName={currentUser?.name || ''}
      />
      <AuthForm
        title={a.registerTitle}
        error={error}
        fields={fields}
        values={formData}
        submitLabel={isSubmitting ? a.registerConnecting : a.registerSubmit}
        footerText={a.registerFooterText}
        footerLinkLabel={a.registerFooterLinkLabel}
        footerLinkTo="/login"
        onChange={handleChange}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
