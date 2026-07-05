import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ComponentProps } from 'react';
import { AuthForm } from '../../../components/forms/AuthForm';
import { AppTopBar } from '../../../components/navigation/AppTopBar';
import { ApiError } from '../../../services/apiClient';
import { getCurrentUser, isAuthenticated, logout, register } from '../../../services/authService';
import { SHIPMENTS_I18N } from '../../shipments/i18n';
import { AUTH_I18N } from '../i18n';
import { isValidEmail, isValidPhone, sanitizeEmail, sanitizePhone, sanitizeText } from '../../../utils/inputValidation';
import { useAuthLanguage } from './useAuthLanguage';

export function useRegisterPage() {
  const navigate = useNavigate();
  const lang = useAuthLanguage();
  const t = SHIPMENTS_I18N[lang];
  const a = AUTH_I18N[lang];
  const currentUser = getCurrentUser();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [successNotice, setSuccessNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [activeTopId, setActiveTopId] = useState('shipments');
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

  const handleLogin = () => navigate('/login');
  const handleRegister = () => navigate('/shipments');
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleTopNavClick = (item: { id: string }) => {
    setActiveTopId(item.id);
  };

  const handleChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) return;

    const normalizedName = sanitizeText(formData.name);
    const normalizedEmail = sanitizeEmail(formData.email);
    const normalizedPhone = sanitizePhone(formData.phone);

    if (!normalizedName || !normalizedEmail || !formData.password || !formData.confirmPassword) {
      setError(a.requiredFields);
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setError(a.invalidEmail);
      return;
    }

    if (normalizedPhone && !isValidPhone(normalizedPhone)) {
      setError(a.invalidPhone);
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

      const emailConfirmationRequired = await register(normalizedEmail, formData.password, {
        name: normalizedName,
        phone: normalizedPhone || undefined,
      });

      setSuccessNotice(emailConfirmationRequired ? a.registerEmailSentBody : a.callbackAccountCreated);
    } catch (submitError) {
      if (submitError instanceof ApiError && submitError.status === 404) {
        setError(a.registrationEndpointNotFound);
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

  const fields: ComponentProps<typeof AuthForm>['fields'] = [
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

  const topBarProps: ComponentProps<typeof AppTopBar> = {
    links: t.topNav,
    activeId: activeTopId,
    onNavigate: handleTopNavClick,
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
    title: a.registerTitle,
    notice: successNotice,
    error,
    fields,
    values: formData,
    submitLabel: isSubmitting ? a.registerConnecting : a.registerSubmit,
    footerText: a.registerFooterText,
    footerLinkLabel: a.registerFooterLinkLabel,
    footerLinkTo: '/login',
    onChange: handleChange,
    onSubmit: handleSubmit,
  };

  return {
    topBarProps,
    formProps,
    successNotice,
  };
}
