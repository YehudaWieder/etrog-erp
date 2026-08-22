import { FaXmark } from 'react-icons/fa6';
import { SubmitButton } from '../../../../../components/ui/SubmitButton';
import { CustomSelect } from '../../../../../components/ui/CustomSelect';
import type { IsraelShipmentRecord } from '../../../../../services/israel/israelShipmentsApi';
import type { NewIsraelBoxFormMode } from '../../hooks/useNewIsraelBoxForm';
import styles from './styles/BoxFormModal.module.css';

type NewIsraelBoxFormModalText = {
  title: string;
  description: string;
  singleModeLabel: string;
  bulkModeLabel: string;
  shipmentNumberLabel: string;
  shipmentNumberPlaceholder: string;
  boxNumberLabel: string;
  boxNumberPlaceholder: string;
  notesLabel: string;
  notesPlaceholder: string;
  startNumberLabel: string;
  startNumberPlaceholder: string;
  endNumberLabel: string;
  endNumberPlaceholder: string;
  save: string;
  saving: string;
  cancel: string;
};

type NewIsraelBoxFormModalProps = {
  isOpen: boolean;
  t: NewIsraelBoxFormModalText;
  mode: NewIsraelBoxFormMode;
  onModeChange: (v: NewIsraelBoxFormMode) => void;
  shipments: IsraelShipmentRecord[];
  isLoadingOptions: boolean;
  selectedShipmentId: string;
  onShipmentIdChange: (v: string) => void;
  boxNumber: string;
  onBoxNumberChange: (v: string) => void;
  notes: string;
  onNotesChange: (v: string) => void;
  startNumber: string;
  onStartNumberChange: (v: string) => void;
  endNumber: string;
  onEndNumberChange: (v: string) => void;
  isSubmitting: boolean;
  error: string | null;
  onSave: () => void;
  onClose: () => void;
};

export function NewIsraelBoxFormModal({
  isOpen,
  t,
  mode,
  onModeChange,
  shipments,
  isLoadingOptions,
  selectedShipmentId,
  onShipmentIdChange,
  boxNumber,
  onBoxNumberChange,
  notes,
  onNotesChange,
  startNumber,
  onStartNumberChange,
  endNumber,
  onEndNumberChange,
  isSubmitting,
  error,
  onSave,
  onClose,
}: NewIsraelBoxFormModalProps): JSX.Element | null {
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

        <div className={styles.modeToggle}>
          <button
            type="button"
            className={`${styles.modeButton} ${mode === 'SINGLE' ? styles.modeButtonActive : ''}`}
            onClick={() => onModeChange('SINGLE')}
          >
            {t.singleModeLabel}
          </button>
          <button
            type="button"
            className={`${styles.modeButton} ${mode === 'BULK' ? styles.modeButtonActive : ''}`}
            onClick={() => onModeChange('BULK')}
          >
            {t.bulkModeLabel}
          </button>
        </div>

        <div className={styles.formGrid}>
          {mode === 'BULK' ? (
            <div className={styles.topRow}>
              <div className={styles.field}>
                <label className={styles.label}>{t.shipmentNumberLabel}</label>
                <CustomSelect
                  className="seasons-manager__year-input"
                  value={selectedShipmentId}
                  onChange={(value) => onShipmentIdChange(value)}
                  disabled={isLoadingOptions}
                  placeholder={t.shipmentNumberPlaceholder}
                  options={shipments.map((s) => ({ value: String(s.id), label: String(s.shipmentNumber) }))}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>{t.startNumberLabel}</label>
                <input
                  className="seasons-manager__year-input"
                  type="number"
                  min={1}
                  step={1}
                  value={startNumber}
                  onChange={(e) => onStartNumberChange(e.target.value)}
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder={t.startNumberPlaceholder}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>{t.endNumberLabel}</label>
                <input
                  className="seasons-manager__year-input"
                  type="number"
                  min={1}
                  step={1}
                  value={endNumber}
                  onChange={(e) => onEndNumberChange(e.target.value)}
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder={t.endNumberPlaceholder}
                />
              </div>
            </div>
          ) : (
            <div className={styles.topRow}>
              <div className={styles.field}>
                <label className={styles.label}>{t.shipmentNumberLabel}</label>
                <CustomSelect
                  className="seasons-manager__year-input"
                  value={selectedShipmentId}
                  onChange={(value) => onShipmentIdChange(value)}
                  disabled={isLoadingOptions}
                  placeholder={t.shipmentNumberPlaceholder}
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
                  placeholder={t.boxNumberPlaceholder}
                  autoFocus
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
          )}
        </div>

        {error ? <p className="seasons-manager__error">{error}</p> : null}

        <div className="modal-actions">
          <button className="btn btn-danger" type="button" onClick={onClose}>
            {t.cancel}
          </button>
          <SubmitButton
            className="btn btn-success"
            onClick={onSave}
            disabled={isLoadingOptions}
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
