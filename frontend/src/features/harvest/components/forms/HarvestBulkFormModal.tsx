import type { Field } from '../../../../services/fieldsApi';
import type { Trader } from '../../../../services/tradersApi';
import type { Customer } from '../../../../services/customersApi';
import type { CustomerCategory } from '../../../../services/customerCategoriesApi';
import type { TraderCategoryWithShares } from '../../../../services/traderCategoriesApi';
import type { HarvestFormClassificationDraft } from '../../harvestPage.types';

type HarvestBulkFormModalProps = {
  isOpen: boolean;
  lang: 'he' | 'en';
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-dialog modal-dialog--form harvest-bulk-form-modal"
        role="dialog"
        aria-modal="true"
        aria-label={lang === 'he' ? 'טופס קטיף גלובלי' : 'Global harvest form'}
        onClick={(event) => event.stopPropagation()}
      >
        <button className="modal-close" type="button" aria-label={lang === 'he' ? 'סגירה' : 'Close'} onClick={onClose}>
          X
        </button>

        <h3 className="modal-title">{lang === 'he' ? 'הוספת קטיף ומיון' : 'Add Harvest and Sorting'}</h3>
        <p className="modal-message">
          {lang === 'he'
            ? 'בטופס זה מזינים נתוני קטיף ומיון, ונדרשת לפחות שורת מיון אחת.'
            : 'Use this form to enter harvest and sorting data. At least one sorting row is required.'}
        </p>

        <div className="management-form-grid harvest-bulk-form-grid harvest-bulk-form-grid--primary">
          <select
            className="seasons-manager__year-input"
            value={harvestFormFieldId}
            onChange={(event) => onFieldIdChange(event.target.value)}
            aria-label={lang === 'he' ? 'שדה' : 'Field'}
          >
            <option value="">{lang === 'he' ? 'בחר שדה' : 'Select field'}</option>
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
            aria-label={lang === 'he' ? 'תאריך לועזי' : 'Gregorian date'}
          />

          <input
            className="seasons-manager__year-input"
            type="text"
            value={harvestFormDateHebrew}
            onChange={(event) => onHebrewDateChange(event.target.value)}
            placeholder={lang === 'he' ? 'תאריך עברי' : 'Hebrew date'}
            aria-label={lang === 'he' ? 'תאריך עברי' : 'Hebrew date'}
          />

          <input
            className="seasons-manager__year-input harvest-bulk-form-number-input harvest-bulk-form-number-input--first"
            type="number"
            min="0"
            value={harvestFormTotalHarvested}
            onChange={(event) => onTotalHarvestedChange(event.target.value)}
            placeholder={lang === 'he' ? 'סה"כ קטיף' : 'Total harvested'}
            aria-label={lang === 'he' ? 'סה"כ קטיף' : 'Total harvested'}
          />

          <input
            className="seasons-manager__year-input harvest-bulk-form-number-input"
            type="number"
            min="0"
            value={harvestFormTotalRejected}
            onChange={(event) => onTotalRejectedChange(event.target.value)}
            placeholder={lang === 'he' ? 'סה"כ פסולים' : 'Total rejected'}
            aria-label={lang === 'he' ? 'סה"כ פסולים' : 'Total rejected'}
          />

          <input
            className="seasons-manager__year-input harvest-bulk-form-number-input"
            type="number"
            min="0"
            value={harvestFormOwnerHarvested}
            onChange={(event) => onOwnerHarvestedChange(event.target.value)}
            placeholder={lang === 'he' ? 'קטיף פרנקו' : 'Franco harvested'}
            aria-label={lang === 'he' ? 'קטיף בעלים' : 'Owner harvested'}
          />

          <input
            className="seasons-manager__year-input harvest-bulk-form-number-input"
            type="number"
            min="0"
            value={harvestFormOwnerRejected}
            onChange={(event) => onOwnerRejectedChange(event.target.value)}
            placeholder={lang === 'he' ? 'פסולים פרנקו' : 'Franco rejected'}
            aria-label={lang === 'he' ? 'פסולים בעלים' : 'Owner rejected'}
          />

          <fieldset className="harvest-bulk-form-classification-mode" aria-label={lang === 'he' ? 'סוג מיון' : 'Classification mode'}>
            <legend>{lang === 'he' ? 'סוג מיון' : 'Classification mode'}</legend>
            <p className="harvest-bulk-form-classification-mode__hint">
              {lang === 'he'
                ? 'בחר סוג מיון לדוח: מיון מלא אם כל האתרוגים מהקטיף מוינו ומעודכנים בטופס הזה, או מיון חלקי לפי נתונים זמינים.'
                : 'Choose the sorting mode for this record: full for the whole harvest or partial for available data.'}
            </p>
            <label>
              <input
                type="radio"
                name="harvest-classification-mode"
                checked={!harvestFormIsPartialClassification}
                onChange={() => onPartialClassificationChange(false)}
              />
              <span>{lang === 'he' ? 'מיון מלא' : 'Full sorting'}</span>
            </label>
            <label>
              <input
                type="radio"
                name="harvest-classification-mode"
                checked={harvestFormIsPartialClassification}
                onChange={() => onPartialClassificationChange(true)}
              />
              <span>{lang === 'he' ? 'מיון חלקי' : 'Partial sorting'}</span>
            </label>
          </fieldset>

          <textarea
            className="seasons-manager__year-input harvest-bulk-form-notes harvest-bulk-form-notes--with-mode"
            rows={1}
            value={harvestFormNotes}
            onChange={(event) => onNotesChange(event.target.value, event.currentTarget)}
            placeholder={lang === 'he' ? 'הערות קטיף' : 'Harvest notes'}
            aria-label={lang === 'he' ? 'הערות קטיף' : 'Harvest notes'}
          />
        </div>

        <div className="harvest-bulk-form-classifications">
          <div className="harvest-bulk-form-classifications__header">
            <h4>{lang === 'he' ? 'שורות מיון' : 'Sorting rows'}</h4>
            <button type="button" className="btn btn-success" onClick={onAddClassificationDraft}>
              {lang === 'he' ? 'הוספת שורת מיון' : 'Add sorting row'}
            </button>
          </div>

          {harvestFormClassifications.map((draft, index) => {
            const availableCustomerCategories = harvestFormCustomerCategories.filter(
              (category) => String(category.customerId) === draft.customerId,
            );

            return (
              <div key={draft.id} className="harvest-bulk-form-classification-row">
                <div className="harvest-bulk-form-classification-row__head">
                  <strong>{lang === 'he' ? `מיון ${index + 1}` : `Sorting ${index + 1}`}</strong>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => onRemoveClassificationDraft(draft.id)}
                    disabled={harvestFormClassifications.length <= 1}
                  >
                    {lang === 'he' ? 'מחיקה' : 'Remove'}
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
                    <option value="GENERAL">{lang === 'he' ? 'כללי' : 'General'}</option>
                    <option value="TRADER">{lang === 'he' ? 'סוחר' : 'Trader'}</option>
                    <option value="CUSTOMER">{lang === 'he' ? 'לקוח' : 'Customer'}</option>
                  </select>

                  {draft.assignmentType === 'GENERAL' || draft.assignmentType === 'TRADER' ? (
                    <select
                      className="seasons-manager__year-input"
                      value={draft.traderCategoryId}
                      onChange={(event) => onUpdateClassificationDraft(draft.id, { traderCategoryId: event.target.value })}
                    >
                      <option value="">{lang === 'he' ? 'בחר קטגוריית סוחר' : 'Select trader category'}</option>
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
                      <option value="">{lang === 'he' ? 'בחר סוחר' : 'Select trader'}</option>
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
                        <option value="">{lang === 'he' ? 'בחר לקוח' : 'Select customer'}</option>
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
                        <option value="">{lang === 'he' ? 'בחר קטגוריית לקוח' : 'Select customer category'}</option>
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
                      placeholder={lang === 'he' ? 'דרגה (אופציונלי)' : 'Grade (optional)'}
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
                    <option value="WITH_PITAM">{lang === 'he' ? 'פיטם' : 'With pitam'}</option>
                    <option value="WITHOUT_PITAM">{lang === 'he' ? 'בל"פ' : 'Without pitam'}</option>
                    <option value="MIXED">{lang === 'he' ? 'מעורב' : 'Mixed'}</option>
                  </select>

                  <input
                    className="seasons-manager__year-input"
                    type="number"
                    min="1"
                    value={draft.quantity}
                    onChange={(event) => onUpdateClassificationDraft(draft.id, { quantity: event.target.value })}
                    placeholder={lang === 'he' ? 'כמות' : 'Quantity'}
                  />

                  <input
                    className="seasons-manager__year-input"
                    type="text"
                    value={draft.notes}
                    onChange={(event) => onUpdateClassificationDraft(draft.id, { notes: event.target.value })}
                    placeholder={lang === 'he' ? 'הערות מיון' : 'Sorting notes'}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {harvestFormError ? <p className="seasons-manager__error">{harvestFormError}</p> : null}

        <div className="modal-actions">
          <button className="btn btn-danger" onClick={onClose} type="button" disabled={isSubmittingHarvestForm}>
            {lang === 'he' ? 'ביטול' : 'Cancel'}
          </button>
          <button className="btn btn-success" onClick={onSubmit} type="button" disabled={isSubmittingHarvestForm}>
            {isSubmittingHarvestForm
              ? lang === 'he'
                ? 'שומר...'
                : 'Saving...'
              : lang === 'he'
                ? 'שמירת קטיף'
                : 'Save harvest'}
          </button>
        </div>
      </div>
    </div>
  );
}



