import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  createTraderCategoryWithShares,
  deleteTraderCategory,
  getTraderCategoriesWithShares,
  reorderTraderCategories,
  type TraderCategoryWithShares,
  updateTraderCategoryWithShares,
} from '../../../services/traderCategoriesApi';
import { fetchSeasons } from '../../../store/seasonsSlice';
import { fetchTraders } from '../../../store/tradersSlice';
import { setScopeFilter } from '../../../store/globalFiltersSlice';
import type { AppDispatch, RootState } from '../../../store';
import { getTraderCategoriesI18n, resolveTradersAppLang } from '../i18n';
import { sortByHebrewName, sortByOrderIndex } from '../services/traderCollections.service';
import { getAddShareRowBlockReason, getAvailableTradersForRow } from '../services/traderShareRows.service';
import { toggleGradeSelection } from '../utils/traderCategoryGrades.util';
import {
  buildTraderCategoriesFiltersConfig,
  parseTraderCategorySeasonFilterId,
  parseTraderFilterId,
} from '../utils/traderCategoriesFilters.util';
import type { ShareRow, TraderCategoriesManagementProps } from '../tradersManagement.types';
import {
  calculateTotalPercent,
  createEmptyShareRow,
  getNextShareRowId,
  isValidSharePercent,
  TOTAL_EPSILON,
} from '../utils/traderShares.util';

const FILTER_SCOPE = 'trader-categories-management';
const EMPTY_FILTERS: Record<string, string> = {};

export function useTraderCategoriesManagement({ onHeaderStateChange }: TraderCategoriesManagementProps) {
  const dispatch = useDispatch<AppDispatch>();
  const appLang = resolveTradersAppLang();
  const t = getTraderCategoriesI18n();

  const seasons = useSelector((state: RootState) => state.seasons.items);
  const activeSeasonId = useSelector((state: RootState) => state.seasons.activeSeasonId);
  const traders = useSelector((state: RootState) => state.traders.items);
  const globalFilterValues = useSelector(
    (state: RootState) => state.globalFilters.scopes[FILTER_SCOPE] ?? EMPTY_FILTERS,
  );

  const [categories, setCategories] = useState<TraderCategoryWithShares[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [categoryName, setCategoryName] = useState('');
  const [categoryNotes, setCategoryNotes] = useState('');
  const [supportedGrades, setSupportedGrades] = useState<string[]>([]);
  const [shareRows, setShareRows] = useState<ShareRow[]>([createEmptyShareRow(1)]);
  const [showAddRowBlockReason, setShowAddRowBlockReason] = useState(false);

  const [addError, setAddError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [reorderError, setReorderError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void dispatch(fetchSeasons());
    void dispatch(fetchTraders());
  }, [dispatch]);

  const seasonFilterId = useMemo(() => {
    return parseTraderCategorySeasonFilterId(globalFilterValues.seasonId ?? '');
  }, [globalFilterValues.seasonId]);

  const traderFilterId = useMemo<number | 'all'>(() => {
    return parseTraderFilterId(globalFilterValues.traderId ?? 'all');
  }, [globalFilterValues.traderId]);

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

  const sortedTraders = useMemo(() => sortByHebrewName(traders), [traders]);

  const filters = useMemo(
    () =>
      buildTraderCategoriesFiltersConfig({
        activeSeasonId,
        seasons,
        traders: sortedTraders,
        t,
      }),
    [activeSeasonId, seasons, sortedTraders, t],
  );

  const loadCategories = async (seasonId: number) => {
    setLoading(true);
    setError(null);

    try {
      const result = await getTraderCategoriesWithShares(seasonId);
      setCategories(sortByOrderIndex(result));
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : t.loadFailed;
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!seasonFilterId) {
      setCategories([]);
      return;
    }

    void loadCategories(seasonFilterId);
  }, [seasonFilterId]);

  const filteredCategories = useMemo(
    () =>
      categories.filter((category) =>
        traderFilterId === 'all'
          ? true
          : category.shares.some((share) => share.traderId === traderFilterId),
      ),
    [categories, traderFilterId],
  );

  useEffect(() => {
    if (selectedCategoryId && !filteredCategories.some((category) => category.id === selectedCategoryId)) {
      setSelectedCategoryId(null);
    }
  }, [selectedCategoryId, filteredCategories]);

  const selectedCategory = useMemo(
    () => filteredCategories.find((item) => item.id === selectedCategoryId) ?? null,
    [filteredCategories, selectedCategoryId],
  );

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

  const resetForm = () => {
    setCategoryName('');
    setCategoryNotes('');
    setSupportedGrades([]);
    setShareRows([createEmptyShareRow(1)]);
    setShowAddRowBlockReason(false);
  };

  const validateBeforeSubmit = (): string | null => {
    if (!seasonFilterId) {
      return t.noSeasonSelected;
    }

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
    if (!seasonFilterId) {
      setAddError(t.noSeasonSelected);
      return;
    }

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

    if (!seasonFilterId) {
      setAddError(t.noSeasonSelected);
      return;
    }

    setIsSubmitting(true);
    setAddError(null);

    try {
      const createdCategory = await createTraderCategoryWithShares({
        seasonId: seasonFilterId,
        name: categoryName.trim(),
        notes: categoryNotes.trim() || undefined,
        supportedGrades,
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
      const updated = await updateTraderCategoryWithShares({
        id: selectedCategory.id,
        name: categoryName.trim(),
        notes: categoryNotes.trim() || undefined,
        supportedGrades,
        shares: shareRows.map((shareRow) => ({
          traderId: shareRow.traderId as number,
          percent: Number(shareRow.percent),
        })),
      });

      setCategories((current) => sortByOrderIndex([...current.filter((item) => item.id !== updated.id), updated]));
      setSelectedCategoryId(updated.id);
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
      await deleteTraderCategory(selectedCategory.id);
      setCategories((current) => current.filter((item) => item.id !== selectedCategory.id));
      setSelectedCategoryId(null);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : t.deleteFailed;
      setDeleteError(message);
    } finally {
      setIsDeleteDialogOpen(false);
    }
  };

  const isAddDisabled = loading || isSubmitting || sortedTraders.length === 0 || !seasonFilterId;
  const isEditDisabled = loading || isSubmitting || !selectedCategory;
  const isDeleteDisabled = loading || isSubmitting || !selectedCategory;
  const isReorderDisabled = traderFilterId !== 'all';
  const shownError = addError ?? editError ?? deleteError ?? reorderError ?? error;

  const reorderCategories = async (orderedIds: number[]) => {
    if (!seasonFilterId || isReorderDisabled) {
      return;
    }

    const previousCategories = categories;
    const reordered = orderedIds
      .map((id, index) => {
        const category = categories.find((item) => item.id === id);
        return category ? { ...category, orderIndex: index } : null;
      })
      .filter((item): item is TraderCategoryWithShares => item !== null);

    setCategories(reordered);
    setReorderError(null);

    try {
      await reorderTraderCategories(seasonFilterId, orderedIds);
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
      count: filteredCategories.length,
      isAddDisabled,
      isEditDisabled,
      isDeleteDisabled,
      onAdd: openAddDialog,
      onEdit: openEditDialog,
      onDelete: openDeleteDialog,
    });
  }, [onHeaderStateChange, filteredCategories.length, isAddDisabled, isEditDisabled, isDeleteDisabled, selectedCategory, loading, isSubmitting, seasonFilterId, sortedTraders.length]);

  useEffect(() => () => {
    onHeaderStateChange?.(null);
  }, [onHeaderStateChange]);

  const getRowAvailableTraders = (row: ShareRow) => {
    return getAvailableTradersForRow(shareRows, row.rowId, sortedTraders, row.traderId);
  };

  return {
    FILTER_SCOPE,
    filters,
    t,
    loading,
    shownError,
    sortedTraders,
    filteredCategories,
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
    isReorderDisabled,
    onReorderCategories: (orderedIds: number[]) => {
      void reorderCategories(orderedIds);
    },
  };
}
