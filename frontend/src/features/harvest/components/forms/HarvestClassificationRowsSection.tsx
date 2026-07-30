import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog';
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
  getMatrixTotalQuantity,
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
  pendingExistingClassificationEdits?: Record<number, string>;
  // Only enabled for the harvest edit dialog: lets the user choose to subtract from an existing cell's
  // quantity as well as add to it, instead of only being able to add (the Add-Harvest and Add-Sorting
  // forms keep the add-only popup).
  allowSubtractExistingQuantity?: boolean;
  isAddingRejectedQuantity?: boolean;
  additionalRejectedQuantity?: string;
  ownerRejected?: string;
  isAddingOwnerRejectedQuantity?: boolean;
  additionalOwnerRejectedQuantity?: string;
  onAddClassificationDraft: () => void;
  onRemoveClassificationDraft: (draftId: string) => void;
  onUpdateClassificationDraft: (draftId: string, updater: Partial<HarvestFormClassificationDraft>) => void;
  onUpdateClassificationDraftQuantity: (draftId: string, pitamKey: PitamRowKey, gradeKey: string, value: string) => void;
  onStageExistingClassificationQuantity?: (classificationId: number, value: string | null) => void;
  onOpenAddRejectedQuantity?: () => void;
  onAdditionalRejectedQuantityChange?: (value: string) => void;
  onRemoveAddedRejectedQuantity?: () => void;
  onOpenAddOwnerRejectedQuantity?: () => void;
  onAdditionalOwnerRejectedQuantityChange?: (value: string) => void;
  onRemoveAddedOwnerRejectedQuantity?: () => void;
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
  pendingExistingClassificationEdits = {},
  allowSubtractExistingQuantity = false,
  isAddingRejectedQuantity = false,
  additionalRejectedQuantity = '',
  ownerRejected = '',
  isAddingOwnerRejectedQuantity = false,
  additionalOwnerRejectedQuantity = '',
  onAddClassificationDraft,
  onRemoveClassificationDraft,
  onUpdateClassificationDraft,
  onUpdateClassificationDraftQuantity,
  onStageExistingClassificationQuantity,
  onOpenAddRejectedQuantity,
  onAdditionalRejectedQuantityChange,
  onRemoveAddedRejectedQuantity,
  onOpenAddOwnerRejectedQuantity,
  onAdditionalOwnerRejectedQuantityChange,
  onRemoveAddedOwnerRejectedQuantity,
}: HarvestClassificationRowsSectionProps) {
  const [didTryAddSortingRow, setDidTryAddSortingRow] = useState(false);
  const [addQuantityCell, setAddQuantityCell] = useState<{
    classificationId: number;
    baseQuantity: number;
    categoryName: string;
    gradeLabel: string;
    pitamLabel: string;
  } | null>(null);
  const [addQuantityValue, setAddQuantityValue] = useState('');
  const [addQuantityError, setAddQuantityError] = useState('');
  const [addQuantityMode, setAddQuantityMode] = useState<'add' | 'subtract'>('add');

  useEffect(() => {
    if (isOpen) {
      setDidTryAddSortingRow(false);
      setAddQuantityCell(null);
      setAddQuantityValue('');
      setAddQuantityError('');
      setAddQuantityMode('add');
    }
  }, [isOpen]);

  // Cell-level quantities (combo + pitam status + grade) for classifications already saved on this harvest.
  // Existing records only block the exact matrix cell they occupy, not the whole category, since the
  // same category can still be sorted again under a different grade/pitam status.
  const existingCellRecords = useMemo(() => {
    const records = new Map<string, { id: number; quantity: number }>();
    for (const record of existingHarvestClassifications) {
      const comboKey = buildClassificationComboKey({
        assignmentType: record.assignmentType,
        traderName: record.trader?.name,
        customerName: record.customer?.customerName,
        categoryName: record.traderCategory?.name ?? record.customerCategory?.name,
        categoryGrade: record.customerCategory?.grade,
      });
      if (!comboKey || !record.pitamStatus) {
        continue;
      }
      const gradeKey = record.grade ?? SINGLE_GRADE_COLUMN_KEY;
      records.set(`${comboKey}:${record.pitamStatus}:${gradeKey}`, { id: record.id, quantity: record.quantity });
    }
    return records;
  }, [existingHarvestClassifications]);

  // Grand total across everything the sorting form will end up saving: quantities already persisted on
  // existing classifications (respecting any pending inline edits) plus everything staged in draft rows.
  const totalSortingQuantity = useMemo(() => {
    const existingTotal = existingHarvestClassifications.reduce((sum, record) => {
      const pendingValue = pendingExistingClassificationEdits[record.id];
      const quantity = pendingValue !== undefined ? Number(pendingValue) : record.quantity;
      return sum + (Number.isFinite(quantity) ? quantity : 0);
    }, 0);
    const draftsTotal = harvestFormClassifications.reduce(
      (sum, draft) => sum + getMatrixTotalQuantity(draft.quantities),
      0,
    );
    return existingTotal + draftsTotal;
  }, [existingHarvestClassifications, pendingExistingClassificationEdits, harvestFormClassifications]);

  const getDraftComboKey = (draft: HarvestFormClassificationDraft): string | null => {
    const traderName = traders.find((trader) => String(trader.id) === draft.traderId)?.name ?? null;
    const customerName = customers.find((customer) => String(customer.id) === draft.customerId)?.customerName ?? null;
    const selectedCustomerCategory = harvestFormCustomerCategories.find(
      (category) => String(category.id) === draft.customerCategoryId,
    );
    const categoryName =
      harvestFormTraderCategories.find((category) => String(category.id) === draft.traderCategoryId)?.name
      ?? selectedCustomerCategory?.name
      ?? null;

    return buildClassificationComboKey({
      assignmentType: draft.assignmentType,
      traderName,
      customerName,
      categoryName,
      categoryGrade: selectedCustomerCategory?.grade,
    });
  };

  // Sibling drafts within this form fully block a repeated assignment+category: a second row for the
  // same category is redundant since one row's matrix already covers every grade/pitam combination.
  // Identity is keyed by category ID (not name): customer categories can share a display name while
  // representing distinct grades, and those must remain independently selectable.
  const getDraftIdentityKey = (draft: HarvestFormClassificationDraft): string | null => {
    if (draft.assignmentType === 'TRADER') {
      return draft.traderId && draft.traderCategoryId ? `TRADER:${draft.traderId}:${draft.traderCategoryId}` : null;
    }
    if (draft.assignmentType === 'CUSTOMER') {
      return draft.customerId && draft.customerCategoryId ? `CUSTOMER:${draft.customerId}:${draft.customerCategoryId}` : null;
    }
    return draft.traderCategoryId ? `GENERAL:${draft.traderCategoryId}` : null;
  };

  const getUsedIdentityKeysExcludingDraftId = (excludeDraftId: string | null): Set<string> => {
    const keys = new Set<string>();
    for (const otherDraft of harvestFormClassifications) {
      if (otherDraft.id === excludeDraftId) {
        continue;
      }
      const key = getDraftIdentityKey(otherDraft);
      if (key) {
        keys.add(key);
      }
    }
    return keys;
  };

  const isDraftComboDuplicate = (draft: HarvestFormClassificationDraft): boolean => {
    const key = getDraftIdentityKey(draft);
    if (!key) {
      return false;
    }
    return getUsedIdentityKeysExcludingDraftId(draft.id).has(key);
  };

  const getDraftCellExistingRecord = (
    draft: HarvestFormClassificationDraft,
    pitamKey: PitamRowKey,
    gradeKey: string,
  ): { id: number; quantity: number } | undefined => {
    const comboKey = getDraftComboKey(draft);
    if (!comboKey) {
      return undefined;
    }
    return existingCellRecords.get(`${comboKey}:${pitamKey}:${gradeKey}`);
  };

  const isDraftCellAlreadyExisting = (draft: HarvestFormClassificationDraft, pitamKey: PitamRowKey, gradeKey: string): boolean => {
    return getDraftCellExistingRecord(draft, pitamKey, gradeKey) !== undefined;
  };

  // A scaffold row auto-populated for an already-saved combo (see buildInitialClassificationDraftsFromExisting)
  // represents data that's already saved, so leaving it untouched should never block adding a new row —
  // the user may just want to add another sorting without editing any existing one.
  const isDraftEffectivelyComplete = (draft: HarvestFormClassificationDraft): boolean =>
    Boolean(draft.isExistingScaffold) || isHarvestClassificationDraftComplete(draft);

  const handleOpenAddQuantityPopup = (params: {
    classificationId: number;
    baseQuantity: number;
    categoryName: string;
    gradeLabel: string;
    pitamLabel: string;
  }) => {
    setAddQuantityCell(params);
    setAddQuantityValue('');
    setAddQuantityError('');
    setAddQuantityMode('add');
  };

  const handleCloseAddQuantityPopup = () => {
    setAddQuantityCell(null);
    setAddQuantityValue('');
    setAddQuantityError('');
    setAddQuantityMode('add');
  };

  const handleConfirmAddQuantity = () => {
    if (!addQuantityCell) {
      return;
    }
    const isSubtractMode = allowSubtractExistingQuantity && addQuantityMode === 'subtract';
    const parsedQuantity = Number(addQuantityValue);
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      setAddQuantityError(
        isSubtractMode
          ? form.subtractExistingClassificationQuantityInvalidError
          : form.addExistingClassificationQuantityInvalidError,
      );
      return;
    }
    if (isSubtractMode && parsedQuantity > addQuantityCell.baseQuantity) {
      setAddQuantityError(form.subtractExistingClassificationQuantityExceedsBaseError(addQuantityCell.baseQuantity));
      return;
    }
    const newTotal = isSubtractMode
      ? addQuantityCell.baseQuantity - parsedQuantity
      : addQuantityCell.baseQuantity + parsedQuantity;
    onStageExistingClassificationQuantity?.(addQuantityCell.classificationId, String(newTotal));
    handleCloseAddQuantityPopup();
  };

  const handleRevertCellEdit = (classificationId: number) => {
    onStageExistingClassificationQuantity?.(classificationId, null);
  };

  const parsedAdditionalRejectedQuantity = (() => {
    const parsed = Number(additionalRejectedQuantity);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  })();
  const parsedTotalRejected = Number(totalRejected);
  const baseTotalRejected = (Number.isFinite(parsedTotalRejected) ? parsedTotalRejected : 0) - parsedAdditionalRejectedQuantity;

  const parsedAdditionalOwnerRejectedQuantity = (() => {
    const parsed = Number(additionalOwnerRejectedQuantity);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  })();
  const parsedOwnerRejected = Number(ownerRejected);
  const baseOwnerRejected = (Number.isFinite(parsedOwnerRejected) ? parsedOwnerRejected : 0) - parsedAdditionalOwnerRejectedQuantity;

  const lastSortingRowDraft = harvestFormClassifications[harvestFormClassifications.length - 1] ?? null;
  const areTotalsFilled = areHarvestSortingTotalsFilled({ totalHarvested, totalRejected });
  const { reachedSortingQuantityLimit, maxSortingQuantity } = getHarvestSortingQuantityState({
    classifications: harvestFormClassifications,
    totalHarvested,
    totalRejected,
    isPartialClassification,
  });
  const canAddSortingRow =
    areTotalsFilled
    && (lastSortingRowDraft ? isDraftEffectivelyComplete(lastSortingRowDraft) : true)
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
          <div className={styles.classificationActions}>
            <button type="button" className="btn btn-primary" onClick={handleAddSortingRowClick}>
              {form.addSortingRow}
            </button>
          </div>
        ) : null}
      </div>

      {!harvestFormClassifications.length
        && ((!isAddingRejectedQuantity && onOpenAddRejectedQuantity) || (!isAddingOwnerRejectedQuantity && onOpenAddOwnerRejectedQuantity)) ? (
        <div className={styles.secondaryActions}>
          {!isAddingRejectedQuantity && onOpenAddRejectedQuantity ? (
            <button type="button" className="btn btn-primary" onClick={onOpenAddRejectedQuantity}>
              {form.addRejectedQuantity}
            </button>
          ) : null}
          {!isAddingOwnerRejectedQuantity && onOpenAddOwnerRejectedQuantity ? (
            <button type="button" className="btn btn-primary" onClick={onOpenAddOwnerRejectedQuantity}>
              {form.addOwnerRejectedQuantity}
            </button>
          ) : null}
        </div>
      ) : null}

      {harvestFormClassifications.map((draft, index) => {
        const availableCustomerCategories = harvestFormCustomerCategories.filter(
          (category) => String(category.customerId) === draft.customerId,
        );
        const selectedTraderCategory = harvestFormTraderCategories.find(
          (category) => String(category.id) === draft.traderCategoryId,
        );
        const selectedCustomerCategoryForRow = harvestFormCustomerCategories.find(
          (category) => String(category.id) === draft.customerCategoryId,
        );
        const draftCategoryName = selectedTraderCategory?.name ?? selectedCustomerCategoryForRow?.name ?? '';
        const displayGradeColumns = getDisplayGradeColumns(draft.assignmentType);
        const enabledGradeColumns = getEnabledGradeColumns(
          draft.assignmentType,
          selectedTraderCategory,
          Boolean(draft.customerCategoryId),
        );
        const isLastSortingRow = index === harvestFormClassifications.length - 1;
        const canAddNextSortingRow = isDraftEffectivelyComplete(draft);
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

        const usedIdentityKeysForDraft = getUsedIdentityKeysExcludingDraftId(draft.id);

        const selectableTraderCategories = harvestFormTraderCategories.filter((category) => {
          if (String(category.id) === draft.traderCategoryId) {
            return true;
          }
          const key =
            draft.assignmentType === 'TRADER'
              ? draft.traderId
                ? `TRADER:${draft.traderId}:${category.id}`
                : null
              : `GENERAL:${category.id}`;
          return !key || !usedIdentityKeysForDraft.has(key);
        });

        const selectableCustomerCategories = availableCustomerCategories.filter((category) => {
          if (String(category.id) === draft.customerCategoryId) {
            return true;
          }
          const key = draft.customerId ? `CUSTOMER:${draft.customerId}:${category.id}` : null;
          return !key || !usedIdentityKeysForDraft.has(key);
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
                        const existingRecord = getDraftCellExistingRecord(draft, pitamKey, gradeKey);
                        const isCellAlreadyExisting = existingRecord !== undefined;
                        const pendingValue = existingRecord ? pendingExistingClassificationEdits[existingRecord.id] : undefined;
                        const hasPendingAddition = pendingValue !== undefined;
                        return (
                          <td key={`harvest-form-quantity-cell-${draft.id}-${pitamKey}-${gradeKey}`}>
                            <div className={styles.existingCellWrapper}>
                              <input
                                className="seasons-manager__year-input"
                                type="number"
                                min="0"
                                disabled={!enabledGradeColumns.includes(gradeKey) || isCellAlreadyExisting}
                                value={
                                  isCellAlreadyExisting
                                    ? pendingValue ?? existingRecord.quantity
                                    : draft.quantities[pitamKey][gradeKey] ?? ''
                                }
                                readOnly={isCellAlreadyExisting}
                                onChange={(event) =>
                                  onUpdateClassificationDraftQuantity(draft.id, pitamKey, gradeKey, event.target.value)
                                }
                                placeholder={form.quantityPlaceholder}
                                title={isCellAlreadyExisting ? form.existingClassificationCellBlockedHint : undefined}
                              />
                              {isCellAlreadyExisting && !hasPendingAddition && onStageExistingClassificationQuantity ? (
                                <button
                                  type="button"
                                  className={styles.existingCellActionButton}
                                  onClick={() =>
                                    handleOpenAddQuantityPopup({
                                      classificationId: existingRecord.id,
                                      baseQuantity: existingRecord.quantity,
                                      categoryName: draftCategoryName,
                                      gradeLabel:
                                        gradeKey === SINGLE_GRADE_COLUMN_KEY
                                          ? selectedCustomerCategoryForRow?.grade ?? ''
                                          : gradeKey,
                                      pitamLabel:
                                        form.pitamOptions[
                                          pitamKey === 'WITH_PITAM' ? 'withPitam' : pitamKey === 'WITHOUT_PITAM' ? 'withoutPitam' : 'mixed'
                                        ],
                                    })
                                  }
                                  aria-label={allowSubtractExistingQuantity ? form.editExistingClassificationQuantityLabel : form.addExistingClassificationQuantityLabel}
                                  title={allowSubtractExistingQuantity ? form.editExistingClassificationQuantityLabel : form.addExistingClassificationQuantityLabel}
                                >
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round">
                                    <path d="M12 5v14M5 12h14" />
                                  </svg>
                                </button>
                              ) : null}
                              {isCellAlreadyExisting && hasPendingAddition ? (
                                <button
                                  type="button"
                                  className={styles.existingCellActionButton}
                                  onClick={() => handleRevertCellEdit(existingRecord.id)}
                                  aria-label={form.cancelExistingClassificationCellLabel}
                                  title={form.cancelExistingClassificationCellLabel}
                                >
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round">
                                    <path d="M6 6l12 12M18 6l-12 12" />
                                  </svg>
                                </button>
                              ) : null}
                            </div>
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

            {isLastSortingRow && ((!isAddingRejectedQuantity && onOpenAddRejectedQuantity) || (!isAddingOwnerRejectedQuantity && onOpenAddOwnerRejectedQuantity)) ? (
              <div className={styles.secondaryActions}>
                {!isAddingRejectedQuantity && onOpenAddRejectedQuantity ? (
                  <button type="button" className="btn btn-primary" onClick={onOpenAddRejectedQuantity}>
                    {form.addRejectedQuantity}
                  </button>
                ) : null}
                {!isAddingOwnerRejectedQuantity && onOpenAddOwnerRejectedQuantity ? (
                  <button type="button" className="btn btn-primary" onClick={onOpenAddOwnerRejectedQuantity}>
                    {form.addOwnerRejectedQuantity}
                  </button>
                ) : null}
              </div>
            ) : null}

            {isLastSortingRow && didTryAddSortingRow && rowAddSortingBlockReason && rowAddSortingBlockReason !== 'duplicate' ? (
              <p className={`seasons-manager__error ${styles.classificationAddError}`}>
                {getAddSortingBlockMessage(rowAddSortingBlockReason)}
              </p>
            ) : null}
          </div>
        );
      })}

      {isAddingRejectedQuantity ? (
        <div className={styles.classificationRow}>
          <div className={`management-form-grid ${styles.grid} ${styles.classificationGrid}`}>
            <label className={styles.summaryField}>
              <span>{form.additionalRejectedLabel}</span>
              <input
                className="seasons-manager__year-input harvest-bulk-form-number-input"
                type="number"
                min="0"
                value={additionalRejectedQuantity}
                onChange={(event) => onAdditionalRejectedQuantityChange?.(event.target.value)}
                placeholder={form.additionalRejectedPlaceholder}
                aria-label={form.additionalRejectedLabel}
              />
            </label>

            <div className={styles.classificationActions}>
              <button type="button" className="btn btn-danger" onClick={onRemoveAddedRejectedQuantity}>
                {form.removeAddedRejectedQuantity}
              </button>
            </div>
          </div>

          {parsedAdditionalRejectedQuantity > 0 ? (
            <p className={styles.quantityMatrixHint}>
              {form.additionalRejectedNewTotalLabel(baseTotalRejected + parsedAdditionalRejectedQuantity)}
            </p>
          ) : null}
        </div>
      ) : null}

      {isAddingOwnerRejectedQuantity ? (
        <div className={styles.classificationRow}>
          <div className={`management-form-grid ${styles.grid} ${styles.classificationGrid}`}>
            <label className={styles.summaryField}>
              <span>{form.additionalOwnerRejectedLabel}</span>
              <input
                className="seasons-manager__year-input harvest-bulk-form-number-input"
                type="number"
                min="0"
                value={additionalOwnerRejectedQuantity}
                onChange={(event) => onAdditionalOwnerRejectedQuantityChange?.(event.target.value)}
                placeholder={form.additionalOwnerRejectedPlaceholder}
                aria-label={form.additionalOwnerRejectedLabel}
              />
            </label>

            <div className={styles.classificationActions}>
              <button type="button" className="btn btn-danger" onClick={onRemoveAddedOwnerRejectedQuantity}>
                {form.removeAddedOwnerRejectedQuantity}
              </button>
            </div>
          </div>

          {parsedAdditionalOwnerRejectedQuantity > 0 ? (
            <p className={styles.quantityMatrixHint}>
              {form.additionalOwnerRejectedNewTotalLabel(baseOwnerRejected + parsedAdditionalOwnerRejectedQuantity)}
            </p>
          ) : null}
        </div>
      ) : null}

      {harvestFormClassifications.length || existingHarvestClassifications.length ? (
        <div className={styles.sortingTotalSummary}>
          <span>{form.sortingTotalQuantityLabel}</span>
          <span>{totalSortingQuantity}</span>
        </div>
      ) : null}

      {(harvestFormClassifications.length || existingHarvestClassifications.length) && maxSortingQuantity !== null ? (
        <p className={`${styles.fullSortingTargetHint} ${totalSortingQuantity === maxSortingQuantity ? '' : styles.fullSortingTargetHintOff}`}>
          {form.fullSortingRequiredHint(maxSortingQuantity)}
          {' '}
          {totalSortingQuantity > maxSortingQuantity
            ? form.fullSortingReduceHint(totalSortingQuantity - maxSortingQuantity)
            : totalSortingQuantity < maxSortingQuantity
              ? form.fullSortingIncreaseHint(maxSortingQuantity - totalSortingQuantity)
              : form.fullSortingMatchHint}
        </p>
      ) : null}

      {!harvestFormClassifications.length && didTryAddSortingRow && addSortingBlockReason ? (
        <p className={`seasons-manager__error ${styles.classificationAddError}`}>
          {getAddSortingBlockMessage(addSortingBlockReason)}
        </p>
      ) : null}

      {addQuantityCell
        ? createPortal(
            <ConfirmDialog
              open
              dialogClassName={`modal-dialog--form ${styles.addQuantityDialog}`}
              title={allowSubtractExistingQuantity ? form.editExistingClassificationQuantityPopupTitle : form.addExistingClassificationQuantityPopupTitle}
              message={
                <>
                  {form.addExistingClassificationQuantityPopupPrefix} <strong>{addQuantityCell.categoryName}</strong>
                  {addQuantityCell.gradeLabel ? (
                    <>
                      {' '}
                      {form.addExistingClassificationQuantityPopupGradeWord} <strong>{addQuantityCell.gradeLabel}</strong>
                    </>
                  ) : null}
                  {' '}
                  <strong>{addQuantityCell.pitamLabel}</strong>: <strong>{addQuantityCell.baseQuantity}</strong>.
                  <br />
                  {allowSubtractExistingQuantity
                    ? form.editExistingClassificationQuantityPopupInstruction
                    : form.addExistingClassificationQuantityPopupInstruction}
                </>
              }
              confirmLabel={
                allowSubtractExistingQuantity && addQuantityMode === 'subtract'
                  ? form.subtractExistingClassificationQuantityConfirmLabel
                  : form.addExistingClassificationQuantityConfirmLabel
              }
              cancelLabel={form.cancel}
              onConfirm={handleConfirmAddQuantity}
              onCancel={handleCloseAddQuantityPopup}
            >
              {allowSubtractExistingQuantity ? (
                <div className={styles.addQuantityModeToggle}>
                  <button
                    type="button"
                    className={`btn ${addQuantityMode === 'add' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setAddQuantityMode('add')}
                  >
                    {form.existingClassificationQuantityAddModeLabel}
                  </button>
                  <button
                    type="button"
                    className={`btn ${addQuantityMode === 'subtract' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setAddQuantityMode('subtract')}
                  >
                    {form.existingClassificationQuantitySubtractModeLabel}
                  </button>
                </div>
              ) : null}
              <div className={styles.addQuantityInputRow}>
                <input
                  className="seasons-manager__year-input harvest-bulk-form-number-input"
                  type="number"
                  min="0"
                  autoFocus
                  value={addQuantityValue}
                  onChange={(event) => {
                    setAddQuantityValue(event.target.value);
                    setAddQuantityError('');
                  }}
                  placeholder={form.quantityPlaceholder}
                  aria-label={allowSubtractExistingQuantity ? form.editExistingClassificationQuantityPopupTitle : form.addExistingClassificationQuantityPopupTitle}
                />
              </div>
              {addQuantityError ? <p className="seasons-manager__error">{addQuantityError}</p> : null}
            </ConfirmDialog>,
            document.body,
          )
        : null}
    </div>
  );
}
