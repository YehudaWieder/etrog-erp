import { FaXmark } from 'react-icons/fa6';
import { SubmitButton } from '../../../../../components/ui/SubmitButton';
import { TopLoadingBar } from '../../../../../components/ui/TopLoadingBar';
import { CustomSelect } from '../../../../../components/ui/CustomSelect';
import type { IsraelBoxStatus } from '../../../../../services/israel/israelBoxesApi';
import type { IsraelShipmentRecord } from '../../../../../services/israel/israelShipmentsApi';
import type { IsraelField } from '../../../../../services/israel/israelFieldsApi';
import styles from './styles/BoxFormModal.module.css';

const STATUS_ORDER: IsraelBoxStatus[] = ['OPEN', 'CLOSED', 'SHIPPED', 'DELIVERED'];

type EditIsraelBoxFormModalText = {
  title: (num: number) => string;
  shipmentLabel: string;
  shipmentPlaceholder: string;
  fieldLabel: string;
  fieldPlaceholder: string;
  fieldLockedHint: string;
  boxNumberLabel: string;
  statusLabel: string;
  notesLabel: string;
  notesPlaceholder: string;
  save: string;
  saving: string;
  cancel: string;
  statusOptions: Record<IsraelBoxStatus, string>;
};

type EditIsraelBoxFormModalProps = {
  isOpen: boolean;
  originalBoxNumber: number;
  t: EditIsraelBoxFormModalText;
  fields: IsraelField[];
  fieldId: string;
  onFieldIdChange: (v: string) => void;
  isFieldLocked: boolean;
  shipments: IsraelShipmentRecord[];
  isLoadingOptions: boolean;
  selectedShipmentId: string;
  onShipmentIdChange: (v: string) => void;
  boxNumber: string;
  onBoxNumberChange: (v: string) => void;
  status: IsraelBoxStatus;
  onStatusChange: (v: IsraelBoxStatus) => void;
  notes: string;
  onNotesChange: (v: string) => void;
  isSubmitting: boolean;
  error: string | null;
  onSave: () => void;
  onClose: () => void;
};

export function EditIsraelBoxFormModal({
  isOpen,
  originalBoxNumber,
  t,
  fields,
  fieldId,
  onFieldIdChange,
  isFieldLocked,
  shipments,
  isLoadingOptions,
  selectedShipmentId,
  onShipmentIdChange,
  boxNumber,
  onBoxNumberChange,
  status,
  onStatusChange,
  notes,
  onNotesChange,
  isSubmitting,
  error,
  onSave,
  onClose,
}: EditIsraelBoxFormModalProps): JSX.Element | null {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog modal-dialog--form" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" type="button" aria-label={t.cancel} onClick={onClose}>
          <FaXmark />
        </button>

        <h3 className="modal-title" style={{ position: 'relative' }}>
          {t.title(originalBoxNumber)}
          <TopLoadingBar isLoading={isLoadingOptions} />
        </h3>

        <div className={styles.formGrid}>
          <div className={styles.topRow}>
            <div className={styles.field}>
              <label className={styles.label}>{t.fieldLabel}</label>
              <CustomSelect
                className="seasons-manager__year-input"
                value={fieldId}
                onChange={onFieldIdChange}
                disabled={isFieldLocked}
                placeholder={t.fieldPlaceholder}
                options={fields.map((f) => ({ value: String(f.id), label: f.name }))}
              />
              {isFieldLocked ? <p className="seasons-manager__hint">{t.fieldLockedHint}</p> : null}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>{t.shipmentLabel}</label>
              <CustomSelect
                className="seasons-manager__year-input"
                value={selectedShipmentId}
                onChange={(value) => onShipmentIdChange(value)}
                disabled={isLoadingOptions}
                placeholder={t.shipmentPlaceholder}
                options={shipments.map((s) => ({ value: String(s.id), label: String(s.shipmentNumber) }))}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>{t.boxNumberLabel}</label>
              <input
                className="seasons-manager__year-input"
                type="number"
                min={1}
                step={1}
                value={boxNumber}
                onChange={(e) => onBoxNumberChange(e.target.value)}
                onWheel={(e) => e.currentTarget.blur()}
                autoFocus
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>{t.statusLabel}</label>
              <CustomSelect
                className="seasons-manager__year-input"
                value={status}
                onChange={(value) => onStatusChange(value as IsraelBoxStatus)}
                options={STATUS_ORDER.map((s) => ({ value: s, label: t.statusOptions[s] }))}
              />
            </div>

            <div className={`${styles.field} ${styles.fieldFull}`}>
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
