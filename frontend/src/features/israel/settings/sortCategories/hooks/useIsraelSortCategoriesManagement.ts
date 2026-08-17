import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  addIsraelSortCategory,
  editIsraelSortCategory,
  fetchIsraelSortCategories,
  removeIsraelSortCategory,
} from '../../../../../store/israelSortCategoriesSlice';
import type { AppDispatch, RootState } from '../../../../../store';
import { getIsraelSortCategoriesI18n } from '../i18n';
import type { IsraelSortCategoriesManagementProps } from '../israelSortCategoriesPage.types';

export function useIsraelSortCategoriesManagement({
  lang,
  onHeaderStateChange,
}: IsraelSortCategoriesManagementProps) {
  const dispatch = useDispatch<AppDispatch>();
  const {
    items: categories,
    loading,
    error,
  } = useSelector((state: RootState) => state.israelSortCategories);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null,
  );
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const t = getIsraelSortCategoriesI18n(lang);

  useEffect(() => {
    dispatch(fetchIsraelSortCategories());
  }, [dispatch]);

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.name.localeCompare(b.name)),
    [categories],
  );

  useEffect(() => {
    if (
      selectedCategoryId &&
      !sortedCategories.some((category) => category.id === selectedCategoryId)
    ) {
      setSelectedCategoryId(null);
    }
  }, [sortedCategories, selectedCategoryId]);

  const selectedCategory = useMemo(
    () =>
      sortedCategories.find((category) => category.id === selectedCategoryId) ??
      null,
    [sortedCategories, selectedCategoryId],
  );

  const handleAdd = async () => {
    const trimmedName = newCategoryName.trim();

    if (!trimmedName) {
      return;
    }

    setAddError(null);
    setIsAdding(true);

    try {
      const actionResult = await dispatch(
        addIsraelSortCategory({ name: trimmedName }),
      );

      if (addIsraelSortCategory.fulfilled.match(actionResult)) {
        setNewCategoryName('');
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
    if (!selectedCategory) {
      return;
    }

    setDeleteError(null);
    setIsDeleteDialogOpen(true);
  };

  const handleOpenEditDialog = () => {
    if (!selectedCategory) {
      return;
    }

    setEditError(null);
    setEditCategoryName(selectedCategory.name);
    setIsEditDialogOpen(true);
  };

  const handleEditCategory = async () => {
    if (!selectedCategory) {
      return;
    }

    const trimmedName = editCategoryName.trim();
    if (!trimmedName) {
      setEditError(t.emptyName);
      return;
    }

    setIsSavingEdit(true);
    const actionResult = await dispatch(
      editIsraelSortCategory({
        id: selectedCategory.id,
        name: trimmedName,
      }),
    );

    if (editIsraelSortCategory.fulfilled.match(actionResult)) {
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

  const handleDeleteCategory = async () => {
    if (!selectedCategory) {
      return;
    }

    const actionResult = await dispatch(
      removeIsraelSortCategory(selectedCategory.id),
    );

    if (removeIsraelSortCategory.fulfilled.match(actionResult)) {
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

  const isEditDisabled = !selectedCategory || loading;
  const isDeleteDisabled = !selectedCategory || loading;
  const shownError = addError ?? editError ?? deleteError ?? error;

  useEffect(() => {
    if (!onHeaderStateChange) {
      return;
    }

    onHeaderStateChange({
      count: sortedCategories.length,
      isEditDisabled,
      isDeleteDisabled,
      onEdit: handleOpenEditDialog,
      onDelete: handleOpenDeleteDialog,
    });
  }, [
    onHeaderStateChange,
    sortedCategories.length,
    isEditDisabled,
    isDeleteDisabled,
    selectedCategory,
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
    sortedCategories,
    newCategoryName,
    setNewCategoryName,
    selectedCategory,
    selectedCategoryId,
    setSelectedCategoryId,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    isEditDialogOpen,
    setIsEditDialogOpen,
    editCategoryName,
    setEditCategoryName,
    editError,
    isSavingEdit,
    isAdding,
    handleAdd,
    handleDeleteCategory,
    handleEditCategory,
  };
}
