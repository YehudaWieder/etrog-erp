import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  createDefaultTraderCategoryWithShares,
  deleteDefaultTraderCategory,
  getDefaultTraderCategories,
  reorderDefaultTraderCategories,
  type DefaultTraderCategory,
  updateDefaultTraderCategory,
} from '../../../services/defaultTraderCategoriesApi';
import { fetchTraders } from '../../../store/tradersSlice';
import type { AppDispatch, RootState } from '../../../store';
import { getDefaultTraderCategoriesI18n, resolveTradersAppLang } from '../i18n';
import { sortByHebrewName, sortByOrderIndex } from '../services/traderCollections.service';
import { syncDefaultTraderCategoryShares } from '../services/defaultTraderCategorySharesSync.service';
import { getAddShareRowBlockReason, getAvailableTradersForRow } from '../services/traderShareRows.service';
import { toggleGradeSelection } from '../utils/traderCategoryGrades.util';
import {
  addGradeGroupRow,
  gradeGroupsToRows,
  removeGradeGroupRow,
  renameGradeGroupRow,
  rowsToGradeGroups,
  toggleGradeInGroupRow,
  type GradeGroupRow,
} from '../utils/traderCategoryGradeGroups.util';
import type { DefaultTraderCategoriesManagementProps, ShareRow } from '../tradersManagement.types';
import {
  calculateTotalPercent,
  createEmptyShareRow,
  getNextShareRowId,
  isValidSharePercent,
  TOTAL_EPSILON,
} from '../utils/traderShares.util';

export function useDefaultTraderCategoriesManagement({ onHeaderStateChange }: DefaultTraderCategoriesManagementProps) {
  const dispatch = useDispatch<AppDispatch>();
  const appLang = resolveTradersAppLang();
  const t = getDefaultTraderCategoriesI18n();
  const traders = useSelector((state: RootState) => state.traders.items);

  const [categories, setCategories] = useState<DefaultTraderCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [reorderError, setReorderError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [categoryName, setCategoryName] = useState('');
  const [categoryNotes, setCategoryNotes] = useState('');
  const [supportedGrades, setSupportedGrades] = useState<string[]>([]);
  const [gradeGroupRows, setGradeGroupRows] = useState<GradeGroupRow[]>([]);
  const [shareRows, setShareRows] = useState<ShareRow[]>([createEmptyShareRow(1)]);
  const [showAddRowBlockReason, setShowAddRowBlockReason] = useState(false);

  useEffect(() => {
    void dispatch(fetchTraders());
  }, [dispatch]);

  useEffect(() => {
    void loadCategories();
  }, []);

  const sortedTraders = useMemo(() => sortByHebrewName(traders), [traders]);

  const selectedCategory = useMemo(
    () => categories.find((item) => item.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId],
  );

  const sortedCategories = useMemo(() => sortByOrderIndex(categories), [categories]);

  const totalPercent = useMemo(() => calculateTotalPercent(shareRows), [shareRows]);

  const isTotalExact = Math.abs(totalPercent - 100) <= TOTAL_EPSILON;
  const isTotalAtLeastHundred = totalPercent >= 100 - TOTAL_EPSILON;
  const selectedTraderIdsCount = new Set(
    shareRows
      .map((row) => row.traderId)
      .filter((traderId): traderId is number => traderId !== null),
  ).size;
  const hasAvailableTraders = selectedTraderIdsCount < sortedTraders.length;
  const addRowBlockReason = useMemo(
    () =>
      getAddShareRowBlockReason({
        shareRows,
        isHebrew: appLang === 'he',
        isTotalAtLeastHundred,
        hasAvailableTraders,
    labels: t.shareRows,
      }),
    [shareRows, appLang, isTotalAtLeastHundred, hasAvailableTraders],
  );

  const canAddShareRow = addRowBlockReason === null;

  const addShareRow = () => {
    if (!canAddShareRow) {
      setShowAddRowBlockReason(true);
      return;
    }

    setShowAddRowBlockReason(false);

    setShareRows((currentRows) => {
      const nextRowId = getNextShareRowId(currentRows);
      return [...currentRows, createEmptyShareRow(nextRowId)];
    });
  };

  const removeShareRow = (rowId: number) => {
    setShareRows((currentRows) => {
      if (currentRows.length === 1) {
        return currentRows;
      }

      return currentRows.filter((row) => row.rowId !== rowId);
    });
  };

  const updateShareRow = (rowId: number, changes: Partial<ShareRow>) => {
    setShareRows((currentRows) =>
      currentRows.map((row) => (row.rowId === rowId ? { ...row, ...changes } : row)),
    );
  };

  const toggleSupportedGrade = (grade: string) => {
    setSupportedGrades((current) => toggleGradeSelection(current, grade));
  };

  const addGradeGroup = () => {
    setGradeGroupRows((current) => addGradeGroupRow(current));
  };

  const removeGradeGroup = (localId: number) => {
    setGradeGroupRows((current) => removeGradeGroupRow(current, localId));
  };

  const renameGradeGroup = (localId: number, name: string) => {
    setGradeGroupRows((current) => renameGradeGroupRow(current, localId, name));
  };

  const toggleGradeInGroup = (localId: number, grade: string) => {
    setGradeGroupRows((current) => toggleGradeInGroupRow(current, localId, grade));
  };

  const resetForm = () => {
    setCategoryName('');
    setCategoryNotes('');
    setSupportedGrades([]);
    setGradeGroupRows([]);
    setShareRows([createEmptyShareRow(1)]);
    setShowAddRowBlockReason(false);
  };

  const loadCategories = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getDefaultTraderCategories();
      setCategories(sortByOrderIndex(result));
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : t.loadFailed;
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const validateBeforeSubmit = (): string | null => {
    if (!categoryName.trim()) {
      return t.emptyName;
    }

    if (shareRows.length === 0) {
      return t.atLeastOneShare;
    }

    const traderIds = new Set<number>();

    for (const shareRow of shareRows) {
      if (!shareRow.traderId) {
        return t.selectTrader;
      }

      if (traderIds.has(shareRow.traderId)) {
        return t.uniqueTraders;
      }

      traderIds.add(shareRow.traderId);

      if (!isValidSharePercent(shareRow.percent)) {
        return t.invalidPercent;
      }
    }

    if (!isTotalExact) {
      return t.totalMustBeHundred;
    }

    return null;
  };

  const openAddDialog = () => {
    if (sortedTraders.length === 0) {
      setAddError(t.noTraders);
      return;
    }

    setError(null);
    setAddError(null);
    setEditError(null);
    resetForm();
    setIsAddDialogOpen(true);
  };

  const openEditDialog = () => {
    if (!selectedCategory) {
      return;
    }

    setError(null);
    setEditError(null);
    setAddError(null);
    setCategoryName(selectedCategory.name);
    setCategoryNotes(selectedCategory.notes ?? '');
    setSupportedGrades(selectedCategory.supportedGrades ?? []);
    setGradeGroupRows(gradeGroupsToRows(selectedCategory.gradeGroups));
    setShowAddRowBlockReason(false);
    setShareRows(
      selectedCategory.shares.length > 0
        ? selectedCategory.shares.map((share, index) => ({
            rowId: index + 1,
            traderId: share.traderId,
            percent: String(share.percent),
          }))
        : [createEmptyShareRow(1)],
    );
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = () => {
    if (!selectedCategory) {
      return;
    }

    setDeleteError(null);
    setError(null);
    setIsDeleteDialogOpen(true);
  };

  const handleCreateCategory = async () => {
    const validationMessage = validateBeforeSubmit();

    if (validationMessage) {
      setAddError(validationMessage);
      return;
    }

    setIsSubmitting(true);
    setAddError(null);

    try {
      const createdCategory = await createDefaultTraderCategoryWithShares({
        name: categoryName.trim(),
        notes: categoryNotes.trim() || undefined,
        supportedGrades,
        gradeGroups: rowsToGradeGroups(gradeGroupRows),
        shares: shareRows.map((shareRow) => ({
          traderId: shareRow.traderId as number,
          percent: Number(shareRow.percent),
        })),
      });

      setCategories((current) => sortByOrderIndex([...current.filter((item) => item.id !== createdCategory.id), createdCategory]));
      setSelectedCategoryId(createdCategory.id);
      setIsAddDialogOpen(false);
      resetForm();
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : t.addFailed;
      setAddError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditCategory = async () => {
    if (!selectedCategory) {
      return;
    }

    const validationMessage = validateBeforeSubmit();
    if (validationMessage) {
      setEditError(validationMessage);
      return;
    }

    setIsSubmitting(true);
    setEditError(null);

    try {
      await updateDefaultTraderCategory({
        id: selectedCategory.id,
        name: categoryName.trim(),
        notes: categoryNotes.trim() || undefined,
        supportedGrades,
        gradeGroups: rowsToGradeGroups(gradeGroupRows),
      });

      await syncDefaultTraderCategoryShares(selectedCategory.id, selectedCategory.shares, shareRows);

      const refreshed = await getDefaultTraderCategories();
      const sorted = sortByOrderIndex(refreshed);
      setCategories(sorted);
      setSelectedCategoryId(selectedCategory.id);
      setIsEditDialogOpen(false);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : t.editFailed;
      setEditError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!selectedCategory) {
      return;
    }

    setDeleteError(null);

    try {
      await deleteDefaultTraderCategory(selectedCategory.id);
      setCategories((current) => current.filter((item) => item.id !== selectedCategory.id));
      setSelectedCategoryId(null);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : t.deleteFailed;
      setDeleteError(message);
    } finally {
      setIsDeleteDialogOpen(false);
    }
  };

  const isAddDisabled = loading || isSubmitting || sortedTraders.length === 0;
  const isEditDisabled = loading || isSubmitting || !selectedCategory;
  const isDeleteDisabled = loading || isSubmitting || !selectedCategory;
  const shownError = addError ?? editError ?? deleteError ?? reorderError ?? error;

  const reorderCategories = async (orderedIds: number[]) => {
    const previousCategories = categories;
    const reordered = orderedIds
      .map((id, index) => {
        const category = categories.find((item) => item.id === id);
        return category ? { ...category, orderIndex: index } : null;
      })
      .filter((item): item is DefaultTraderCategory => item !== null);

    setCategories(reordered);
    setReorderError(null);

    try {
      await reorderDefaultTraderCategories(orderedIds);
    } catch (requestError) {
      setCategories(previousCategories);
      const message = requestError instanceof Error ? requestError.message : t.reorderFailed;
      setReorderError(message);
    }
  };

  useEffect(() => {
    if (!onHeaderStateChange) {
      return;
    }

    onHeaderStateChange({
      count: sortedCategories.length,
      isAddDisabled,
      isEditDisabled,
      isDeleteDisabled,
      onAdd: openAddDialog,
      onEdit: openEditDialog,
      onDelete: openDeleteDialog,
    });
  }, [onHeaderStateChange, sortedCategories.length, isAddDisabled, isEditDisabled, isDeleteDisabled, selectedCategory, loading, isSubmitting, sortedTraders.length]);

  useEffect(() => () => {
    onHeaderStateChange?.(null);
  }, [onHeaderStateChange]);

  const getRowAvailableTraders = (row: ShareRow) => {
    return getAvailableTradersForRow(shareRows, row.rowId, sortedTraders, row.traderId);
  };

  return {
    t,
    loading,
    shownError,
    sortedTraders,
    sortedCategories,
    selectedCategory,
    selectedCategoryId,
    setSelectedCategoryId,
    isAddDialogOpen,
    isEditDialogOpen,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    categoryName,
    setCategoryName,
    categoryNotes,
    setCategoryNotes,
    supportedGrades,
    toggleSupportedGrade,
    gradeGroupRows,
    addGradeGroup,
    removeGradeGroup,
    renameGradeGroup,
    toggleGradeInGroup,
    shareRows,
    updateShareRow,
    removeShareRow,
    addShareRow,
    totalPercent,
    isTotalExact,
    showAddRowBlockReason,
    addRowBlockReason,
    addError,
    editError,
    isSubmitting,
    handleDeleteCategory,
    closeDialogs: () => {
      setIsAddDialogOpen(false);
      setIsEditDialogOpen(false);
    },
    onSaveFromModal: () => {
      if (isAddDialogOpen) {
        void handleCreateCategory();
        return;
      }

      void handleEditCategory();
    },
    getRowAvailableTraders,
    onReorderCategories: (orderedIds: number[]) => {
      void reorderCategories(orderedIds);
    },
  };
}
