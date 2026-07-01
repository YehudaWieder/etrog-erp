import type { Field } from '../../../../services/fieldsApi';
import type { Trader } from '../../../../services/tradersApi';
import type { Customer } from '../../../../services/customersApi';
import type { CustomerCategory } from '../../../../services/customerCategoriesApi';
import type { TraderCategoryWithShares } from '../../../../services/traderCategoriesApi';
import type { HarvestFormClassificationDraft } from '../../harvestPage.types';
import type { HarvestI18n } from '../../i18n';
import { HarvestClassificationRowsSection } from './HarvestClassificationRowsSection';
import type { PitamRowKey } from '../../utils/harvestClassificationMatrix.util';
import styles from './styles/HarvestBulkFormModal.module.css';

type HarvestBulkFormModalProps = {
  isOpen: boolean;
  lang: 'he' | 'en';
  t: HarvestI18n;
  activeSeasonYearName: number | null;
  fields: Field[];
  traders: Trader[];
  customers: Customer[];
  isSubmittingHarvestForm: boolean;
  harvestFormError: string;
  harvestFormFieldId: string;
  harvestFormDateGregorian: string;
  harvestFormDateHebrew: string;
  harvestFormTotalHarvested: string;
  harvestFormTotalRejected: string;
  harvestFormOwnerHarvested: string;
  harvestFormOwnerRejected: string;
  harvestFormIsPartialClassification: boolean;
  harvestFormNotes: string;
  harvestFormClassifications: HarvestFormClassificationDraft[];
  harvestFormTraderCategories: TraderCategoryWithShares[];
  harvestFormCustomerCategories: CustomerCategory[];
  onClose: () => void;
  onSubmit: () => void;
  onFieldIdChange: (value: string) => void;
  onGregorianDateChange: (value: string) => void;
  onHebrewDateChange: (value: string) => void;
  onTotalHarvestedChange: (value: string) => void;
  onTotalRejectedChange: (value: string) => void;
  onOwnerHarvestedChange: (value: string) => void;
  onOwnerRejectedChange: (value: string) => void;
  onPartialClassificationChange: (value: boolean) => void;
  onNotesChange: (nextNotes: string, textareaElement: HTMLTextAreaElement) => void;
  onAddClassificationDraft: () => void;
  onRemoveClassificationDraft: (draftId: string) => void;
  onUpdateClassificationDraft: (draftId: string, updater: Partial<HarvestFormClassificationDraft>) => void;
  onUpdateClassificationDraftQuantity: (draftId: string, pitamKey: PitamRowKey, gradeKey: string, value: string) => void;
};

export function HarvestBulkFormModal({
  isOpen,
  t,
  activeSeasonYearName,
  fields,
  traders,
  customers,
  isSubmittingHarvestForm,
  harvestFormError,
  harvestFormFieldId,
  harvestFormDateGregorian,
  harvestFormDateHebrew,
  harvestFormTotalHarvested,
  harvestFormTotalRejected,
  harvestFormOwnerHarvested,
  harvestFormOwnerRejected,
  harvestFormIsPartialClassification,
  harvestFormNotes,
  harvestFormClassifications,
  harvestFormTraderCategories,
  harvestFormCustomerCategories,
  onClose,
  onSubmit,
  onFieldIdChange,
  onGregorianDateChange,
  onHebrewDateChange,
  onTotalHarvestedChange,
  onTotalRejectedChange,
  onOwnerHarvestedChange,
  onOwnerRejectedChange,
  onPartialClassificationChange,
  onNotesChange,
  onAddClassificationDraft,
  onRemoveClassificationDraft,
  onUpdateClassificationDraft,
  onUpdateClassificationDraftQuantity,
}: HarvestBulkFormModalProps) {
  if (!isOpen) {
    return null;
  }

  const form = t.bulkForm;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal-dialog modal-dialog--form ${styles.modal}`}
        role="dialog"
        aria-modal="true"
        aria-label={form.ariaLabel}
        onClick={(event) => event.stopPropagation()}
      >
        <button className="modal-close" type="button" aria-label={form.closeLabel} onClick={onClose}>
          X
        </button>

        <h3 className="modal-title">{form.title}</h3>
        <p className="modal-message">{form.instructions}</p>

        <div className={`management-form-grid ${styles.grid} ${styles.gridPrimary}`}>
          <label className={styles.selectionField}>
            <span>{form.fieldLabel}</span>
            <select
              className="seasons-manager__year-input"
              value={harvestFormFieldId}
              onChange={(event) => onFieldIdChange(event.target.value)}
              aria-label={form.fieldLabel}
              autoFocus
            >
              <option value="">{form.fieldPlaceholder}</option>
              {fields.map((field) => (
                <option key={`harvest-form-field-${field.id}`} value={String(field.id)}>
                  {field.name}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.summaryField}>
            <span>{form.gregorianDateLabel}</span>
            <input
              className="seasons-manager__year-input"
              type="date"
              value={harvestFormDateGregorian}
              min={activeSeasonYearName !== null ? `${activeSeasonYearName}-01-01` : undefined}
              max={activeSeasonYearName !== null ? `${activeSeasonYearName}-12-31` : undefined}
              onChange={(event) => onGregorianDateChange(event.target.value)}
              aria-label={form.gregorianDateLabel}
            />
          </label>

          <label className={styles.summaryField}>
            <span>{form.hebrewDateLabel}</span>
            <input
              className="seasons-manager__year-input"
              type="text"
              value={harvestFormDateHebrew}
              onChange={(event) => onHebrewDateChange(event.target.value)}
              placeholder={form.hebrewDatePlaceholder}
              aria-label={form.hebrewDateLabel}
            />
          </label>

          <label className={`${styles.summaryField} ${styles.numberInputFirst}`}>
            <span>{form.totalHarvestedPlaceholder}</span>
            <input
              className="seasons-manager__year-input harvest-bulk-form-number-input"
              type="number"
              min="0"
              required
              value={harvestFormTotalHarvested}
              onChange={(event) => onTotalHarvestedChange(event.target.value)}
              placeholder={form.totalHarvestedPlaceholder}
              aria-label={form.totalHarvestedPlaceholder}
            />
          </label>

          <label className={styles.summaryField}>
            <span>{form.totalRejectedPlaceholder}</span>
            <input
              className="seasons-manager__year-input harvest-bulk-form-number-input"
              type="number"
              min="0"
              required
              value={harvestFormTotalRejected}
              onChange={(event) => onTotalRejectedChange(event.target.value)}
              placeholder={form.totalRejectedPlaceholder}
              aria-label={form.totalRejectedPlaceholder}
            />
          </label>

          <label className={styles.summaryField}>
            <span>{form.ownerHarvestedLabel}</span>
            <input
              className="seasons-manager__year-input harvest-bulk-form-number-input"
              type="number"
              min="0"
              value={harvestFormOwnerHarvested}
              onChange={(event) => onOwnerHarvestedChange(event.target.value)}
              placeholder={form.ownerHarvestedPlaceholder}
              aria-label={form.ownerHarvestedLabel}
            />
          </label>

          <label className={styles.summaryField}>
            <span>{form.ownerRejectedLabel}</span>
            <input
              className="seasons-manager__year-input harvest-bulk-form-number-input"
              type="number"
              min="0"
              value={harvestFormOwnerRejected}
              onChange={(event) => onOwnerRejectedChange(event.target.value)}
              placeholder={form.ownerRejectedPlaceholder}
              aria-label={form.ownerRejectedLabel}
            />
          </label>

          <fieldset className={styles.classificationMode} aria-label={form.classificationModeLabel}>
            <legend>{form.classificationModeLabel}</legend>
            <p className={styles.classificationModeHint}>{form.classificationModeHint}</p>
            <label>
              <input
                type="radio"
                name="harvest-classification-mode"
                checked={!harvestFormIsPartialClassification}
                onChange={() => onPartialClassificationChange(false)}
              />
              <span>{form.fullSorting}</span>
            </label>
            <label>
              <input
                type="radio"
                name="harvest-classification-mode"
                checked={harvestFormIsPartialClassification}
                onChange={() => onPartialClassificationChange(true)}
              />
              <span>{form.partialSorting}</span>
            </label>
          </fieldset>

          <label className={`${styles.summaryField} ${styles.notesWithMode}`}>
            <span>{form.notesLabel}</span>
            <textarea
              className={`seasons-manager__year-input ${styles.notesTextarea}`}
              rows={1}
              value={harvestFormNotes}
              onChange={(event) => onNotesChange(event.target.value, event.currentTarget)}
              placeholder={form.notesPlaceholder}
              aria-label={form.notesLabel}
            />
          </label>
        </div>

        <HarvestClassificationRowsSection
          isOpen={isOpen}
          form={form}
          formSubmissionText={t.formSubmission}
          traders={traders}
          customers={customers}
          totalHarvested={harvestFormTotalHarvested}
          totalRejected={harvestFormTotalRejected}
          isPartialClassification={harvestFormIsPartialClassification}
          harvestFormClassifications={harvestFormClassifications}
          harvestFormTraderCategories={harvestFormTraderCategories}
          harvestFormCustomerCategories={harvestFormCustomerCategories}
          onAddClassificationDraft={onAddClassificationDraft}
          onRemoveClassificationDraft={onRemoveClassificationDraft}
          onUpdateClassificationDraft={onUpdateClassificationDraft}
          onUpdateClassificationDraftQuantity={onUpdateClassificationDraftQuantity}
        />

        {harvestFormError ? <p className="seasons-manager__error">{harvestFormError}</p> : null}

        <div className="modal-actions">
          <button className="btn btn-danger" onClick={onClose} type="button" disabled={isSubmittingHarvestForm}>
            {form.cancel}
          </button>
          <button className="btn btn-success" onClick={onSubmit} type="button" disabled={isSubmittingHarvestForm}>
            {isSubmittingHarvestForm ? form.saving : form.save}
          </button>
        </div>
      </div>
    </div>
  );
}
