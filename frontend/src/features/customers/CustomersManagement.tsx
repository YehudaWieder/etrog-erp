import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FaXmark } from 'react-icons/fa6';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import ManagementCardsGrid from '../../components/ui/ManagementCardsGrid';
import ManagementSelectableCard from '../../components/ui/ManagementSelectableCard';
import SettingsInnerTemplate from '../../components/ui/SettingsInnerTemplate';
import { addCustomer, editCustomer, fetchCustomers, removeCustomer } from '../../store/customersSlice';
import type { AppDispatch, RootState } from '../../store';
import { isValidEmail, isValidPhone, sanitizeEmail, sanitizePhone, sanitizeText } from '../../utils/inputValidation';
import { getManagementI18n, resolveAppLang } from '../settings/managementI18n';

export type CustomersHeaderState = {
  count: number;
  isEditDisabled: boolean;
  isDeleteDisabled: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

type CustomersManagementProps = {
  onHeaderStateChange?: (state: CustomersHeaderState | null) => void;
};

const CustomersManagement: React.FC<CustomersManagementProps> = ({ onHeaderStateChange }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { items: customers, loading, error } = useSelector((state: RootState) => state.customers);

  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');

  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const [addError, setAddError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [editCustomerName, setEditCustomerName] = useState('');
  const [editCustomerEmail, setEditCustomerEmail] = useState('');
  const [editCustomerPhone, setEditCustomerPhone] = useState('');
  const t = getManagementI18n(resolveAppLang()).customers;

  useEffect(() => {
    dispatch(fetchCustomers());
  }, [dispatch]);

  const sortedCustomers = useMemo(
    () => [...customers].sort((a, b) => a.customerName.localeCompare(b.customerName, 'he')),
    [customers],
  );

  useEffect(() => {
    if (selectedCustomerId && !sortedCustomers.some((customer) => customer.id === selectedCustomerId)) {
      setSelectedCustomerId(null);
    }
  }, [selectedCustomerId, sortedCustomers]);

  const selectedCustomer = useMemo(
    () => sortedCustomers.find((customer) => customer.id === selectedCustomerId) ?? null,
    [selectedCustomerId, sortedCustomers],
  );

  const handleAdd = async () => {
    const trimmedName = sanitizeText(newCustomerName);
    const sanitizedEmail = sanitizeEmail(newCustomerEmail);
    const sanitizedPhone = sanitizePhone(newCustomerPhone);

    if (!trimmedName) {
      setAddError(t.emptyName);
      return;
    }

    if (sanitizedEmail && !isValidEmail(sanitizedEmail)) {
      setAddError(t.invalidEmail);
      return;
    }

    if (sanitizedPhone && !isValidPhone(sanitizedPhone)) {
      setAddError(t.invalidPhone);
      return;
    }

    setAddError(null);

    const actionResult = await dispatch(
      addCustomer({
        customerName: trimmedName,
        ...(sanitizedEmail ? { email: sanitizedEmail } : {}),
        ...(sanitizedPhone ? { phone: sanitizedPhone } : {}),
      }),
    );

    if (addCustomer.fulfilled.match(actionResult)) {
      setNewCustomerName('');
      setNewCustomerEmail('');
      setNewCustomerPhone('');
      return;
    }

    const failureMessage =
      (typeof actionResult.payload === 'string' && actionResult.payload) ||
      actionResult.error.message ||
      t.addFailed;

    setAddError(failureMessage);
  };

  const handleOpenDeleteDialog = () => {
    if (!selectedCustomer) {
      return;
    }

    setDeleteError(null);
    setIsDeleteDialogOpen(true);
  };

  const handleOpenEditDialog = () => {
    if (!selectedCustomer) {
      return;
    }

    setEditError(null);
    setEditCustomerName(selectedCustomer.customerName);
    setEditCustomerEmail(selectedCustomer.email ?? '');
    setEditCustomerPhone(selectedCustomer.phone ?? '');
    setIsEditDialogOpen(true);
  };

  const handleEditCustomer = async () => {
    if (!selectedCustomer) {
      return;
    }

    const trimmedName = sanitizeText(editCustomerName);
    const sanitizedEmail = sanitizeEmail(editCustomerEmail);
    const sanitizedPhone = sanitizePhone(editCustomerPhone);

    if (!trimmedName) {
      setEditError(t.emptyName);
      return;
    }

    if (sanitizedEmail && !isValidEmail(sanitizedEmail)) {
      setEditError(t.invalidEmail);
      return;
    }

    if (sanitizedPhone && !isValidPhone(sanitizedPhone)) {
      setEditError(t.invalidPhone);
      return;
    }

    const actionResult = await dispatch(
      editCustomer({
        id: selectedCustomer.id,
        customerName: trimmedName,
        ...(sanitizedEmail ? { email: sanitizedEmail } : {}),
        ...(sanitizedPhone ? { phone: sanitizedPhone } : {}),
      }),
    );

    if (editCustomer.fulfilled.match(actionResult)) {
      setEditError(null);
      setIsEditDialogOpen(false);
      return;
    }

    const failureMessage =
      (typeof actionResult.payload === 'string' && actionResult.payload) ||
      actionResult.error.message ||
      t.editFailed;

    setEditError(failureMessage);
  };

  const handleDeleteCustomer = async () => {
    if (!selectedCustomer) {
      return;
    }

    const actionResult = await dispatch(removeCustomer(selectedCustomer.id));

    if (removeCustomer.fulfilled.match(actionResult)) {
      setDeleteError(null);
      setIsDeleteDialogOpen(false);
      return;
    }

    const failureMessage =
      (typeof actionResult.payload === 'string' && actionResult.payload) ||
      actionResult.error.message ||
      t.deleteFailed;

    setDeleteError(failureMessage);
    setIsDeleteDialogOpen(false);
  };

  const isEditDisabled = !selectedCustomer || loading;
  const isDeleteDisabled = !selectedCustomer || loading;
  const shownError = addError ?? editError ?? deleteError ?? error;

  useEffect(() => {
    if (!onHeaderStateChange) {
      return;
    }

    onHeaderStateChange({
      count: sortedCustomers.length,
      isEditDisabled,
      isDeleteDisabled,
      onEdit: handleOpenEditDialog,
      onDelete: handleOpenDeleteDialog,
    });
  }, [onHeaderStateChange, sortedCustomers.length, isEditDisabled, isDeleteDisabled, selectedCustomer, loading]);

  useEffect(() => () => {
    onHeaderStateChange?.(null);
  }, [onHeaderStateChange]);

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
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              void handleAdd();
            }}
            disabled={loading}
          >
            {t.addCustomer}
          </button>
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
                    <span className="seasons-manager__meta customers-manager__meta">
                      <span className="customers-manager__meta-line">{t.email}: {customer.email || '-'}</span>
                      <span className="customers-manager__meta-line">{t.phone}: {customer.phone || '-'}</span>
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
              <button
                className="btn btn-success"
                onClick={() => {
                  void handleEditCustomer();
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

export default CustomersManagement;
