import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchSeasons } from '../../../../../store/seasonsSlice';
import { fetchIsraelFields } from '../../../../../store/israelFieldsSlice';
import {
  addIsraelFieldCategory,
  editIsraelFieldCategory,
  fetchIsraelFieldCategories,
  removeIsraelFieldCategory,
} from '../../../../../store/israelFieldCategoriesSlice';
import type { AppDispatch, RootState } from '../../../../../store';
import type { Currency } from '../../../../../services/israel/israelFieldCategoriesApi';
import { getIsraelFieldCategoriesI18n } from '../i18n';
import {
  buildIsraelFieldCategoriesFiltersConfig,
  parseFieldFilterId,
} from '../utils/israelFieldCategoriesFilters.util';
import type {
  IsraelFieldCategoriesManagementProps,
  IsraelFieldCategoryFormState,
} from '../israelFieldCategoriesPage.types';

const FILTER_SCOPE = 'israel-field-categories-management';
const EMPTY_FILTERS: Record<string, string> = {};

const createInitialFormState = (): IsraelFieldCategoryFormState => ({
  fieldId: '',
  name: '',
  price: '',
  currency: '',
});

function isValidPrice(value: string): boolean {
  if (value.trim() === '') {
    return false;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue >= 0;
}

export function useIsraelFieldCategoriesManagement({
  lang,
  onHeaderStateChange,
}: IsraelFieldCategoriesManagementProps) {
  const dispatch = useDispatch<AppDispatch>();
  const t = getIsraelFieldCategoriesI18n(lang);
  const globalFilterValues = useSelector(
    (state: RootState) => state.globalFilters.scopes[FILTER_SCOPE] ?? EMPTY_FILTERS,
  );

  const israelFields = useSelector(
    (state: RootState) => state.israelFields.items,
  );
  const categories = useSelector(
    (state: RootState) => state.israelFieldCategories.items,
  );
  const loading = useSelector(
    (state: RootState) => state.israelFieldCategories.loading,
  );
  const error = useSelector(
    (state: RootState) => state.israelFieldCategories.error,
  );
  const activeSeasonId = useSelector(
    (state: RootState) => state.seasons.activeSeasonId,
  );

  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null,
  );
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [formState, setFormState] = useState<IsraelFieldCategoryFormState>(() =>
    createInitialFormState(),
  );
  const [addError, setAddError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    dispatch(fetchSeasons());
    dispatch(fetchIsraelFields());
  }, [dispatch]);

  useEffect(() => {
    if (!activeSeasonId) {
      return;
    }

    dispatch(fetchIsraelFieldCategories(activeSeasonId));
  }, [dispatch, activeSeasonId]);

  const sortedFields = useMemo(
    () => [...israelFields].sort((a, b) => a.name.localeCompare(b.name)),
    [israelFields],
  );

  const fieldById = useMemo(
    () => new Map(sortedFields.map((field) => [field.id, field.name])),
    [sortedFields],
  );

  const fieldFilterId = useMemo<number | 'all'>(
    () => parseFieldFilterId(globalFilterValues.fieldId ?? 'all'),
    [globalFilterValues.fieldId],
  );

  const filters = useMemo(
    () => buildIsraelFieldCategoriesFiltersConfig({ fields: sortedFields, t }),
    [sortedFields, t],
  );

  const sortedCategories = useMemo(
    () =>
      [...categories]
        .filter((category) =>
          fieldFilterId === 'all' ? true : category.fieldId === fieldFilterId,
        )
        .sort((a, b) => {
          const nameA = a.field?.name ?? fieldById.get(a.fieldId) ?? '';
          const nameB = b.field?.name ?? fieldById.get(b.fieldId) ?? '';
          return nameA.localeCompare(nameB) || a.name.localeCompare(b.name);
        }),
    [categories, fieldById, fieldFilterId],
  );

  const categoriesByField = useMemo(() => {
    const groups = new Map<
      number,
      { fieldName: string; categories: typeof sortedCategories }
    >();

    sortedCategories.forEach((category) => {
      const fieldName =
        category.field?.name ?? fieldById.get(category.fieldId) ?? `#${category.fieldId}`;
      const existingGroup = groups.get(category.fieldId);

      if (existingGroup) {
        existingGroup.categories.push(category);
        return;
      }

      groups.set(category.fieldId, { fieldName, categories: [category] });
    });

    return Array.from(groups.entries()).map(([fieldId, group]) => ({
      fieldId,
      fieldName: group.fieldName,
      categories: group.categories,
    }));
  }, [sortedCategories, fieldById]);

  useEffect(() => {
    if (
      selectedCategoryId &&
      !sortedCategories.some((category) => category.id === selectedCategoryId)
    ) {
      setSelectedCategoryId(null);
    }
  }, [selectedCategoryId, sortedCategories]);

  const selectedCategory = useMemo(
    () =>
      sortedCategories.find((category) => category.id === selectedCategoryId) ??
      null,
    [selectedCategoryId, sortedCategories],
  );

  const selectedCategoryLabel = selectedCategory
    ? `${selectedCategory.field?.name ?? fieldById.get(selectedCategory.fieldId) ?? ''} · ${selectedCategory.name}`
    : '';

  const validateFormState = (
    state: IsraelFieldCategoryFormState,
  ):
    | {
        ok: true;
        payload: {
          fieldId: number;
          name: string;
          price: number;
          currency: Currency;
        };
      }
    | { ok: false; error: string } => {
    if (!state.fieldId) {
      return { ok: false, error: t.selectField };
    }

    if (!state.name.trim()) {
      return { ok: false, error: t.invalidName };
    }

    if (!isValidPrice(state.price)) {
      return { ok: false, error: t.invalidPrice };
    }

    if (!state.currency) {
      return { ok: false, error: t.selectCurrency };
    }

    return {
      ok: true,
      payload: {
        fieldId: state.fieldId,
        name: state.name.trim(),
        price: Number(state.price),
        currency: state.currency,
      },
    };
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
    if (!selectedCategory) {
      return;
    }

    setEditError(null);
    setFormState({
      fieldId: selectedCategory.fieldId,
      name: selectedCategory.name,
      price: String(selectedCategory.price),
      currency: selectedCategory.currency,
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

  const handleAddCategory = async () => {
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
        addIsraelFieldCategory({
          seasonId: activeSeasonId,
          ...validation.payload,
        }),
      );

      if (addIsraelFieldCategory.fulfilled.match(actionResult)) {
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

    const validation = validateFormState(formState);
    if (!validation.ok) {
      setEditError(validation.error);
      return;
    }

    setEditError(null);
    setIsSubmitting(true);

    try {
      const actionResult = await dispatch(
        editIsraelFieldCategory({
          id: selectedCategory.id,
          name: validation.payload.name,
          price: validation.payload.price,
          currency: validation.payload.currency,
        }),
      );

      if (editIsraelFieldCategory.fulfilled.match(actionResult)) {
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
      removeIsraelFieldCategory(selectedCategory.id),
    );

    if (removeIsraelFieldCategory.fulfilled.match(actionResult)) {
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

  const isAddDisabled = !activeSeasonId || loading || isSubmitting;
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
    activeSeasonId,
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
    filters,
    sortedFields,
    fieldById,
    sortedCategories,
    categoriesByField,
    selectedCategory,
    selectedCategoryId,
    setSelectedCategoryId,
    selectedCategoryLabel,
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
    handleDeleteCategory,
    handleAddCategory,
    handleEditCategory,
  };
}
