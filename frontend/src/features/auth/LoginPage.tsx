import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthForm } from '../../components/forms/AuthForm';
import { AppTopBar } from '../../components/navigation/AppTopBar';
import { SHIPMENTS_I18N } from '../shipments/i18n';
import type { NavItem } from '../../types/navigation';

export function LoginPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [activeTopId, setActiveTopId] = useState('shipments');

  const lang = useMemo(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('app.language');
      if (stored && (stored === 'en' || stored === 'he')) return stored;
    }
    return 'he';
  }, []);
  const t = SHIPMENTS_I18N[lang];

  const handleLogin = () => navigate('/shipments');
  const handleRegister = () => navigate('/register');
  const handleTopNavClick = (item: NavItem) => {
    setActiveTopId(item.id);
  };

  const handleChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      setError('נא למלא את כל השדות');
      return;
    }

    // TODO: אימות אמיתי מול השרת
    console.log('Login attempt:', formData);
    setError('');
    // ניווט חזרה לעמוד הראשי אחרי התחברות מוצלחת
    navigate('/shipments');
  };

  const fields = [
    { id: 'email', name: 'email', label: 'אימייל', type: 'email', placeholder: 'הזן את הימייל שלך' },
    { id: 'password', name: 'password', label: 'סיסמא', type: 'password', placeholder: 'הזן את הסיסמא שלך' },
  ];

  return (
    <div className="auth-page" dir={lang === 'he' ? 'rtl' : 'ltr'}>
      <AppTopBar
        links={t.topNav}
        activeId={activeTopId}
        onNavigate={handleTopNavClick}
        onBrandClick={() => navigate('/home')}
        lang={lang}
        isAuthenticated={false}
        onLogin={handleLogin}
        onRegister={handleRegister}
        onLogout={() => {}}
        onProfile={() => {}}
        userName=""
      />
      <AuthForm
        title="התחברות"
        error={error}
        fields={fields}
        values={formData}
        submitLabel="התחברות"
        footerText="אין לך חשבון?"
        footerLinkLabel="הרשם כאן"
        footerLinkTo="/register"
        onChange={handleChange}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
