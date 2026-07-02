import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addCustomer, editCustomer, fetchCustomers, removeCustomer } from '../../../store/customersSlice';
import type { AppDispatch, RootState } from '../../../store';
import { isValidEmail, isValidPhone, sanitizeEmail, sanitizePhone, sanitizeText } from '../../../utils/inputValidation';
import { getCustomersI18n } from '../i18n';
import { sortCustomersByName } from '../services/customersSort.service';
import type { CustomersManagementProps } from '../customersPage.types';

export function useCustomersManagement({ onHeaderStateChange }: CustomersManagementProps) {
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const [editCustomerName, setEditCustomerName] = useState('');
  const [editCustomerEmail, setEditCustomerEmail] = useState('');
  const [editCustomerPhone, setEditCustomerPhone] = useState('');
  const t = getCustomersI18n();

  useEffect(() => {
    dispatch(fetchCustomers());
  }, [dispatch]);

  const sortedCustomers = useMemo(() => sortCustomersByName(customers), [customers]);

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
    setIsAdding(true);

    try {
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
    } finally {
      setIsAdding(false);
    }
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

    setIsSubmitting(true);

    try {
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
    } finally {
      setIsSubmitting(false);
    }
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

  const isEditDisabled = !selectedCustomer || loading || isSubmitting;
  const isDeleteDisabled = !selectedCustomer || loading || isSubmitting;
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
  }, [onHeaderStateChange, sortedCustomers.length, isEditDisabled, isDeleteDisabled, selectedCustomer, loading, isSubmitting]);

  useEffect(() => () => {
    onHeaderStateChange?.(null);
  }, [onHeaderStateChange]);

  return {
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
  };
}
