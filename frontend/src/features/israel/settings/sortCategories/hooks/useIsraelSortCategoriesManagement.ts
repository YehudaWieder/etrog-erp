import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  addIsraelSortCategory,
  editIsraelSortCategory,
  fetchIsraelSortCategories,
  removeIsraelSortCategory,
  reorderIsraelSortCategory,
} from '../../../../../store/israelSortCategoriesSlice';
import type { AppDispatch, RootState } from '../../../../../store';
import { toggleGradeSelection } from '../../../../traders/utils/traderCategoryGrades.util';
import {
  addGradeGroupRow,
  gradeGroupsToRows,
  removeGradeGroupRow,
  renameGradeGroupRow,
  rowsToGradeGroups,
  toggleGradeInGroupRow,
} from '../../../../traders/utils/traderCategoryGradeGroups.util';
import { getIsraelSortCategoriesI18n } from '../i18n';
import type {
  IsraelSortCategoriesManagementProps,
  IsraelSortCategoryFormState,
} from '../israelSortCategoriesPage.types';

const createInitialFormState = (): IsraelSortCategoryFormState => ({
  name: '',
  notes: '',
  supportedGrades: [],
  gradeGroupRows: [],
});

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
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null,
  );
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [formState, setFormState] = useState<IsraelSortCategoryFormState>(() =>
    createInitialFormState(),
  );
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const t = getIsraelSortCategoriesI18n(lang);

  useEffect(() => {
    dispatch(fetchIsraelSortCategories());
  }, [dispatch]);

  const sortedCategories = useMemo(
    () =>
      [...categories].sort(
        (a, b) => a.orderIndex - b.orderIndex || a.name.localeCompare(b.name),
      ),
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

  const toggleFormGrade = (grade: string) => {
    setFormState((current) => ({
      ...current,
      supportedGrades: toggleGradeSelection(current.supportedGrades, grade),
    }));
  };

  const addFormGradeGroup = () => {
    setFormState((current) => ({
      ...current,
      gradeGroupRows: addGradeGroupRow(current.gradeGroupRows),
    }));
  };

  const removeFormGradeGroup = (localId: number) => {
    setFormState((current) => ({
      ...current,
      gradeGroupRows: removeGradeGroupRow(current.gradeGroupRows, localId),
    }));
  };

  const renameFormGradeGroup = (localId: number, name: string) => {
    setFormState((current) => ({
      ...current,
      gradeGroupRows: renameGradeGroupRow(
        current.gradeGroupRows,
        localId,
        name,
      ),
    }));
  };

  const toggleFormGradeInGroup = (localId: number, grade: string) => {
    setFormState((current) => ({
      ...current,
      gradeGroupRows: toggleGradeInGroupRow(
        current.gradeGroupRows,
        localId,
        grade,
      ),
    }));
  };

  const handleOpenAddDialog = () => {
    setAddError(null);
    setFormState(createInitialFormState());
    setIsAddDialogOpen(true);
  };

  const handleOpenEditDialog = () => {
    if (!selectedCategory) {
      return;
    }

    setEditError(null);
    setFormState({
      name: selectedCategory.name,
      notes: selectedCategory.notes ?? '',
      supportedGrades: selectedCategory.supportedGrades,
      gradeGroupRows: gradeGroupsToRows(selectedCategory.gradeGroups),
    });
    setIsEditDialogOpen(true);
  };

  const handleOpenDeleteDialog = () => {
    if (!selectedCategory) {
      return;
    }

    setDeleteError(null);
    setIsDeleteDialogOpen(true);
  };

  const closeDialogs = () => {
    setIsAddDialogOpen(false);
    setIsEditDialogOpen(false);
  };

  const handleAddCategory = async () => {
    const trimmedName = formState.name.trim();

    if (!trimmedName) {
      setAddError(t.emptyName);
      return;
    }

    setAddError(null);
    setIsSubmitting(true);

    try {
      const actionResult = await dispatch(
        addIsraelSortCategory({
          name: trimmedName,
          notes: formState.notes.trim() || undefined,
          supportedGrades: formState.supportedGrades,
          gradeGroups: rowsToGradeGroups(formState.gradeGroupRows),
        }),
      );

      if (addIsraelSortCategory.fulfilled.match(actionResult)) {
        setIsAddDialogOpen(false);
        return;
      }

      const failureMessage =
        (typeof actionResult.payload === 'string' && actionResult.payload) ||
        actionResult.error.message ||
        t.addFailed;

      setAddError(failureMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditCategory = async () => {
    if (!selectedCategory) {
      return;
    }

    const trimmedName = formState.name.trim();
    if (!trimmedName) {
      setEditError(t.emptyName);
      return;
    }

    setEditError(null);
    setIsSubmitting(true);

    try {
      const actionResult = await dispatch(
        editIsraelSortCategory({
          id: selectedCategory.id,
          name: trimmedName,
          notes: formState.notes.trim() || undefined,
          supportedGrades: formState.supportedGrades,
          gradeGroups: rowsToGradeGroups(formState.gradeGroupRows),
        }),
      );

      if (editIsraelSortCategory.fulfilled.match(actionResult)) {
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

  const reorderCategories = async (orderedIds: number[]) => {
    await dispatch(reorderIsraelSortCategory(orderedIds));
  };

  const isAddDisabled = loading || isSubmitting;
  const isEditDisabled = !selectedCategory || loading || isSubmitting;
  const isDeleteDisabled = !selectedCategory || loading || isSubmitting;
  const shownError = addError ?? editError ?? deleteError ?? error;

  useEffect(() => {
    if (!onHeaderStateChange) {
      return;
    }

    onHeaderStateChange({
      count: sortedCategories.length,
      isAddDisabled,
      isEditDisabled,
      isDeleteDisabled,
      onAdd: handleOpenAddDialog,
      onEdit: handleOpenEditDialog,
      onDelete: handleOpenDeleteDialog,
    });
  }, [
    onHeaderStateChange,
    sortedCategories.length,
    isAddDisabled,
    isEditDisabled,
    isDeleteDisabled,
    selectedCategory,
    loading,
    isSubmitting,
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
    selectedCategory,
    selectedCategoryId,
    setSelectedCategoryId,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    isAddDialogOpen,
    isEditDialogOpen,
    closeDialogs,
    formState,
    setFormState,
    toggleFormGrade,
    addFormGradeGroup,
    removeFormGradeGroup,
    renameFormGradeGroup,
    toggleFormGradeInGroup,
    addError,
    editError,
    isSubmitting,
    handleAddCategory,
    handleDeleteCategory,
    handleEditCategory,
    onReorderCategories: (orderedIds: number[]) => {
      void reorderCategories(orderedIds);
    },
  };
}
