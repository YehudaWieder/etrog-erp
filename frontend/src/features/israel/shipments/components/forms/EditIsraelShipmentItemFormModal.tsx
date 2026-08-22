import { FaXmark } from 'react-icons/fa6';
import { SubmitButton } from '../../../../../components/ui/SubmitButton';
import type { IsraelPitamStatus } from '../../../../../services/israel/israelClassificationsApi';
import styles from './styles/BoxFormModal.module.css';

type EditIsraelShipmentItemFormModalText = {
  title: (id: number) => string;
  categoryLabel: string;
  gradeLabel: string;
  pitamStatusLabel: string;
  pitamStatusLabels: Record<IsraelPitamStatus, string>;
  quantityLabel: string;
  quantityPlaceholder: string;
  availableQuantityHint: (n: number) => string;
  notesLabel: string;
  notesPlaceholder: string;
  save: string;
  saving: string;
  cancel: string;
};

type EditIsraelShipmentItemFormModalProps = {
  isOpen: boolean;
  itemId: number;
  category: string;
  grade: string;
  pitamStatus: IsraelPitamStatus;
  t: EditIsraelShipmentItemFormModalText;
  quantity: string;
  onQuantityChange: (v: string) => void;
  availableQuantity: number | null;
  notes: string;
  onNotesChange: (v: string) => void;
  isSubmitting: boolean;
  error: string | null;
  onSave: () => void;
  onClose: () => void;
};

export function EditIsraelShipmentItemFormModal({
  isOpen,
  itemId,
  category,
  grade,
  pitamStatus,
  t,
  quantity,
  onQuantityChange,
  availableQuantity,
  notes,
  onNotesChange,
  isSubmitting,
  error,
  onSave,
  onClose,
}: EditIsraelShipmentItemFormModalProps): JSX.Element | null {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog modal-dialog--form" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" type="button" aria-label={t.cancel} onClick={onClose}>
          <FaXmark />
        </button>

        <h3 className="modal-title">{t.title(itemId)}</h3>

        <div className={styles.formGrid}>
          <div className={styles.formRow}>
            <div className={styles.field}>
              <label className={styles.label}>{t.categoryLabel}</label>
              <input className="seasons-manager__year-input" type="text" value={category} disabled readOnly />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>{t.gradeLabel}</label>
              <input className="seasons-manager__year-input" type="text" value={grade} disabled readOnly />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>{t.pitamStatusLabel}</label>
              <input className="seasons-manager__year-input" type="text" value={t.pitamStatusLabels[pitamStatus]} disabled readOnly />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>{t.quantityLabel}</label>
              <input
                className="seasons-manager__year-input"
                type="number"
                min={1}
                max={availableQuantity ?? undefined}
                step={1}
                value={quantity}
                onChange={(e) => onQuantityChange(e.target.value)}
                onWheel={(e) => e.currentTarget.blur()}
                placeholder={t.quantityPlaceholder}
                autoFocus
              />
              {availableQuantity !== null ? (
                <span style={{ fontSize: 12, opacity: 0.75 }}>{t.availableQuantityHint(availableQuantity)}</span>
              ) : null}
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
