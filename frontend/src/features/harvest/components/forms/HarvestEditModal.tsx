import { SubmitButton } from '../../../../components/ui/SubmitButton';
import type { Customer } from '../../../../services/customersApi';
import type { CustomerCategory } from '../../../../services/customerCategoriesApi';
import type { ClassificationRecord } from '../../../../services/classificationsApi';
import type { Field } from '../../../../services/fieldsApi';
import type { Trader } from '../../../../services/tradersApi';
import type { TraderCategoryWithShares } from '../../../../services/traderCategoriesApi';
import type { HarvestFormClassificationDraft } from '../../harvestPage.types';
import type { HarvestI18n } from '../../i18n';
import { HarvestClassificationRowsSection } from './HarvestClassificationRowsSection';
import type { PitamRowKey } from '../../utils/harvestClassificationMatrix.util';
import styles from './styles/HarvestBulkFormModal.module.css';

type HarvestEditModalProps = {
  isOpen: boolean;
  t: HarvestI18n;
  lang: 'he' | 'en';
  fields: Field[];
  dateGregorian: string;
  dateHebrew: string;
  activeSeasonYearName: number | null;
  fieldId: number;
  totalHarvested: number;
  totalRejected: number;
  ownerHarvested: number;
  ownerRejected: number;
  notes: string;
  isPartialClassification: boolean;
  onIsPartialClassificationChange: (value: boolean) => void;
  uncalculatedRejected: number;
  onUncalculatedRejectedChange: (value: number) => void;
  remainsInItalyGradeH: boolean;
  onRemainsInItalyGradeHChange: (value: boolean) => void;
  remainsInItalyGradeV: boolean;
  onRemainsInItalyGradeVChange: (value: boolean) => void;
  isSubmitting: boolean;
  error: string;
  onDateGregorianChange: (value: string) => void;
  onFieldIdChange: (value: number) => void;
  onTotalHarvestedChange: (value: number) => void;
  onTotalRejectedChange: (value: number) => void;
  onOwnerHarvestedChange: (value: number) => void;
  onOwnerRejectedChange: (value: number) => void;
  onNotesChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  traders: Trader[];
  customers: Customer[];
  harvestFormTraderCategories: TraderCategoryWithShares[];
  harvestFormCustomerCategories: CustomerCategory[];
  classificationDrafts: HarvestFormClassificationDraft[];
  existingHarvestClassifications: ClassificationRecord[];
  pendingExistingClassificationEdits: Record<number, string>;
  onAddClassificationDraft: () => void;
  onRemoveClassificationDraft: (draftId: string) => void;
  onUpdateClassificationDraft: (draftId: string, updater: Partial<HarvestFormClassificationDraft>) => void;
  onUpdateClassificationDraftQuantity: (draftId: string, pitamKey: PitamRowKey, gradeKey: string, value: string) => void;
  onStageExistingClassificationQuantity: (classificationId: number, value: string | null) => void;
  removedClassificationGroups: { ids: number[]; label: string }[];
  onRestoreClassificationGroup: (ids: number[]) => void;
};

export function HarvestEditModal({
  isOpen,
  t,
  fields,
  dateGregorian,
  dateHebrew,
  activeSeasonYearName,
  fieldId,
  totalHarvested,
  totalRejected,
  ownerHarvested,
  ownerRejected,
  notes,
  isPartialClassification,
  onIsPartialClassificationChange,
  uncalculatedRejected,
  onUncalculatedRejectedChange,
  remainsInItalyGradeH,
  onRemainsInItalyGradeHChange,
  remainsInItalyGradeV,
  onRemainsInItalyGradeVChange,
  isSubmitting,
  error,
  onDateGregorianChange,
  onFieldIdChange,
  onTotalHarvestedChange,
  onTotalRejectedChange,
  onOwnerHarvestedChange,
  onOwnerRejectedChange,
  onNotesChange,
  onClose,
  onSubmit,
  traders,
  customers,
  harvestFormTraderCategories,
  harvestFormCustomerCategories,
  classificationDrafts,
  existingHarvestClassifications,
  pendingExistingClassificationEdits,
  onAddClassificationDraft,
  onRemoveClassificationDraft,
  onUpdateClassificationDraft,
  onUpdateClassificationDraftQuantity,
  onStageExistingClassificationQuantity,
  removedClassificationGroups,
  onRestoreClassificationGroup,
}: HarvestEditModalProps): JSX.Element | null {
  if (!isOpen) return null;

  const ed = t.pageControls.editHarvestDialog;
  const bf = t.bulkForm;

  const formatRejectionRate = (rejected: number, harvested: number) => {
    if (!Number.isFinite(harvested) || harvested <= 0 || !Number.isFinite(rejected)) {
      return '';
    }

    return `${((rejected / harvested) * 100).toFixed(2)}%`;
  };

  const totalRejectionRate = formatRejectionRate(totalRejected, totalHarvested);
  const ownerRejectionRate = formatRejectionRate(ownerRejected, ownerHarvested);

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
          <label className={styles.selectionField}>
            <span>{ed.fieldLabel}</span>
            <select
              className="seasons-manager__year-input"
              value={fieldId}
              onChange={(e) => onFieldIdChange(Number(e.target.value))}
              aria-label={ed.fieldLabel}
            >
              <option value={0} disabled>{ed.fieldPlaceholder}</option>
              {fields.map((field) => (
                <option key={field.id} value={field.id}>{field.name}</option>
              ))}
            </select>
          </label>

          <label className={styles.summaryField}>
            <span>{bf.gregorianDateLabel}</span>
            <input
              className="seasons-manager__year-input"
              type="date"
              value={dateGregorian}
              min={activeSeasonYearName !== null ? `${activeSeasonYearName}-01-01` : undefined}
              max={activeSeasonYearName !== null ? `${activeSeasonYearName}-12-31` : undefined}
              onChange={(e) => onDateGregorianChange(e.target.value)}
              aria-label={bf.gregorianDateLabel}
            />
          </label>

          <label className={styles.summaryField}>
            <span>{bf.hebrewDateLabel}</span>
            <input
              className="seasons-manager__year-input"
              type="text"
              value={dateHebrew}
              disabled
              aria-label={bf.hebrewDateLabel}
            />
          </label>

          <label className={`${styles.summaryField} ${styles.numberInputFirst}`}>
            <span>{ed.totalHarvestedLabel}</span>
            <input
              className="seasons-manager__year-input harvest-bulk-form-number-input"
              type="number"
              min={0}
              value={totalHarvested}
              onChange={(e) => onTotalHarvestedChange(Number(e.target.value))}
              aria-label={ed.totalHarvestedLabel}
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
              aria-label={ed.totalRejectedLabel}
            />
          </label>

          <label className={styles.summaryField}>
            <span>{bf.rejectionRateLabel}</span>
            <input
              className={`seasons-manager__year-input ${styles.readOnlyField}`}
              type="text"
              value={totalRejectionRate}
              disabled
              aria-label={bf.rejectionRateLabel}
            />
          </label>

          <label className={styles.summaryField}>
            <span>{bf.uncalculatedRejectedLabel}</span>
            <input
              className="seasons-manager__year-input harvest-bulk-form-number-input"
              type="number"
              min={0}
              max={totalRejected}
              value={uncalculatedRejected}
              onChange={(e) => onUncalculatedRejectedChange(Number(e.target.value))}
              aria-label={bf.uncalculatedRejectedLabel}
            />
            <p className={styles.quantityMatrixHint}>{ed.uncalculatedRejectedPlaceholder(totalRejected)}</p>
          </label>

          <label className={`${styles.summaryField} ${styles.numberInputFirst}`}>
            <span>{ed.ownerHarvestedLabel}</span>
            <input
              className="seasons-manager__year-input harvest-bulk-form-number-input"
              type="number"
              min={0}
              value={ownerHarvested}
              onChange={(e) => onOwnerHarvestedChange(Number(e.target.value))}
              aria-label={ed.ownerHarvestedLabel}
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
              aria-label={ed.ownerRejectedLabel}
            />
          </label>

          <label className={styles.summaryField}>
            <span>{bf.ownerRejectionRateLabel}</span>
            <input
              className={`seasons-manager__year-input ${styles.readOnlyField}`}
              type="text"
              value={ownerRejectionRate}
              disabled
              aria-label={bf.ownerRejectionRateLabel}
            />
          </label>

          <label className={`${styles.badPickField} ${styles.numberInputFirst}`}>
            <input
              type="checkbox"
              checked={remainsInItalyGradeH}
              onChange={(e) => onRemainsInItalyGradeHChange(e.target.checked)}
            />
            <span>{bf.remainsInItalyGradeHLabel}</span>
          </label>

          <label className={styles.badPickField}>
            <input
              type="checkbox"
              checked={remainsInItalyGradeV}
              onChange={(e) => onRemainsInItalyGradeVChange(e.target.checked)}
            />
            <span>{bf.remainsInItalyGradeVLabel}</span>
          </label>

          <fieldset className={styles.classificationMode} aria-label={bf.classificationModeLabel}>
            <legend>{bf.classificationModeLabel}</legend>
            <p className={styles.classificationModeHint}>{bf.classificationModeHint}</p>
            <label>
              <input
                type="radio"
                name="edit-harvest-classification-mode"
                checked={!isPartialClassification}
                onChange={() => onIsPartialClassificationChange(false)}
              />
              <span>{bf.fullSorting}</span>
            </label>
            <label>
              <input
                type="radio"
                name="edit-harvest-classification-mode"
                checked={isPartialClassification}
                onChange={() => onIsPartialClassificationChange(true)}
              />
              <span>{bf.partialSorting}</span>
            </label>
          </fieldset>

          <label className={`${styles.summaryField} ${styles.notesWithMode}`}>
            <span>{ed.notesLabel}</span>
            <textarea
              className={`seasons-manager__year-input ${styles.notesTextarea}`}
              rows={1}
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              aria-label={ed.notesLabel}
            />
          </label>
        </div>

        <HarvestClassificationRowsSection
          isOpen={isOpen}
          form={bf}
          formSubmissionText={t.formSubmission}
          traders={traders}
          customers={customers}
          totalHarvested={String(totalHarvested)}
          totalRejected={String(totalRejected)}
          isPartialClassification={isPartialClassification}
          harvestFormClassifications={classificationDrafts}
          harvestFormTraderCategories={harvestFormTraderCategories}
          harvestFormCustomerCategories={harvestFormCustomerCategories}
          existingHarvestClassifications={existingHarvestClassifications}
          pendingExistingClassificationEdits={pendingExistingClassificationEdits}
          allowSubtractExistingQuantity
          onAddClassificationDraft={onAddClassificationDraft}
          onRemoveClassificationDraft={onRemoveClassificationDraft}
          onUpdateClassificationDraft={onUpdateClassificationDraft}
          onUpdateClassificationDraftQuantity={onUpdateClassificationDraftQuantity}
          onStageExistingClassificationQuantity={onStageExistingClassificationQuantity}
        />

        {removedClassificationGroups.length ? (
          <div className={styles.classifications}>
            <div className={styles.classificationsHeader}>
              <h4>{bf.pendingRemovedSortingRowsTitle}</h4>
            </div>
            <p className={styles.quantityMatrixHint}>{bf.pendingRemovedSortingRowsHint}</p>
            {removedClassificationGroups.map((group) => (
              <div key={group.ids.join('-')} className={styles.classificationRow}>
                <div className={styles.classificationRowHead}>
                  <span>{group.label}</span>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => onRestoreClassificationGroup(group.ids)}
                  >
                    {bf.restorePendingRemovedSortingRow}
                  </button>
                </div>
              </div>
            ))}
          </div>
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
            disabled={fieldId === 0}
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
