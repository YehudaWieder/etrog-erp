import React from 'react';
import { FaXmark } from 'react-icons/fa6';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
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
                          setSelectedCategoryId((previousId) => (previousId === category.id ? null : category.id));
                        }}
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
                <select
                  className="seasons-manager__year-input"
                  value={formState.customerId}
                  disabled={isEditDialogOpen}
                  onChange={(event) => {
                    setFormState((previous) => ({
                      ...previous,
                      customerId: event.target.value ? Number(event.target.value) : '',
                    }));
                  }}
                >
                  <option value="" disabled>
                    {t.selectCustomer}
                  </option>
                  {sortedCustomers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.customerName}
                    </option>
                  ))}
                </select>
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
              <button
                className="btn btn-success"
                onClick={() => {
                  if (isAddDialogOpen) {
                    void handleAddCategory();
                    return;
                  }

                  void handleEditCategory();
                }}
                type="button"
              >
                {t.save}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </SettingsInnerTemplate>
  );
};

export default CustomerCategoriesManagement;
