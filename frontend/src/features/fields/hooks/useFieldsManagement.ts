import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addField, editField, fetchFields, removeField } from '../../../store/fieldsSlice';
import type { AppDispatch, RootState } from '../../../store';
import { getFieldsI18n } from '../i18n';
import { sortFieldsByName } from '../services/fieldsSort.service';
import type { FieldsManagementProps } from '../fieldsPage.types';

export function useFieldsManagement({ onHeaderStateChange }: FieldsManagementProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { items: fields, loading, error } = useSelector((state: RootState) => state.fields);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldIncludeInRejectionSummary, setNewFieldIncludeInRejectionSummary] = useState(true);
  const [selectedFieldId, setSelectedFieldId] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editFieldName, setEditFieldName] = useState('');
  const [editIncludeInRejectionSummary, setEditIncludeInRejectionSummary] = useState(true);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const t = getFieldsI18n();

  useEffect(() => {
    dispatch(fetchFields());
  }, [dispatch]);

  const sortedFields = useMemo(() => sortFieldsByName(fields), [fields]);

  useEffect(() => {
    if (selectedFieldId && !sortedFields.some((field) => field.id === selectedFieldId)) {
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
        addField({ name: trimmedName, includeInRejectionSummary: newFieldIncludeInRejectionSummary }),
      );

      if (addField.fulfilled.match(actionResult)) {
        setNewFieldName('');
        setNewFieldIncludeInRejectionSummary(true);
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
    setEditIncludeInRejectionSummary(selectedField.includeInRejectionSummary);
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
      editField({ id: selectedField.id, name: trimmedName, includeInRejectionSummary: editIncludeInRejectionSummary }),
    );

    if (editField.fulfilled.match(actionResult)) {
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

    const actionResult = await dispatch(removeField(selectedField.id));

    if (removeField.fulfilled.match(actionResult)) {
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
  }, [onHeaderStateChange, sortedFields.length, isEditDisabled, isDeleteDisabled, selectedField, loading]);

  useEffect(() => () => {
    onHeaderStateChange?.(null);
  }, [onHeaderStateChange]);

  return {
    t,
    loading,
    shownError,
    sortedFields,
    newFieldName,
    setNewFieldName,
    newFieldIncludeInRejectionSummary,
    setNewFieldIncludeInRejectionSummary,
    selectedField,
    selectedFieldId,
    setSelectedFieldId,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    isEditDialogOpen,
    setIsEditDialogOpen,
    editFieldName,
    setEditFieldName,
    editIncludeInRejectionSummary,
    setEditIncludeInRejectionSummary,
    editError,
    isSavingEdit,
    isAdding,
    handleAdd,
    handleDeleteField,
    handleEditField,
  };
}
