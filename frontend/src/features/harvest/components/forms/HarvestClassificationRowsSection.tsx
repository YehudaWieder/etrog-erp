import { useEffect, useState } from 'react';
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
import {
  getDisplayGradeColumns,
  getEnabledGradeColumns,
  PITAM_ROW_KEYS,
  SINGLE_GRADE_COLUMN_KEY,
  type PitamRowKey,
} from '../../utils/harvestClassificationMatrix.util';
import styles from './styles/HarvestBulkFormModal.module.css';

type HarvestClassificationRowsSectionProps = {
  isOpen: boolean;
  form: HarvestI18n['bulkForm'];
  formSubmissionText: HarvestI18n['formSubmission'];
  traders: Trader[];
  customers: Customer[];
  totalHarvested: string;
  totalRejected: string;
  isPartialClassification: boolean;
  harvestFormClassifications: HarvestFormClassificationDraft[];
  harvestFormTraderCategories: TraderCategoryWithShares[];
  harvestFormCustomerCategories: CustomerCategory[];
  onAddClassificationDraft: () => void;
  onRemoveClassificationDraft: (draftId: string) => void;
  onUpdateClassificationDraft: (draftId: string, updater: Partial<HarvestFormClassificationDraft>) => void;
  onUpdateClassificationDraftQuantity: (draftId: string, pitamKey: PitamRowKey, gradeKey: string, value: string) => void;
};

export function HarvestClassificationRowsSection({
  isOpen,
  form,
  formSubmissionText,
  traders,
  customers,
  totalHarvested,
  totalRejected,
  isPartialClassification,
  harvestFormClassifications,
  harvestFormTraderCategories,
  harvestFormCustomerCategories,
  onAddClassificationDraft,
  onRemoveClassificationDraft,
  onUpdateClassificationDraft,
  onUpdateClassificationDraftQuantity,
}: HarvestClassificationRowsSectionProps) {
  const [didTryAddSortingRow, setDidTryAddSortingRow] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDidTryAddSortingRow(false);
    }
  }, [isOpen]);

  const lastSortingRowDraft = harvestFormClassifications[harvestFormClassifications.length - 1] ?? null;
  const areTotalsFilled = areHarvestSortingTotalsFilled({ totalHarvested, totalRejected });
  const { reachedSortingQuantityLimit } = getHarvestSortingQuantityState({
    classifications: harvestFormClassifications,
    totalHarvested,
    totalRejected,
    isPartialClassification,
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
        || formSubmissionText.addSortingRowTotalsRequiredError
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
        const selectedTraderCategory = harvestFormTraderCategories.find(
          (category) => String(category.id) === draft.traderCategoryId,
        );
        const displayGradeColumns = getDisplayGradeColumns(draft.assignmentType);
        const enabledGradeColumns = getEnabledGradeColumns(
          draft.assignmentType,
          selectedTraderCategory,
          Boolean(draft.customerCategoryId),
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
              ) : null}
            </div>

            <div className={styles.quantityMatrix}>
              <table className={styles.quantityMatrixTable}>
                <thead>
                  <tr>
                    <th>{form.pitamStatusLabel}</th>
                    {displayGradeColumns.map((gradeKey) => (
                      <th key={`harvest-form-grade-col-${draft.id}-${gradeKey}`}>
                        {gradeKey === SINGLE_GRADE_COLUMN_KEY ? form.quantityLabel : gradeKey}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PITAM_ROW_KEYS.map((pitamKey) => (
                    <tr key={`harvest-form-pitam-row-${draft.id}-${pitamKey}`}>
                      <th>{form.pitamOptions[pitamKey === 'WITH_PITAM' ? 'withPitam' : pitamKey === 'WITHOUT_PITAM' ? 'withoutPitam' : 'mixed']}</th>
                      {displayGradeColumns.map((gradeKey) => (
                        <td key={`harvest-form-quantity-cell-${draft.id}-${pitamKey}-${gradeKey}`}>
                          <input
                            className="seasons-manager__year-input"
                            type="number"
                            min="0"
                            disabled={!enabledGradeColumns.includes(gradeKey)}
                            value={draft.quantities[pitamKey][gradeKey] ?? ''}
                            onChange={(event) =>
                              onUpdateClassificationDraftQuantity(draft.id, pitamKey, gradeKey, event.target.value)
                            }
                            placeholder={form.quantityPlaceholder}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {enabledGradeColumns.length === 0 ? (
              <p className={styles.quantityMatrixHint}>{form.selectCategoryForQuantitiesHint}</p>
            ) : null}

            <div className={`management-form-grid ${styles.grid} ${styles.classificationGrid}`}>
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
  );
}
