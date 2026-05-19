import { Link } from 'react-router-dom';
import * as FAIcons from 'react-icons/fa6';

const iconMap: Record<string, keyof typeof FAIcons> = {
  'fa-truck': 'FaTruck',
  'fa-box-open': 'FaBoxOpen',
  'fa-circle-check': 'FaCircleCheck',
  'fa-boxes-stacked': 'FaBoxesStacked',
  'fa-file-circle-xmark': 'FaFileCircleXmark',
  'fa-truck-ramp-box': 'FaTruckRampBox',
  'fa-box': 'FaBox',
  'fa-door-open': 'FaDoorOpen',
  'fa-lemon': 'FaLemon',
  'fa-paper-plane': 'FaPaperPlane',
  'fa-clock': 'FaClock',
};

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
  error?: string;
  fields: AuthFormField[];
  values: Record<string, string>;
  submitLabel: string;
  footerText: string;
  footerLinkLabel: string;
  footerLinkTo: string;
  onChange: (name: string, value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

export function AuthForm({
  title,
  subtitle = 'Wieders etrogs',
  error,
  fields,
  values,
  submitLabel,
  footerText,
  footerLinkLabel,
  footerLinkTo,
  onChange,
  onSubmit,
}: AuthFormProps) {
  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1 className="login-title">{title}</h1>
          <p className="login-subtitle">{subtitle}</p>
        </div>

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
        </form>

        <div className="login-footer">
          <p className="login-footer-text">
            {footerText} <Link to={footerLinkTo} className="login-link">{footerLinkLabel}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
