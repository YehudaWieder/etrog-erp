import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchSeasons } from '../../../store/seasonsSlice';
import { fetchIsraelSortCategories } from '../../../store/israelSortCategoriesSlice';
import {
  fetchIsraelCategoryGrades,
  removeIsraelCategoryGrade,
  saveIsraelCategoryGrade,
} from '../../../store/israelCategoryGradesSlice';
import type { AppDispatch, RootState } from '../../../store';
import { getIsraelCategoryGradesI18n } from '../i18n';
import type {
  GradeRow,
  IsraelCategoryGradeFormState,
  IsraelCategoryGradesManagementProps,
} from '../israelCategoryGradesPage.types';

const createInitialFormState = (): IsraelCategoryGradeFormState => ({
  categoryId: '',
  rows: [{ key: '', value: '' }],
});

function rowsToGradesMap(rows: GradeRow[]): Record<string, string> | null {
  const grades: Record<string, string> = {};

  for (const row of rows) {
    const key = row.key.trim();
    const value = row.value.trim();

    if (!key || !value) {
      continue;
    }

    if (grades[key] !== undefined) {
      return null;
    }

    grades[key] = value;
  }

  return Object.keys(grades).length > 0 ? grades : null;
}

function gradesMapToRows(grades: Record<string, string>): GradeRow[] {
  const rows = Object.entries(grades).map(([key, value]) => ({ key, value }));
  return rows.length > 0 ? rows : [{ key: '', value: '' }];
}

export function useIsraelCategoryGradesManagement({
  lang,
  onHeaderStateChange,
}: IsraelCategoryGradesManagementProps) {
  const dispatch = useDispatch<AppDispatch>();
  const t = getIsraelCategoryGradesI18n(lang);

  const sortCategories = useSelector(
    (state: RootState) => state.israelSortCategories.items,
  );
  const entries = useSelector(
    (state: RootState) => state.israelCategoryGrades.items,
  );
  const loading = useSelector(
    (state: RootState) => state.israelCategoryGrades.loading,
  );
  const error = useSelector(
    (state: RootState) => state.israelCategoryGrades.error,
  );
  const activeSeasonId = useSelector(
    (state: RootState) => state.seasons.activeSeasonId,
  );

  const [selectedEntryId, setSelectedEntryId] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [formState, setFormState] = useState<IsraelCategoryGradeFormState>(() =>
    createInitialFormState(),
  );
  const [addError, setAddError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    dispatch(fetchSeasons());
    dispatch(fetchIsraelSortCategories());
  }, [dispatch]);

  useEffect(() => {
    if (!activeSeasonId) {
      return;
    }

    dispatch(fetchIsraelCategoryGrades(activeSeasonId));
  }, [dispatch, activeSeasonId]);

  const sortedCategories = useMemo(
    () => [...sortCategories].sort((a, b) => a.name.localeCompare(b.name)),
    [sortCategories],
  );

  const categoryById = useMemo(
    () =>
      new Map(sortedCategories.map((category) => [category.id, category.name])),
    [sortedCategories],
  );

  const sortedEntries = useMemo(
    () =>
      [...entries].sort((a, b) => {
        const nameA = a.category?.name ?? categoryById.get(a.categoryId) ?? '';
        const nameB = b.category?.name ?? categoryById.get(b.categoryId) ?? '';
        return nameA.localeCompare(nameB);
      }),
    [entries, categoryById],
  );

  const availableCategoriesForAdd = useMemo(
    () =>
      sortedCategories.filter(
        (category) =>
          !entries.some((entry) => entry.categoryId === category.id),
      ),
    [sortedCategories, entries],
  );

  useEffect(() => {
    if (
      selectedEntryId &&
      !sortedEntries.some((entry) => entry.id === selectedEntryId)
    ) {
      setSelectedEntryId(null);
    }
  }, [selectedEntryId, sortedEntries]);

  const selectedEntry = useMemo(
    () => sortedEntries.find((entry) => entry.id === selectedEntryId) ?? null,
    [selectedEntryId, sortedEntries],
  );

  const selectedEntryCategoryName = selectedEntry
    ? (selectedEntry.category?.name ??
      categoryById.get(selectedEntry.categoryId) ??
      '')
    : '';

  const handleAddRow = () => {
    setFormState((previous) => ({
      ...previous,
      rows: [...previous.rows, { key: '', value: '' }],
    }));
  };

  const handleRemoveRow = (index: number) => {
    setFormState((previous) => ({
      ...previous,
      rows:
        previous.rows.length > 1
          ? previous.rows.filter((_, rowIndex) => rowIndex !== index)
          : previous.rows,
    }));
  };

  const handleUpdateRow = (
    index: number,
    field: keyof GradeRow,
    value: string,
  ) => {
    setFormState((previous) => ({
      ...previous,
      rows: previous.rows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row,
      ),
    }));
  };

  const validateFormState = (
    state: IsraelCategoryGradeFormState,
  ):
    | {
        ok: true;
        payload: { categoryId: number; grades: Record<string, string> };
      }
    | { ok: false; error: string } => {
    if (!state.categoryId) {
      return { ok: false, error: t.invalidCategory };
    }

    const grades = rowsToGradesMap(state.rows);
    if (!grades) {
      return { ok: false, error: t.invalidGrades };
    }

    return { ok: true, payload: { categoryId: state.categoryId, grades } };
  };

  const handleOpenAddDialog = () => {
    if (!activeSeasonId) {
      return;
    }

    setAddError(null);
    setFormState(createInitialFormState());
    setIsAddDialogOpen(true);
  };

  const handleOpenEditDialog = () => {
    if (!selectedEntry) {
      return;
    }

    setEditError(null);
    setFormState({
      categoryId: selectedEntry.categoryId,
      rows: gradesMapToRows(selectedEntry.grades),
    });
    setIsEditDialogOpen(true);
  };

  const handleOpenDeleteDialog = () => {
    if (!selectedEntry) {
      return;
    }

    setDeleteError(null);
    setIsDeleteDialogOpen(true);
  };

  const handleAddEntry = async () => {
    if (!activeSeasonId) {
      return;
    }

    const validation = validateFormState(formState);
    if (!validation.ok) {
      setAddError(validation.error);
      return;
    }

    setAddError(null);
    setIsSubmitting(true);

    try {
      const actionResult = await dispatch(
        saveIsraelCategoryGrade({
          seasonId: activeSeasonId,
          ...validation.payload,
        }),
      );

      if (saveIsraelCategoryGrade.fulfilled.match(actionResult)) {
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

  const handleEditEntry = async () => {
    if (!selectedEntry || !activeSeasonId) {
      return;
    }

    const validation = validateFormState(formState);
    if (!validation.ok) {
      setEditError(validation.error);
      return;
    }

    setEditError(null);
    setIsSubmitting(true);

    try {
      const actionResult = await dispatch(
        saveIsraelCategoryGrade({
          seasonId: activeSeasonId,
          ...validation.payload,
        }),
      );

      if (saveIsraelCategoryGrade.fulfilled.match(actionResult)) {
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

  const handleDeleteEntry = async () => {
    if (!selectedEntry) {
      return;
    }

    const actionResult = await dispatch(
      removeIsraelCategoryGrade(selectedEntry.id),
    );

    if (removeIsraelCategoryGrade.fulfilled.match(actionResult)) {
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

  const isAddDisabled =
    !activeSeasonId ||
    loading ||
    isSubmitting ||
    availableCategoriesForAdd.length === 0;
  const isEditDisabled = !selectedEntry || loading || isSubmitting;
  const isDeleteDisabled = !selectedEntry || loading || isSubmitting;
  const shownError = addError ?? editError ?? deleteError ?? error;

  useEffect(() => {
    if (!onHeaderStateChange) {
      return;
    }

    onHeaderStateChange({
      count: sortedEntries.length,
      isAddDisabled,
      isEditDisabled,
      isDeleteDisabled,
      onAdd: handleOpenAddDialog,
      onEdit: handleOpenEditDialog,
      onDelete: handleOpenDeleteDialog,
    });
  }, [
    onHeaderStateChange,
    sortedEntries.length,
    isAddDisabled,
    isEditDisabled,
    isDeleteDisabled,
    selectedEntry,
    loading,
    isSubmitting,
    activeSeasonId,
    availableCategoriesForAdd.length,
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
    activeSeasonId,
    sortedCategories,
    categoryById,
    availableCategoriesForAdd,
    sortedEntries,
    selectedEntry,
    selectedEntryId,
    setSelectedEntryId,
    selectedEntryCategoryName,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    isAddDialogOpen,
    setIsAddDialogOpen,
    isEditDialogOpen,
    setIsEditDialogOpen,
    formState,
    setFormState,
    addError,
    editError,
    isSubmitting,
    handleAddRow,
    handleRemoveRow,
    handleUpdateRow,
    handleDeleteEntry,
    handleAddEntry,
    handleEditEntry,
  };
}
