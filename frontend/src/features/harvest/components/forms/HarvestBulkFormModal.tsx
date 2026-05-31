import type { Field } from '../../../../services/fieldsApi';
import type { Trader } from '../../../../services/tradersApi';
import type { Customer } from '../../../../services/customersApi';
import type { CustomerCategory } from '../../../../services/customerCategoriesApi';
import type { TraderCategoryWithShares } from '../../../../services/traderCategoriesApi';
import type { HarvestFormClassificationDraft } from '../../harvestPage.types';
import type { HarvestI18n } from '../../i18n';

type HarvestBulkFormModalProps = {
  isOpen: boolean;
  lang: 'he' | 'en';
  t: HarvestI18n;
  fields: Field[];
  traders: Trader[];
  customers: Customer[];
  isSubmittingHarvestForm: boolean;
  harvestFormError: string;
  harvestFormFieldId: string;
  harvestFormDateGregorian: string;
  harvestFormDateHebrew: string;
  harvestFormTotalHarvested: string;
  harvestFormTotalRejected: string;
  harvestFormOwnerHarvested: string;
  harvestFormOwnerRejected: string;
  harvestFormIsPartialClassification: boolean;
  harvestFormNotes: string;
  harvestFormClassifications: HarvestFormClassificationDraft[];
  harvestFormTraderCategories: TraderCategoryWithShares[];
  harvestFormCustomerCategories: CustomerCategory[];
  onClose: () => void;
  onSubmit: () => void;
  onFieldIdChange: (value: string) => void;
  onGregorianDateChange: (value: string) => void;
  onHebrewDateChange: (value: string) => void;
  onTotalHarvestedChange: (value: string) => void;
  onTotalRejectedChange: (value: string) => void;
  onOwnerHarvestedChange: (value: string) => void;
  onOwnerRejectedChange: (value: string) => void;
  onPartialClassificationChange: (value: boolean) => void;
  onNotesChange: (nextNotes: string, textareaElement: HTMLTextAreaElement) => void;
  onAddClassificationDraft: () => void;
  onRemoveClassificationDraft: (draftId: string) => void;
  onUpdateClassificationDraft: (draftId: string, updater: Partial<HarvestFormClassificationDraft>) => void;
};

export function HarvestBulkFormModal({
  isOpen,
  lang,
  t,
  fields,
  traders,
  customers,
  isSubmittingHarvestForm,
  harvestFormError,
  harvestFormFieldId,
  harvestFormDateGregorian,
  harvestFormDateHebrew,
  harvestFormTotalHarvested,
  harvestFormTotalRejected,
  harvestFormOwnerHarvested,
  harvestFormOwnerRejected,
  harvestFormIsPartialClassification,
  harvestFormNotes,
  harvestFormClassifications,
  harvestFormTraderCategories,
  harvestFormCustomerCategories,
  onClose,
  onSubmit,
  onFieldIdChange,
  onGregorianDateChange,
  onHebrewDateChange,
  onTotalHarvestedChange,
  onTotalRejectedChange,
  onOwnerHarvestedChange,
  onOwnerRejectedChange,
  onPartialClassificationChange,
  onNotesChange,
  onAddClassificationDraft,
  onRemoveClassificationDraft,
  onUpdateClassificationDraft,
}: HarvestBulkFormModalProps) {
  if (!isOpen) {
    return null;
  }

  const form = t.bulkForm;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-dialog modal-dialog--form harvest-bulk-form-modal"
        role="dialog"
        aria-modal="true"
        aria-label={form.ariaLabel}
        onClick={(event) => event.stopPropagation()}
      >
        <button className="modal-close" type="button" aria-label={form.closeLabel} onClick={onClose}>
          X
        </button>

        <h3 className="modal-title">{form.title}</h3>
        <p className="modal-message">{form.instructions}</p>

        <div className="management-form-grid harvest-bulk-form-grid harvest-bulk-form-grid--primary">
          <select
            className="seasons-manager__year-input"
            value={harvestFormFieldId}
            onChange={(event) => onFieldIdChange(event.target.value)}
            aria-label={form.fieldLabel}
          >
            <option value="">{form.fieldPlaceholder}</option>
            {fields.map((field) => (
              <option key={`harvest-form-field-${field.id}`} value={String(field.id)}>
                {field.name}
              </option>
            ))}
          </select>

          <input
            className="seasons-manager__year-input"
            type="date"
            value={harvestFormDateGregorian}
            onChange={(event) => onGregorianDateChange(event.target.value)}
            aria-label={form.gregorianDateLabel}
          />

          <input
            className="seasons-manager__year-input"
            type="text"
            value={harvestFormDateHebrew}
            onChange={(event) => onHebrewDateChange(event.target.value)}
            placeholder={form.hebrewDatePlaceholder}
            aria-label={form.hebrewDateLabel}
          />

          <input
            className="seasons-manager__year-input harvest-bulk-form-number-input harvest-bulk-form-number-input--first"
            type="number"
            min="0"
            value={harvestFormTotalHarvested}
            onChange={(event) => onTotalHarvestedChange(event.target.value)}
            placeholder={form.totalHarvestedPlaceholder}
            aria-label={form.totalHarvestedPlaceholder}
          />

          <input
            className="seasons-manager__year-input harvest-bulk-form-number-input"
            type="number"
            min="0"
            value={harvestFormTotalRejected}
            onChange={(event) => onTotalRejectedChange(event.target.value)}
            placeholder={form.totalRejectedPlaceholder}
            aria-label={form.totalRejectedPlaceholder}
          />

          <input
            className="seasons-manager__year-input harvest-bulk-form-number-input"
            type="number"
            min="0"
            value={harvestFormOwnerHarvested}
            onChange={(event) => onOwnerHarvestedChange(event.target.value)}
            placeholder={form.ownerHarvestedPlaceholder}
            aria-label={form.ownerHarvestedLabel}
          />

          <input
            className="seasons-manager__year-input harvest-bulk-form-number-input"
            type="number"
            min="0"
            value={harvestFormOwnerRejected}
            onChange={(event) => onOwnerRejectedChange(event.target.value)}
            placeholder={form.ownerRejectedPlaceholder}
            aria-label={form.ownerRejectedLabel}
          />

          <fieldset className="harvest-bulk-form-classification-mode" aria-label={form.classificationModeLabel}>
            <legend>{form.classificationModeLabel}</legend>
            <p className="harvest-bulk-form-classification-mode__hint">{form.classificationModeHint}</p>
            <label>
              <input
                type="radio"
                name="harvest-classification-mode"
                checked={!harvestFormIsPartialClassification}
                onChange={() => onPartialClassificationChange(false)}
              />
              <span>{form.fullSorting}</span>
            </label>
            <label>
              <input
                type="radio"
                name="harvest-classification-mode"
                checked={harvestFormIsPartialClassification}
                onChange={() => onPartialClassificationChange(true)}
              />
              <span>{form.partialSorting}</span>
            </label>
          </fieldset>

          <textarea
            className="seasons-manager__year-input harvest-bulk-form-notes harvest-bulk-form-notes--with-mode"
            rows={1}
            value={harvestFormNotes}
            onChange={(event) => onNotesChange(event.target.value, event.currentTarget)}
            placeholder={form.notesPlaceholder}
            aria-label={form.notesLabel}
          />
        </div>

        <div className="harvest-bulk-form-classifications">
          <div className="harvest-bulk-form-classifications__header">
            <h4>{form.sortingRowsTitle}</h4>
            <button type="button" className="btn btn-success" onClick={onAddClassificationDraft}>
              {form.addSortingRow}
            </button>
          </div>

          {harvestFormClassifications.map((draft, index) => {
            const availableCustomerCategories = harvestFormCustomerCategories.filter(
              (category) => String(category.customerId) === draft.customerId,
            );

            return (
              <div key={draft.id} className="harvest-bulk-form-classification-row">
                <div className="harvest-bulk-form-classification-row__head">
                  <strong>{form.sortingRowPrefix(index)}</strong>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => onRemoveClassificationDraft(draft.id)}
                    disabled={harvestFormClassifications.length <= 1}
                  >
                    {form.removeSortingRow}
                  </button>
                </div>

                <div className="management-form-grid harvest-bulk-form-grid">
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

                  {draft.assignmentType === 'GENERAL' || draft.assignmentType === 'TRADER' ? (
                    <select
                      className="seasons-manager__year-input"
                      value={draft.traderCategoryId}
                      onChange={(event) => onUpdateClassificationDraft(draft.id, { traderCategoryId: event.target.value })}
                    >
                      <option value="">{form.traderCategoryPlaceholder}</option>
                      {harvestFormTraderCategories.map((category) => (
                        <option key={`harvest-form-trader-category-${category.id}`} value={String(category.id)}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  ) : null}

                  {draft.assignmentType === 'TRADER' ? (
                    <select
                      className="seasons-manager__year-input"
                      value={draft.traderId}
                      onChange={(event) => onUpdateClassificationDraft(draft.id, { traderId: event.target.value })}
                    >
                      <option value="">{form.traderPlaceholder}</option>
                      {traders.map((trader) => (
                        <option key={`harvest-form-trader-${trader.id}`} value={String(trader.id)}>
                          {trader.name}
                        </option>
                      ))}
                    </select>
                  ) : null}

                  {draft.assignmentType === 'CUSTOMER' ? (
                    <>
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

                      <select
                        className="seasons-manager__year-input"
                        value={draft.customerCategoryId}
                        onChange={(event) => onUpdateClassificationDraft(draft.id, { customerCategoryId: event.target.value })}
                        disabled={!draft.customerId}
                      >
                        <option value="">{form.customerCategoryPlaceholder}</option>
                        {availableCustomerCategories.map((category) => (
                          <option key={`harvest-form-customer-category-${category.id}`} value={String(category.id)}>
                            {`${category.name} (${category.grade})`}
                          </option>
                        ))}
                      </select>
                    </>
                  ) : (
                    <input
                      className="seasons-manager__year-input"
                      type="text"
                      value={draft.grade}
                      onChange={(event) => onUpdateClassificationDraft(draft.id, { grade: event.target.value })}
                      placeholder={form.gradePlaceholder}
                    />
                  )}

                  <select
                    className="seasons-manager__year-input"
                    value={draft.pitamStatus}
                    onChange={(event) =>
                      onUpdateClassificationDraft(draft.id, {
                        pitamStatus: event.target.value as HarvestFormClassificationDraft['pitamStatus'],
                      })
                    }
                  >
                    <option value="WITH_PITAM">{form.pitamOptions.withPitam}</option>
                    <option value="WITHOUT_PITAM">{form.pitamOptions.withoutPitam}</option>
                    <option value="MIXED">{form.pitamOptions.mixed}</option>
                  </select>

                  <input
                    className="seasons-manager__year-input"
                    type="number"
                    min="1"
                    value={draft.quantity}
                    onChange={(event) => onUpdateClassificationDraft(draft.id, { quantity: event.target.value })}
                    placeholder={form.quantityPlaceholder}
                  />

                  <input
                    className="seasons-manager__year-input"
                    type="text"
                    value={draft.notes}
                    onChange={(event) => onUpdateClassificationDraft(draft.id, { notes: event.target.value })}
                    placeholder={form.sortingNotesPlaceholder}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {harvestFormError ? <p className="seasons-manager__error">{harvestFormError}</p> : null}

        <div className="modal-actions">
          <button className="btn btn-danger" onClick={onClose} type="button" disabled={isSubmittingHarvestForm}>
            {form.cancel}
          </button>
          <button className="btn btn-success" onClick={onSubmit} type="button" disabled={isSubmittingHarvestForm}>
            {isSubmittingHarvestForm ? form.saving : form.save}
          </button>
        </div>
      </div>
    </div>
  );
}



