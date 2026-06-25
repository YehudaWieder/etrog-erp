import { useEffect, useState } from 'react';
import type { Field } from '../../../../services/fieldsApi';
import type { Trader } from '../../../../services/tradersApi';
import type { Customer } from '../../../../services/customersApi';
import type { CustomerCategory } from '../../../../services/customerCategoriesApi';
import type { TraderCategoryWithShares } from '../../../../services/traderCategoriesApi';
import type { HarvestFormClassificationDraft } from '../../harvestPage.types';
import type { HarvestI18n } from '../../i18n';
import {
  areHarvestSortingTotalsFilled,
  getHarvestSortingQuantityState,
  isHarvestClassificationDraftComplete,
} from '../../utils/harvestFormSubmission.util';
import { HARVEST_GRADE_OPTIONS } from '../../utils/harvestPage.utils';
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
};

export function HarvestBulkFormModal({
  isOpen,
  lang,
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
}: HarvestBulkFormModalProps) {
  const [didTryAddSortingRow, setDidTryAddSortingRow] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDidTryAddSortingRow(false);
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const form = t.bulkForm;
  const lastSortingRowDraft = harvestFormClassifications[harvestFormClassifications.length - 1] ?? null;
  const areTotalsFilled = areHarvestSortingTotalsFilled({
    totalHarvested: harvestFormTotalHarvested,
    totalRejected: harvestFormTotalRejected,
  });
  const { reachedSortingQuantityLimit } = getHarvestSortingQuantityState({
    classifications: harvestFormClassifications,
    totalHarvested: harvestFormTotalHarvested,
    totalRejected: harvestFormTotalRejected,
    isPartialClassification: harvestFormIsPartialClassification,
  });
  const canAddSortingRow =
    areTotalsFilled
    && (lastSortingRowDraft ? isHarvestClassificationDraftComplete(lastSortingRowDraft) : true)
    && !reachedSortingQuantityLimit;

  const addSortingBlockReason = !areTotalsFilled
    ? 'totals-missing'
    : reachedSortingQuantityLimit
    ? 'max-reached'
    : lastSortingRowDraft && !isHarvestClassificationDraftComplete(lastSortingRowDraft)
      ? 'incomplete'
      : null;

  const getAddSortingBlockMessage = (reason: 'totals-missing' | 'incomplete' | 'max-reached' | null) => {
    if (reason === 'totals-missing') {
      return (
        form.addSortingRowSummaryFieldsRequiredError
        || t.formSubmission.addSortingRowTotalsRequiredError
        || form.addSortingRowBlockedError
      );
    }

    if (reason === 'incomplete') {
      return form.addSortingRowBlockedError;
    }

    if (reason === 'max-reached') {
      return form.addSortingRowMaxReachedError || form.addSortingRowBlockedError;
    }

    return form.addSortingRowBlockedError;
  };

  const handleAddSortingRowClick = () => {
    if (!canAddSortingRow) {
      setDidTryAddSortingRow(true);
      return;
    }

    setDidTryAddSortingRow(false);
    onAddClassificationDraft();
  };

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

        <div className={styles.classifications}>
          <div className={styles.classificationsHeader}>
            <h4>{form.sortingRowsTitle}</h4>
            {!harvestFormClassifications.length ? (
              <button type="button" className="btn btn-primary" onClick={handleAddSortingRowClick}>
                {form.addSortingRow}
              </button>
            ) : null}
          </div>

          {harvestFormClassifications.map((draft, index) => {
            const availableCustomerCategories = harvestFormCustomerCategories.filter(
              (category) => String(category.customerId) === draft.customerId,
            );
            const isLastSortingRow = index === harvestFormClassifications.length - 1;
            const canAddNextSortingRow = isHarvestClassificationDraftComplete(draft);
            const rowAddSortingBlockReason = !areTotalsFilled
              ? 'totals-missing'
              : !canAddNextSortingRow
              ? 'incomplete'
              : reachedSortingQuantityLimit
                ? 'max-reached'
                : null;

            return (
              <div key={draft.id} className={styles.classificationRow}>
                <div className={styles.classificationRowHead}>
                  <strong>{form.sortingRowPrefix(index)}</strong>
                </div>

                <div className={`management-form-grid ${styles.grid} ${styles.classificationGrid}`}>
                  <label className={styles.summaryField}>
                    <span>{form.assignmentTypeLabel}</span>
                    <select
                      className="seasons-manager__year-input"
                      value={draft.assignmentType}
                      onChange={(event) =>
                        onUpdateClassificationDraft(draft.id, {
                          assignmentType: event.target.value as HarvestFormClassificationDraft['assignmentType'],
                        })
                      }
                    >
                      <option value="GENERAL">{form.assignmentOptions.general}</option>
                      <option value="TRADER">{form.assignmentOptions.trader}</option>
                      <option value="CUSTOMER">{form.assignmentOptions.customer}</option>
                    </select>
                  </label>

                  {draft.assignmentType === 'TRADER' ? (
                    <label className={styles.summaryField}>
                      <span>{form.traderLabel}</span>
                      <select
                        className="seasons-manager__year-input"
                        value={draft.traderId}
                        onChange={(event) => onUpdateClassificationDraft(draft.id, { traderId: event.target.value })}
                      >
                        <option value="">{form.traderPlaceholder}</option>
                        {[...traders]
                          .sort((left, right) => left.name.localeCompare(right.name))
                          .map((trader) => (
                          <option key={`harvest-form-trader-${trader.id}`} value={String(trader.id)}>
                            {trader.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}

                  {draft.assignmentType === 'GENERAL' || draft.assignmentType === 'TRADER' ? (
                    <label className={styles.summaryField}>
                      <span>{form.traderCategoryLabel}</span>
                      <select
                        className="seasons-manager__year-input"
                        value={draft.traderCategoryId}
                        onChange={(event) => onUpdateClassificationDraft(draft.id, { traderCategoryId: event.target.value })}
                      >
                        <option value="">{form.traderCategoryPlaceholder}</option>
                        {harvestFormTraderCategories.map((category) => (
                          <option key={`harvest-form-trader-category-${category.id}`} value={String(category.id)}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}

                  {draft.assignmentType === 'CUSTOMER' ? (
                    <>
                      <label className={styles.summaryField}>
                        <span>{form.customerLabel}</span>
                        <select
                          className="seasons-manager__year-input"
                          value={draft.customerId}
                          onChange={(event) => onUpdateClassificationDraft(draft.id, { customerId: event.target.value })}
                        >
                          <option value="">{form.customerPlaceholder}</option>
                          {customers.map((customer) => (
                            <option key={`harvest-form-customer-${customer.id}`} value={String(customer.id)}>
                              {customer.customerName}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className={styles.summaryField}>
                        <span>{form.customerCategoryLabel}</span>
                        <select
                          className="seasons-manager__year-input"
                          value={draft.customerCategoryId}
                          onChange={(event) => onUpdateClassificationDraft(draft.id, { customerCategoryId: event.target.value })}
                          disabled={!draft.customerId}
                        >
                          <option value="">{form.customerCategoryPlaceholder}</option>
                          {availableCustomerCategories.map((category) => (
                            <option key={`harvest-form-customer-category-${category.id}`} value={String(category.id)}>
                              {`${category.name} (${category.grade})`}
                            </option>
                          ))}
                        </select>
                      </label>
                    </>
                  ) : (
                    <label className={styles.summaryField}>
                      <span>{form.gradeLabel}</span>
                      <select
                        className="seasons-manager__year-input"
                        value={draft.grade}
                        onChange={(event) => onUpdateClassificationDraft(draft.id, { grade: event.target.value })}
                      >
                        <option value="">{form.gradePlaceholder}</option>
                        {HARVEST_GRADE_OPTIONS.map((grade) => (
                          <option key={`harvest-form-grade-${grade}`} value={grade}>
                            {grade}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  <label className={styles.summaryField}>
                    <span>{form.pitamStatusLabel}</span>
                    <select
                      className="seasons-manager__year-input"
                      value={draft.pitamStatus}
                      onChange={(event) =>
                        onUpdateClassificationDraft(draft.id, {
                          pitamStatus: event.target.value as HarvestFormClassificationDraft['pitamStatus'],
                        })
                      }
                    >
                      <option value="WITH_PITAM">{form.pitamOptions.withPitam}</option>
                      <option value="WITHOUT_PITAM">{form.pitamOptions.withoutPitam}</option>
                      <option value="MIXED">{form.pitamOptions.mixed}</option>
                    </select>
                  </label>

                  <label className={styles.summaryField}>
                    <span>{form.quantityLabel}</span>
                    <input
                      className="seasons-manager__year-input"
                      type="number"
                      min="1"
                      value={draft.quantity}
                      onChange={(event) => onUpdateClassificationDraft(draft.id, { quantity: event.target.value })}
                      placeholder={form.quantityPlaceholder}
                    />
                  </label>

                  <label className={`${styles.summaryField} ${styles.classificationNotes}`}>
                    <span>{form.sortingNotesLabel}</span>
                    <input
                      className="seasons-manager__year-input"
                      type="text"
                      value={draft.notes}
                      onChange={(event) => onUpdateClassificationDraft(draft.id, { notes: event.target.value })}
                      placeholder={form.sortingNotesPlaceholder}
                    />
                  </label>

                  <div className={styles.classificationActions}>
                    {isLastSortingRow ? (
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleAddSortingRowClick}
                      >
                        {form.addSortingRow}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => onRemoveClassificationDraft(draft.id)}
                      disabled={harvestFormClassifications.length <= 1}
                    >
                      {form.removeSortingRow}
                    </button>
                  </div>
                </div>

                {isLastSortingRow && didTryAddSortingRow && rowAddSortingBlockReason ? (
                  <p className={`seasons-manager__error ${styles.classificationAddError}`}>
                    {getAddSortingBlockMessage(rowAddSortingBlockReason)}
                  </p>
                ) : null}
              </div>
            );
          })}

          {!harvestFormClassifications.length && didTryAddSortingRow && addSortingBlockReason ? (
            <p className={`seasons-manager__error ${styles.classificationAddError}`}>
              {getAddSortingBlockMessage(addSortingBlockReason)}
            </p>
          ) : null}
        </div>

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



