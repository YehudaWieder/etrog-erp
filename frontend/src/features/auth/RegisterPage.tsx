import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthForm } from '../../components/forms/AuthForm';
import { AppTopBar } from '../../components/navigation/AppTopBar';
import { SHIPMENTS_I18N } from '../shipments/i18n';
import type { NavItem } from '../../types/navigation';

export function RegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
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

  const handleLogin = () => navigate('/login');
  const handleRegister = () => navigate('/shipments');
  const handleTopNavClick = (item: NavItem) => {
    setActiveTopId(item.id);
  };

  const handleChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.phone || !formData.password) {
      setError('נא למלא את כל השדות');
      return;
    }

    // TODO: הרשמה אמיתית מול השרת
    console.log('Register attempt:', formData);
    setError('');
    // ניווט חזרה לעמוד הראשי אחרי הרשמה מוצלחת
    navigate('/shipments');
  };

  const fields = [
    { id: 'name', name: 'name', label: 'שם', type: 'text', placeholder: 'הזן את שמך' },
    { id: 'email', name: 'email', label: 'אימייל', type: 'email', placeholder: 'הזן את הימייל שלך' },
    { id: 'phone', name: 'phone', label: 'טלפון', type: 'tel', placeholder: 'הזן את מספר הטלפון שלך' },
    { id: 'password', name: 'password', label: 'סיסמא', type: 'password', placeholder: 'הזן סיסמא' },
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
        title="הרשמה"
        error={error}
        fields={fields}
        values={formData}
        submitLabel="הרשמה"
        footerText="כבר יש לך חשבון?"
        footerLinkLabel="התחבר כאן"
        footerLinkTo="/login"
        onChange={handleChange}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
