import { AUTH_I18N } from './i18n';
import { AuthPageShell } from './components/AuthPageShell';
import { useLoginPage } from './hooks/useLoginPage';
import { useAuthLanguage } from './hooks/useAuthLanguage';

export function LoginPage() {
  const lang = useAuthLanguage();
  const a = AUTH_I18N[lang];
  const {
    topBarProps,
    formProps,
    showForgotPassword,
    forgotEmail,
    setForgotEmail,
    forgotMessage,
    isSendingReset,
    handleForgotPasswordSubmit,
  } = useLoginPage();

  return (
    <>
      <AuthPageShell topBarProps={topBarProps} formProps={formProps} />

      {showForgotPassword ? (
        <div className="login-container" style={{ paddingTop: '0.5rem' }}>
          <div className="login-card" style={{ maxWidth: '400px' }}>
            <h2 className="login-title" style={{ fontSize: '1.2rem' }}>{a.forgotPasswordTitle}</h2>

            {forgotMessage ? (
              <div className="login-notice">{forgotMessage}</div>
            ) : (
              <form onSubmit={(e) => { void handleForgotPasswordSubmit(e); }} className="login-form">
                <div className="form-group">
                  <label htmlFor="forgotEmail" className="form-label">{a.forgotPasswordEmailLabel}</label>
                  <input
                    id="forgotEmail"
                    type="email"
                    className="form-input"
                    placeholder={a.forgotPasswordEmailPlaceholder}
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-login" disabled={isSendingReset}>
                  <span className="btn-text">{isSendingReset ? a.forgotPasswordSending : a.forgotPasswordSubmit}</span>
                  <span className="btn-arrow" aria-hidden="true">←</span>
                </button>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
