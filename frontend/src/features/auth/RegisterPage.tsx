import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HomeIcon } from '../../components/ui/HomeIcon';
import { ProfileMenu } from '../../components/navigation/ProfileMenu';

export function RegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });
  const [error, setError] = useState('');

  const handleLogin = () => navigate('/login');
  const handleRegister = () => navigate('/shipments');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
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

  return (
    <div className="auth-page">
      <header className="auth-topbar">
        <div className="auth-topbar-brand">
          <HomeIcon style={{ fontSize: 22, marginInlineEnd: 6 }} />
          <span>Wieders etrogs</span>
        </div>
        <div className="auth-topbar-right">
          <ProfileMenu
            isAuthenticated={false}
            onLogin={handleLogin}
            onRegister={handleRegister}
            onLogout={() => {}}
            onProfile={() => {}}
            userName=""
          />
        </div>
      </header>

      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h1 className="login-title">הרשמה</h1>
            <p className="login-subtitle">Wieders etrogs</p>
          </div>

          {error && <div className="login-error">{error}</div>}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="name" className="form-label">שם</label>
              <input
                id="name"
                type="text"
                name="name"
                className="form-input"
                placeholder="הזן את שמך"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email" className="form-label">אימייל</label>
              <input
                id="email"
                type="email"
                name="email"
                className="form-input"
                placeholder="הזן את הימייל שלך"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone" className="form-label">טלפון</label>
              <input
                id="phone"
                type="tel"
                name="phone"
                className="form-input"
                placeholder="הזן את מספר הטלפון שלך"
                value={formData.phone}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">סיסמא</label>
              <input
                id="password"
                type="password"
                name="password"
                className="form-input"
                placeholder="הזן סיסמא"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

            <button type="submit" className="btn btn-login">
              הרשמה
            </button>
          </form>

          <div className="login-footer">
            <p className="login-footer-text">
              כבר יש לך חשבון? <a href="/login" className="login-link">התחבר כאן</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
