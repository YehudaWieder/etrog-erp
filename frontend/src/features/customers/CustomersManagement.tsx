import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { addCustomer, editCustomer, fetchCustomers, removeCustomer } from '../../store/customersSlice';
import type { AppDispatch, RootState } from '../../store';
import { isValidEmail, isValidPhone, sanitizeEmail, sanitizePhone, sanitizeText } from '../../utils/inputValidation';

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
      setAddError('שם הלקוח לא יכול להיות ריק.');
      return;
    }

    if (sanitizedEmail && !isValidEmail(sanitizedEmail)) {
      setAddError('כתובת אימייל לא תקינה.');
      return;
    }

    if (sanitizedPhone && !isValidPhone(sanitizedPhone)) {
      setAddError('מספר טלפון לא תקין. יש להזין בין 7 ל-15 ספרות (אפשר עם + בתחילה).');
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
      'הוספת הלקוח נכשלה.';

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
      setEditError('שם הלקוח לא יכול להיות ריק.');
      return;
    }

    if (sanitizedEmail && !isValidEmail(sanitizedEmail)) {
      setEditError('כתובת אימייל לא תקינה.');
      return;
    }

    if (sanitizedPhone && !isValidPhone(sanitizedPhone)) {
      setEditError('מספר טלפון לא תקין. יש להזין בין 7 ל-15 ספרות (אפשר עם + בתחילה).');
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
      'עדכון הלקוח נכשל.';

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
      'לא ניתן למחוק את הלקוח שנבחר.';

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
    <div className="seasons-manager">
      <div className="seasons-manager__create-row">
        <input
          className="seasons-manager__year-input"
          type="text"
          value={newCustomerName}
          onChange={(e) => setNewCustomerName(e.target.value)}
          placeholder="שם לקוח חדש"
        />
        <input
          className="seasons-manager__year-input"
          type="email"
          value={newCustomerEmail}
          onChange={(e) => setNewCustomerEmail(e.target.value)}
          placeholder="אימייל (לא חובה)"
        />
        <input
          className="seasons-manager__year-input"
          type="text"
          value={newCustomerPhone}
          onChange={(e) => setNewCustomerPhone(e.target.value)}
          placeholder="טלפון (לא חובה)"
        />
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            void handleAdd();
          }}
          disabled={loading}
        >
          הוסף לקוח
        </button>
      </div>

      {loading ? <p className="seasons-manager__state">טוען לקוחות...</p> : null}
      {shownError ? <p className="seasons-manager__error">{shownError}</p> : null}

      {sortedCustomers.length === 0 && !loading ? (
        <div className="seasons-manager__empty">אין לקוחות להצגה כרגע.</div>
      ) : null}

      {sortedCustomers.length > 0 ? (
        <ul className="seasons-manager__cards">
          {sortedCustomers.map((customer) => {
            const isSelected = selectedCustomerId === customer.id;
            const customerBadgeLabel = customer.customerName.trim().slice(0, 2).toUpperCase() || '#';

            return (
              <li key={customer.id}>
                <button
                  type="button"
                  className={`seasons-manager__card${isSelected ? ' is-selected' : ''}`}
                  onClick={() => {
                    setSelectedCustomerId((previousSelectedId) =>
                      previousSelectedId === customer.id ? null : customer.id,
                    );
                  }}
                >
                  <span className={`seasons-manager__selector${isSelected ? ' is-selected' : ''}`}>
                    {isSelected ? '✓' : customerBadgeLabel}
                  </span>

                  <span className="seasons-manager__card-main">
                    <span className="seasons-manager__year">{customer.customerName}</span>
                    <span className="seasons-manager__meta customers-manager__meta">
                      <span className="customers-manager__meta-line">מזהה לקוח: {customer.id}</span>
                      <span className="customers-manager__meta-line">אימייל: {customer.email || '-'}</span>
                      <span className="customers-manager__meta-line">טלפון: {customer.phone || '-'}</span>
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      <ConfirmDialog
        open={isDeleteDialogOpen}
        title="מחיקת לקוח"
        message={
          selectedCustomer
            ? `האם למחוק את הלקוח ${selectedCustomer.customerName}? פעולה זו לא ניתנת לשחזור.`
            : 'האם למחוק את הלקוח שנבחר?'
        }
        confirmLabel="מחק"
        cancelLabel="ביטול"
        onConfirm={() => {
          void handleDeleteCustomer();
        }}
        onCancel={() => setIsDeleteDialogOpen(false)}
      />

      {isEditDialogOpen ? (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <h3 className="modal-title">עריכת לקוח</h3>
            <div className="modal-message">
              {selectedCustomer ? `עדכון פרטי הלקוח ${selectedCustomer.customerName}` : 'עדכון פרטי לקוח נבחר'}
            </div>

            <input
              className="seasons-manager__year-input"
              type="text"
              value={editCustomerName}
              onChange={(event) => setEditCustomerName(event.target.value)}
              placeholder="שם לקוח"
              autoFocus
            />

            <input
              className="seasons-manager__year-input"
              type="email"
              value={editCustomerEmail}
              onChange={(event) => setEditCustomerEmail(event.target.value)}
              placeholder="אימייל (לא חובה)"
            />

            <input
              className="seasons-manager__year-input"
              type="text"
              value={editCustomerPhone}
              onChange={(event) => setEditCustomerPhone(event.target.value)}
              placeholder="טלפון (לא חובה)"
            />

            {editError ? <p className="seasons-manager__error">{editError}</p> : null}

            <div className="modal-actions">
              <button className="btn btn-danger" onClick={() => setIsEditDialogOpen(false)} type="button">
                ביטול
              </button>
              <button
                className="btn btn-success"
                onClick={() => {
                  void handleEditCustomer();
                }}
                type="button"
              >
                שמור
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default CustomersManagement;
