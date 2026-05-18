import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthForm } from '../../components/forms/AuthForm';
import { AppTopBar } from '../../components/navigation/AppTopBar';
import { SHIPMENTS_I18N } from '../shipments/i18n';
import type { NavItem } from '../../types/navigation';
import { getCurrentUser, isAuthenticated, logout } from '../../services/authService';
import { AUTH_I18N } from './i18n';

export function RegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
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

    if (!formData.name || !formData.email || !formData.phone || !formData.password) {
      setError(a.requiredFields);
      return;
    }

    // TODO: הרשמה אמיתית מול השרת (API endpoint /auth/register טרם קיים)
    setError('');
    navigate('/login');
  };

  const fields = [
    { id: 'name', name: 'name', label: a.nameLabel, type: 'text', placeholder: a.namePlaceholder },
    { id: 'email', name: 'email', label: a.emailLabel, type: 'email', placeholder: a.emailPlaceholder },
    { id: 'phone', name: 'phone', label: a.phoneLabel, type: 'tel', placeholder: a.phonePlaceholder },
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
