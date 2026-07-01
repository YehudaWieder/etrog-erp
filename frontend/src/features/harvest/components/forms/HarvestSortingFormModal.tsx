import type { Customer } from '../../../../services/customersApi';
import type { CustomerCategory } from '../../../../services/customerCategoriesApi';
import type { Trader } from '../../../../services/tradersApi';
import type { TraderCategoryWithShares } from '../../../../services/traderCategoriesApi';
import type { HarvestI18n } from '../../i18n';
import { getAvailableHarvestGradeOptions } from '../../utils/harvestPage.utils';
import styles from './styles/HarvestBulkFormModal.module.css';

type HarvestSortingFormHarvestOption = {
  value: string;
  label: string;
};

type HarvestSortingFormModalProps = {
  isOpen: boolean;
  restoreMode?: boolean;
  t: HarvestI18n;
  harvestOptions: HarvestSortingFormHarvestOption[];
  selectedHarvestSummary: {
    dateGregorian: string;
    totalHarvested: string;
    totalRejected: string;
    classifiedTotal: string;
  } | null;
  traders: Trader[];
  customers: Customer[];
  isSubmittingHarvestSortingForm: boolean;
  harvestSortingFormError: string;
  harvestSortingFormHarvestId: string;
  harvestSortingFormAssignmentType: 'GENERAL' | 'TRADER' | 'CUSTOMER';
  harvestSortingFormTraderId: string;
  harvestSortingFormCustomerId: string;
  harvestSortingFormTraderCategoryId: string;
  harvestSortingFormCustomerCategoryId: string;
  harvestSortingFormGrade: string;
  harvestSortingFormPitamStatus: 'WITH_PITAM' | 'WITHOUT_PITAM' | 'MIXED' | '';
  harvestSortingFormQuantity: string;
  harvestSortingFormNotes: string;
  harvestSortingFormIsPartialClassification: boolean;
  harvestFormTraderCategories: TraderCategoryWithShares[];
  harvestFormCustomerCategories: CustomerCategory[];
  onClose: () => void;
  onSubmit: () => void;
  onHarvestIdChange: (value: string) => void;
  onAssignmentTypeChange: (value: 'GENERAL' | 'TRADER' | 'CUSTOMER') => void;
  onTraderIdChange: (value: string) => void;
  onCustomerIdChange: (value: string) => void;
  onTraderCategoryIdChange: (value: string) => void;
  onCustomerCategoryIdChange: (value: string) => void;
  onGradeChange: (value: string) => void;
  onPitamStatusChange: (value: 'WITH_PITAM' | 'WITHOUT_PITAM' | 'MIXED' | '') => void;
  onQuantityChange: (value: string) => void;
  onNotesChange: (nextNotes: string, textareaElement: HTMLTextAreaElement) => void;
  onPartialClassificationChange: (value: boolean) => void;
};

export function HarvestSortingFormModal({
  isOpen,
  restoreMode = false,
  t,
  harvestOptions,
  selectedHarvestSummary,
  traders,
  customers,
  isSubmittingHarvestSortingForm,
  harvestSortingFormError,
  harvestSortingFormHarvestId,
  harvestSortingFormAssignmentType,
  harvestSortingFormTraderId,
  harvestSortingFormCustomerId,
  harvestSortingFormTraderCategoryId,
  harvestSortingFormCustomerCategoryId,
  harvestSortingFormGrade,
  harvestSortingFormPitamStatus,
  harvestSortingFormQuantity,
  harvestSortingFormNotes,
  harvestSortingFormIsPartialClassification,
  harvestFormTraderCategories,
  harvestFormCustomerCategories,
  onClose,
  onSubmit,
  onHarvestIdChange,
  onAssignmentTypeChange,
  onTraderIdChange,
  onCustomerIdChange,
  onTraderCategoryIdChange,
  onCustomerCategoryIdChange,
  onGradeChange,
  onPitamStatusChange,
  onQuantityChange,
  onNotesChange,
  onPartialClassificationChange,
}: HarvestSortingFormModalProps): JSX.Element | null {
  if (!isOpen) {
    return null;
  }

  const form = t.bulkForm;
  const availableCustomerCategories = harvestSortingFormCustomerId
    ? harvestFormCustomerCategories.filter((category) => String(category.customerId) === harvestSortingFormCustomerId)
    : [];

  const selectedCustomerCategoryGrade = availableCustomerCategories.find(
    (category) => String(category.id) === harvestSortingFormCustomerCategoryId,
  )?.grade ?? '';

  const selectedTraderCategoryName = harvestFormTraderCategories.find(
    (category) => String(category.id) === harvestSortingFormTraderCategoryId,
  )?.name;

  const availableGradeOptions = getAvailableHarvestGradeOptions(selectedTraderCategoryName);

  const handleTraderCategoryIdChange = (nextTraderCategoryId: string) => {
    onTraderCategoryIdChange(nextTraderCategoryId);

    const nextTraderCategoryName = harvestFormTraderCategories.find(
      (category) => String(category.id) === nextTraderCategoryId,
    )?.name;
    const nextGradeOptions = getAvailableHarvestGradeOptions(nextTraderCategoryName);

    if (harvestSortingFormGrade && !(nextGradeOptions as readonly string[]).includes(harvestSortingFormGrade)) {
      onGradeChange('');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal-dialog modal-dialog--form ${styles.modal}`}
        role="dialog"
        aria-modal="true"
        aria-label={t.sortingForm.ariaLabel}
        onClick={(event) => event.stopPropagation()}
      >
        <button className="modal-close" type="button" aria-label={t.sortingForm.closeLabel} onClick={onClose}>
          X
        </button>

        <h3 className="modal-title">{restoreMode ? t.sortingForm.restoreTitle : t.sortingForm.title}</h3>
        <p className="modal-message">{t.sortingForm.instructions}</p>

        <div className={`management-form-grid ${styles.grid} ${styles.gridPrimary}`}>
          <label className={styles.selectionField}>
            <span>{t.sortingForm.harvestLabel}</span>
            <select
              className={`seasons-manager__year-input ${styles.compactSelect}`}
              value={harvestSortingFormHarvestId}
              onChange={(event) => onHarvestIdChange(event.target.value)}
            >
              <option value="">{t.sortingForm.harvestPlaceholder}</option>
              {harvestOptions.map((option) => (
                <option key={`sorting-form-harvest-${option.value}`} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.summaryField}>
            <span>{t.sortingForm.dateGregorianLabel}</span>
            <input
              className="seasons-manager__year-input"
              type="text"
              value={selectedHarvestSummary?.dateGregorian ?? ''}
              readOnly
              aria-label={t.sortingForm.dateGregorianLabel}
            />
          </label>

          <label className={styles.summaryField}>
            <span>{t.sortingForm.totalHarvestedLabel}</span>
            <input
              className="seasons-manager__year-input"
              type="text"
              value={selectedHarvestSummary?.totalHarvested ?? ''}
              readOnly
              aria-label={t.sortingForm.totalHarvestedLabel}
            />
          </label>

          <label className={styles.summaryField}>
            <span>{t.sortingForm.totalRejectedLabel}</span>
            <input
              className="seasons-manager__year-input"
              type="text"
              value={selectedHarvestSummary?.totalRejected ?? ''}
              readOnly
              aria-label={t.sortingForm.totalRejectedLabel}
            />
          </label>

          <label className={styles.summaryField}>
            <span>{t.sortingForm.classifiedTotalLabel}</span>
            <input
              className="seasons-manager__year-input"
              type="text"
              value={selectedHarvestSummary?.classifiedTotal ?? ''}
              readOnly
              aria-label={t.sortingForm.classifiedTotalLabel}
            />
          </label>
        </div>

        <fieldset className={styles.classificationMode} aria-label={form.classificationModeLabel}>
          <legend>{form.classificationModeLabel}</legend>
          <p className={styles.classificationModeHint}>{form.classificationModeHint}</p>
          <label>
            <input
              type="radio"
              name="sorting-classification-mode"
              checked={!harvestSortingFormIsPartialClassification}
              onChange={() => onPartialClassificationChange(false)}
            />
            <span>{form.fullSorting}</span>
          </label>
          <label>
            <input
              type="radio"
              name="sorting-classification-mode"
              checked={harvestSortingFormIsPartialClassification}
              onChange={() => onPartialClassificationChange(true)}
            />
            <span>{form.partialSorting}</span>
          </label>
        </fieldset>

        <div className={`management-form-grid ${styles.grid} ${styles.gridPrimary}`}>
          <label className={styles.selectionField}>
            <span>{form.assignmentTypeLabel}</span>
            <select
              className="seasons-manager__year-input"
              value={harvestSortingFormAssignmentType}
              onChange={(event) => onAssignmentTypeChange(event.target.value as 'GENERAL' | 'TRADER' | 'CUSTOMER')}
            >
              <option value="GENERAL">{form.assignmentOptions.general}</option>
              <option value="TRADER">{form.assignmentOptions.trader}</option>
              <option value="CUSTOMER">{form.assignmentOptions.customer}</option>
            </select>
          </label>

          {harvestSortingFormAssignmentType === 'TRADER' ? (
            <label className={styles.selectionField}>
              <span>{form.traderLabel}</span>
              <select
                className="seasons-manager__year-input"
                value={harvestSortingFormTraderId}
                onChange={(event) => onTraderIdChange(event.target.value)}
              >
                <option value="">{form.traderPlaceholder}</option>
                {[...traders].sort((left, right) => left.name.localeCompare(right.name)).map((trader) => (
                  <option key={`sorting-form-trader-${trader.id}`} value={String(trader.id)}>
                    {trader.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {harvestSortingFormAssignmentType === 'GENERAL' || harvestSortingFormAssignmentType === 'TRADER' ? (
            <label className={styles.selectionField}>
              <span>{form.traderCategoryLabel}</span>
              <select
                className="seasons-manager__year-input"
                value={harvestSortingFormTraderCategoryId}
                onChange={(event) => handleTraderCategoryIdChange(event.target.value)}
              >
                <option value="">{form.traderCategoryPlaceholder}</option>
                {harvestFormTraderCategories.map((category) => (
                  <option key={`sorting-form-trader-category-${category.id}`} value={String(category.id)}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {harvestSortingFormAssignmentType === 'GENERAL' || harvestSortingFormAssignmentType === 'TRADER' ? (
            <label className={styles.selectionField}>
              <span>{form.gradeLabel}</span>
              <select
                className="seasons-manager__year-input"
                value={harvestSortingFormGrade}
                onChange={(event) => onGradeChange(event.target.value)}
              >
                <option value="">{form.gradePlaceholder}</option>
                {availableGradeOptions.map((grade) => (
                  <option key={`sorting-form-grade-${grade}`} value={grade}>
                    {grade}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {harvestSortingFormAssignmentType === 'CUSTOMER' ? (
            <>
              <label className={styles.selectionField}>
                <span>{form.customerLabel}</span>
                <select
                  className="seasons-manager__year-input"
                  value={harvestSortingFormCustomerId}
                  onChange={(event) => onCustomerIdChange(event.target.value)}
                >
                  <option value="">{form.customerPlaceholder}</option>
                  {[...customers]
                    .sort((left, right) => left.customerName.localeCompare(right.customerName))
                    .map((customer) => (
                      <option key={`sorting-form-customer-${customer.id}`} value={String(customer.id)}>
                        {customer.customerName}
                      </option>
                    ))}
                </select>
              </label>

              <label className={styles.selectionField}>
                <span>{form.customerCategoryLabel}</span>
                <select
                  className="seasons-manager__year-input"
                  value={harvestSortingFormCustomerCategoryId}
                  onChange={(event) => onCustomerCategoryIdChange(event.target.value)}
                  disabled={!harvestSortingFormCustomerId}
                >
                  <option value="">{form.customerCategoryPlaceholder}</option>
                  {availableCustomerCategories.map((category) => (
                    <option key={`sorting-form-customer-category-${category.id}`} value={String(category.id)}>
                      {`${category.name} — ${category.grade}`}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.selectionField}>
                <span>{form.gradeLabel}</span>
                <input
                  className="seasons-manager__year-input"
                  type="text"
                  value={selectedCustomerCategoryGrade}
                  readOnly
                  aria-label={form.gradeLabel}
                />
              </label>
            </>
          ) : null}

          <label className={styles.selectionField}>
            <span>{form.pitamStatusLabel}</span>
            <select
              className="seasons-manager__year-input"
              value={harvestSortingFormPitamStatus}
              onChange={(event) => onPitamStatusChange(event.target.value as 'WITH_PITAM' | 'WITHOUT_PITAM' | 'MIXED' | '')}
            >
              <option value="">{form.pitamStatusPlaceholder}</option>
              <option value="WITH_PITAM">{form.pitamOptions.withPitam}</option>
              <option value="WITHOUT_PITAM">{form.pitamOptions.withoutPitam}</option>
              <option value="MIXED">{form.pitamOptions.mixed}</option>
            </select>
          </label>

          <label className={styles.selectionField}>
            <span>{form.quantityLabel}</span>
            <input
              className="seasons-manager__year-input harvest-bulk-form-number-input"
              type="number"
              min="0"
              required
              value={harvestSortingFormQuantity}
              onChange={(event) => onQuantityChange(event.target.value)}
              placeholder={form.quantityPlaceholder}
              aria-label={form.quantityLabel}
            />
          </label>

          <label className={`${styles.selectionField} ${styles.notes}`}>
            <span>{form.sortingNotesLabel}</span>
            <textarea
              className={`seasons-manager__year-input ${styles.notesTextarea}`}
              rows={1}
              value={harvestSortingFormNotes}
              onChange={(event) => onNotesChange(event.target.value, event.currentTarget)}
              placeholder={form.sortingNotesPlaceholder}
              aria-label={form.sortingNotesLabel}
            />
          </label>
        </div>

        {harvestSortingFormError ? <p className="seasons-manager__error">{harvestSortingFormError}</p> : null}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {form.cancel}
          </button>
          <button type="button" className="btn btn-primary" onClick={onSubmit} disabled={isSubmittingHarvestSortingForm}>
            {restoreMode
              ? (isSubmittingHarvestSortingForm ? t.sortingForm.restoring : t.sortingForm.restore)
              : (isSubmittingHarvestSortingForm ? t.sortingForm.saving : t.sortingForm.save)}
          </button>
        </div>
      </div>
    </div>
  );
}