import React from 'react';
import { FaXmark } from 'react-icons/fa6';
import { ConfirmDialog } from '../../../../../components/ui/ConfirmDialog';
import { GlobalScopedFilters } from '../../../../../components/ui/GlobalScopedFilters';
import ManagementCardsGrid from '../../../../../components/ui/ManagementCardsGrid';
import ManagementSelectableCard from '../../../../../components/ui/ManagementSelectableCard';
import SettingsInnerTemplate from '../../../../../components/ui/SettingsInnerTemplate';
import { SubmitButton } from '../../../../../components/ui/SubmitButton';
import type { Currency } from '../../../../../services/israelFieldCategoriesApi';
import type { IsraelFieldCategoriesManagementProps } from '../israelFieldCategoriesPage.types';
import { useIsraelFieldCategoriesManagement } from '../hooks/useIsraelFieldCategoriesManagement';
import styles from './styles/IsraelFieldCategoriesShared.module.css';

export type { IsraelFieldCategoriesHeaderState } from '../israelFieldCategoriesPage.types';

const CURRENCIES: Currency[] = ['ILS', 'USD', 'EUR'];
const FILTER_SCOPE = 'israel-field-categories-management';

const IsraelFieldCategoriesManagement: React.FC<
  IsraelFieldCategoriesManagementProps
> = ({ lang, onHeaderStateChange }) => {
  const {
    t,
    loading,
    shownError,
    activeSeasonId,
    filters,
    sortedFields,
    fieldById,
    sortedCategories,
    categoriesByField,
    selectedCategory,
    selectedCategoryId,
    setSelectedCategoryId,
    selectedCategoryLabel,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    isAddDialogOpen,
    setIsAddDialogOpen,
    isEditDialogOpen,
    setIsEditDialogOpen,
    formState,
    setFormState,
    addError,
    editError,
    isSubmitting,
    handleDeleteCategory,
    handleAddCategory,
    handleEditCategory,
  } = useIsraelFieldCategoriesManagement({ lang, onHeaderStateChange });

  return (
    <SettingsInnerTemplate
      filters={(
        <GlobalScopedFilters
          scope={FILTER_SCOPE}
          filters={filters}
          className="israel-field-categories-manager__filters"
          direction={lang === 'he' ? 'rtl' : 'ltr'}
        />
      )}
      loadingMessage={loading ? t.loading : null}
      errorMessage={shownError}
      emptyMessage={
        !activeSeasonId
          ? t.noActiveSeason
          : sortedCategories.length === 0 && !loading
            ? t.empty
            : null
      }
    >
      {categoriesByField.length > 0 ? (
        <div className={styles.groups}>
          {categoriesByField.map((group) => (
            <section key={group.fieldId} className={styles.group}>
              <h4 className="seasons-manager__section-title">{group.fieldName}</h4>
              <ManagementCardsGrid className={styles.cards}>
                {group.categories.map((category) => {
                  const isSelected = selectedCategoryId === category.id;
                  const badgeLabel =
                    category.name.trim().slice(0, 2).toUpperCase() || '#';

                  return (
                    <li key={category.id}>
                      <ManagementSelectableCard
                        isSelected={isSelected}
                        badgeLabel={badgeLabel}
                        onToggle={() => {
                          setSelectedCategoryId((previousId) =>
                            previousId === category.id ? null : category.id,
                          );
                        }}
                        topContent={
                          <>
                            <span className="seasons-manager__year">
                              {category.name}
                            </span>
                            <span className="seasons-manager__meta">
                              {group.fieldName}
                            </span>
                          </>
                        }
                        bottomContent={
                          <span className={`seasons-manager__meta ${styles.meta}`}>
                            <span className={styles.metaLine}>
                              {t.priceLabel}: {category.price} {category.currency}
                            </span>
                          </span>
                        }
                      />
                    </li>
                  );
                })}
              </ManagementCardsGrid>
            </section>
          ))}
        </div>
      ) : null}

      <ConfirmDialog
        open={isDeleteDialogOpen}
        title={t.deleteTitle}
        message={
          selectedCategory
            ? t.deleteMessage(selectedCategoryLabel)
            : t.deleteFallback
        }
        confirmLabel={t.deleteConfirm}
        cancelLabel={t.cancel}
        onConfirm={() => {
          void handleDeleteCategory();
        }}
        onCancel={() => setIsDeleteDialogOpen(false)}
      />

      {isAddDialogOpen || isEditDialogOpen ? (
        <div className="modal-overlay">
          <div className="modal-dialog modal-dialog--form">
            <button
              className="modal-close"
              type="button"
              aria-label={t.cancel}
              onClick={() => {
                setIsAddDialogOpen(false);
                setIsEditDialogOpen(false);
              }}
            >
              <FaXmark />
            </button>
            <h3 className="modal-title">
              {isAddDialogOpen ? t.addTitle : t.editTitle}
            </h3>
            <div className="modal-message">
              {isAddDialogOpen
                ? t.addMessage
                : t.editMessage(selectedCategoryLabel)}
            </div>

            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label className={styles.label}>{t.fieldLabel}</label>
                <select
                  className="seasons-manager__year-input"
                  value={formState.fieldId}
                  disabled={isEditDialogOpen}
                  onChange={(event) => {
                    setFormState((previous) => ({
                      ...previous,
                      fieldId: event.target.value
                        ? Number(event.target.value)
                        : '',
                    }));
                  }}
                >
                  <option value="" disabled>
                    {t.selectField}
                  </option>
                  {isEditDialogOpen && selectedCategory ? (
                    <option value={selectedCategory.fieldId}>
                      {selectedCategory.field?.name ??
                        fieldById.get(selectedCategory.fieldId) ??
                        ''}
                    </option>
                  ) : (
                    sortedFields.map((field) => (
                      <option key={field.id} value={field.id}>
                        {field.name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>{t.nameLabel}</label>
                <input
                  className="seasons-manager__year-input"
                  type="text"
                  value={formState.name}
                  onChange={(event) => {
                    setFormState((previous) => ({
                      ...previous,
                      name: event.target.value,
                    }));
                  }}
                  placeholder={t.namePlaceholder}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>{t.priceLabel}</label>
                <input
                  className="seasons-manager__year-input"
                  type="number"
                  min={0}
                  step="0.01"
                  value={formState.price}
                  onChange={(event) => {
                    setFormState((previous) => ({
                      ...previous,
                      price: event.target.value,
                    }));
                  }}
                  placeholder={t.pricePlaceholder}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>{t.currencyLabel}</label>
                <select
                  className="seasons-manager__year-input"
                  value={formState.currency}
                  onChange={(event) => {
                    setFormState((previous) => ({
                      ...previous,
                      currency: event.target.value as Currency | '',
                    }));
                  }}
                >
                  <option value="" disabled>
                    {t.selectCurrency}
                  </option>
                  {CURRENCIES.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {isAddDialogOpen && addError ? (
              <p className="seasons-manager__error">{addError}</p>
            ) : null}
            {isEditDialogOpen && editError ? (
              <p className="seasons-manager__error">{editError}</p>
            ) : null}

            <div className="modal-actions">
              <button
                className="btn btn-danger"
                onClick={() => {
                  setIsAddDialogOpen(false);
                  setIsEditDialogOpen(false);
                }}
                type="button"
              >
                {t.cancel}
              </button>
              <SubmitButton
                className="btn btn-success"
                onClick={() => {
                  if (isAddDialogOpen) {
                    void handleAddCategory();
                    return;
                  }

                  void handleEditCategory();
                }}
                type="button"
                isLoading={isSubmitting}
                loadingText={t.saving}
              >
                {t.save}
              </SubmitButton>
            </div>
          </div>
        </div>
      ) : null}
    </SettingsInnerTemplate>
  );
};

export default IsraelFieldCategoriesManagement;
