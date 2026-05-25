import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { fetchCustomers } from '../../store/customersSlice';
import { fetchSeasons } from '../../store/seasonsSlice';
import {
  addCustomerCategory,
  editCustomerCategory,
  fetchCustomerCategories,
  removeCustomerCategory,
} from '../../store/customerCategoriesSlice';
import type { AppDispatch, RootState } from '../../store';
import { sanitizeText } from '../../utils/inputValidation';
import type { Currency, Grade } from '../../services/customerCategoriesApi';

const GRADES: Grade[] = ['א', 'ב', 'ג', 'ד', 'ה', 'ו'];
const CURRENCIES: Currency[] = ['ILS', 'USD', 'EUR'];

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

  useEffect(() => {
    dispatch(fetchSeasons());
    dispatch(fetchCustomers());
  }, [dispatch]);

  useEffect(() => {
    if (!activeSeasonId) {
      return;
    }

    dispatch(fetchCustomerCategories(activeSeasonId));
  }, [dispatch, activeSeasonId]);

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

  useEffect(() => {
    if (selectedCategoryId && !sortedCategories.some((category) => category.id === selectedCategoryId)) {
      setSelectedCategoryId(null);
    }
  }, [selectedCategoryId, sortedCategories]);

  const selectedCategory = useMemo(
    () => sortedCategories.find((category) => category.id === selectedCategoryId) ?? null,
    [selectedCategoryId, sortedCategories],
  );

  const activeSeason = useMemo(
    () => seasons.find((season) => season.id === activeSeasonId) ?? null,
    [seasons, activeSeasonId],
  );

  const validateFormState = (state: CategoryFormState): { ok: true; payload: { customerId: number; name: string; grade: Grade; price: number; currency: Currency } } | { ok: false; error: string } => {
    const sanitizedName = sanitizeText(state.name);

    if (!activeSeasonId) {
      return { ok: false, error: 'לא נמצאה עונה פעילה. יש להגדיר עונה פעילה לפני הוספת קטגוריות.' };
    }

    if (!state.customerId) {
      return { ok: false, error: 'יש לבחור לקוח.' };
    }
    if (!state.grade) {
      return { ok: false, error: 'יש לבחור דרגה.' };
    }

    if (!state.currency) {
      return { ok: false, error: 'יש לבחור מטבע.' };
    }


    if (!sanitizedName) {
      return { ok: false, error: 'שם הקטגוריה לא יכול להיות ריק.' };
    }

    const numericPrice = Number(state.price);
    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      return { ok: false, error: 'המחיר חייב להיות מספר חוקי גדול או שווה ל-0.' };
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
    if (!activeSeasonId) {
      setAddError('לא נמצאה עונה פעילה. יש להגדיר עונה פעילה לפני הוספת קטגוריות.');
      return;
    }

    if (sortedCustomers.length === 0) {
      setAddError('אין לקוחות במערכת. יש להוסיף לקוח לפני הגדרת קטגוריה.');
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
        seasonId: activeSeasonId as number,
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
      'הוספת קטגוריית הלקוח נכשלה.';

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
        seasonId: activeSeasonId as number,
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
      'עדכון קטגוריית הלקוח נכשל.';

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
      'לא ניתן למחוק את קטגוריית הלקוח שנבחרה.';

    setDeleteError(failureMessage);
    setIsDeleteDialogOpen(false);
  };

  const isAddDisabled = loading || !activeSeasonId || sortedCustomers.length === 0;
  const isEditDisabled = !selectedCategory || loading;
  const isDeleteDisabled = !selectedCategory || loading;
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
  }, [onHeaderStateChange, sortedCategories.length, isAddDisabled, isEditDisabled, isDeleteDisabled, selectedCategory, loading, activeSeasonId, sortedCustomers.length]);

  useEffect(() => () => {
    onHeaderStateChange?.(null);
  }, [onHeaderStateChange]);

  return (
    <div className="seasons-manager">
      <div className="seasons-manager__state">
        {activeSeason ? `עונה פעילה: ${activeSeason.yearName}` : 'אין עונה פעילה כרגע'}
      </div>

      {loading ? <p className="seasons-manager__state">טוען קטגוריות לקוחות...</p> : null}
      {shownError ? <p className="seasons-manager__error">{shownError}</p> : null}

      {!activeSeasonId ? (
        <div className="seasons-manager__empty">לא נמצאה עונה פעילה. הגדר עונה פעילה ואז הוסף קטגוריות לקוחות.</div>
      ) : null}

      {activeSeasonId && sortedCategories.length === 0 && !loading ? (
        <div className="seasons-manager__empty">אין קטגוריות לקוחות להצגה בעונה הפעילה.</div>
      ) : null}

      {sortedCategories.length > 0 ? (
        <ul className="seasons-manager__cards">
          {sortedCategories.map((category) => {
            const isSelected = selectedCategoryId === category.id;
            const badgeLabel = category.name.trim().slice(0, 2).toUpperCase() || '#';

            return (
              <li key={category.id}>
                <button
                  type="button"
                  className={`seasons-manager__card${isSelected ? ' is-selected' : ''}`}
                  onClick={() => {
                    setSelectedCategoryId((previousId) => (previousId === category.id ? null : category.id));
                  }}
                >
                  <span className={`seasons-manager__selector${isSelected ? ' is-selected' : ''}`}>
                    {isSelected ? '✓' : badgeLabel}
                  </span>

                  <span className="seasons-manager__card-main">
                    <span className="seasons-manager__year">
                      {category.name} | דרגה {category.grade}
                    </span>
                    <span className="seasons-manager__meta customers-manager__meta">
                      <span className="customers-manager__meta-line">לקוח: {category.customerName}</span>
                      <span className="customers-manager__meta-line">מחיר: {normalizePriceValue(category.price)} {category.currency}</span>
                      <span className="customers-manager__meta-line">מזהה קטגוריה: {category.id}</span>
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      <ConfirmDialog
        open={isDeleteDialogOpen}
        title="מחיקת קטגוריית לקוח"
        message={
          selectedCategory
            ? `האם למחוק את הקטגוריה ${selectedCategory.name} (דרגה ${selectedCategory.grade}) עבור הלקוח ${selectedCategory.customerName}?`
            : 'האם למחוק את קטגוריית הלקוח שנבחרה?'
        }
        confirmLabel="מחק"
        cancelLabel="ביטול"
        onConfirm={() => {
          void handleDeleteCategory();
        }}
        onCancel={() => setIsDeleteDialogOpen(false)}
      />

      {isAddDialogOpen || isEditDialogOpen ? (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <h3 className="modal-title">{isAddDialogOpen ? 'הוספת קטגוריית לקוח' : 'עריכת קטגוריית לקוח'}</h3>
            <div className="modal-message">
              {isAddDialogOpen
                ? 'הזן את פרטי הקטגוריה לעונה הפעילה.'
                : `עדכון פרטי הקטגוריה ${selectedCategory?.name ?? ''}`}
            </div>

            <div className="customer-categories-manager__form-grid">
              <div className="customer-categories-manager__field">
                <label className="customer-categories-manager__label">לקוח</label>
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
                    בחר לקוח מהרשימה
                  </option>
                  {sortedCustomers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.customerName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="customer-categories-manager__field">
                <label className="customer-categories-manager__label">שם קטגוריה</label>
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
                  placeholder="לדוגמה: מהדרין"
                  autoFocus
                />
              </div>

              <div className="customer-categories-manager__field">
                <label className="customer-categories-manager__label">דרגה</label>
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
                    בחר דרגה
                  </option>
                  {GRADES.map((grade) => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))}
                </select>
              </div>

              <div className="customer-categories-manager__field">
                <label className="customer-categories-manager__label">מחיר</label>
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
                  placeholder="הזן מחיר"
                />
              </div>

              <div className="customer-categories-manager__field">
                <label className="customer-categories-manager__label">מטבע</label>
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
                    בחר מטבע
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
                ביטול
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
                שמור
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default CustomerCategoriesManagement;