import { Link } from 'react-router-dom';

export type AuthFormField = {
  id: string;
  name: string;
  label: string;
  type: string;
  placeholder: string;
  required?: boolean;
  helperText?: string;
  actionLabel?: string;
  onActionClick?: () => void;
};

type AuthFormProps = {
  title: string;
  subtitle?: string;
  notice?: string;
  error?: string;
  fields: AuthFormField[];
  values: Record<string, string>;
  submitLabel: string;
  footerText: string;
  footerLinkLabel: string;
  footerLinkTo: string;
  onChange: (name: string, value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onForgotPassword?: () => void;
  forgotPasswordLabel?: string;
  onGoogleLogin?: () => void;
  googleLoginLabel?: string;
  orDivider?: string;
};

export function AuthForm({
  title,
  subtitle = 'Wieders etrogs',
  notice,
  error,
  fields,
  values,
  submitLabel,
  footerText,
  footerLinkLabel,
  footerLinkTo,
  onChange,
  onSubmit,
  onForgotPassword,
  forgotPasswordLabel = 'Forgot password',
  onGoogleLogin,
  googleLoginLabel = 'Continue with Google',
  orDivider = 'or',
}: AuthFormProps) {
  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1 className="login-title">{title}</h1>
          <p className="login-subtitle">{subtitle}</p>
        </div>

        {notice ? <div className="login-notice">{notice}</div> : null}
        {error ? <div className="login-error">{error}</div> : null}

        <form onSubmit={onSubmit} className="login-form">
          {fields.map((field) => (
            <div className="form-group" key={field.id}>
              <label htmlFor={field.id} className="form-label">
                {field.label}
              </label>
              <div className="form-input-row">
                <input
                  id={field.id}
                  type={field.type}
                  name={field.name}
                  className={`form-input ${field.type === 'tel' ? 'rtl-placeholder' : ''}`}
                  placeholder={field.placeholder}
                  value={values[field.name] ?? ''}
                  onChange={(event) => onChange(field.name, event.target.value)}
                  required={field.required ?? true}
                />
                {field.actionLabel && field.onActionClick ? (
                  <button type="button" className="form-input-action" onClick={field.onActionClick}>
                    {field.actionLabel}
                  </button>
                ) : null}
              </div>
              {field.helperText ? <small className="form-helper-text">{field.helperText}</small> : null}
            </div>
          ))}

          <button type="submit" className="btn btn-login">
            <span className="btn-text">{submitLabel}</span>
            <span className="btn-arrow" aria-hidden="true">←</span>
          </button>

          {onGoogleLogin ? (
            <>
              <div className="login-divider"><span>{orDivider}</span></div>
              <button type="button" className="btn-google" onClick={onGoogleLogin}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="18" height="18" aria-hidden="true">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.32-8.16 2.32-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                <span>{googleLoginLabel}</span>
              </button>
            </>
          ) : null}
        </form>

        <div className="login-footer">
          {onForgotPassword ? (
            <p className="login-footer-text">
              <button type="button" className="login-link" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} onClick={onForgotPassword}>
                {forgotPasswordLabel}
              </button>
            </p>
          ) : null}
          <p className="login-footer-text">
            {footerText} <Link to={footerLinkTo} className="login-link">{footerLinkLabel}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
