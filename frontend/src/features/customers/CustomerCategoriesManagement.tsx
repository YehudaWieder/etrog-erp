import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FaXmark } from 'react-icons/fa6';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { GlobalScopedFilters } from '../../components/ui/GlobalScopedFilters';
import ManagementCardsGrid from '../../components/ui/ManagementCardsGrid';
import ManagementSelectableCard from '../../components/ui/ManagementSelectableCard';
import SettingsInnerTemplate from '../../components/ui/SettingsInnerTemplate';
import { fetchCustomers } from '../../store/customersSlice';
import { fetchSeasons } from '../../store/seasonsSlice';
import { setScopeFilter } from '../../store/globalFiltersSlice';
import {
  addCustomerCategory,
  editCustomerCategory,
  fetchCustomerCategories,
  removeCustomerCategory,
} from '../../store/customerCategoriesSlice';
import type { AppDispatch, RootState } from '../../store';
import { sanitizeText } from '../../utils/inputValidation';
import type { Currency, Grade } from '../../services/customerCategoriesApi';
import { getManagementI18n, resolveAppLang } from '../settings/managementI18n';
import {
  buildCustomerCategoriesFiltersConfig,
  parseCustomerFilterId,
  parseSeasonFilterId,
} from './customerCategoriesFilters';

const GRADES: Grade[] = ['א', 'ב', 'ג', 'ד', 'ה', 'ו'];
const CURRENCIES: Currency[] = ['ILS', 'USD', 'EUR'];
const FILTER_SCOPE = 'customer-categories-management';
const EMPTY_FILTERS: Record<string, string> = {};

type CategoryFormState = {
  customerId: number | '';
  name: string;
  grade: Grade | '';
  price: string;
  currency: Currency | '';
};

export type CustomerCategoriesHeaderState = {
  count: number;
  isAddDisabled: boolean;
  isEditDisabled: boolean;
  isDeleteDisabled: boolean;
  onAdd: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

type CustomerCategoriesManagementProps = {
  onHeaderStateChange?: (state: CustomerCategoriesHeaderState | null) => void;
};

const createInitialFormState = (): CategoryFormState => ({
  customerId: '',
  name: '',
  grade: '',
  price: '',
  currency: '',
});

function normalizePriceValue(value: number | string): string {
  const numericValue = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(numericValue)) {
    return '0';
  }

  return String(numericValue);
}

const CustomerCategoriesManagement: React.FC<CustomerCategoriesManagementProps> = ({ onHeaderStateChange }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { items: categories, loading, error } = useSelector((state: RootState) => state.customerCategories);
  const customers = useSelector((state: RootState) => state.customers.items);
  const seasons = useSelector((state: RootState) => state.seasons.items);
  const activeSeasonId = useSelector((state: RootState) => state.seasons.activeSeasonId);

  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const [formState, setFormState] = useState<CategoryFormState>(() =>
    createInitialFormState(),
  );
  const [addError, setAddError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const t = getManagementI18n(resolveAppLang()).customerCategories;
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

  const sortedCustomers = useMemo(
    () => [...customers].sort((a, b) => a.customerName.localeCompare(b.customerName, 'he')),
    [customers],
  );

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

    if (!seasonFilterId) {
      return { ok: false, error: t.noActiveSeasonForAdd };
    }

    if (!state.customerId) {
      return { ok: false, error: t.selectCustomer };
    }
    if (!state.grade) {
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
        grade: state.grade,
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

  return (
    <SettingsInnerTemplate
      filters={(
        <GlobalScopedFilters
          scope={FILTER_SCOPE}
          filters={filters}
          className="customer-categories-manager__filters"
          direction="rtl"
        />
      )}
      info={(
        <div className="seasons-manager__state">
          {selectedSeason ? t.activeSeason(selectedSeason.yearName) : t.noActiveSeason}
        </div>
      )}
      loadingMessage={loading ? t.loading : null}
      errorMessage={shownError}
      emptyMessage={!seasonFilterId ? t.empty : seasonFilterId && filteredCategories.length === 0 && !loading ? t.categoryForSeasonEmpty : null}
    >
      {categoriesByCustomer.length > 0 ? (
        <div className="customer-categories-manager__groups">
          {categoriesByCustomer.map((group) => (
            <section key={group.customerId} className="customer-categories-manager__group">
              <h4 className="seasons-manager__section-title">{group.customerName}</h4>
              <ManagementCardsGrid className="customer-categories-manager__cards">
                {group.categories.map((category) => {
                  const isSelected = selectedCategoryId === category.id;
                  const badgeLabel = category.name.trim().slice(0, 2).toUpperCase() || '#';

                  return (
                    <li key={category.id}>
                      <ManagementSelectableCard
                        isSelected={isSelected}
                        badgeLabel={badgeLabel}
                        onToggle={() => {
                          setSelectedCategoryId((previousId) => (previousId === category.id ? null : category.id));
                        }}
                        topContent={
                          <>
                            <span className="seasons-manager__year">
                              {category.name} | {t.grade} {category.grade}
                            </span>
                            <span className="seasons-manager__meta">{t.categoryId}: {category.id}</span>
                          </>
                        }
                        bottomContent={
                          <span className="seasons-manager__meta customers-manager__meta">
                            <span className="customers-manager__meta-line">{t.customer}: {category.customerName}</span>
                            <span className="customers-manager__meta-line">{t.price}: {normalizePriceValue(category.price)} {category.currency}</span>
                          </span>
                        }
                      />
                    </li>
                  );
                })}
              </ManagementCardsGrid>
            </section>
          ))}
        </div>
      ) : null}

      <ConfirmDialog
        open={isDeleteDialogOpen}
        title={t.deleteTitle}
        message={
          selectedCategory
            ? t.deleteMessage(selectedCategory.name, selectedCategory.grade, selectedCategory.customerName)
            : t.deleteFallback
        }
        confirmLabel={t.deleteConfirm}
        cancelLabel={t.cancel}
        onConfirm={() => {
          void handleDeleteCategory();
        }}
        onCancel={() => setIsDeleteDialogOpen(false)}
      />

      {isAddDialogOpen || isEditDialogOpen ? (
        <div className="modal-overlay">
          <div className="modal-dialog modal-dialog--form">
            <button
              className="modal-close"
              type="button"
              aria-label={t.cancel}
              onClick={() => {
                setIsAddDialogOpen(false);
                setIsEditDialogOpen(false);
              }}
            >
              <FaXmark />
            </button>
            <h3 className="modal-title">{isAddDialogOpen ? t.addTitle : t.editTitle}</h3>
            <div className="modal-message">
              {isAddDialogOpen
                ? t.addMessage
                : t.editMessage(selectedCategory?.name ?? '')}
            </div>

            <div className="customer-categories-manager__form-grid">
              <div className="customer-categories-manager__field">
                <label className="customer-categories-manager__label">{t.customerLabel}</label>
                <select
                  className="seasons-manager__year-input"
                  value={formState.customerId}
                  onChange={(event) => {
                    setFormState((previous) => ({
                      ...previous,
                      customerId: event.target.value ? Number(event.target.value) : '',
                    }));
                  }}
                >
                  <option value="" disabled>
                    {t.selectCustomer}
                  </option>
                  {sortedCustomers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.customerName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="customer-categories-manager__field">
                <label className="customer-categories-manager__label">{t.categoryNameLabel}</label>
                <input
                  className="seasons-manager__year-input"
                  type="text"
                  value={formState.name}
                  onChange={(event) => {
                    setFormState((previous) => ({
                      ...previous,
                      name: event.target.value,
                    }));
                  }}
                  placeholder={t.categoryNamePlaceholder}
                  autoFocus
                />
              </div>

              <div className="customer-categories-manager__field">
                <label className="customer-categories-manager__label">{t.gradeLabel}</label>
                <select
                  className="seasons-manager__year-input"
                  value={formState.grade}
                  onChange={(event) => {
                    setFormState((previous) => ({
                      ...previous,
                      grade: event.target.value as Grade | '',
                    }));
                  }}
                >
                  <option value="" disabled>
                    {t.selectGrade}
                  </option>
                  {GRADES.map((grade) => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))}
                </select>
              </div>

              <div className="customer-categories-manager__field">
                <label className="customer-categories-manager__label">{t.priceLabel}</label>
                <input
                  className="seasons-manager__year-input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formState.price}
                  onChange={(event) => {
                    setFormState((previous) => ({
                      ...previous,
                      price: event.target.value,
                    }));
                  }}
                  placeholder={t.pricePlaceholder}
                />
              </div>

              <div className="customer-categories-manager__field">
                <label className="customer-categories-manager__label">{t.currencyLabel}</label>
                <select
                  className="seasons-manager__year-input"
                  value={formState.currency}
                  onChange={(event) => {
                    setFormState((previous) => ({
                      ...previous,
                      currency: event.target.value as Currency | '',
                    }));
                  }}
                >
                  <option value="" disabled>
                    {t.selectCurrency}
                  </option>
                  {CURRENCIES.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {isAddDialogOpen && addError ? <p className="seasons-manager__error">{addError}</p> : null}
            {isEditDialogOpen && editError ? <p className="seasons-manager__error">{editError}</p> : null}

            <div className="modal-actions">
              <button
                className="btn btn-danger"
                onClick={() => {
                  setIsAddDialogOpen(false);
                  setIsEditDialogOpen(false);
                }}
                type="button"
              >
                {t.cancel}
              </button>
              <button
                className="btn btn-success"
                onClick={() => {
                  if (isAddDialogOpen) {
                    void handleAddCategory();
                    return;
                  }

                  void handleEditCategory();
                }}
                type="button"
              >
                {t.save}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </SettingsInnerTemplate>
  );
};

export default CustomerCategoriesManagement;