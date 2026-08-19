import React from 'react';
import { FaTriangleExclamation, FaXmark } from 'react-icons/fa6';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { SubmitButton } from '../../../components/ui/SubmitButton';
import { CustomSelect } from '../../../components/ui/CustomSelect';
import { GlobalScopedFilters } from '../../../components/ui/GlobalScopedFilters';
import ManagementCardsGrid from '../../../components/ui/ManagementCardsGrid';
import ManagementSelectableCard from '../../../components/ui/ManagementSelectableCard';
import SettingsInnerTemplate from '../../../components/ui/SettingsInnerTemplate';
import type { Currency, Grade } from '../../../services/customerCategoriesApi';
import type { CustomerCategoriesManagementProps } from '../customersPage.types';
import {
  normalizePriceValue,
  useCustomerCategoriesManagement,
} from '../hooks/useCustomerCategoriesManagement';
import sharedStyles from './styles/CustomersShared.module.css';
import styles from './styles/CustomerCategoriesManagement.module.css';

export type { CustomerCategoriesHeaderState } from '../customersPage.types';

const CURRENCIES: Currency[] = ['ILS', 'USD', 'EUR'];
const FILTER_SCOPE = 'customer-categories-management';

const CustomerCategoriesManagement: React.FC<CustomerCategoriesManagementProps> = ({ onHeaderStateChange }) => {
  const {
    t,
    filters,
    loading,
    shownError,
    seasonFilterId,
    selectedSeason,
    isViewingNonActiveSeason,
    categoriesByCustomer,
    filteredCategoriesCount,
    selectedCategory,
    selectedCategoryId,
    setSelectedCategoryId,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    isAddDialogOpen,
    setIsAddDialogOpen,
    isEditDialogOpen,
    setIsEditDialogOpen,
    formState,
    setFormState,
    sortedCustomers,
    addError,
    editError,
    isSubmitting,
    handleDeleteCategory,
    handleAddCategory,
    handleEditCategory,
  } = useCustomerCategoriesManagement({ onHeaderStateChange });

  return (
    <SettingsInnerTemplate
      filters={(
        <GlobalScopedFilters
          scope={FILTER_SCOPE}
          filters={filters}
          className="customer-categories-manager__filters"
          direction="rtl"
        />
      )}
      info={(
        <div className="seasons-manager__state">
          {selectedSeason ? t.activeSeason(selectedSeason.yearName) : t.noActiveSeason}
        </div>
      )}
      loadingMessage={loading ? t.loading : null}
      errorMessage={shownError}
      emptyMessage={!seasonFilterId ? t.empty : seasonFilterId && filteredCategoriesCount === 0 && !loading ? t.categoryForSeasonEmpty : null}
    >
      <p className={styles.warningNotice}>
        <FaTriangleExclamation aria-hidden="true" />
        <span>{t.warningNotice}</span>
        <FaTriangleExclamation aria-hidden="true" />
      </p>

      {categoriesByCustomer.length > 0 ? (
        <div className={styles.groups}>
          {categoriesByCustomer.map((group) => (
            <section key={group.customerId} className={styles.group}>
              <h4 className="seasons-manager__section-title">{group.customerName}</h4>
              <ManagementCardsGrid className={styles.cards}>
                {group.categories.map((category) => {
                  const isSelected = selectedCategoryId === category.id;
                  const badgeLabel = category.name.trim().slice(0, 2).toUpperCase() || '#';

                  return (
                    <li key={category.id}>
                      <ManagementSelectableCard
                        isSelected={isSelected}
                        badgeLabel={badgeLabel}
                        onToggle={() => {
                          if (isViewingNonActiveSeason) {
                            return;
                          }
                          setSelectedCategoryId((previousId) => (previousId === category.id ? null : category.id));
                        }}
                        disabled={isViewingNonActiveSeason}
                        title={isViewingNonActiveSeason ? t.nonActiveSeasonSelectionDisabled : undefined}
                        topContent={
                          <>
                            <span className="seasons-manager__year">
                              {category.name} | {t.grade} {category.grade}
                            </span>
                            <span className="seasons-manager__meta">{t.categoryId}: {category.id}</span>
                          </>
                        }
                        bottomContent={
                          <span className={`seasons-manager__meta ${sharedStyles.meta}`}>
                            <span className={sharedStyles.metaLine}>{t.customer}: {category.customerName}</span>
                            <span className={sharedStyles.metaLine}>{t.price}: {normalizePriceValue(category.price)} {category.currency}</span>
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
            ? t.deleteMessage(selectedCategory.name, selectedCategory.grade, selectedCategory.customerName)
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
            <h3 className="modal-title">{isAddDialogOpen ? t.addTitle : t.editTitle}</h3>
            <div className="modal-message">
              {isAddDialogOpen
                ? t.addMessage
                : t.editMessage(selectedCategory?.name ?? '')}
            </div>

            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label className={styles.label}>{t.customerLabel}</label>
                <CustomSelect
                  className="seasons-manager__year-input"
                  value={String(formState.customerId)}
                  disabled={isEditDialogOpen}
                  onChange={(value) => {
                    setFormState((previous) => ({
                      ...previous,
                      customerId: value ? Number(value) : '',
                    }));
                  }}
                  placeholder={t.selectCustomer}
                  options={sortedCustomers.map((customer) => ({ value: String(customer.id), label: customer.customerName }))}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>{t.categoryNameLabel}</label>
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
                  placeholder={t.categoryNamePlaceholder}
                  autoFocus
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>{t.gradeLabel}</label>
                <input
                  className="seasons-manager__year-input"
                  type="text"
                  value={formState.grade}
                  onChange={(event) => {
                    setFormState((previous) => ({
                      ...previous,
                      grade: event.target.value,
                    }));
                  }}
                  placeholder={t.gradePlaceholder}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>{t.priceLabel}</label>
                <input
                  className="seasons-manager__year-input"
                  type="number"
                  min="0"
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
                <CustomSelect
                  className="seasons-manager__year-input"
                  value={formState.currency}
                  onChange={(value) => {
                    setFormState((previous) => ({
                      ...previous,
                      currency: value as Currency | '',
                    }));
                  }}
                  placeholder={t.selectCurrency}
                  options={CURRENCIES.map((currency) => ({ value: currency, label: currency }))}
                />
              </div>
            </div>

            {isAddDialogOpen && addError ? <p className="seasons-manager__error">{addError}</p> : null}
            {isEditDialogOpen && editError ? <p className="seasons-manager__error">{editError}</p> : null}

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

export default CustomerCategoriesManagement;
