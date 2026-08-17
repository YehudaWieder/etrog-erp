import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  addIsraelField,
  editIsraelField,
  fetchIsraelFields,
  removeIsraelField,
} from '../../../store/israelFieldsSlice';
import type { AppDispatch, RootState } from '../../../store';
import { getIsraelFieldsI18n } from '../i18n';
import type { IsraelFieldsManagementProps } from '../israelFieldsPage.types';

export function useIsraelFieldsManagement({
  lang,
  onHeaderStateChange,
}: IsraelFieldsManagementProps) {
  const dispatch = useDispatch<AppDispatch>();
  const {
    items: fields,
    loading,
    error,
  } = useSelector((state: RootState) => state.israelFields);
  const [newFieldName, setNewFieldName] = useState('');
  const [selectedFieldId, setSelectedFieldId] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editFieldName, setEditFieldName] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const t = getIsraelFieldsI18n(lang);

  useEffect(() => {
    dispatch(fetchIsraelFields());
  }, [dispatch]);

  const sortedFields = useMemo(
    () => [...fields].sort((a, b) => a.name.localeCompare(b.name)),
    [fields],
  );

  useEffect(() => {
    if (
      selectedFieldId &&
      !sortedFields.some((field) => field.id === selectedFieldId)
    ) {
      setSelectedFieldId(null);
    }
  }, [sortedFields, selectedFieldId]);

  const selectedField = useMemo(
    () => sortedFields.find((field) => field.id === selectedFieldId) ?? null,
    [sortedFields, selectedFieldId],
  );

  const handleAdd = async () => {
    const trimmedName = newFieldName.trim();

    if (!trimmedName) {
      return;
    }

    setAddError(null);
    setIsAdding(true);

    try {
      const actionResult = await dispatch(
        addIsraelField({ name: trimmedName }),
      );

      if (addIsraelField.fulfilled.match(actionResult)) {
        setNewFieldName('');
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
    if (!selectedField) {
      return;
    }

    setDeleteError(null);
    setIsDeleteDialogOpen(true);
  };

  const handleOpenEditDialog = () => {
    if (!selectedField) {
      return;
    }

    setEditError(null);
    setEditFieldName(selectedField.name);
    setIsEditDialogOpen(true);
  };

  const handleEditField = async () => {
    if (!selectedField) {
      return;
    }

    const trimmedName = editFieldName.trim();
    if (!trimmedName) {
      setEditError(t.emptyName);
      return;
    }

    setIsSavingEdit(true);
    const actionResult = await dispatch(
      editIsraelField({
        id: selectedField.id,
        name: trimmedName,
      }),
    );

    if (editIsraelField.fulfilled.match(actionResult)) {
      setEditError(null);
      setIsEditDialogOpen(false);
      setIsSavingEdit(false);
      return;
    }

    const failureMessage =
      (typeof actionResult.payload === 'string' && actionResult.payload) ||
      actionResult.error.message ||
      t.editFailed;

    setEditError(failureMessage);
    setIsSavingEdit(false);
  };

  const handleDeleteField = async () => {
    if (!selectedField) {
      return;
    }

    const actionResult = await dispatch(removeIsraelField(selectedField.id));

    if (removeIsraelField.fulfilled.match(actionResult)) {
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

  const isEditDisabled = !selectedField || loading;
  const isDeleteDisabled = !selectedField || loading;
  const shownError = addError ?? editError ?? deleteError ?? error;

  useEffect(() => {
    if (!onHeaderStateChange) {
      return;
    }

    onHeaderStateChange({
      count: sortedFields.length,
      isEditDisabled,
      isDeleteDisabled,
      onEdit: handleOpenEditDialog,
      onDelete: handleOpenDeleteDialog,
    });
  }, [
    onHeaderStateChange,
    sortedFields.length,
    isEditDisabled,
    isDeleteDisabled,
    selectedField,
    loading,
  ]);

  useEffect(
    () => () => {
      onHeaderStateChange?.(null);
    },
    [onHeaderStateChange],
  );

  return {
    t,
    loading,
    shownError,
    sortedFields,
    newFieldName,
    setNewFieldName,
    selectedField,
    selectedFieldId,
    setSelectedFieldId,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    isEditDialogOpen,
    setIsEditDialogOpen,
    editFieldName,
    setEditFieldName,
    editError,
    isSavingEdit,
    isAdding,
    handleAdd,
    handleDeleteField,
    handleEditField,
  };
}
