import { FaXmark } from 'react-icons/fa6';
import { SubmitButton } from '../../../../../components/ui/SubmitButton';
import styles from './styles/ShipmentFormModal.module.css';

type NewIsraelShipmentFormModalText = {
  title: string;
  description: string;
  shipmentNumberLabel: string;
  shipmentNumberPlaceholder: string;
  notesLabel: string;
  notesPlaceholder: string;
  save: string;
  saving: string;
  cancel: string;
};

type NewIsraelShipmentFormModalProps = {
  isOpen: boolean;
  t: NewIsraelShipmentFormModalText;
  shipmentNumber: string;
  onShipmentNumberChange: (v: string) => void;
  notes: string;
  onNotesChange: (v: string) => void;
  isSubmitting: boolean;
  error: string | null;
  onSave: () => void;
  onClose: () => void;
};

export function NewIsraelShipmentFormModal({
  isOpen,
  t,
  shipmentNumber,
  onShipmentNumberChange,
  notes,
  onNotesChange,
  isSubmitting,
  error,
  onSave,
  onClose,
}: NewIsraelShipmentFormModalProps): JSX.Element | null {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog modal-dialog--form" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" type="button" aria-label={t.cancel} onClick={onClose}>
          <FaXmark />
        </button>

        <h3 className="modal-title">{t.title}</h3>
        <p className="modal-message">{t.description}</p>

        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label className={styles.label}>{t.shipmentNumberLabel}</label>
            <input
              className="seasons-manager__year-input"
              type="number"
              min={1}
              step={1}
              value={shipmentNumber}
              onChange={(e) => onShipmentNumberChange(e.target.value)}
              onWheel={(e) => e.currentTarget.blur()}
              placeholder={t.shipmentNumberPlaceholder}
              autoFocus
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t.notesLabel}</label>
            <textarea
              className={`seasons-manager__year-input ${styles.textarea}`}
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = 'auto';
                el.style.height = `${el.scrollHeight}px`;
              }}
              placeholder={t.notesPlaceholder}
              rows={1}
            />
          </div>
        </div>

        {error ? <p className="seasons-manager__error">{error}</p> : null}

        <div className="modal-actions">
          <button className="btn btn-danger" type="button" onClick={onClose}>
            {t.cancel}
          </button>
          <SubmitButton
            className="btn btn-success"
            onClick={onSave}
            isLoading={isSubmitting}
            loadingText={t.saving}
          >
            {t.save}
          </SubmitButton>
        </div>
      </div>
    </div>
  );
}
