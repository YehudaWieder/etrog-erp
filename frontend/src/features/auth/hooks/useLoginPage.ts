import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { ComponentProps } from 'react';
import { AuthForm } from '../../../components/forms/AuthForm';
import { AppTopBar } from '../../../components/navigation/AppTopBar';
import { ApiError } from '../../../services/apiClient';
import { getCurrentUser, isAuthenticated, login, logout } from '../../../services/authService';
import { SHIPMENTS_I18N } from '../../shipments/i18n';
import { AUTH_I18N } from '../i18n';
import { useAuthLanguage } from './useAuthLanguage';

export function useLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const lang = useAuthLanguage();
  const t = SHIPMENTS_I18N[lang];
  const a = AUTH_I18N[lang];
  const currentUser = getCurrentUser();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const successNotice = (() => {
    const state = location.state as { notice?: string } | null;
    return state?.notice || '';
  })();

  const authMessages = {
    requiredFields: a.requiredFields,
    loginFailed: a.loginFailed,
    connecting: a.loginConnecting,
    networkError: a.networkError,
    notFound: a.loginEndpointNotFound,
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

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

  const fields: ComponentProps<typeof AuthForm>['fields'] = [
    { id: 'email', name: 'email', label: a.emailLabel, type: 'email', placeholder: a.emailPlaceholder },
    { id: 'password', name: 'password', label: a.passwordLabel, type: 'password', placeholder: a.passwordPlaceholder },
  ];

  const topBarProps: ComponentProps<typeof AppTopBar> = {
    links: t.topNav,
    activeId: undefined,
    onBrandClick: () => navigate('/home'),
    lang,
    isAuthenticated: isAuthenticated(),
    onLogin: handleLogin,
    onRegister: handleRegister,
    onLogout: handleLogout,
    onProfile: () => navigate('/profile'),
    userName: currentUser?.name || '',
  };

  const formProps: ComponentProps<typeof AuthForm> = {
    title: a.loginTitle,
    notice: successNotice,
    error,
    fields,
    values: formData,
    submitLabel: isSubmitting ? authMessages.connecting : authMessages.submitLabel,
    footerText: a.loginFooterText,
    footerLinkLabel: a.loginFooterLinkLabel,
    footerLinkTo: '/register',
    onChange: handleChange,
    onSubmit: handleSubmit,
  };

  return {
    topBarProps,
    formProps,
  };
}
