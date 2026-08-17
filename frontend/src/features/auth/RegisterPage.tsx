import { Link } from 'react-router-dom';
import { AUTH_I18N } from './i18n';
import { AuthPageShell } from './components/AuthPageShell';
import { useAuthLanguage } from './hooks/useAuthLanguage';
import { useRegisterPage } from './hooks/useRegisterPage';

export function RegisterPage() {
  const lang = useAuthLanguage();
  const a = AUTH_I18N[lang];
  const dir = lang === 'he' ? 'rtl' : 'ltr';
  const { formProps, successNotice } = useRegisterPage();

  if (successNotice) {
    return (
      <div className="auth-page" dir={dir}>
        <div className="login-container">
          <div className="login-card" style={{ textAlign: 'center' }}>
            <h1 className="login-title" style={{ fontSize: '1.6rem', marginBottom: '1rem' }}>{a.registerEmailSentTitle}</h1>
            <div className="login-notice" style={{ marginBottom: '1.5rem' }}>{successNotice}</div>
            <p className="login-footer-text">
              <Link to="/login" className="login-link">{a.registerEmailSentReturn}</Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <AuthPageShell lang={lang} formProps={formProps} />;
}
