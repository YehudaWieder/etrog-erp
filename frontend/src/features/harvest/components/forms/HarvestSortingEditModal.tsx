import { SubmitButton } from '../../../../components/ui/SubmitButton';
import type { ClassificationListRecord } from '../../../../services/classificationsApi';
import type { HarvestI18n } from '../../i18n';
import styles from './styles/HarvestBulkFormModal.module.css';

type HarvestSortingEditModalProps = {
  isOpen: boolean;
  t: HarvestI18n;
  row: ClassificationListRecord;
  formatGregorianDate: (value: string) => string;
  quantity: number;
  onQuantityChange: (value: number) => void;
  isSubmitting: boolean;
  error: string;
  onClose: () => void;
  onSubmit: () => void;
};

export function HarvestSortingEditModal({
  isOpen,
  t,
  row,
  formatGregorianDate,
  quantity,
  onQuantityChange,
  isSubmitting,
  error,
  onClose,
  onSubmit,
}: HarvestSortingEditModalProps): JSX.Element | null {
  if (!isOpen) return null;

  const sl = t.sortingList;
  const form = t.bulkForm;
  const ed = t.pageControls.editSortingDialog;

  const resolveAssignmentLabel = () => {
    if (row.assignmentType === 'TRADER') return form.assignmentOptions.trader;
    if (row.assignmentType === 'CUSTOMER') return form.assignmentOptions.customer;
    return form.assignmentOptions.general;
  };

  const resolveTarget = () => {
    if (row.assignmentType === 'TRADER') return row.trader?.name ?? '';
    if (row.assignmentType === 'CUSTOMER') return row.customer?.customerName ?? '';
    return '';
  };

  const resolveCategory = () => row.customerCategory?.name ?? row.traderCategory?.name ?? '';

  const resolveGrade = () => row.grade ?? row.customerCategory?.grade ?? '';

  const resolvePitamLabel = () => {
    if (row.pitamStatus === 'WITH_PITAM') return form.pitamOptions.withPitam;
    if (row.pitamStatus === 'WITHOUT_PITAM') return form.pitamOptions.withoutPitam;
    if (row.pitamStatus === 'MIXED') return form.pitamOptions.mixed;
    return '';
  };

  const isPartial = row.fieldHarvest?.isPartialClassification ?? false;
  const target = resolveTarget();

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
            <span>{sl.columns.dateGregorian}</span>
            <input
              className="seasons-manager__year-input"
              type="text"
              disabled
              value={formatGregorianDate(row.fieldHarvest?.dateGregorian ?? '')}
            />
          </label>
          <label className={styles.summaryField}>
            <span>{sl.columns.dateHebrew}</span>
            <input
              className="seasons-manager__year-input"
              type="text"
              disabled
              value={row.fieldHarvest?.dateHebrew ?? ''}
            />
          </label>
          <label className={styles.summaryField}>
            <span>{sl.columns.fieldName}</span>
            <input
              className="seasons-manager__year-input"
              type="text"
              disabled
              value={row.fieldHarvest?.field?.name ?? ''}
            />
          </label>
        </div>

        <fieldset className={styles.classificationMode} disabled aria-label={form.classificationModeLabel}>
          <legend>{form.classificationModeLabel}</legend>
          <label>
            <input type="radio" name="edit-classification-mode" disabled checked={!isPartial} onChange={() => void 0} />
            <span>{form.fullSorting}</span>
          </label>
          <label>
            <input type="radio" name="edit-classification-mode" disabled checked={isPartial} onChange={() => void 0} />
            <span>{form.partialSorting}</span>
          </label>
        </fieldset>

        <div className={`management-form-grid ${styles.grid} ${styles.gridPrimary}`}>
          <input
            className="seasons-manager__year-input"
            type="text"
            disabled
            value={resolveAssignmentLabel()}
            aria-label={sl.columns.assignmentType}
          />

          {target ? (
            <input
              className="seasons-manager__year-input"
              type="text"
              disabled
              value={target}
              aria-label={sl.columns.target}
            />
          ) : null}

          <input
            className="seasons-manager__year-input"
            type="text"
            disabled
            value={resolveCategory()}
            aria-label={sl.columns.category}
          />

          <input
            className="seasons-manager__year-input"
            type="text"
            disabled
            value={resolveGrade()}
            aria-label={sl.columns.grade}
          />

          <input
            className="seasons-manager__year-input"
            type="text"
            disabled
            value={resolvePitamLabel()}
            aria-label={sl.columns.pitamStatus}
          />

          <input
            className="seasons-manager__year-input harvest-bulk-form-number-input"
            type="number"
            min={1}
            required
            autoFocus
            value={quantity}
            onChange={(e) => onQuantityChange(Number(e.target.value))}
            aria-label={sl.columns.quantity}
          />

          <textarea
            className={`seasons-manager__year-input ${styles.notes} ${styles.notesTextarea}`}
            rows={1}
            disabled
            value={row.notes ?? ''}
            aria-label={sl.columns.notes}
          />
        </div>

        {error ? <p className="seasons-manager__error">{error}</p> : null}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {ed.cancel}
          </button>
          <SubmitButton
            type="button"
            className="btn btn-primary"
            onClick={onSubmit}
            disabled={quantity < 1}
            isLoading={isSubmitting}
            loadingText={t.sortingForm.saving}
          >
            {ed.confirm}
          </SubmitButton>
        </div>
      </div>
    </div>
  );
}
