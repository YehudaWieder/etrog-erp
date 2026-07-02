import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addTrader, editTrader, fetchTraders, removeTrader } from '../../../store/tradersSlice';
import type { AppDispatch, RootState } from '../../../store';
import { getTradersI18n } from '../i18n';
import { sortByHebrewName } from '../services/traderCollections.service';
import type { TradersManagementProps } from '../tradersManagement.types';
import { isValidPaymentPercent } from '../utils/traderPayments.util';

export function useTradersManagement({ onHeaderStateChange }: TradersManagementProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { items: traders, loading, error } = useSelector((state: RootState) => state.traders);
  const [newTraderName, setNewTraderName] = useState('');
  const [newTraderPercent, setNewTraderPercent] = useState('');
  const [selectedTraderId, setSelectedTraderId] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editTraderName, setEditTraderName] = useState('');
  const [editTraderPercent, setEditTraderPercent] = useState('');
  const t = getTradersI18n();

  useEffect(() => {
    dispatch(fetchTraders());
  }, [dispatch]);

  const sortedTraders = useMemo(() => sortByHebrewName(traders), [traders]);

  useEffect(() => {
    if (selectedTraderId && !sortedTraders.some((trader) => trader.id === selectedTraderId)) {
      setSelectedTraderId(null);
    }
  }, [sortedTraders, selectedTraderId]);

  const selectedTrader = useMemo(
    () => sortedTraders.find((trader) => trader.id === selectedTraderId) ?? null,
    [sortedTraders, selectedTraderId],
  );

  const handleAdd = async () => {
    const trimmedName = newTraderName.trim();
    const trimmedPercent = newTraderPercent.trim();

    if (!trimmedName) {
      return;
    }

    if (trimmedPercent === '') {
      setAddError(t.paymentRequired);
      return;
    }

    const parsedPercent = Number(trimmedPercent);

    if (!isValidPaymentPercent(trimmedPercent)) {
      return;
    }

    setAddError(null);
    setIsAdding(true);

    try {
      const actionResult = await dispatch(
        addTrader({
          name: trimmedName,
          paymentPercent: parsedPercent,
        }),
      );

      if (addTrader.fulfilled.match(actionResult)) {
        setNewTraderName('');
        setNewTraderPercent('');
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
    if (!selectedTrader) {
      return;
    }

    setDeleteError(null);
    setIsDeleteDialogOpen(true);
  };

  const handleOpenEditDialog = () => {
    if (!selectedTrader) {
      return;
    }

    setEditError(null);
    setEditTraderName(selectedTrader.name);
    setEditTraderPercent(
      typeof selectedTrader.paymentPercent === 'number'
        ? String(selectedTrader.paymentPercent)
        : '',
    );
    setIsEditDialogOpen(true);
  };

  const handleEditTrader = async () => {
    if (!selectedTrader) {
      return;
    }

    const trimmedName = editTraderName.trim();
    const trimmedPercent = editTraderPercent.trim();

    if (!trimmedName) {
      setEditError(t.emptyName);
      return;
    }

    if (trimmedPercent === '') {
      setEditError(t.paymentRequired);
      return;
    }

    if (!isValidPaymentPercent(trimmedPercent)) {
      setEditError(t.invalidPercent);
      return;
    }

    const parsedPercent = Number(trimmedPercent);

    setIsSubmitting(true);

    try {
      const actionResult = await dispatch(
        editTrader({
          id: selectedTrader.id,
          name: trimmedName,
          paymentPercent: parsedPercent,
        }),
      );

      if (editTrader.fulfilled.match(actionResult)) {
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

  const handleDeleteTrader = async () => {
    if (!selectedTrader) {
      return;
    }

    const actionResult = await dispatch(removeTrader(selectedTrader.id));

    if (removeTrader.fulfilled.match(actionResult)) {
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

  const isEditDisabled = !selectedTrader || loading || isSubmitting;
  const isDeleteDisabled = !selectedTrader || loading || isSubmitting;
  const shownError = addError ?? editError ?? deleteError ?? error;

  useEffect(() => {
    if (!onHeaderStateChange) {
      return;
    }

    onHeaderStateChange({
      count: sortedTraders.length,
      isEditDisabled,
      isDeleteDisabled,
      onEdit: handleOpenEditDialog,
      onDelete: handleOpenDeleteDialog,
    });
  }, [onHeaderStateChange, sortedTraders.length, isEditDisabled, isDeleteDisabled, selectedTrader, loading, isSubmitting]);

  useEffect(() => () => {
    onHeaderStateChange?.(null);
  }, [onHeaderStateChange]);

  return {
    t,
    loading,
    newTraderName,
    setNewTraderName,
    newTraderPercent,
    setNewTraderPercent,
    selectedTraderId,
    setSelectedTraderId,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    isEditDialogOpen,
    setIsEditDialogOpen,
    sortedTraders,
    selectedTrader,
    editTraderName,
    setEditTraderName,
    editTraderPercent,
    setEditTraderPercent,
    editError,
    isEditDisabled,
    isSubmitting,
    isAdding,
    shownError,
    handleAdd,
    handleDeleteTrader,
    handleEditTrader,
    isValidPaymentPercent,
  };
}
