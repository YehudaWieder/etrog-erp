import React from 'react';
import { FaXmark } from 'react-icons/fa6';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { SubmitButton } from '../../../components/ui/SubmitButton';
import ManagementCardsGrid from '../../../components/ui/ManagementCardsGrid';
import ManagementSelectableCard from '../../../components/ui/ManagementSelectableCard';
import SettingsInnerTemplate from '../../../components/ui/SettingsInnerTemplate';
import type { CustomersManagementProps } from '../customersPage.types';
import { useCustomersManagement } from '../hooks/useCustomersManagement';
import sharedStyles from './styles/CustomersShared.module.css';

export type { CustomersHeaderState } from '../customersPage.types';

const CustomersManagement: React.FC<CustomersManagementProps> = ({ onHeaderStateChange }) => {
  const {
    t,
    loading,
    sortedCustomers,
    shownError,
    newCustomerName,
    setNewCustomerName,
    newCustomerEmail,
    setNewCustomerEmail,
    newCustomerPhone,
    setNewCustomerPhone,
    selectedCustomer,
    selectedCustomerId,
    setSelectedCustomerId,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    isEditDialogOpen,
    setIsEditDialogOpen,
    editCustomerName,
    setEditCustomerName,
    editCustomerEmail,
    setEditCustomerEmail,
    editCustomerPhone,
    setEditCustomerPhone,
    editError,
    isSubmitting,
    isAdding,
    handleAdd,
    handleDeleteCustomer,
    handleEditCustomer,
  } = useCustomersManagement({ onHeaderStateChange });

  return (
    <SettingsInnerTemplate
      toolbar={(
        <div className="seasons-manager__create-row">
          <input
            className="seasons-manager__year-input"
            type="text"
            value={newCustomerName}
            onChange={(e) => setNewCustomerName(e.target.value)}
            placeholder={t.newCustomerPlaceholder}
          />
          <input
            className="seasons-manager__year-input"
            type="email"
            value={newCustomerEmail}
            onChange={(e) => setNewCustomerEmail(e.target.value)}
            placeholder={t.optionalEmailPlaceholder}
          />
          <input
            className="seasons-manager__year-input"
            type="text"
            value={newCustomerPhone}
            onChange={(e) => setNewCustomerPhone(e.target.value)}
            placeholder={t.optionalPhonePlaceholder}
          />
          <SubmitButton
            className="btn btn-primary"
            onClick={() => {
              void handleAdd();
            }}
            disabled={loading}
            isLoading={isAdding}
            loadingText={t.adding}
          >
            {t.addCustomer}
          </SubmitButton>
        </div>
      )}
      loadingMessage={loading ? t.loading : null}
      errorMessage={shownError}
      emptyMessage={sortedCustomers.length === 0 && !loading ? t.empty : null}
    >
      {sortedCustomers.length > 0 ? (
        <ManagementCardsGrid>
          {sortedCustomers.map((customer) => {
            const isSelected = selectedCustomerId === customer.id;
            const customerBadgeLabel = customer.customerName.trim().slice(0, 2).toUpperCase() || '#';

            return (
              <li key={customer.id}>
                <ManagementSelectableCard
                  isSelected={isSelected}
                  badgeLabel={customerBadgeLabel}
                  onToggle={() => {
                    setSelectedCustomerId((previousSelectedId) =>
                      previousSelectedId === customer.id ? null : customer.id,
                    );
                  }}
                  topContent={
                    <>
                      <span className="seasons-manager__year">{customer.customerName}</span>
                      <span className="seasons-manager__meta">{t.customerId}: {customer.id}</span>
                    </>
                  }
                  bottomContent={
                    <span className={`seasons-manager__meta ${sharedStyles.meta}`}>
                      <span className={sharedStyles.metaLine}>{t.email}: {customer.email || '-'}</span>
                      <span className={sharedStyles.metaLine}>{t.phone}: {customer.phone || '-'}</span>
                    </span>
                  }
                />
              </li>
            );
          })}
        </ManagementCardsGrid>
      ) : null}

      <ConfirmDialog
        open={isDeleteDialogOpen}
        title={t.deleteTitle}
        message={
          selectedCustomer
            ? t.deleteMessage(selectedCustomer.customerName)
            : t.deleteFallback
        }
        confirmLabel={t.deleteConfirm}
        cancelLabel={t.cancel}
        onConfirm={() => {
          void handleDeleteCustomer();
        }}
        onCancel={() => setIsDeleteDialogOpen(false)}
      />

      {isEditDialogOpen ? (
        <div className="modal-overlay">
          <div className="modal-dialog modal-dialog--form">
            <button className="modal-close" type="button" aria-label={t.cancel} onClick={() => setIsEditDialogOpen(false)}>
              <FaXmark />
            </button>
            <h3 className="modal-title">{t.editTitle}</h3>
            <div className="modal-message">
              {selectedCustomer ? t.editMessage(selectedCustomer.customerName) : t.editFallback}
            </div>

            <div className="management-form-grid">
              <input
                className="seasons-manager__year-input"
                type="text"
                value={editCustomerName}
                onChange={(event) => setEditCustomerName(event.target.value)}
                placeholder={t.customerPlaceholder}
                autoFocus
              />

              <input
                className="seasons-manager__year-input"
                type="email"
                value={editCustomerEmail}
                onChange={(event) => setEditCustomerEmail(event.target.value)}
                placeholder={t.optionalEmailPlaceholder}
              />

              <input
                className="seasons-manager__year-input"
                type="text"
                value={editCustomerPhone}
                onChange={(event) => setEditCustomerPhone(event.target.value)}
                placeholder={t.optionalPhonePlaceholder}
              />
            </div>

            {editError ? <p className="seasons-manager__error">{editError}</p> : null}

            <div className="modal-actions">
              <button className="btn btn-danger" onClick={() => setIsEditDialogOpen(false)} type="button">
                {t.cancel}
              </button>
              <SubmitButton
                className="btn btn-success"
                onClick={() => {
                  void handleEditCustomer();
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

export default CustomersManagement;
