import { useEffect, useMemo, useState } from 'react';
import { CustomSelect } from '../../../../../components/ui/CustomSelect';
import { SubmitButton } from '../../../../../components/ui/SubmitButton';
import type { IsraelField } from '../../../../../services/israelFieldsApi';
import type { IsraelFieldCategory } from '../../../../../services/israelFieldCategoriesApi';
import type { IsraelSortCategory } from '../../../../../services/israelSortCategoriesApi';
import type { IsraelHarvestRecord } from '../../../../../services/israelHarvestsApi';
import type {
  IsraelClassificationRecord,
  IsraelPitamStatus,
} from '../../../../../services/israelClassificationsApi';
import { formatHebrewDateFromGregorianInput } from '../../../../harvest/utils/harvestPage.utils';
import {
  getFilledMatrixEntries,
  type PitamRowKey,
} from '../../../../harvest/utils/harvestClassificationMatrix.util';
import type { IsraelHarvestFormClassificationDraft } from '../../israelHarvestPage.types';
import type { IsraelHarvestI18n } from '../../i18n';
import {
  buildInitialIsraelClassificationDraftsFromExisting,
  createEmptyIsraelHarvestClassificationDraft,
  getIsraelHarvestDraftsTotalQuantity,
} from '../../utils/israelHarvestClassificationMatrix.util';
import { IsraelHarvestClassificationRowsSection } from './IsraelHarvestClassificationRowsSection';
import styles from '../../../../harvest/components/forms/styles/HarvestBulkFormModal.module.css';

export type IsraelHarvestEditSubmitPayload = {
  fieldId: number;
  dateGregorian: string;
  dateHebrew: string;
  quantity: number;
  notes: string;
  classifications: Array<{
    fieldCategoryId: number;
    categoryId: number;
    grade: string;
    pitamStatus: IsraelPitamStatus;
    quantity: number;
    notes: string;
  }>;
};

type IsraelHarvestEditModalProps = {
  isOpen: boolean;
  t: IsraelHarvestI18n;
  harvest: IsraelHarvestRecord | null;
  fields: IsraelField[];
  fieldCategories: IsraelFieldCategory[];
  categories: IsraelSortCategory[];
  existingClassifications: IsraelClassificationRecord[];
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: IsraelHarvestEditSubmitPayload) => void;
};

let draftIdCounter = 0;
function nextDraftId() {
  draftIdCounter += 1;
  return `israel-harvest-edit-draft-${draftIdCounter}`;
}

export function IsraelHarvestEditModal({
  isOpen,
  t,
  harvest,
  fields,
  fieldCategories,
  categories,
  existingClassifications,
  isSubmitting,
  onClose,
  onSubmit,
}: IsraelHarvestEditModalProps): JSX.Element | null {
  const form = t.editHarvestForm;
  const classificationForm = t.harvestForm;
  const [fieldId, setFieldId] = useState('');
  const [dateGregorian, setDateGregorian] = useState('');
  const [dateHebrew, setDateHebrew] = useState('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [isPartialClassification, setIsPartialClassification] = useState(false);
  const [drafts, setDrafts] = useState<IsraelHarvestFormClassificationDraft[]>(
    [],
  );
  const [removedDrafts, setRemovedDrafts] = useState<
    IsraelHarvestFormClassificationDraft[]
  >([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && harvest) {
      const initialQuantity = harvest.quantity;
      const initialDrafts = buildInitialIsraelClassificationDraftsFromExisting(
        existingClassifications,
      );
      const initialClassifiedTotal = existingClassifications.reduce(
        (sum, record) => sum + record.quantity,
        0,
      );

      setFieldId(String(harvest.fieldId));
      setDateGregorian(harvest.dateGregorian.slice(0, 10));
      setDateHebrew(harvest.dateHebrew);
      setQuantity(String(initialQuantity));
      setNotes(harvest.notes ?? '');
      setDrafts(initialDrafts);
      setRemovedDrafts([]);
      setIsPartialClassification(initialClassifiedTotal < initialQuantity);
      setError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, harvest]);

  const availableFieldCategories = useMemo(
    () =>
      fieldCategories.filter(
        (fieldCategory) => fieldCategory.fieldId === Number(fieldId),
      ),
    [fieldCategories, fieldId],
  );

  if (!isOpen || !harvest) return null;

  const handleGregorianDateChange = (value: string) => {
    setDateGregorian(value);
    setDateHebrew(formatHebrewDateFromGregorianInput(value));
  };

  const handleAddDraft = () => {
    setDrafts((current) => [
      ...current,
      createEmptyIsraelHarvestClassificationDraft(nextDraftId()),
    ]);
  };

  const handleRemoveDraft = (draftId: string) => {
    setDrafts((current) => {
      const draftToRemove = current.find((draft) => draft.id === draftId);
      if (draftToRemove) {
        setRemovedDrafts((removed) => [...removed, draftToRemove]);
      }
      return current.filter((draft) => draft.id !== draftId);
    });
  };

  const handleRestoreDraft = (draftId: string) => {
    setRemovedDrafts((current) => {
      const draftToRestore = current.find((draft) => draft.id === draftId);
      if (draftToRestore) {
        setDrafts((drafts) => [...drafts, draftToRestore]);
      }
      return current.filter((draft) => draft.id !== draftId);
    });
  };

  const getDraftLabel = (draft: IsraelHarvestFormClassificationDraft) => {
    const fieldCategoryName =
      fieldCategories.find(
        (fieldCategory) => String(fieldCategory.id) === draft.fieldCategoryId,
      )?.name ?? draft.fieldCategoryId;
    const categoryName =
      categories.find((category) => String(category.id) === draft.categoryId)
        ?.name ?? draft.categoryId;
    return `${fieldCategoryName} — ${categoryName}`;
  };

  const handleUpdateDraft = (
    draftId: string,
    updater: Partial<IsraelHarvestFormClassificationDraft>,
  ) => {
    setDrafts((current) =>
      current.map((draft) =>
        draft.id === draftId ? { ...draft, ...updater } : draft,
      ),
    );
  };

  const handleUpdateDraftQuantity = (
    draftId: string,
    pitamKey: PitamRowKey,
    gradeKey: string,
    value: string,
  ) => {
    setDrafts((current) =>
      current.map((draft) =>
        draft.id === draftId
          ? {
              ...draft,
              quantities: {
                ...draft.quantities,
                [pitamKey]: {
                  ...draft.quantities[pitamKey],
                  [gradeKey]: value,
                },
              },
            }
          : draft,
      ),
    );
  };

  const handleSubmit = () => {
    const parsedFieldId = Number(fieldId);
    const parsedQuantity = Number(quantity);

    if (!parsedFieldId) {
      setError(form.fieldRequiredError);
      return;
    }

    if (!dateGregorian || Number.isNaN(new Date(dateGregorian).getTime())) {
      setError(form.gregorianDateRequiredError);
      return;
    }

    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      setError(form.quantityRequiredError);
      return;
    }

    const relevantDrafts = drafts.filter(
      (draft) => draft.fieldCategoryId && draft.categoryId,
    );
    const totalSortingQuantity =
      getIsraelHarvestDraftsTotalQuantity(relevantDrafts);

    if (relevantDrafts.length > 0) {
      if (isPartialClassification) {
        if (totalSortingQuantity >= parsedQuantity) {
          setError(
            classificationForm.sortingTotalMustBeLessForPartialSorting(
              parsedQuantity,
            ),
          );
          return;
        }
      } else if (totalSortingQuantity !== parsedQuantity) {
        setError(
          classificationForm.sortingTotalMustMatchAvailableForFullSorting(
            parsedQuantity,
          ),
        );
        return;
      }
    }

    const classifications = relevantDrafts.flatMap((draft) =>
      getFilledMatrixEntries(draft.quantities).map((entry) => ({
        fieldCategoryId: Number(draft.fieldCategoryId),
        categoryId: Number(draft.categoryId),
        grade: entry.grade ?? '',
        pitamStatus: entry.pitamStatus,
        quantity: entry.quantity,
        notes: draft.notes,
      })),
    );

    setError('');
    onSubmit({
      fieldId: parsedFieldId,
      dateGregorian,
      dateHebrew,
      quantity: parsedQuantity,
      notes,
      classifications,
    });
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
        <button
          className="modal-close"
          type="button"
          aria-label={form.closeLabel}
          onClick={onClose}
        >
          X
        </button>

        <h3 className="modal-title">{form.title}</h3>
        <p className="modal-message">{form.instructions}</p>

        <div
          className={`management-form-grid ${styles.grid} ${styles.gridPrimary}`}
        >
          <label className={styles.selectionField}>
            <span>{form.fieldLabel}</span>
            <CustomSelect
              className="seasons-manager__year-input"
              value={fieldId}
              onChange={(value) => setFieldId(value)}
              ariaLabel={form.fieldLabel}
              placeholder={form.fieldPlaceholder}
              options={fields.map((field) => ({
                value: String(field.id),
                label: field.name,
              }))}
            />
          </label>

          <label className={styles.summaryField}>
            <span>{form.gregorianDateLabel}</span>
            <input
              className="seasons-manager__year-input"
              type="date"
              value={dateGregorian}
              onChange={(event) =>
                handleGregorianDateChange(event.target.value)
              }
              aria-label={form.gregorianDateLabel}
            />
          </label>

          <label className={styles.summaryField}>
            <span>{form.hebrewDateLabel}</span>
            <input
              className="seasons-manager__year-input"
              type="text"
              value={dateHebrew}
              disabled
              aria-label={form.hebrewDateLabel}
            />
          </label>

          <label
            className={`${styles.summaryField} ${styles.numberInputFirst}`}
          >
            <span>{form.quantityLabel}</span>
            <input
              className="seasons-manager__year-input harvest-bulk-form-number-input"
              type="number"
              min="0"
              required
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              placeholder={form.quantityPlaceholder}
              aria-label={form.quantityLabel}
            />
          </label>

          <fieldset
            className={styles.classificationMode}
            aria-label={classificationForm.classificationModeLabel}
          >
            <legend>{classificationForm.classificationModeLabel}</legend>
            <p className={styles.classificationModeHint}>
              {classificationForm.classificationModeHint}
            </p>
            <label>
              <input
                type="radio"
                name="israel-harvest-edit-classification-mode"
                checked={!isPartialClassification}
                onChange={() => setIsPartialClassification(false)}
              />
              <span>{classificationForm.fullSorting}</span>
            </label>
            <label>
              <input
                type="radio"
                name="israel-harvest-edit-classification-mode"
                checked={isPartialClassification}
                onChange={() => setIsPartialClassification(true)}
              />
              <span>{classificationForm.partialSorting}</span>
            </label>
          </fieldset>

          <label className={`${styles.summaryField} ${styles.notesWithMode}`}>
            <span>{form.notesLabel}</span>
            <textarea
              className={`seasons-manager__year-input ${styles.notesTextarea}`}
              rows={1}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={form.notesPlaceholder}
              aria-label={form.notesLabel}
            />
          </label>
        </div>

        <IsraelHarvestClassificationRowsSection
          form={classificationForm}
          fieldCategories={availableFieldCategories}
          categories={categories}
          quantity={quantity}
          isPartialClassification={isPartialClassification}
          drafts={drafts}
          onAddDraft={handleAddDraft}
          onRemoveDraft={handleRemoveDraft}
          onUpdateDraft={handleUpdateDraft}
          onUpdateDraftQuantity={handleUpdateDraftQuantity}
        />

        {removedDrafts.length ? (
          <div className={styles.classifications}>
            <div className={styles.classificationsHeader}>
              <h4>{form.pendingRemovedSortingRowsTitle}</h4>
            </div>
            <p className={styles.quantityMatrixHint}>
              {form.pendingRemovedSortingRowsHint}
            </p>
            {removedDrafts.map((draft) => (
              <div key={draft.id} className={styles.classificationRow}>
                <div className={styles.classificationRowHead}>
                  <span>{getDraftLabel(draft)}</span>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleRestoreDraft(draft.id)}
                  >
                    {form.restorePendingRemovedSortingRow}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {error ? <p className="seasons-manager__error">{error}</p> : null}

        <div className="modal-actions">
          <button
            className="btn btn-danger"
            onClick={onClose}
            type="button"
            disabled={isSubmitting}
          >
            {form.cancel}
          </button>
          <SubmitButton
            className="btn btn-success"
            onClick={handleSubmit}
            type="button"
            isLoading={isSubmitting}
            loadingText={form.saving}
          >
            {form.save}
          </SubmitButton>
        </div>
      </div>
    </div>
  );
}
