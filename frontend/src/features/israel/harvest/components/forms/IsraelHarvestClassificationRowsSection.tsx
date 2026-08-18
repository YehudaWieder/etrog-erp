import type { IsraelFieldCategory } from '../../../../../services/israelFieldCategoriesApi';
import type { IsraelSortCategory } from '../../../../../services/israelSortCategoriesApi';
import type { IsraelHarvestFormClassificationDraft } from '../../israelHarvestPage.types';
import type { IsraelHarvestI18n } from '../../i18n';
import {
  PITAM_ROW_KEYS,
  type PitamRowKey,
} from '../../../../harvest/utils/harvestClassificationMatrix.util';
import {
  getIsraelCategoryGradeEntries,
  getIsraelHarvestDraftsTotalQuantity,
  isIsraelClassificationDraftComplete,
  isIsraelDraftComboDuplicate,
} from '../../utils/israelHarvestClassificationMatrix.util';
import styles from '../../../../harvest/components/forms/styles/HarvestBulkFormModal.module.css';

type IsraelHarvestClassificationRowsSectionProps = {
  form: IsraelHarvestI18n['harvestForm'];
  fieldCategories: IsraelFieldCategory[];
  categories: IsraelSortCategory[];
  quantity: string;
  isPartialClassification: boolean;
  drafts: IsraelHarvestFormClassificationDraft[];
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
  form,
  fieldCategories,
  categories,
  quantity,
  isPartialClassification,
  drafts,
  onAddDraft,
  onRemoveDraft,
  onUpdateDraft,
  onUpdateDraftQuantity,
}: IsraelHarvestClassificationRowsSectionProps): JSX.Element {
  const parsedQuantity = Number(quantity);
  const hasValidQuantity =
    Number.isFinite(parsedQuantity) && parsedQuantity > 0;

  const lastDraft = drafts[drafts.length - 1] ?? null;
  const canAddRow =
    hasValidQuantity &&
    (lastDraft ? isIsraelClassificationDraftComplete(lastDraft) : true);

  const totalSortingQuantity = getIsraelHarvestDraftsTotalQuantity(drafts);

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
        const gradeEntries = getIsraelCategoryGradeEntries(
          categories,
          draft.categoryId,
        );
        const isDuplicate = isIsraelDraftComboDuplicate(draft, drafts);
        const isLastRow = index === drafts.length - 1;

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
                <select
                  className="seasons-manager__year-input"
                  value={draft.fieldCategoryId}
                  onChange={(event) =>
                    onUpdateDraft(draft.id, {
                      fieldCategoryId: event.target.value,
                    })
                  }
                >
                  <option value="">{form.fieldCategoryPlaceholder}</option>
                  {fieldCategories.map((fieldCategory) => (
                    <option
                      key={`israel-harvest-form-field-category-${fieldCategory.id}`}
                      value={String(fieldCategory.id)}
                    >
                      {fieldCategory.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.summaryField}>
                <span>{form.categoryLabel}</span>
                <select
                  className="seasons-manager__year-input"
                  value={draft.categoryId}
                  onChange={(event) =>
                    onUpdateDraft(draft.id, { categoryId: event.target.value })
                  }
                  disabled={!draft.fieldCategoryId}
                >
                  <option value="">{form.categoryPlaceholder}</option>
                  {categories.map((category) => (
                    <option
                      key={`israel-harvest-form-category-${category.id}`}
                      value={String(category.id)}
                    >
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {isDuplicate ? (
              <p
                className={`seasons-manager__error ${styles.classificationAddError}`}
              >
                {form.duplicateSortingRowError}
              </p>
            ) : null}

            {draft.categoryId ? (
              gradeEntries.length > 0 ? (
                <div className={styles.quantityMatrix}>
                  <table className={styles.quantityMatrixTable}>
                    <thead>
                      <tr>
                        <th>{form.pitamStatusLabel}</th>
                        {gradeEntries.map(([gradeKey, gradeLabel]) => (
                          <th
                            key={`israel-harvest-form-grade-col-${draft.id}-${gradeKey}`}
                          >
                            {gradeLabel}
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
                          {gradeEntries.map(([gradeKey]) => (
                            <td
                              key={`israel-harvest-form-quantity-cell-${draft.id}-${pitamKey}-${gradeKey}`}
                            >
                              <input
                                className="seasons-manager__year-input"
                                type="number"
                                min="0"
                                value={
                                  draft.quantities[pitamKey][gradeKey] ?? ''
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
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className={styles.quantityMatrixHint}>
                  {form.selectCategoryForQuantitiesHint}
                </p>
              )
            ) : (
              <p className={styles.quantityMatrixHint}>
                {draft.fieldCategoryId
                  ? form.selectCategoryForQuantitiesHint
                  : form.selectFieldCategoryFirstHint}
              </p>
            )}

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
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => onRemoveDraft(draft.id)}
                >
                  {form.removeSortingRow}
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {drafts.length ? (
        <div className={styles.sortingTotalSummary}>
          <span>{form.sortingTotalQuantityLabel}</span>
          <span>{totalSortingQuantity}</span>
        </div>
      ) : null}

      {drafts.length && hasValidQuantity ? (
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
    </div>
  );
}
