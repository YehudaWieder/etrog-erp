import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ConfirmDialog } from '../../../../../components/ui/ConfirmDialog';
import { CustomSelect } from '../../../../../components/ui/CustomSelect';
import type { IsraelFieldCategory } from '../../../../../services/israel/israelFieldCategoriesApi';
import type { IsraelSortCategory } from '../../../../../services/israel/israelSortCategoriesApi';
import type { IsraelClassificationRecord } from '../../../../../services/israel/israelClassificationsApi';
import type { IsraelHarvestFormClassificationDraft } from '../../israelHarvestPage.types';
import type { IsraelHarvestI18n } from '../../i18n';
import {
  PITAM_ROW_KEYS,
  type PitamRowKey,
} from '../../../../harvest/utils/harvestClassificationMatrix.util';
import {
  buildIsraelExistingCellRecords,
  getIsraelCategoryEnabledGrades,
  getIsraelDraftGradeColumns,
  getIsraelHarvestDraftsTotalQuantity,
  isIsraelDraftComboDuplicate,
  isIsraelDraftEffectivelyComplete,
} from '../../utils/israelHarvestClassificationMatrix.util';
import styles from '../../../../harvest/components/forms/styles/HarvestBulkFormModal.module.css';

type IsraelHarvestClassificationRowsSectionProps = {
  isOpen?: boolean;
  form: IsraelHarvestI18n['harvestForm'];
  fieldCategories: IsraelFieldCategory[];
  categories: IsraelSortCategory[];
  quantity: string;
  isPartialClassification: boolean;
  drafts: IsraelHarvestFormClassificationDraft[];
  existingHarvestClassifications?: IsraelClassificationRecord[];
  pendingExistingClassificationEdits?: Record<number, string>;
  // Only enabled for the harvest edit dialog: lets the user choose to subtract from an existing cell's
  // quantity as well as add to it, instead of only being able to add (the Add-Harvest and Add-Sorting
  // forms keep the add-only popup).
  allowSubtractExistingQuantity?: boolean;
  // Hide the remove button on existing-scaffold rows. Used by forms (like the Add-Sorting dialog) that
  // only show already-saved classifications for reference and don't support un-saving them.
  canRemoveExistingScaffold?: boolean;
  onAddDraft: () => void;
  onRemoveDraft: (draftId: string) => void;
  onUpdateDraft: (
    draftId: string,
    updater: Partial<IsraelHarvestFormClassificationDraft>,
  ) => void;
  onUpdateDraftQuantity: (
    draftId: string,
    pitamKey: PitamRowKey,
    gradeKey: string,
    value: string,
  ) => void;
  onStageExistingClassificationQuantity?: (
    classificationId: number,
    value: string | null,
  ) => void;
};

const pitamLabelKey: Record<
  PitamRowKey,
  'withPitam' | 'withoutPitam' | 'mixed'
> = {
  WITH_PITAM: 'withPitam',
  WITHOUT_PITAM: 'withoutPitam',
  MIXED: 'mixed',
};

export function IsraelHarvestClassificationRowsSection({
  isOpen = true,
  form,
  fieldCategories,
  categories,
  quantity,
  isPartialClassification,
  drafts,
  existingHarvestClassifications = [],
  pendingExistingClassificationEdits = {},
  allowSubtractExistingQuantity = false,
  canRemoveExistingScaffold = true,
  onAddDraft,
  onRemoveDraft,
  onUpdateDraft,
  onUpdateDraftQuantity,
  onStageExistingClassificationQuantity,
}: IsraelHarvestClassificationRowsSectionProps): JSX.Element {
  const [addQuantityCell, setAddQuantityCell] = useState<{
    classificationId: number;
    baseQuantity: number;
    categoryName: string;
    gradeLabel: string;
    pitamLabel: string;
  } | null>(null);
  const [addQuantityValue, setAddQuantityValue] = useState('');
  const [addQuantityError, setAddQuantityError] = useState('');
  const [addQuantityMode, setAddQuantityMode] = useState<'add' | 'subtract'>(
    'add',
  );

  useEffect(() => {
    if (isOpen) {
      setAddQuantityCell(null);
      setAddQuantityValue('');
      setAddQuantityError('');
      setAddQuantityMode('add');
    }
  }, [isOpen]);

  const existingCellRecords = useMemo(
    () => buildIsraelExistingCellRecords(existingHarvestClassifications),
    [existingHarvestClassifications],
  );

  const parsedQuantity = Number(quantity);
  const hasValidQuantity =
    Number.isFinite(parsedQuantity) && parsedQuantity > 0;

  const existingTotalQuantity = useMemo(
    () =>
      existingHarvestClassifications.reduce((sum, record) => {
        const pendingValue = pendingExistingClassificationEdits[record.id];
        const value = pendingValue !== undefined ? Number(pendingValue) : record.quantity;
        return sum + (Number.isFinite(value) ? value : 0);
      }, 0),
    [existingHarvestClassifications, pendingExistingClassificationEdits],
  );

  const totalSortingQuantity =
    existingTotalQuantity + getIsraelHarvestDraftsTotalQuantity(drafts);

  const lastDraft = drafts[drafts.length - 1] ?? null;
  const canAddRow =
    hasValidQuantity &&
    (lastDraft ? isIsraelDraftEffectivelyComplete(lastDraft) : true);

  const getDraftCellExistingRecord = (
    draft: IsraelHarvestFormClassificationDraft,
    pitamKey: PitamRowKey,
    gradeKey: string,
  ): { id: number; quantity: number } | undefined => {
    if (!draft.fieldCategoryId || !draft.categoryId) {
      return undefined;
    }
    return existingCellRecords.get(
      `${draft.fieldCategoryId}:${draft.categoryId}:${pitamKey}:${gradeKey}`,
    );
  };

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
    const isSubtractMode =
      allowSubtractExistingQuantity && addQuantityMode === 'subtract';
    const parsedValue = Number(addQuantityValue);
    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
      setAddQuantityError(
        isSubtractMode
          ? form.subtractExistingClassificationQuantityInvalidError
          : form.addExistingClassificationQuantityInvalidError,
      );
      return;
    }
    if (isSubtractMode && parsedValue > addQuantityCell.baseQuantity) {
      setAddQuantityError(
        form.subtractExistingClassificationQuantityExceedsBaseError(
          addQuantityCell.baseQuantity,
        ),
      );
      return;
    }
    const newTotal = isSubtractMode
      ? addQuantityCell.baseQuantity - parsedValue
      : addQuantityCell.baseQuantity + parsedValue;
    onStageExistingClassificationQuantity?.(
      addQuantityCell.classificationId,
      String(newTotal),
    );
    handleCloseAddQuantityPopup();
  };

  const handleRevertCellEdit = (classificationId: number) => {
    onStageExistingClassificationQuantity?.(classificationId, null);
  };

  return (
    <div className={styles.classifications}>
      <div className={styles.classificationsHeader}>
        <h4>{form.sortingRowsTitle}</h4>
        {!drafts.length ? (
          <div className={styles.classificationActions}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={onAddDraft}
              disabled={!hasValidQuantity}
            >
              {form.addSortingRow}
            </button>
          </div>
        ) : null}
      </div>

      {drafts.map((draft, index) => {
        const enabledGrades = getIsraelCategoryEnabledGrades(
          categories,
          draft.categoryId,
        );
        const gradeColumns = getIsraelDraftGradeColumns(
          categories,
          draft.categoryId,
        );
        const isDuplicate = isIsraelDraftComboDuplicate(draft, drafts);
        const isLastRow = index === drafts.length - 1;
        const draftCategoryName =
          categories.find((category) => String(category.id) === draft.categoryId)
            ?.name ?? '';

        return (
          <div key={draft.id} className={styles.classificationRow}>
            <div className={styles.classificationRowHead}>
              <strong>{form.sortingRowPrefix(index)}</strong>
            </div>

            <div
              className={`management-form-grid ${styles.grid} ${styles.classificationGrid}`}
            >
              <label className={styles.summaryField}>
                <span>{form.fieldCategoryLabel}</span>
                <CustomSelect
                  className="seasons-manager__year-input"
                  value={draft.fieldCategoryId}
                  onChange={(value) =>
                    onUpdateDraft(draft.id, {
                      fieldCategoryId: value,
                    })
                  }
                  placeholder={form.fieldCategoryPlaceholder}
                  options={fieldCategories.map((fieldCategory) => ({
                    value: String(fieldCategory.id),
                    label: fieldCategory.name,
                  }))}
                />
              </label>

              <label className={styles.summaryField}>
                <span>{form.categoryLabel}</span>
                <CustomSelect
                  className="seasons-manager__year-input"
                  value={draft.categoryId}
                  onChange={(value) =>
                    onUpdateDraft(draft.id, { categoryId: value })
                  }
                  disabled={!draft.fieldCategoryId}
                  placeholder={form.categoryPlaceholder}
                  options={categories.map((category) => ({
                    value: String(category.id),
                    label: category.name,
                  }))}
                />
              </label>
            </div>

            {isDuplicate ? (
              <p
                className={`seasons-manager__error ${styles.classificationAddError}`}
              >
                {form.duplicateSortingRowError}
              </p>
            ) : null}

            <div className={styles.quantityMatrix}>
              <table className={styles.quantityMatrixTable}>
                <thead>
                  <tr>
                    <th>{form.pitamStatusLabel}</th>
                    {gradeColumns.map((gradeKey) => (
                      <th
                        key={`israel-harvest-form-grade-col-${draft.id}-${gradeKey}`}
                      >
                        {gradeKey}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PITAM_ROW_KEYS.map((pitamKey) => (
                    <tr
                      key={`israel-harvest-form-pitam-row-${draft.id}-${pitamKey}`}
                    >
                      <th>{form.pitamOptions[pitamLabelKey[pitamKey]]}</th>
                      {gradeColumns.map((gradeKey) => {
                        const existingRecord = getDraftCellExistingRecord(
                          draft,
                          pitamKey,
                          gradeKey,
                        );
                        const isCellAlreadyExisting = existingRecord !== undefined;
                        const pendingValue = existingRecord
                          ? pendingExistingClassificationEdits[existingRecord.id]
                          : undefined;
                        const hasPendingAddition = pendingValue !== undefined;
                        return (
                          <td
                            key={`israel-harvest-form-quantity-cell-${draft.id}-${pitamKey}-${gradeKey}`}
                          >
                            <div className={styles.existingCellWrapper}>
                              <input
                                className="seasons-manager__year-input"
                                type="number"
                                min="0"
                                disabled={
                                  !enabledGrades.includes(gradeKey) ||
                                  isCellAlreadyExisting
                                }
                                readOnly={isCellAlreadyExisting}
                                value={
                                  isCellAlreadyExisting
                                    ? pendingValue ?? existingRecord.quantity
                                    : draft.quantities[pitamKey][gradeKey] ?? ''
                                }
                                onChange={(event) =>
                                  onUpdateDraftQuantity(
                                    draft.id,
                                    pitamKey,
                                    gradeKey,
                                    event.target.value,
                                  )
                                }
                                placeholder={form.quantityMatrixQuantityHeader}
                                title={
                                  isCellAlreadyExisting
                                    ? form.existingClassificationCellBlockedHint
                                    : undefined
                                }
                              />
                              {isCellAlreadyExisting &&
                              !hasPendingAddition &&
                              onStageExistingClassificationQuantity ? (
                                <button
                                  type="button"
                                  className={styles.existingCellActionButton}
                                  onClick={() =>
                                    handleOpenAddQuantityPopup({
                                      classificationId: existingRecord.id,
                                      baseQuantity: existingRecord.quantity,
                                      categoryName: draftCategoryName,
                                      gradeLabel: gradeKey,
                                      pitamLabel:
                                        form.pitamOptions[pitamLabelKey[pitamKey]],
                                    })
                                  }
                                  aria-label={
                                    allowSubtractExistingQuantity
                                      ? form.editExistingClassificationQuantityLabel
                                      : form.addExistingClassificationQuantityLabel
                                  }
                                  title={
                                    allowSubtractExistingQuantity
                                      ? form.editExistingClassificationQuantityLabel
                                      : form.addExistingClassificationQuantityLabel
                                  }
                                >
                                  <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3.5"
                                    strokeLinecap="round"
                                  >
                                    <path d="M12 5v14M5 12h14" />
                                  </svg>
                                </button>
                              ) : null}
                              {isCellAlreadyExisting && hasPendingAddition ? (
                                <button
                                  type="button"
                                  className={styles.existingCellActionButton}
                                  onClick={() =>
                                    handleRevertCellEdit(existingRecord.id)
                                  }
                                  aria-label={form.cancelExistingClassificationCellLabel}
                                  title={form.cancelExistingClassificationCellLabel}
                                >
                                  <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3.5"
                                    strokeLinecap="round"
                                  >
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

            {enabledGrades.length === 0 ? (
              <p className={styles.quantityMatrixHint}>
                {draft.fieldCategoryId
                  ? form.selectCategoryForQuantitiesHint
                  : form.selectFieldCategoryFirstHint}
              </p>
            ) : draft.isExistingScaffold ? (
              <p className={styles.quantityMatrixHint}>
                {form.existingClassificationRowHint}
              </p>
            ) : null}

            <div
              className={`management-form-grid ${styles.grid} ${styles.classificationGrid}`}
            >
              <label
                className={`${styles.summaryField} ${styles.classificationNotes}`}
              >
                <span>{form.sortingNotesLabel}</span>
                <input
                  className="seasons-manager__year-input"
                  type="text"
                  value={draft.notes}
                  onChange={(event) =>
                    onUpdateDraft(draft.id, { notes: event.target.value })
                  }
                  placeholder={form.sortingNotesPlaceholder}
                />
              </label>

              <div className={styles.classificationActions}>
                {isLastRow ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={onAddDraft}
                    disabled={!canAddRow}
                    title={
                      !canAddRow ? form.addSortingRowBlockedError : undefined
                    }
                  >
                    {form.addSortingRow}
                  </button>
                ) : null}
                {!draft.isExistingScaffold || canRemoveExistingScaffold ? (
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => onRemoveDraft(draft.id)}
                  >
                    {form.removeSortingRow}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}

      {drafts.length || existingHarvestClassifications.length ? (
        <div className={styles.sortingTotalSummary}>
          <span>{form.sortingTotalQuantityLabel}</span>
          <span>{totalSortingQuantity}</span>
        </div>
      ) : null}

      {(drafts.length || existingHarvestClassifications.length) &&
      hasValidQuantity ? (
        <p
          className={`${styles.fullSortingTargetHint} ${
            isPartialClassification
              ? totalSortingQuantity < parsedQuantity
                ? ''
                : styles.fullSortingTargetHintOff
              : totalSortingQuantity === parsedQuantity
                ? ''
                : styles.fullSortingTargetHintOff
          }`}
        >
          {form.fullSortingRequiredHint(parsedQuantity)}{' '}
          {totalSortingQuantity > parsedQuantity
            ? form.fullSortingReduceHint(totalSortingQuantity - parsedQuantity)
            : totalSortingQuantity < parsedQuantity
              ? isPartialClassification
                ? ''
                : form.fullSortingIncreaseHint(
                    parsedQuantity - totalSortingQuantity,
                  )
              : form.fullSortingMatchHint}
        </p>
      ) : null}

      {addQuantityCell
        ? createPortal(
            <ConfirmDialog
              open
              dialogClassName={`modal-dialog--form ${styles.addQuantityDialog}`}
              title={
                allowSubtractExistingQuantity
                  ? form.editExistingClassificationQuantityPopupTitle
                  : form.addExistingClassificationQuantityPopupTitle
              }
              message={
                <>
                  {form.addExistingClassificationQuantityPopupPrefix}{' '}
                  <strong>{addQuantityCell.categoryName}</strong>
                  {addQuantityCell.gradeLabel ? (
                    <>
                      {' '}
                      {form.addExistingClassificationQuantityPopupGradeWord}{' '}
                      <strong>{addQuantityCell.gradeLabel}</strong>
                    </>
                  ) : null}
                  {' '}
                  <strong>{addQuantityCell.pitamLabel}</strong>:{' '}
                  <strong>{addQuantityCell.baseQuantity}</strong>.
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
                  placeholder={form.quantityMatrixQuantityHeader}
                  aria-label={
                    allowSubtractExistingQuantity
                      ? form.editExistingClassificationQuantityPopupTitle
                      : form.addExistingClassificationQuantityPopupTitle
                  }
                />
              </div>
              {addQuantityError ? (
                <p className="seasons-manager__error">{addQuantityError}</p>
              ) : null}
            </ConfirmDialog>,
            document.body,
          )
        : null}
    </div>
  );
}
