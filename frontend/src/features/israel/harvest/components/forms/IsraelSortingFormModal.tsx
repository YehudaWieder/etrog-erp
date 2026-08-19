import { useEffect, useMemo, useState } from 'react';
import { CustomSelect } from '../../../../../components/ui/CustomSelect';
import { SubmitButton } from '../../../../../components/ui/SubmitButton';
import { TopLoadingBar } from '../../../../../components/ui/TopLoadingBar';
import type { IsraelHarvestRecord } from '../../../../../services/israelHarvestsApi';
import type { IsraelFieldCategory } from '../../../../../services/israelFieldCategoriesApi';
import type { IsraelSortCategory } from '../../../../../services/israelSortCategoriesApi';
import {
  getIsraelClassificationsByHarvest,
  type IsraelPitamStatus,
} from '../../../../../services/israelClassificationsApi';
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

export type IsraelSortingFormSubmitPayload = {
  harvestId: number;
  classifications: Array<{
    fieldCategoryId: number;
    categoryId: number;
    grade: string;
    pitamStatus: IsraelPitamStatus;
    quantity: number;
    notes: string;
  }>;
};

type IsraelSortingFormModalProps = {
  isOpen: boolean;
  t: IsraelHarvestI18n;
  harvests: IsraelHarvestRecord[];
  fieldCategories: IsraelFieldCategory[];
  categories: IsraelSortCategory[];
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: IsraelSortingFormSubmitPayload) => void;
};

let draftIdCounter = 0;
function nextDraftId() {
  draftIdCounter += 1;
  return `israel-sorting-draft-${draftIdCounter}`;
}

export function IsraelSortingFormModal({
  isOpen,
  t,
  harvests,
  fieldCategories,
  categories,
  isSubmitting,
  onClose,
  onSubmit,
}: IsraelSortingFormModalProps): JSX.Element | null {
  const form = t.harvestForm;
  const sf = t.sortingForm;
  const [harvestId, setHarvestId] = useState('');
  const [isPartialClassification, setIsPartialClassification] = useState(false);
  const [drafts, setDrafts] = useState<IsraelHarvestFormClassificationDraft[]>(
    [],
  );
  const [error, setError] = useState('');
  const [alreadyClassifiedTotal, setAlreadyClassifiedTotal] = useState(0);
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setHarvestId('');
      setIsPartialClassification(false);
      setDrafts([]);
      setError('');
      setAlreadyClassifiedTotal(0);
    }
  }, [isOpen]);

  useEffect(() => {
    const parsedHarvestId = Number(harvestId);
    if (!parsedHarvestId) {
      setAlreadyClassifiedTotal(0);
      return;
    }

    setIsLoadingExisting(true);
    getIsraelClassificationsByHarvest(parsedHarvestId)
      .then((records) => {
        setAlreadyClassifiedTotal(
          records.reduce((sum, record) => sum + record.quantity, 0),
        );
      })
      .catch(() => setAlreadyClassifiedTotal(0))
      .finally(() => setIsLoadingExisting(false));
  }, [harvestId]);

  const selectedHarvest = useMemo(
    () => harvests.find((harvest) => harvest.id === Number(harvestId)) ?? null,
    [harvestId, harvests],
  );

  const availableFieldCategories = useMemo(
    () =>
      fieldCategories.filter(
        (fieldCategory) => fieldCategory.fieldId === selectedHarvest?.fieldId,
      ),
    [fieldCategories, selectedHarvest],
  );

  const remainingQuantity = selectedHarvest
    ? Math.max(0, selectedHarvest.quantity - alreadyClassifiedTotal)
    : 0;

  if (!isOpen) return null;

  const isFormReady = selectedHarvest !== null && !isLoadingExisting;

  const handleHarvestChange = (value: string) => {
    setHarvestId(value);
    setDrafts([]);
    setError('');
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
    const parsedHarvestId = Number(harvestId);
    if (!parsedHarvestId) {
      setError(sf.harvestRequiredError);
      return;
    }

    const relevantDrafts = drafts.filter(
      (draft) => draft.fieldCategoryId && draft.categoryId,
    );
    if (relevantDrafts.length === 0) {
      setError(form.addSortingRowBlockedError);
      return;
    }

    const totalSortingQuantity =
      getIsraelHarvestDraftsTotalQuantity(relevantDrafts);

    if (isPartialClassification) {
      if (totalSortingQuantity >= remainingQuantity) {
        setError(
          form.sortingTotalMustBeLessForPartialSorting(remainingQuantity),
        );
        return;
      }
    } else if (totalSortingQuantity !== remainingQuantity) {
      setError(
        form.sortingTotalMustMatchAvailableForFullSorting(remainingQuantity),
      );
      return;
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
    onSubmit({ harvestId: parsedHarvestId, classifications });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal-dialog modal-dialog--form ${styles.modal}`}
        role="dialog"
        aria-modal="true"
        aria-label={sf.ariaLabel}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="modal-close"
          type="button"
          aria-label={sf.closeLabel}
          onClick={onClose}
        >
          X
        </button>

        <h3 className="modal-title" style={{ position: 'relative' }}>
          {sf.title}
          <TopLoadingBar isLoading={isLoadingExisting} />
        </h3>
        <p className="modal-message">{sf.instructions}</p>

        <div
          className={`management-form-grid ${styles.grid} ${styles.gridPrimary}`}
        >
          <label className={styles.selectionField}>
            <span>{sf.harvestLabel}</span>
            <CustomSelect
              className={`seasons-manager__year-input ${styles.compactSelect}`}
              value={harvestId}
              onChange={(value) => handleHarvestChange(value)}
              placeholder={sf.harvestPlaceholder}
              options={harvests.map((harvest) => ({
                value: String(harvest.id),
                label: `${harvest.field?.name ?? ''} — ${
                  harvest.dateHebrew || harvest.dateGregorian.slice(0, 10)
                }`,
              }))}
            />
          </label>

          <label className={styles.summaryField}>
            <span>{sf.dateGregorianLabel}</span>
            <input
              className={`seasons-manager__year-input ${styles.readOnlyField}`}
              type="text"
              value={
                selectedHarvest
                  ? selectedHarvest.dateGregorian.slice(0, 10)
                  : ''
              }
              readOnly
              aria-label={sf.dateGregorianLabel}
            />
          </label>

          <label className={styles.summaryField}>
            <span>{sf.dateHebrewLabel}</span>
            <input
              className={`seasons-manager__year-input ${styles.readOnlyField}`}
              type="text"
              value={selectedHarvest?.dateHebrew ?? ''}
              readOnly
              aria-label={sf.dateHebrewLabel}
            />
          </label>

          <label className={styles.summaryField}>
            <span>{sf.quantityLabel}</span>
            <input
              className={`seasons-manager__year-input ${styles.readOnlyField}`}
              type="text"
              value={selectedHarvest ? String(selectedHarvest.quantity) : ''}
              readOnly
              aria-label={sf.quantityLabel}
            />
          </label>

          <label className={styles.summaryField}>
            <span>{sf.classifiedTotalLabel}</span>
            <input
              className={`seasons-manager__year-input ${styles.readOnlyField}`}
              type="text"
              value={selectedHarvest ? String(alreadyClassifiedTotal) : ''}
              readOnly
              aria-label={sf.classifiedTotalLabel}
            />
          </label>

          <label className={styles.summaryField}>
            <span>{sf.remainingLabel}</span>
            <input
              className={`seasons-manager__year-input ${styles.readOnlyField}`}
              type="text"
              value={selectedHarvest ? String(remainingQuantity) : ''}
              readOnly
              aria-label={sf.remainingLabel}
            />
          </label>
        </div>

        {!isFormReady ? (
          <p className="seasons-manager__hint" style={{ margin: 0 }}>
            {isLoadingExisting
              ? sf.loadingExistingClassifications
              : sf.selectHarvestHint}
          </p>
        ) : remainingQuantity <= 0 ? (
          <p className="seasons-manager__hint" style={{ margin: 0 }}>
            {sf.alreadyFullySortedMessage}
          </p>
        ) : (
          <>
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
                  name="israel-sorting-classification-mode"
                  checked={!isPartialClassification}
                  onChange={() => setIsPartialClassification(false)}
                />
                <span>{form.fullSorting}</span>
              </label>
              <label>
                <input
                  type="radio"
                  name="israel-sorting-classification-mode"
                  checked={isPartialClassification}
                  onChange={() => setIsPartialClassification(true)}
                />
                <span>{form.partialSorting}</span>
              </label>
            </fieldset>

            <IsraelHarvestClassificationRowsSection
              form={form}
              fieldCategories={availableFieldCategories}
              categories={categories}
              quantity={String(remainingQuantity)}
              isPartialClassification={isPartialClassification}
              drafts={drafts}
              onAddDraft={handleAddDraft}
              onRemoveDraft={handleRemoveDraft}
              onUpdateDraft={handleUpdateDraft}
              onUpdateDraftQuantity={handleUpdateDraftQuantity}
            />
          </>
        )}

        {error ? <p className="seasons-manager__error">{error}</p> : null}

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
            marginTop: 16,
          }}
        >
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {form.cancel}
          </button>
          <SubmitButton
            type="button"
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={!isFormReady || remainingQuantity <= 0}
            isLoading={isSubmitting}
            loadingText={sf.saving}
          >
            {sf.save}
          </SubmitButton>
        </div>
      </div>
    </div>
  );
}
