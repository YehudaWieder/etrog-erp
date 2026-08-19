import { useEffect, useMemo, useState } from 'react';
import { CustomSelect } from '../../../../../components/ui/CustomSelect';
import { SubmitButton } from '../../../../../components/ui/SubmitButton';
import type { IsraelField } from '../../../../../services/israelFieldsApi';
import type { IsraelFieldCategory } from '../../../../../services/israelFieldCategoriesApi';
import type { IsraelSortCategory } from '../../../../../services/israelSortCategoriesApi';
import type { IsraelPitamStatus } from '../../../../../services/israelClassificationsApi';
import { formatHebrewDateFromGregorianInput } from '../../../../harvest/utils/harvestPage.utils';
import { getFilledMatrixEntries } from '../../../../harvest/utils/harvestClassificationMatrix.util';
import type { PitamRowKey } from '../../../../harvest/utils/harvestClassificationMatrix.util';
import type { IsraelHarvestFormClassificationDraft } from '../../israelHarvestPage.types';
import type { IsraelHarvestI18n } from '../../i18n';
import {
  createEmptyIsraelHarvestClassificationDraft,
  getIsraelHarvestDraftsTotalQuantity,
} from '../../utils/israelHarvestClassificationMatrix.util';
import { IsraelHarvestClassificationRowsSection } from './IsraelHarvestClassificationRowsSection';
import styles from '../../../../harvest/components/forms/styles/HarvestBulkFormModal.module.css';

export type IsraelHarvestBulkFormSubmitPayload = {
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

type IsraelHarvestBulkFormModalProps = {
  isOpen: boolean;
  t: IsraelHarvestI18n;
  activeSeasonYearName: number | null;
  fields: IsraelField[];
  fieldCategories: IsraelFieldCategory[];
  categories: IsraelSortCategory[];
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: IsraelHarvestBulkFormSubmitPayload) => void;
};

let draftIdCounter = 0;
function nextDraftId() {
  draftIdCounter += 1;
  return `israel-harvest-draft-${draftIdCounter}`;
}

export function IsraelHarvestBulkFormModal({
  isOpen,
  t,
  activeSeasonYearName,
  fields,
  fieldCategories,
  categories,
  isSubmitting,
  onClose,
  onSubmit,
}: IsraelHarvestBulkFormModalProps): JSX.Element | null {
  const form = t.harvestForm;
  const [fieldId, setFieldId] = useState('');
  const [dateGregorian, setDateGregorian] = useState('');
  const [dateHebrew, setDateHebrew] = useState('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [isPartialClassification, setIsPartialClassification] = useState(false);
  const [drafts, setDrafts] = useState<IsraelHarvestFormClassificationDraft[]>(
    [],
  );
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      const today = new Date().toISOString().slice(0, 10);
      setFieldId('');
      setDateGregorian(today);
      setDateHebrew(formatHebrewDateFromGregorianInput(today));
      setQuantity('');
      setNotes('');
      setIsPartialClassification(false);
      setDrafts([]);
      setError('');
    }
  }, [isOpen]);

  const availableFieldCategories = useMemo(
    () =>
      fieldCategories.filter(
        (fieldCategory) => fieldCategory.fieldId === Number(fieldId),
      ),
    [fieldCategories, fieldId],
  );

  if (!isOpen) return null;

  const handleFieldIdChange = (value: string) => {
    setFieldId(value);
    setDrafts([]);
  };

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
    setDrafts((current) => current.filter((draft) => draft.id !== draftId));
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
            form.sortingTotalMustBeLessForPartialSorting(parsedQuantity),
          );
          return;
        }
      } else if (totalSortingQuantity !== parsedQuantity) {
        setError(
          form.sortingTotalMustMatchAvailableForFullSorting(parsedQuantity),
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
              onChange={(value) => handleFieldIdChange(value)}
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
              min={
                activeSeasonYearName !== null
                  ? `${activeSeasonYearName}-01-01`
                  : undefined
              }
              max={
                activeSeasonYearName !== null
                  ? `${activeSeasonYearName}-12-31`
                  : undefined
              }
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
            aria-label={form.classificationModeLabel}
          >
            <legend>{form.classificationModeLabel}</legend>
            <p className={styles.classificationModeHint}>
              {form.classificationModeHint}
            </p>
            <label>
              <input
                type="radio"
                name="israel-harvest-classification-mode"
                checked={!isPartialClassification}
                onChange={() => setIsPartialClassification(false)}
              />
              <span>{form.fullSorting}</span>
            </label>
            <label>
              <input
                type="radio"
                name="israel-harvest-classification-mode"
                checked={isPartialClassification}
                onChange={() => setIsPartialClassification(true)}
              />
              <span>{form.partialSorting}</span>
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
          form={form}
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
