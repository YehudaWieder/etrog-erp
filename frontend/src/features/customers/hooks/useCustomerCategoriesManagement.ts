import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCustomers } from '../../../store/customersSlice';
import { fetchSeasons } from '../../../store/seasonsSlice';
import { setScopeFilter } from '../../../store/globalFiltersSlice';
import {
  addCustomerCategory,
  editCustomerCategory,
  fetchCustomerCategories,
  removeCustomerCategory,
} from '../../../store/customerCategoriesSlice';
import type { AppDispatch, RootState } from '../../../store';
import { sanitizeText } from '../../../utils/inputValidation';
import type { Currency, Grade } from '../../../services/customerCategoriesApi';
import { getCustomerCategoriesI18n } from '../i18n';
import { sortCustomersByName } from '../services/customersSort.service';
import type { CategoryFormState, CustomerCategoriesManagementProps } from '../customersPage.types';
import {
  buildCustomerCategoriesFiltersConfig,
  parseCustomerFilterId,
  parseSeasonFilterId,
} from '../utils/customerCategoriesFilters.util';

const FILTER_SCOPE = 'customer-categories-management';
const EMPTY_FILTERS: Record<string, string> = {};

const createInitialFormState = (): CategoryFormState => ({
  customerId: '',
  name: '',
  grade: '',
  price: '',
  currency: '',
});

export function normalizePriceValue(value: number | string): string {
  const numericValue = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(numericValue)) {
    return '0';
  }

  return String(numericValue);
}

export function useCustomerCategoriesManagement({ onHeaderStateChange }: CustomerCategoriesManagementProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { items: categories, loading, error } = useSelector((state: RootState) => state.customerCategories);
  const customers = useSelector((state: RootState) => state.customers.items);
  const seasons = useSelector((state: RootState) => state.seasons.items);
  const activeSeasonId = useSelector((state: RootState) => state.seasons.activeSeasonId);

  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const [formState, setFormState] = useState<CategoryFormState>(() => createInitialFormState());
  const [addError, setAddError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const t = getCustomerCategoriesI18n();
  const globalFilterValues = useSelector(
    (state: RootState) => state.globalFilters.scopes[FILTER_SCOPE] ?? EMPTY_FILTERS,
  );

  useEffect(() => {
    dispatch(fetchSeasons());
    dispatch(fetchCustomers());
  }, [dispatch]);

  const seasonFilterId = useMemo(() => {
    return parseSeasonFilterId(globalFilterValues.seasonId ?? '');
  }, [globalFilterValues.seasonId]);

  const customerFilterId = useMemo<number | 'all'>(() => {
    return parseCustomerFilterId(globalFilterValues.customerId ?? 'all');
  }, [globalFilterValues.customerId]);

  useEffect(() => {
    if (activeSeasonId && (seasonFilterId === null || !seasons.some((season) => season.id === seasonFilterId))) {
      dispatch(
        setScopeFilter({
          scope: FILTER_SCOPE,
          key: 'seasonId',
          value: String(activeSeasonId),
        }),
      );
      return;
    }

    if (!activeSeasonId && seasonFilterId !== null && !seasons.some((season) => season.id === seasonFilterId)) {
      dispatch(
        setScopeFilter({
          scope: FILTER_SCOPE,
          key: 'seasonId',
          value: seasons[0] ? String(seasons[0].id) : '',
        }),
      );
    }
  }, [activeSeasonId, dispatch, seasonFilterId, seasons]);

  useEffect(() => {
    if (!seasonFilterId) {
      return;
    }

    dispatch(fetchCustomerCategories(seasonFilterId));
  }, [dispatch, seasonFilterId]);

  const sortedCustomers = useMemo(() => sortCustomersByName(customers), [customers]);

  const categoriesWithResolvedCustomer = useMemo(() => {
    const customerById = new Map(sortedCustomers.map((customer) => [customer.id, customer.customerName]));

    return categories.map((category) => {
      const customerName = category.customer?.customerName ?? customerById.get(category.customerId) ?? `#${category.customerId}`;

      return {
        ...category,
        customerName,
      };
    });
  }, [categories, sortedCustomers]);

  const sortedCategories = useMemo(
    () =>
      [...categoriesWithResolvedCustomer].sort((a, b) => {
        const customerComparison = a.customerName.localeCompare(b.customerName, 'he');

        if (customerComparison !== 0) {
          return customerComparison;
        }

        const nameComparison = a.name.localeCompare(b.name, 'he');
        if (nameComparison !== 0) {
          return nameComparison;
        }

        return a.grade.localeCompare(b.grade, 'he');
      }),
    [categoriesWithResolvedCustomer],
  );

  const filteredCategories = useMemo(
    () =>
      sortedCategories.filter((category) =>
        customerFilterId === 'all' ? true : category.customerId === customerFilterId,
      ),
    [sortedCategories, customerFilterId],
  );

  const categoriesByCustomer = useMemo(() => {
    const groups = new Map<number, { customerName: string; categories: typeof filteredCategories }>();

    filteredCategories.forEach((category) => {
      const existingGroup = groups.get(category.customerId);

      if (existingGroup) {
        existingGroup.categories.push(category);
        return;
      }

      groups.set(category.customerId, {
        customerName: category.customerName,
        categories: [category],
      });
    });

    return Array.from(groups.entries()).map(([customerId, group]) => ({
      customerId,
      customerName: group.customerName,
      categories: group.categories,
    }));
  }, [filteredCategories]);

  useEffect(() => {
    if (selectedCategoryId && !filteredCategories.some((category) => category.id === selectedCategoryId)) {
      setSelectedCategoryId(null);
    }
  }, [selectedCategoryId, filteredCategories]);

  const selectedCategory = useMemo(
    () => filteredCategories.find((category) => category.id === selectedCategoryId) ?? null,
    [selectedCategoryId, filteredCategories],
  );

  const selectedSeason = useMemo(
    () => seasons.find((season) => season.id === seasonFilterId) ?? null,
    [seasons, seasonFilterId],
  );

  const filters = useMemo(
    () =>
      buildCustomerCategoriesFiltersConfig({
        activeSeasonId,
        seasons,
        customers: sortedCustomers,
        t,
      }),
    [activeSeasonId, seasons, sortedCustomers, t],
  );

  const validateFormState = (state: CategoryFormState): { ok: true; payload: { customerId: number; name: string; grade: Grade; price: number; currency: Currency } } | { ok: false; error: string } => {
    const sanitizedName = sanitizeText(state.name);
    const sanitizedGrade = sanitizeText(state.grade);

    if (!seasonFilterId) {
      return { ok: false, error: t.noActiveSeasonForAdd };
    }

    if (!state.customerId) {
      return { ok: false, error: t.selectCustomer };
    }
    if (!sanitizedGrade) {
      return { ok: false, error: t.selectGrade };
    }

    if (!state.currency) {
      return { ok: false, error: t.selectCurrency };
    }

    if (!sanitizedName) {
      return { ok: false, error: t.emptyName };
    }

    const numericPrice = Number(state.price);
    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      return { ok: false, error: t.invalidPrice };
    }

    return {
      ok: true,
      payload: {
        customerId: state.customerId,
        name: sanitizedName,
        grade: sanitizedGrade,
        price: numericPrice,
        currency: state.currency,
      },
    };
  };

  const handleOpenAddDialog = () => {
    if (!seasonFilterId) {
      setAddError(t.noActiveSeasonForAdd);
      return;
    }

    if (sortedCustomers.length === 0) {
      setAddError(t.noCustomers);
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
      customerId: selectedCategory.customerId,
      name: selectedCategory.name,
      grade: selectedCategory.grade,
      price: normalizePriceValue(selectedCategory.price),
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
    const validation = validateFormState(formState);
    if (!validation.ok) {
      setAddError(validation.error);
      return;
    }

    setAddError(null);

    const actionResult = await dispatch(
      addCustomerCategory({
        seasonId: seasonFilterId as number,
        ...validation.payload,
      }),
    );

    if (addCustomerCategory.fulfilled.match(actionResult)) {
      setIsAddDialogOpen(false);
      return;
    }

    const failureMessage =
      (typeof actionResult.payload === 'string' && actionResult.payload) ||
      actionResult.error.message ||
      t.addFailed;

    setAddError(failureMessage);
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

    const actionResult = await dispatch(
      editCustomerCategory({
        id: selectedCategory.id,
        seasonId: seasonFilterId as number,
        ...validation.payload,
      }),
    );

    if (editCustomerCategory.fulfilled.match(actionResult)) {
      setIsEditDialogOpen(false);
      return;
    }

    const failureMessage =
      (typeof actionResult.payload === 'string' && actionResult.payload) ||
      actionResult.error.message ||
      t.editFailed;

    setEditError(failureMessage);
  };

  const handleDeleteCategory = async () => {
    if (!selectedCategory) {
      return;
    }

    const actionResult = await dispatch(removeCustomerCategory(selectedCategory.id));

    if (removeCustomerCategory.fulfilled.match(actionResult)) {
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

  const isAddDisabled = loading || !seasonFilterId || sortedCustomers.length === 0;
  const isEditDisabled = !selectedCategory || loading;
  const isDeleteDisabled = !selectedCategory || loading;
  const shownError = addError ?? editError ?? deleteError ?? error;

  useEffect(() => {
    if (!onHeaderStateChange) {
      return;
    }

    onHeaderStateChange({
      count: filteredCategories.length,
      isAddDisabled,
      isEditDisabled,
      isDeleteDisabled,
      onAdd: handleOpenAddDialog,
      onEdit: handleOpenEditDialog,
      onDelete: handleOpenDeleteDialog,
    });
  }, [onHeaderStateChange, filteredCategories.length, isAddDisabled, isEditDisabled, isDeleteDisabled, selectedCategory, loading, seasonFilterId, sortedCustomers.length]);

  useEffect(() => () => {
    onHeaderStateChange?.(null);
  }, [onHeaderStateChange]);

  return {
    t,
    filters,
    loading,
    shownError,
    seasonFilterId,
    selectedSeason,
    categoriesByCustomer,
    filteredCategoriesCount: filteredCategories.length,
    selectedCategory,
    selectedCategoryId,
    setSelectedCategoryId,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    isAddDialogOpen,
    setIsAddDialogOpen,
    isEditDialogOpen,
    setIsEditDialogOpen,
    formState,
    setFormState,
    sortedCustomers,
    addError,
    editError,
    handleDeleteCategory,
    handleAddCategory,
    handleEditCategory,
  };
}
