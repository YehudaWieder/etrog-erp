import { SubmitButton } from '../../../../components/ui/SubmitButton';
import type { Field } from '../../../../services/fieldsApi';
import type { HarvestI18n } from '../../i18n';
import styles from './styles/HarvestBulkFormModal.module.css';

type HarvestEditModalProps = {
  isOpen: boolean;
  t: HarvestI18n;
  lang: 'he' | 'en';
  fields: Field[];
  dateGregorian: string;
  dateHebrew: string;
  fieldId: number;
  totalHarvested: number;
  totalRejected: number;
  ownerHarvested: number;
  ownerRejected: number;
  notes: string;
  classifiedTotal: number;
  isPartialClassification: boolean;
  markAsFullClassification: boolean;
  onMarkAsFullClassificationChange: (value: boolean) => void;
  isSubmitting: boolean;
  error: string;
  onFieldIdChange: (value: number) => void;
  onTotalHarvestedChange: (value: number) => void;
  onTotalRejectedChange: (value: number) => void;
  onOwnerHarvestedChange: (value: number) => void;
  onOwnerRejectedChange: (value: number) => void;
  onNotesChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export function HarvestEditModal({
  isOpen,
  t,
  fields,
  dateGregorian,
  dateHebrew,
  fieldId,
  totalHarvested,
  totalRejected,
  ownerHarvested,
  ownerRejected,
  notes,
  classifiedTotal,
  isPartialClassification,
  markAsFullClassification,
  onMarkAsFullClassificationChange,
  isSubmitting,
  error,
  onFieldIdChange,
  onTotalHarvestedChange,
  onTotalRejectedChange,
  onOwnerHarvestedChange,
  onOwnerRejectedChange,
  onNotesChange,
  onClose,
  onSubmit,
}: HarvestEditModalProps): JSX.Element | null {
  if (!isOpen) return null;

  const ed = t.pageControls.editHarvestDialog;
  const bf = t.bulkForm;

  const netQuantity = totalHarvested - totalRejected;
  const hasSortings = classifiedTotal > 0;
  const belowSortings = hasSortings && netQuantity < classifiedTotal;
  // exactlySortings: only relevant for partial — full classification at net===classified is the normal state
  const exactlySortings = hasSortings && isPartialClassification && netQuantity === classifiedTotal;
  const exactNotMarked = exactlySortings && !markAsFullClassification;
  const submitBlocked = belowSortings || exactNotMarked;
  // full classification harvest + net increased above classified → will auto-switch to partial
  const willSwitchToPartial = !isPartialClassification && hasSortings && netQuantity > classifiedTotal;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal-dialog modal-dialog--form ${styles.modal}`}
        role="dialog"
        aria-modal="true"
        aria-label={ed.title}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" type="button" aria-label={ed.cancel} onClick={onClose}>
          X
        </button>

        <h3 className="modal-title">{ed.title}</h3>

        <div className={`management-form-grid ${styles.grid} ${styles.gridPrimary}`}>
          <label className={styles.summaryField}>
            <span>{bf.gregorianDateLabel}</span>
            <input
              className="seasons-manager__year-input"
              type="text"
              disabled
              value={dateGregorian}
            />
          </label>
          <label className={styles.summaryField}>
            <span>{bf.hebrewDateLabel}</span>
            <input
              className="seasons-manager__year-input"
              type="text"
              disabled
              value={dateHebrew}
            />
          </label>
        </div>

        <div className={`management-form-grid ${styles.grid} ${styles.gridPrimary}`}>
          <label className={styles.summaryField}>
            <span>{ed.fieldLabel}</span>
            <select
              className="seasons-manager__year-input"
              value={fieldId}
              onChange={(e) => onFieldIdChange(Number(e.target.value))}
            >
              <option value={0} disabled>{ed.fieldPlaceholder}</option>
              {fields.map((field) => (
                <option key={field.id} value={field.id}>{field.name}</option>
              ))}
            </select>
          </label>
        </div>

        <div className={`management-form-grid ${styles.grid} ${styles.gridPrimary}`}>
          <label className={styles.summaryField}>
            <span>{ed.totalHarvestedLabel}</span>
            <input
              className="seasons-manager__year-input harvest-bulk-form-number-input"
              type="number"
              min={0}
              value={totalHarvested}
              onChange={(e) => onTotalHarvestedChange(Number(e.target.value))}
            />
          </label>
          <label className={styles.summaryField}>
            <span>{ed.totalRejectedLabel}</span>
            <input
              className="seasons-manager__year-input harvest-bulk-form-number-input"
              type="number"
              min={0}
              value={totalRejected}
              onChange={(e) => onTotalRejectedChange(Number(e.target.value))}
            />
          </label>
          <label className={styles.summaryField}>
            <span>{ed.ownerHarvestedLabel}</span>
            <input
              className="seasons-manager__year-input harvest-bulk-form-number-input"
              type="number"
              min={0}
              value={ownerHarvested}
              onChange={(e) => onOwnerHarvestedChange(Number(e.target.value))}
            />
          </label>
          <label className={styles.summaryField}>
            <span>{ed.ownerRejectedLabel}</span>
            <input
              className="seasons-manager__year-input harvest-bulk-form-number-input"
              type="number"
              min={0}
              value={ownerRejected}
              onChange={(e) => onOwnerRejectedChange(Number(e.target.value))}
            />
          </label>
        </div>

        <div className={`management-form-grid ${styles.grid} ${styles.gridPrimary}`}>
          <label className={styles.summaryField}>
            <span>{ed.notesLabel}</span>
            <textarea
              className={`seasons-manager__year-input ${styles.notesTextarea}`}
              rows={2}
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
            />
          </label>
        </div>

        {belowSortings ? (
          <p className="seasons-manager__error">{ed.classifiedExceedsNetError(classifiedTotal)}</p>
        ) : exactNotMarked ? (
          <p className="seasons-manager__error">{ed.exactNetRequiresFullClassificationError}</p>
        ) : willSwitchToPartial ? (
          <p className="seasons-manager__warning">{ed.netIncreaseSwitchesToPartialWarning}</p>
        ) : null}

        {exactlySortings ? (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <input
              type="checkbox"
              checked={markAsFullClassification}
              onChange={(e) => onMarkAsFullClassificationChange(e.target.checked)}
            />
            <span>{ed.markAsFullClassificationLabel}</span>
          </label>
        ) : null}

        {error ? <p className="seasons-manager__error">{error}</p> : null}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {ed.cancel}
          </button>
          <SubmitButton
            type="button"
            className="btn btn-primary"
            onClick={onSubmit}
            disabled={fieldId === 0 || submitBlocked}
            isLoading={isSubmitting}
            loadingText={bf.saving}
          >
            {ed.confirm}
          </SubmitButton>
        </div>
      </div>
    </div>
  );
}
