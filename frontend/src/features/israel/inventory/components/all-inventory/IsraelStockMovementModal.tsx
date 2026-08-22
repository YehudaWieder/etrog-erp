import { useMemo, useState } from 'react';
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa6';
import { CustomSelect } from '../../../../../components/ui/CustomSelect';
import { SubmitButton } from '../../../../../components/ui/SubmitButton';
import { TopLoadingBar } from '../../../../../components/ui/TopLoadingBar';
import type { IsraelField } from '../../../../../services/israel/israelFieldsApi';
import type { IsraelSortCategory } from '../../../../../services/israel/israelSortCategoriesApi';
import type {
  CreateIsraelStockMovementPayload,
  IsraelManualMovementType,
  IsraelStockRecord,
} from '../../../../../services/israel/israelStockApi';
import type { IsraelPitamStatus } from '../../../../../services/israel/israelClassificationsApi';
import type { IsraelInventoryI18n } from '../../i18n';
import styles from '../../../../harvest/components/forms/styles/HarvestBulkFormModal.module.css';
import typePickerStyles from '../../../../traders/components/styles/MovementTypePicker.module.css';

const MANUAL_MOVEMENT_TYPES: IsraelManualMovementType[] = [
  'SELF_PICKUP',
  'WASTE',
];

type IsraelStockMovementModalProps = {
  isOpen: boolean;
  lang: 'he' | 'en';
  labels: IsraelInventoryI18n['addMovement'];
  seasonId: number | null;
  fields: IsraelField[];
  sortCategories: IsraelSortCategory[];
  stockRows: IsraelStockRecord[];
  isLoadingStock: boolean;
  isSubmitting: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (payload: CreateIsraelStockMovementPayload) => void;
};

export function IsraelStockMovementModal({
  isOpen,
  lang,
  labels,
  seasonId,
  fields,
  sortCategories,
  stockRows,
  isLoadingStock,
  isSubmitting,
  error,
  onClose,
  onSubmit,
}: IsraelStockMovementModalProps) {
  const [type, setType] = useState<IsraelManualMovementType | ''>('');
  const [fieldId, setFieldId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [grade, setGrade] = useState('');
  const [pitamStatus, setPitamStatus] = useState<IsraelPitamStatus | ''>('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [validationError, setValidationError] = useState('');

  const quantityValue = Number(quantity);

  const selectedCategory = useMemo(
    () => sortCategories.find((category) => String(category.id) === categoryId),
    [sortCategories, categoryId],
  );

  const stockRowsForField = useMemo(() => {
    if (fieldId === '') return [];
    const numericFieldId = Number(fieldId);
    return stockRows.filter((row) => row.fieldId === numericFieldId);
  }, [stockRows, fieldId]);

  const categoryOptions = useMemo(() => {
    const availableTotals = new Map<number, number>();
    for (const row of stockRowsForField) {
      availableTotals.set(
        row.categoryId,
        (availableTotals.get(row.categoryId) ?? 0) + row.quantity,
      );
    }

    return sortCategories
      .filter((category) => (availableTotals.get(category.id) ?? 0) > 0)
      .map((category) => ({
        value: String(category.id),
        label: category.name,
      }));
  }, [sortCategories, stockRowsForField]);

  const gradeOptions = useMemo(() => {
    if (!selectedCategory) return [];

    const availableTotals = new Map<string, number>();
    for (const row of stockRowsForField) {
      if (row.categoryId !== selectedCategory.id) continue;
      availableTotals.set(
        row.grade,
        (availableTotals.get(row.grade) ?? 0) + row.quantity,
      );
    }

    return selectedCategory.supportedGrades
      .filter((option) => (availableTotals.get(option) ?? 0) > 0)
      .map((option) => ({ value: option, label: option }));
  }, [selectedCategory, stockRowsForField]);

  const pitamStatusOptions = useMemo(() => {
    if (!selectedCategory || grade === '') return [];

    const availableTotals = new Map<IsraelPitamStatus, number>();
    for (const row of stockRowsForField) {
      if (row.categoryId !== selectedCategory.id || row.grade !== grade)
        continue;
      availableTotals.set(
        row.pitamStatus,
        (availableTotals.get(row.pitamStatus) ?? 0) + row.quantity,
      );
    }

    return (['WITH_PITAM', 'WITHOUT_PITAM', 'MIXED'] as const)
      .filter((option) => (availableTotals.get(option) ?? 0) > 0)
      .map((option) => ({
        value: option,
        label:
          option === 'WITH_PITAM'
            ? labels.pitamOptions.withPitam
            : option === 'WITHOUT_PITAM'
              ? labels.pitamOptions.withoutPitam
              : labels.pitamOptions.mixed,
      }));
  }, [selectedCategory, grade, stockRowsForField, labels.pitamOptions]);

  const availableQuantity = useMemo(() => {
    if (
      fieldId === '' ||
      categoryId === '' ||
      grade === '' ||
      pitamStatus === ''
    ) {
      return null;
    }

    const numericCategoryId = Number(categoryId);

    return stockRowsForField.reduce((sum, row) => {
      if (
        row.categoryId === numericCategoryId &&
        row.grade === grade &&
        row.pitamStatus === pitamStatus
      ) {
        return sum + row.quantity;
      }
      return sum;
    }, 0);
  }, [stockRowsForField, fieldId, categoryId, grade, pitamStatus]);

  if (!isOpen) return null;

  const handleTypeChange = (nextType: IsraelManualMovementType | '') => {
    setType(nextType);
    setFieldId('');
    setCategoryId('');
    setGrade('');
    setPitamStatus('');
    setQuantity('');
    setNotes('');
    setValidationError('');
  };

  const handleSubmit = () => {
    setValidationError('');

    if (
      type === '' ||
      seasonId === null ||
      fieldId === '' ||
      categoryId === '' ||
      grade === '' ||
      pitamStatus === '' ||
      !Number.isFinite(quantityValue) ||
      quantityValue <= 0
    ) {
      setValidationError(labels.validationRequiredError);
      return;
    }

    if (availableQuantity !== null && quantityValue > availableQuantity) {
      setValidationError(
        labels.quantityExceedsAvailableError(availableQuantity),
      );
      return;
    }

    onSubmit({
      seasonId,
      date: new Date().toISOString(),
      fieldId: Number(fieldId),
      categoryId: Number(categoryId),
      grade,
      pitamStatus,
      quantity: quantityValue,
      type,
      notes: notes || undefined,
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal-dialog modal-dialog--form ${styles.modal}`}
        role="dialog"
        aria-modal="true"
        aria-label={labels.modalTitle}
        dir={lang === 'he' ? 'rtl' : 'ltr'}
        style={{ width: 820, minHeight: 480 }}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="modal-close"
          type="button"
          aria-label={labels.cancel}
          onClick={onClose}
        >
          X
        </button>

        <h3 className="modal-title" style={{ position: 'relative' }}>
          {labels.modalTitle}
          <TopLoadingBar isLoading={isLoadingStock} />
        </h3>

        <div className={typePickerStyles.groups}>
          <span className={typePickerStyles.groupLabel}>
            {labels.chooseTypeLabel}
          </span>

          {type !== '' ? (
            <div className={typePickerStyles.selectedRow}>
              <button
                type="button"
                className={typePickerStyles.backButton}
                aria-label={labels.backLabel}
                onClick={() => handleTypeChange('')}
              >
                {lang === 'he' ? <FaArrowRight /> : <FaArrowLeft />}
              </button>
              <div className={typePickerStyles.grid}>
                <button
                  type="button"
                  className={`${typePickerStyles.button} ${typePickerStyles.buttonSelected}`}
                  onClick={() => handleTypeChange('')}
                >
                  {
                    labels.typeOptions[
                      type === 'SELF_PICKUP' ? 'selfPickup' : 'waste'
                    ]
                  }
                </button>
              </div>
            </div>
          ) : (
            <div className={typePickerStyles.group}>
              <span className={typePickerStyles.groupLabel}>
                {labels.typeSectionLabel}
              </span>
              <div className={typePickerStyles.grid}>
                {MANUAL_MOVEMENT_TYPES.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={typePickerStyles.button}
                    onClick={() => handleTypeChange(option)}
                  >
                    {
                      labels.typeOptions[
                        option === 'SELF_PICKUP' ? 'selfPickup' : 'waste'
                      ]
                    }
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {type !== '' ? (
          <div
            className={`management-form-grid ${styles.grid}`}
            style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}
          >
            <label className={styles.summaryField}>
              <span>{labels.fieldLabel}</span>
              <CustomSelect
                value={fieldId}
                onChange={(value) => {
                  setFieldId(value);
                  setCategoryId('');
                  setGrade('');
                  setPitamStatus('');
                  setQuantity('');
                  setNotes('');
                }}
                placeholder={labels.fieldPlaceholder}
                options={fields.map((field) => ({
                  value: String(field.id),
                  label: field.name,
                }))}
                ariaLabel={labels.fieldLabel}
              />
            </label>

            <label className={styles.summaryField}>
              <span>{labels.categoryLabel}</span>
              <CustomSelect
                value={categoryId}
                onChange={(value) => {
                  setCategoryId(value);
                  setGrade('');
                  setPitamStatus('');
                  setQuantity('');
                  setNotes('');
                }}
                placeholder={labels.categoryPlaceholder}
                disabled={fieldId === '' || categoryOptions.length === 0}
                options={categoryOptions}
                ariaLabel={labels.categoryLabel}
              />
            </label>

            <label className={styles.summaryField}>
              <span>{labels.gradeLabel}</span>
              <CustomSelect
                value={grade}
                onChange={(value) => {
                  setGrade(value);
                  setPitamStatus('');
                  setQuantity('');
                  setNotes('');
                }}
                placeholder={labels.gradePlaceholder}
                disabled={!selectedCategory || gradeOptions.length === 0}
                options={gradeOptions}
                ariaLabel={labels.gradeLabel}
              />
            </label>

            <label className={styles.summaryField}>
              <span>{labels.pitamStatusLabel}</span>
              <CustomSelect
                value={pitamStatus}
                onChange={(value) => {
                  setPitamStatus(value as IsraelPitamStatus);
                  setQuantity('');
                  setNotes('');
                }}
                placeholder={labels.pitamStatusPlaceholder}
                disabled={grade === '' || pitamStatusOptions.length === 0}
                options={pitamStatusOptions}
                ariaLabel={labels.pitamStatusLabel}
              />
            </label>

            <label className={styles.summaryField}>
              <span>{labels.quantityLabel}</span>
              <input
                className="seasons-manager__year-input harvest-bulk-form-number-input"
                type="number"
                min={1}
                max={availableQuantity ?? undefined}
                required
                disabled={pitamStatus === ''}
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                aria-label={labels.quantityLabel}
              />
              <span
                style={{
                  fontSize: 12,
                  opacity: 0.75,
                  visibility: availableQuantity !== null ? 'visible' : 'hidden',
                }}
              >
                {availableQuantity !== null
                  ? labels.availableQuantityHint(availableQuantity)
                  : ' '}
              </span>
            </label>

            <label className={`${styles.summaryField} ${styles.notesWithMode}`}>
              <span>{labels.notesLabel}</span>
              <textarea
                className={`seasons-manager__year-input ${styles.notesTextarea}`}
                rows={1}
                disabled={!Number.isFinite(quantityValue) || quantityValue <= 0}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                aria-label={labels.notesLabel}
              />
            </label>
          </div>
        ) : null}

        {validationError || error ? (
          <p className="seasons-manager__error">{validationError || error}</p>
        ) : null}

        <div className="modal-actions" style={{ marginTop: 'auto' }}>
          <button
            className="btn btn-danger"
            onClick={onClose}
            type="button"
            disabled={isSubmitting}
          >
            {labels.cancel}
          </button>
          <SubmitButton
            className="btn btn-success"
            onClick={handleSubmit}
            type="button"
            isLoading={isSubmitting}
            loadingText={labels.saving}
          >
            {labels.save}
          </SubmitButton>
        </div>
      </div>
    </div>
  );
}
