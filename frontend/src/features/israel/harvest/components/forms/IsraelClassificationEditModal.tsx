import { SubmitButton } from '../../../../../components/ui/SubmitButton';
import { formatHarvestGregorianDate } from '../../../../harvest/services/harvestDisplayFormatters.service';
import type { IsraelClassificationSeasonRecord } from '../../../../../services/israel/israelClassificationsApi';
import type { IsraelHarvestI18n } from '../../i18n';
import styles from '../../../../harvest/components/forms/styles/HarvestBulkFormModal.module.css';

function pitamStatusLabel(
  status: IsraelClassificationSeasonRecord['pitamStatus'] | undefined,
  labels: IsraelHarvestI18n['harvestForm']['pitamOptions'],
): string {
  if (status === 'WITH_PITAM') return labels.withPitam;
  if (status === 'WITHOUT_PITAM') return labels.withoutPitam;
  return labels.mixed;
}

type IsraelClassificationEditModalProps = {
  isOpen: boolean;
  lang: 'he' | 'en';
  t: IsraelHarvestI18n;
  row: IsraelClassificationSeasonRecord;
  quantity: number;
  onQuantityChange: (value: number) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  isSubmitting: boolean;
  error: string;
  onClose: () => void;
  onSubmit: () => void;
};

export function IsraelClassificationEditModal({
  isOpen,
  lang,
  t,
  row,
  quantity,
  onQuantityChange,
  notes,
  onNotesChange,
  isSubmitting,
  error,
  onClose,
  onSubmit,
}: IsraelClassificationEditModalProps): JSX.Element | null {
  if (!isOpen) return null;

  const sl = t.sortingList;
  const ed = t.pageControls.editSortingDialog;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal-dialog modal-dialog--form ${styles.modal}`}
        role="dialog"
        aria-modal="true"
        aria-label={ed.title}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="modal-close"
          type="button"
          aria-label={ed.cancel}
          onClick={onClose}
        >
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
              value={formatHarvestGregorianDate(row.harvest?.dateGregorian ?? '', lang)}
            />
          </label>
          <label className={styles.summaryField}>
            <span>{sl.columns.fieldName}</span>
            <input
              className="seasons-manager__year-input"
              type="text"
              disabled
              value={row.harvest?.field?.name ?? ''}
            />
          </label>
          <label className={styles.summaryField}>
            <span>{sl.columns.fieldCategory}</span>
            <input
              className="seasons-manager__year-input"
              type="text"
              disabled
              value={row.fieldCategory?.name ?? ''}
            />
          </label>
          <label className={styles.summaryField}>
            <span>{sl.columns.category}</span>
            <input
              className="seasons-manager__year-input"
              type="text"
              disabled
              value={row.category?.name ?? ''}
            />
          </label>
          <label className={styles.summaryField}>
            <span>{sl.columns.grade}</span>
            <input
              className="seasons-manager__year-input"
              type="text"
              disabled
              value={row.grade ?? ''}
            />
          </label>
          <label className={styles.summaryField}>
            <span>{sl.columns.pitamStatus}</span>
            <input
              className="seasons-manager__year-input"
              type="text"
              disabled
              value={pitamStatusLabel(row.pitamStatus, t.harvestForm.pitamOptions)}
            />
          </label>

          <label className={styles.summaryField}>
            <span>{ed.quantityLabel}</span>
            <input
              className="seasons-manager__year-input harvest-bulk-form-number-input"
              type="number"
              min={1}
              required
              autoFocus
              value={quantity}
              onChange={(event) => onQuantityChange(Number(event.target.value))}
              aria-label={ed.quantityLabel}
            />
          </label>

          <label className={`${styles.summaryField} ${styles.notesWithMode}`}>
            <span>{ed.notesLabel}</span>
            <textarea
              className={`seasons-manager__year-input ${styles.notesTextarea}`}
              rows={1}
              value={notes}
              onChange={(event) => onNotesChange(event.target.value)}
              aria-label={ed.notesLabel}
            />
          </label>
        </div>

        {error ? <p className="seasons-manager__error">{error}</p> : null}

        <div className="modal-actions">
          <button
            className="btn btn-danger"
            onClick={onClose}
            type="button"
            disabled={isSubmitting}
          >
            {ed.cancel}
          </button>
          <SubmitButton
            className="btn btn-success"
            onClick={onSubmit}
            type="button"
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
