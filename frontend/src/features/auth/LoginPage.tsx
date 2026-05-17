import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HomeIcon } from '../../components/ui/HomeIcon';
import { ProfileMenu } from '../../components/navigation/ProfileMenu';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = () => navigate('/shipments');
  const handleRegister = () => navigate('/register');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('נא למלא את כל השדות');
      return;
    }

    // TODO: אימות אמיתי מול השרת
    console.log('Login attempt:', { email, password });
    setError('');
    // ניווט חזרה לעמוד הראשי אחרי התחברות מוצלחת
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
            <h1 className="login-title">התחברות</h1>
            <p className="login-subtitle">Wieders etrogs</p>
          </div>

          {error && <div className="login-error">{error}</div>}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email" className="form-label">אימייל</label>
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="הזן את הימייל שלך"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">סיסמא</label>
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="הזן את הסיסמא שלך"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-login">
              התחברות
            </button>
          </form>

          <div className="login-footer">
            <p className="login-footer-text">
              אין לך חשבון? <a href="/register" className="login-link">הרשם כאן</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
