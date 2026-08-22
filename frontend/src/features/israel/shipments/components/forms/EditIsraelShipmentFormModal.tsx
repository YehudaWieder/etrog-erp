import { FaXmark } from 'react-icons/fa6';
import { SubmitButton } from '../../../../../components/ui/SubmitButton';
import { CustomSelect } from '../../../../../components/ui/CustomSelect';
import type { IsraelShipmentStatus } from '../../../../../services/israel/israelShipmentsApi';
import styles from './styles/ShipmentFormModal.module.css';

const STATUS_ORDER: IsraelShipmentStatus[] = ['PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

type EditIsraelShipmentFormModalText = {
  title: (num: number) => string;
  shipmentNumberLabel: string;
  statusLabel: string;
  shippedAtLabel: string;
  notesLabel: string;
  notesPlaceholder: string;
  save: string;
  saving: string;
  cancel: string;
  statusOptions: Record<IsraelShipmentStatus, string>;
};

type EditIsraelShipmentFormModalProps = {
  isOpen: boolean;
  originalShipmentNumber: number;
  shipmentNumber: string;
  onShipmentNumberChange: (v: string) => void;
  t: EditIsraelShipmentFormModalText;
  status: IsraelShipmentStatus;
  onStatusChange: (v: IsraelShipmentStatus) => void;
  shippedAt: string;
  onShippedAtChange: (v: string) => void;
  isShippedAtDisabled: boolean;
  activeSeasonYearName: number | null;
  notes: string;
  onNotesChange: (v: string) => void;
  isSubmitting: boolean;
  error: string | null;
  onSave: () => void;
  onClose: () => void;
};

export function EditIsraelShipmentFormModal({
  isOpen,
  originalShipmentNumber,
  shipmentNumber,
  onShipmentNumberChange,
  t,
  status,
  onStatusChange,
  shippedAt,
  onShippedAtChange,
  isShippedAtDisabled,
  activeSeasonYearName,
  notes,
  onNotesChange,
  isSubmitting,
  error,
  onSave,
  onClose,
}: EditIsraelShipmentFormModalProps): JSX.Element | null {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog modal-dialog--form" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" type="button" aria-label={t.cancel} onClick={onClose}>
          <FaXmark />
        </button>

        <h3 className="modal-title">{t.title(originalShipmentNumber)}</h3>

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
              autoFocus
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t.statusLabel}</label>
            <CustomSelect
              className="seasons-manager__year-input"
              value={status}
              onChange={(value) => onStatusChange(value as IsraelShipmentStatus)}
              options={STATUS_ORDER.map((s) => ({ value: s, label: t.statusOptions[s] }))}
            />
          </div>

          {!isShippedAtDisabled && (
            <div className={styles.field}>
              <label className={styles.label}>{t.shippedAtLabel}</label>
              <input
                className="seasons-manager__year-input"
                type="date"
                value={shippedAt}
                min={activeSeasonYearName !== null ? `${activeSeasonYearName}-01-01` : undefined}
                max={activeSeasonYearName !== null ? `${activeSeasonYearName}-12-31` : undefined}
                onChange={(e) => onShippedAtChange(e.target.value)}
              />
            </div>
          )}

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
