import { SubmitButton } from '../../../../components/ui/SubmitButton';
import { TopLoadingBar } from '../../../../components/ui/TopLoadingBar';
import type { Customer } from '../../../../services/customersApi';
import type { CustomerCategory } from '../../../../services/customerCategoriesApi';
import type { ClassificationRecord } from '../../../../services/classificationsApi';
import type { Trader } from '../../../../services/tradersApi';
import type { TraderCategoryWithShares } from '../../../../services/traderCategoriesApi';
import type { HarvestFormClassificationDraft } from '../../harvestPage.types';
import type { HarvestI18n } from '../../i18n';
import { HarvestClassificationRowsSection } from './HarvestClassificationRowsSection';
import type { PitamRowKey } from '../../utils/harvestClassificationMatrix.util';
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
  isLoadingHarvestOptions: boolean;
  selectedHarvestSummary: {
    dateGregorian: string;
    dateHebrew: string;
    totalHarvested: string;
    totalRejected: string;
    classifiedTotal: string;
  } | null;
  rawTotals: { totalHarvested: number; totalRejected: number; ownerRejected: number } | null;
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
  harvestSortingFormTotalHarvested: string;
  harvestSortingFormOwnerHarvested: string;
  harvestSortingFormUncalculatedRejected: string;
  harvestSortingFormRemainsInItalyGradeH: boolean;
  harvestSortingFormRemainsInItalyGradeV: boolean;
  isAddingRejectedQuantity: boolean;
  harvestSortingFormAdditionalRejected: string;
  isAddingOwnerRejectedQuantity: boolean;
  harvestSortingFormAdditionalOwnerRejected: string;
  harvestFormTraderCategories: TraderCategoryWithShares[];
  harvestFormCustomerCategories: CustomerCategory[];
  harvestFormClassifications: HarvestFormClassificationDraft[];
  existingHarvestClassifications: ClassificationRecord[];
  pendingExistingClassificationEdits: Record<number, string>;
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
  onTotalHarvestedChange: (value: string) => void;
  onOwnerHarvestedChange: (value: string) => void;
  onUncalculatedRejectedChange: (value: string) => void;
  onRemainsInItalyGradeHChange: (value: boolean) => void;
  onRemainsInItalyGradeVChange: (value: boolean) => void;
  onOpenAddRejectedQuantity: () => void;
  onAdditionalRejectedQuantityChange: (value: string) => void;
  onRemoveAddedRejectedQuantity: () => void;
  onOpenAddOwnerRejectedQuantity: () => void;
  onAdditionalOwnerRejectedQuantityChange: (value: string) => void;
  onRemoveAddedOwnerRejectedQuantity: () => void;
  onAddClassificationDraft: () => void;
  onRemoveClassificationDraft: (draftId: string) => void;
  onUpdateClassificationDraft: (draftId: string, updater: Partial<HarvestFormClassificationDraft>) => void;
  onUpdateClassificationDraftQuantity: (draftId: string, pitamKey: PitamRowKey, gradeKey: string, value: string) => void;
  onStageExistingClassificationQuantity: (classificationId: number, value: string | null) => void;
};

export function HarvestSortingFormModal({
  isOpen,
  restoreMode = false,
  t,
  harvestOptions,
  isLoadingHarvestOptions,
  selectedHarvestSummary,
  rawTotals,
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
  harvestSortingFormTotalHarvested,
  harvestSortingFormOwnerHarvested,
  harvestSortingFormUncalculatedRejected,
  harvestSortingFormRemainsInItalyGradeH,
  harvestSortingFormRemainsInItalyGradeV,
  isAddingRejectedQuantity,
  harvestSortingFormAdditionalRejected,
  isAddingOwnerRejectedQuantity,
  harvestSortingFormAdditionalOwnerRejected,
  harvestFormTraderCategories,
  harvestFormCustomerCategories,
  harvestFormClassifications,
  existingHarvestClassifications,
  pendingExistingClassificationEdits,
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
  onTotalHarvestedChange,
  onOwnerHarvestedChange,
  onUncalculatedRejectedChange,
  onRemainsInItalyGradeHChange,
  onRemainsInItalyGradeVChange,
  onOpenAddRejectedQuantity,
  onAdditionalRejectedQuantityChange,
  onRemoveAddedRejectedQuantity,
  onOpenAddOwnerRejectedQuantity,
  onAdditionalOwnerRejectedQuantityChange,
  onRemoveAddedOwnerRejectedQuantity,
  onAddClassificationDraft,
  onRemoveClassificationDraft,
  onUpdateClassificationDraft,
  onUpdateClassificationDraftQuantity,
  onStageExistingClassificationQuantity,
}: HarvestSortingFormModalProps): JSX.Element | null {
  if (!isOpen) {
    return null;
  }

  const form = t.bulkForm;
  const isHarvestSelected = harvestSortingFormHarvestId !== '';
  const isFormReady = isHarvestSelected && !isLoadingHarvestOptions;
  const availableCustomerCategories = harvestSortingFormCustomerId
    ? harvestFormCustomerCategories.filter((category) => String(category.customerId) === harvestSortingFormCustomerId)
    : [];

  const selectedCustomerCategoryGrade = availableCustomerCategories.find(
    (category) => String(category.id) === harvestSortingFormCustomerCategoryId,
  )?.grade ?? '';

  const selectedTraderCategoryName = harvestFormTraderCategories.find(
    (category) => String(category.id) === harvestSortingFormTraderCategoryId,
  )?.name;

  const restoreAssignmentTypeLabel = harvestSortingFormAssignmentType === 'TRADER'
    ? form.assignmentOptions.trader
    : harvestSortingFormAssignmentType === 'CUSTOMER'
      ? form.assignmentOptions.customer
      : form.assignmentOptions.general;

  const restoreTraderName = traders.find(
    (trader) => String(trader.id) === harvestSortingFormTraderId,
  )?.name ?? '';

  const restoreCustomerName = customers.find(
    (customer) => String(customer.id) === harvestSortingFormCustomerId,
  )?.customerName ?? '';

  const restoreCustomerCategoryLabel = availableCustomerCategories.find(
    (category) => String(category.id) === harvestSortingFormCustomerCategoryId,
  );
  const restoreCustomerCategoryText = restoreCustomerCategoryLabel
    ? `${restoreCustomerCategoryLabel.name} — ${restoreCustomerCategoryLabel.grade}`
    : '';

  const formatRejectionRate = (rejected: number | string, harvested: number | string) => {
    const rejectedValue = Number(rejected);
    const harvestedValue = Number(harvested);

    if (!harvestedValue || !Number.isFinite(harvestedValue) || harvestedValue <= 0 || !Number.isFinite(rejectedValue)) {
      return '';
    }

    return `${((rejectedValue / harvestedValue) * 100).toFixed(2)}%`;
  };

  const totalRejectionRate = formatRejectionRate(
    selectedHarvestSummary?.totalRejected ?? '',
    selectedHarvestSummary?.totalHarvested ?? '',
  );
  const ownerRejectionRate = formatRejectionRate(
    rawTotals?.ownerRejected ?? '',
    harvestSortingFormOwnerHarvested,
  );

  const restorePitamStatusLabel = harvestSortingFormPitamStatus === 'WITH_PITAM'
    ? form.pitamOptions.withPitam
    : harvestSortingFormPitamStatus === 'WITHOUT_PITAM'
      ? form.pitamOptions.withoutPitam
      : harvestSortingFormPitamStatus === 'MIXED'
        ? form.pitamOptions.mixed
        : '';

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

        <h3 className="modal-title" style={{ position: 'relative' }}>
          {restoreMode ? t.sortingForm.restoreTitle : t.sortingForm.title}
          <TopLoadingBar isLoading={isLoadingHarvestOptions} />
        </h3>
        <p className="modal-message">{t.sortingForm.instructions}</p>

        <div className={`management-form-grid ${styles.grid} ${styles.gridPrimary}`}>
          <label className={styles.selectionField}>
            <span>{t.sortingForm.harvestLabel}</span>
            {restoreMode ? (
              <input
                className={`seasons-manager__year-input ${styles.readOnlyField}`}
                type="text"
                value={harvestOptions.find((option) => option.value === harvestSortingFormHarvestId)?.label ?? ''}
                readOnly
                aria-label={t.sortingForm.harvestLabel}
              />
            ) : (
              <select
                className={`seasons-manager__year-input ${styles.compactSelect}`}
                value={harvestSortingFormHarvestId}
                onChange={(event) => onHarvestIdChange(event.target.value)}
                disabled={isLoadingHarvestOptions}
              >
                <option value="">{isLoadingHarvestOptions ? t.sortingForm.loadingHarvestOptions : t.sortingForm.harvestPlaceholder}</option>
                {harvestOptions.map((option) => (
                  <option key={`sorting-form-harvest-${option.value}`} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
          </label>

          <label className={styles.summaryField}>
            <span>{t.sortingForm.dateGregorianLabel}</span>
            <input
              className={`seasons-manager__year-input ${styles.readOnlyField}`}
              type="text"
              value={selectedHarvestSummary?.dateGregorian ?? ''}
              readOnly
              aria-label={t.sortingForm.dateGregorianLabel}
            />
          </label>

          <label className={styles.summaryField}>
            <span>{t.sortingForm.dateHebrewLabel}</span>
            <input
              className={`seasons-manager__year-input ${styles.readOnlyField}`}
              type="text"
              value={selectedHarvestSummary?.dateHebrew ?? ''}
              readOnly
              aria-label={t.sortingForm.dateHebrewLabel}
            />
          </label>

          <label className={styles.summaryField}>
            <span>{t.sortingForm.classifiedTotalLabel}</span>
            <input
              className={`seasons-manager__year-input ${styles.readOnlyField}`}
              type="text"
              value={selectedHarvestSummary?.classifiedTotal ?? ''}
              readOnly
              aria-label={t.sortingForm.classifiedTotalLabel}
            />
          </label>

          <label className={`${styles.summaryField} ${styles.numberInputFirst}`}>
            <span>{t.sortingForm.totalHarvestedLabel}</span>
            {restoreMode ? (
              <input
                className={`seasons-manager__year-input ${styles.readOnlyField}`}
                type="text"
                value={selectedHarvestSummary?.totalHarvested ?? ''}
                readOnly
                aria-label={t.sortingForm.totalHarvestedLabel}
              />
            ) : (
              <input
                className="seasons-manager__year-input harvest-bulk-form-number-input"
                type="number"
                min="0"
                disabled={!isHarvestSelected}
                value={harvestSortingFormTotalHarvested}
                onChange={(event) => onTotalHarvestedChange(event.target.value)}
                aria-label={t.sortingForm.totalHarvestedLabel}
              />
            )}
          </label>

          <label className={styles.summaryField}>
            <span>{t.sortingForm.totalRejectedLabel}</span>
            <input
              className={`seasons-manager__year-input ${styles.readOnlyField}`}
              type="text"
              value={selectedHarvestSummary?.totalRejected ?? ''}
              readOnly
              aria-label={t.sortingForm.totalRejectedLabel}
            />
          </label>

          <label className={styles.summaryField}>
            <span>{form.rejectionRateLabel}</span>
            <input
              className={`seasons-manager__year-input ${styles.readOnlyField}`}
              type="text"
              value={totalRejectionRate}
              disabled
              aria-label={form.rejectionRateLabel}
            />
          </label>

          {!restoreMode ? (
            <label className={styles.summaryField}>
              <span>{form.uncalculatedRejectedLabel}</span>
              <input
                className="seasons-manager__year-input harvest-bulk-form-number-input"
                type="number"
                min="0"
                max={rawTotals?.totalRejected ?? undefined}
                value={harvestSortingFormUncalculatedRejected}
                disabled={!isHarvestSelected}
                onChange={(event) => onUncalculatedRejectedChange(event.target.value)}
                aria-label={form.uncalculatedRejectedLabel}
              />
              <p className={styles.quantityMatrixHint}>
                {form.uncalculatedRejectedPlaceholder(rawTotals?.totalRejected ?? 0)}
              </p>
            </label>
          ) : null}

          {!restoreMode ? (
            <label className={`${styles.summaryField} ${styles.numberInputFirst}`}>
              <span>{t.sortingForm.ownerHarvestedLabel}</span>
              <input
                className="seasons-manager__year-input harvest-bulk-form-number-input"
                type="number"
                min="0"
                disabled={!isHarvestSelected}
                value={harvestSortingFormOwnerHarvested}
                onChange={(event) => onOwnerHarvestedChange(event.target.value)}
                aria-label={t.sortingForm.ownerHarvestedLabel}
              />
            </label>
          ) : null}

          {!restoreMode ? (
            <label className={styles.summaryField}>
              <span>{t.sortingForm.ownerRejectedLabel}</span>
              <input
                className={`seasons-manager__year-input ${styles.readOnlyField}`}
                type="text"
                value={rawTotals ? String(rawTotals.ownerRejected) : ''}
                readOnly
                aria-label={t.sortingForm.ownerRejectedLabel}
              />
            </label>
          ) : null}

          {!restoreMode ? (
            <label className={styles.summaryField}>
              <span>{form.ownerRejectionRateLabel}</span>
              <input
                className={`seasons-manager__year-input ${styles.readOnlyField}`}
                type="text"
                value={ownerRejectionRate}
                disabled
                aria-label={form.ownerRejectionRateLabel}
              />
            </label>
          ) : null}

          {!restoreMode ? (
            <label className={`${styles.badPickField} ${styles.numberInputFirst}`}>
              <input
                type="checkbox"
                checked={harvestSortingFormRemainsInItalyGradeH}
                disabled={!isHarvestSelected}
                onChange={(event) => onRemainsInItalyGradeHChange(event.target.checked)}
              />
              <span>{form.remainsInItalyGradeHLabel}</span>
            </label>
          ) : null}

          {!restoreMode ? (
            <label className={styles.badPickField}>
              <input
                type="checkbox"
                checked={harvestSortingFormRemainsInItalyGradeV}
                disabled={!isHarvestSelected}
                onChange={(event) => onRemainsInItalyGradeVChange(event.target.checked)}
              />
              <span>{form.remainsInItalyGradeVLabel}</span>
            </label>
          ) : null}
        </div>

        {!isFormReady ? (
          <p className="seasons-manager__hint" style={{ margin: 0 }}>
            {isLoadingHarvestOptions ? t.sortingForm.loadingHarvestOptions : t.sortingForm.selectHarvestHint}
          </p>
        ) : (
          <>
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

        {restoreMode ? (
          <div className={`management-form-grid ${styles.grid} ${styles.gridPrimary}`}>
            <label className={styles.selectionField}>
              <span>{form.assignmentTypeLabel}</span>
              <input
                className={`seasons-manager__year-input ${styles.readOnlyField}`}
                type="text"
                value={restoreAssignmentTypeLabel}
                readOnly
                aria-label={form.assignmentTypeLabel}
              />
            </label>

            {harvestSortingFormAssignmentType === 'TRADER' ? (
              <label className={styles.selectionField}>
                <span>{form.traderLabel}</span>
                <input
                  className={`seasons-manager__year-input ${styles.readOnlyField}`}
                  type="text"
                  value={restoreTraderName}
                  readOnly
                  aria-label={form.traderLabel}
                />
              </label>
            ) : null}

            {harvestSortingFormAssignmentType === 'GENERAL' || harvestSortingFormAssignmentType === 'TRADER' ? (
              <label className={styles.selectionField}>
                <span>{form.traderCategoryLabel}</span>
                <input
                  className={`seasons-manager__year-input ${styles.readOnlyField}`}
                  type="text"
                  value={selectedTraderCategoryName ?? ''}
                  readOnly
                  aria-label={form.traderCategoryLabel}
                />
              </label>
            ) : null}

            {harvestSortingFormAssignmentType === 'GENERAL' || harvestSortingFormAssignmentType === 'TRADER' ? (
              <label className={styles.selectionField}>
                <span>{form.gradeLabel}</span>
                <input
                  className={`seasons-manager__year-input ${styles.readOnlyField}`}
                  type="text"
                  value={harvestSortingFormGrade}
                  readOnly
                  aria-label={form.gradeLabel}
                />
              </label>
            ) : null}

            {harvestSortingFormAssignmentType === 'CUSTOMER' ? (
              <>
                <label className={styles.selectionField}>
                  <span>{form.customerLabel}</span>
                  <input
                    className={`seasons-manager__year-input ${styles.readOnlyField}`}
                    type="text"
                    value={restoreCustomerName}
                    readOnly
                    aria-label={form.customerLabel}
                  />
                </label>

                <label className={styles.selectionField}>
                  <span>{form.customerCategoryLabel}</span>
                  <input
                    className={`seasons-manager__year-input ${styles.readOnlyField}`}
                    type="text"
                    value={restoreCustomerCategoryText}
                    readOnly
                    aria-label={form.customerCategoryLabel}
                  />
                </label>

                <label className={styles.selectionField}>
                  <span>{form.gradeLabel}</span>
                  <input
                    className={`seasons-manager__year-input ${styles.readOnlyField}`}
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
              <input
                className={`seasons-manager__year-input ${styles.readOnlyField}`}
                type="text"
                value={restorePitamStatusLabel}
                readOnly
                aria-label={form.pitamStatusLabel}
              />
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
          </div>
        ) : (
          <HarvestClassificationRowsSection
            isOpen={isOpen}
            form={form}
            formSubmissionText={t.formSubmission}
            traders={traders}
            customers={customers}
            totalHarvested={rawTotals ? String(rawTotals.totalHarvested) : ''}
            totalRejected={rawTotals ? String(rawTotals.totalRejected) : ''}
            ownerRejected={rawTotals ? String(rawTotals.ownerRejected) : ''}
            isPartialClassification={harvestSortingFormIsPartialClassification}
            harvestFormClassifications={harvestFormClassifications}
            harvestFormTraderCategories={harvestFormTraderCategories}
            harvestFormCustomerCategories={harvestFormCustomerCategories}
            existingHarvestClassifications={existingHarvestClassifications}
            pendingExistingClassificationEdits={pendingExistingClassificationEdits}
            isAddingRejectedQuantity={isAddingRejectedQuantity}
            additionalRejectedQuantity={harvestSortingFormAdditionalRejected}
            isAddingOwnerRejectedQuantity={isAddingOwnerRejectedQuantity}
            additionalOwnerRejectedQuantity={harvestSortingFormAdditionalOwnerRejected}
            onAddClassificationDraft={onAddClassificationDraft}
            onRemoveClassificationDraft={onRemoveClassificationDraft}
            onUpdateClassificationDraft={onUpdateClassificationDraft}
            onUpdateClassificationDraftQuantity={onUpdateClassificationDraftQuantity}
            onStageExistingClassificationQuantity={onStageExistingClassificationQuantity}
            onOpenAddRejectedQuantity={onOpenAddRejectedQuantity}
            onAdditionalRejectedQuantityChange={onAdditionalRejectedQuantityChange}
            onRemoveAddedRejectedQuantity={onRemoveAddedRejectedQuantity}
            onOpenAddOwnerRejectedQuantity={onOpenAddOwnerRejectedQuantity}
            onAdditionalOwnerRejectedQuantityChange={onAdditionalOwnerRejectedQuantityChange}
            onRemoveAddedOwnerRejectedQuantity={onRemoveAddedOwnerRejectedQuantity}
          />
        )}

        {restoreMode ? (
          <div className={`management-form-grid ${styles.grid} ${styles.gridPrimary}`}>
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
        ) : null}
          </>
        )}

        {harvestSortingFormError ? <p className="seasons-manager__error">{harvestSortingFormError}</p> : null}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {form.cancel}
          </button>
          <SubmitButton
            type="button"
            className="btn btn-primary"
            onClick={onSubmit}
            disabled={!isFormReady}
            isLoading={isSubmittingHarvestSortingForm}
            loadingText={restoreMode ? t.sortingForm.restoring : t.sortingForm.saving}
          >
            {restoreMode ? t.sortingForm.restore : t.sortingForm.save}
          </SubmitButton>
        </div>
      </div>
    </div>
  );
}
