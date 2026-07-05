import { useEffect, useMemo, useState } from 'react';
import type { Trader } from '../../../../services/tradersApi';
import type { Customer } from '../../../../services/customersApi';
import type { CustomerCategory } from '../../../../services/customerCategoriesApi';
import type { ClassificationRecord } from '../../../../services/classificationsApi';
import type { TraderCategoryWithShares } from '../../../../services/traderCategoriesApi';
import type { HarvestFormClassificationDraft } from '../../harvestPage.types';
import type { HarvestI18n } from '../../i18n';
import {
  areHarvestSortingTotalsFilled,
  buildClassificationComboKey,
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
  existingHarvestClassifications?: ClassificationRecord[];
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
  existingHarvestClassifications = [],
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

  // Cell-level quantities (combo + pitam status + grade) for classifications already saved on this harvest.
  // Existing records only block the exact matrix cell they occupy, not the whole category, since the
  // same category can still be sorted again under a different grade/pitam status.
  const existingCellQuantities = useMemo(() => {
    const quantities = new Map<string, number>();
    for (const record of existingHarvestClassifications) {
      const comboKey = buildClassificationComboKey({
        assignmentType: record.assignmentType,
        traderName: record.trader?.name,
        customerName: record.customer?.customerName,
        categoryName: record.traderCategory?.name ?? record.customerCategory?.name,
      });
      if (!comboKey || !record.pitamStatus) {
        continue;
      }
      const gradeKey = record.grade ?? SINGLE_GRADE_COLUMN_KEY;
      quantities.set(`${comboKey}:${record.pitamStatus}:${gradeKey}`, record.quantity);
    }
    return quantities;
  }, [existingHarvestClassifications]);

  const getDraftComboKey = (draft: HarvestFormClassificationDraft): string | null => {
    const traderName = traders.find((trader) => String(trader.id) === draft.traderId)?.name ?? null;
    const customerName = customers.find((customer) => String(customer.id) === draft.customerId)?.customerName ?? null;
    const categoryName =
      harvestFormTraderCategories.find((category) => String(category.id) === draft.traderCategoryId)?.name
      ?? harvestFormCustomerCategories.find((category) => String(category.id) === draft.customerCategoryId)?.name
      ?? null;

    return buildClassificationComboKey({
      assignmentType: draft.assignmentType,
      traderName,
      customerName,
      categoryName,
    });
  };

  // Sibling drafts within this form fully block a repeated assignment+category: a second row for the
  // same category is redundant since one row's matrix already covers every grade/pitam combination.
  const getUsedComboKeysExcludingDraftId = (excludeDraftId: string | null): Set<string> => {
    const keys = new Set<string>();
    for (const otherDraft of harvestFormClassifications) {
      if (otherDraft.id === excludeDraftId) {
        continue;
      }
      const key = getDraftComboKey(otherDraft);
      if (key) {
        keys.add(key);
      }
    }
    return keys;
  };

  const isDraftComboDuplicate = (draft: HarvestFormClassificationDraft): boolean => {
    const key = getDraftComboKey(draft);
    if (!key) {
      return false;
    }
    return getUsedComboKeysExcludingDraftId(draft.id).has(key);
  };

  const getDraftCellExistingQuantity = (draft: HarvestFormClassificationDraft, pitamKey: PitamRowKey, gradeKey: string): number | undefined => {
    const comboKey = getDraftComboKey(draft);
    if (!comboKey) {
      return undefined;
    }
    return existingCellQuantities.get(`${comboKey}:${pitamKey}:${gradeKey}`);
  };

  const isDraftCellAlreadyExisting = (draft: HarvestFormClassificationDraft, pitamKey: PitamRowKey, gradeKey: string): boolean => {
    return getDraftCellExistingQuantity(draft, pitamKey, gradeKey) !== undefined;
  };

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
    && (lastSortingRowDraft ? !isDraftComboDuplicate(lastSortingRowDraft) : true)
    && !reachedSortingQuantityLimit;

  const addSortingBlockReason = !areTotalsFilled
    ? 'totals-missing'
    : reachedSortingQuantityLimit
    ? 'max-reached'
    : lastSortingRowDraft && !isHarvestClassificationDraftComplete(lastSortingRowDraft)
      ? 'incomplete'
      : null;

  const getAddSortingBlockMessage = (reason: 'totals-missing' | 'incomplete' | 'duplicate' | 'max-reached' | null) => {
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

    if (reason === 'duplicate') {
      return form.duplicateSortingRowError;
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
        const isDuplicateCombo = isDraftComboDuplicate(draft);
        const rowAddSortingBlockReason = !areTotalsFilled
          ? 'totals-missing'
          : !canAddNextSortingRow
          ? 'incomplete'
          : isDuplicateCombo
            ? 'duplicate'
            : reachedSortingQuantityLimit
              ? 'max-reached'
              : null;

        const usedComboKeysForDraft = getUsedComboKeysExcludingDraftId(draft.id);
        const traderNameForDraft = traders.find((trader) => String(trader.id) === draft.traderId)?.name ?? null;
        const customerNameForDraft =
          customers.find((customer) => String(customer.id) === draft.customerId)?.customerName ?? null;

        const selectableTraderCategories = harvestFormTraderCategories.filter((category) => {
          if (String(category.id) === draft.traderCategoryId) {
            return true;
          }
          const key = buildClassificationComboKey({
            assignmentType: draft.assignmentType,
            traderName: traderNameForDraft,
            categoryName: category.name,
          });
          return !key || !usedComboKeysForDraft.has(key);
        });

        const selectableCustomerCategories = availableCustomerCategories.filter((category) => {
          if (String(category.id) === draft.customerCategoryId) {
            return true;
          }
          const key = buildClassificationComboKey({
            assignmentType: 'CUSTOMER',
            customerName: customerNameForDraft,
            categoryName: category.name,
          });
          return !key || !usedComboKeysForDraft.has(key);
        });

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
                    {selectableTraderCategories.map((category) => (
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
                      {selectableCustomerCategories.map((category) => (
                        <option key={`harvest-form-customer-category-${category.id}`} value={String(category.id)}>
                          {`${category.name} (${category.grade})`}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              ) : null}
            </div>

            {isDuplicateCombo ? (
              <p className={`seasons-manager__error ${styles.classificationAddError}`}>
                {form.duplicateSortingRowError}
              </p>
            ) : null}

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
                      {displayGradeColumns.map((gradeKey) => {
                        const existingQuantity = getDraftCellExistingQuantity(draft, pitamKey, gradeKey);
                        const isCellAlreadyExisting = existingQuantity !== undefined;
                        return (
                          <td key={`harvest-form-quantity-cell-${draft.id}-${pitamKey}-${gradeKey}`}>
                            <input
                              className="seasons-manager__year-input"
                              type="number"
                              min="0"
                              disabled={!enabledGradeColumns.includes(gradeKey) || isCellAlreadyExisting}
                              value={isCellAlreadyExisting ? existingQuantity : draft.quantities[pitamKey][gradeKey] ?? ''}
                              readOnly={isCellAlreadyExisting}
                              onChange={(event) =>
                                onUpdateClassificationDraftQuantity(draft.id, pitamKey, gradeKey, event.target.value)
                              }
                              placeholder={form.quantityPlaceholder}
                              title={isCellAlreadyExisting ? form.existingClassificationCellBlockedHint : undefined}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {enabledGradeColumns.length === 0 ? (
              <p className={styles.quantityMatrixHint}>{form.selectCategoryForQuantitiesHint}</p>
            ) : displayGradeColumns.some((gradeKey) => !enabledGradeColumns.includes(gradeKey))
              || enabledGradeColumns.some((gradeKey) =>
                PITAM_ROW_KEYS.some((pitamKey) => isDraftCellAlreadyExisting(draft, pitamKey, gradeKey)),
              ) ? (
              <p className={styles.quantityMatrixHint}>{form.blockedQuantityFieldsHint}</p>
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

            {isLastSortingRow && didTryAddSortingRow && rowAddSortingBlockReason && rowAddSortingBlockReason !== 'duplicate' ? (
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
