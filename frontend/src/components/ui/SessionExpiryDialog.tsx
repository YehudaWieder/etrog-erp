import { APP_I18N } from '../../app/i18n';
import { getPreferredLanguage } from '../../utils/locale';

interface SessionExpiryDialogProps {
  open: boolean;
  isExtending: boolean;
  onExtend: () => void;
  onDismiss: () => void;
}

export function SessionExpiryDialog({ open, isExtending, onExtend, onDismiss }: SessionExpiryDialogProps) {
  if (!open) return null;

  const t = APP_I18N[getPreferredLanguage() === 'en' ? 'en' : 'he'];

  return (
    <div className="modal-overlay">
      <div className="modal-dialog">
        <h3 className="modal-title">{t.sessionExpiryTitle}</h3>
        <div className="modal-message">{t.sessionExpiryMessage}</div>
        <div className="modal-actions">
          <button className="btn btn-primary" onClick={onExtend} type="button" disabled={isExtending}>
            {isExtending ? t.sessionExpiryExtending : t.sessionExpiryExtend}
          </button>
          <button className="btn btn-secondary" onClick={onDismiss} type="button" disabled={isExtending}>
            {t.sessionExpiryDismiss}
          </button>
        </div>
      </div>
    </div>
  );
}
