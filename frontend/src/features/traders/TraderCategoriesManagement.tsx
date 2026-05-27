import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FaXmark } from 'react-icons/fa6';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { GlobalScopedFilters } from '../../components/ui/GlobalScopedFilters';
import ManagementCardsGrid from '../../components/ui/ManagementCardsGrid';
import ManagementSelectableCard from '../../components/ui/ManagementSelectableCard';
import SettingsInnerTemplate from '../../components/ui/SettingsInnerTemplate';
import {
  createTraderCategoryWithShares,
  deleteTraderCategory,
  getTraderCategoriesWithShares,
  type TraderCategoryWithShares,
  updateTraderCategoryWithShares,
} from '../../services/traderCategoriesApi';
import { fetchSeasons } from '../../store/seasonsSlice';
import { fetchTraders } from '../../store/tradersSlice';
import { setScopeFilter } from '../../store/globalFiltersSlice';
import type { AppDispatch, RootState } from '../../store';
import { getManagementI18n, resolveAppLang } from '../settings/managementI18n';
import {
  buildTraderCategoriesFiltersConfig,
  parseTraderCategorySeasonFilterId,
  parseTraderFilterId,
} from './traderCategoriesFilters';

type ShareRow = {
  rowId: number;
  traderId: number | null;
  percent: string;
};

export type TraderCategoriesHeaderState = {
  count: number;
  isAddDisabled: boolean;
  isEditDisabled: boolean;
  isDeleteDisabled: boolean;
  onAdd: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

type TraderCategoriesManagementProps = {
  onHeaderStateChange?: (state: TraderCategoriesHeaderState | null) => void;
};

const FILTER_SCOPE = 'trader-categories-management';
const EMPTY_FILTERS: Record<string, string> = {};
const DEFAULT_PERCENT_STEP = 0.01;
const TOTAL_EPSILON = 0.001;

const createEmptyShareRow = (rowId: number): ShareRow => ({
  rowId,
  traderId: null,
  percent: '',
});

const isValidPercent = (value: string): boolean => {
  if (value.trim() === '') {
    return false;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue > 0 && parsedValue <= 100;
};

const isShareRowComplete = (row: ShareRow): boolean => {
  return row.traderId !== null && isValidPercent(row.percent);
};

const TraderCategoriesManagement: React.FC<TraderCategoriesManagementProps> = ({ onHeaderStateChange }) => {
  const dispatch = useDispatch<AppDispatch>();
  const appLang = resolveAppLang();
  const t = getManagementI18n(resolveAppLang()).traderCategories;

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
  const [shareRows, setShareRows] = useState<ShareRow[]>([createEmptyShareRow(1)]);
  const [showAddRowBlockReason, setShowAddRowBlockReason] = useState(false);

  const [addError, setAddError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
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

  const sortedTraders = useMemo(
    () => [...traders].sort((a, b) => a.name.localeCompare(b.name, 'he')),
    [traders],
  );

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
      setCategories(result.sort((a, b) => a.name.localeCompare(b.name, 'he')));
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

  const totalPercent = useMemo(
    () => shareRows.reduce((acc, row) => acc + (Number(row.percent) || 0), 0),
    [shareRows],
  );

  const isTotalExact = Math.abs(totalPercent - 100) <= TOTAL_EPSILON;
  const isTotalAtLeastHundred = totalPercent >= 100 - TOTAL_EPSILON;
  const selectedTraderIdsCount = new Set(
    shareRows
      .map((row) => row.traderId)
      .filter((traderId): traderId is number => traderId !== null),
  ).size;
  const hasAvailableTraders = selectedTraderIdsCount < sortedTraders.length;
  const addRowBlockReason = useMemo(() => {
    if (shareRows.length === 0) {
      return null;
    }

    const lastRow = shareRows[shareRows.length - 1];
    const isHebrew = appLang === 'he';

    if (!isShareRowComplete(lastRow)) {
      return isHebrew
        ? 'לא ניתן להוסיף שורה חדשה לפני השלמת השורה האחרונה (סוחר ואחוז תקין).'
        : 'Complete the previous row (trader and valid percent) before adding a new one.';
    }

    if (isTotalAtLeastHundred) {
      return isHebrew
        ? 'לא ניתן להוסיף שורה נוספת כי הסכום הכולל כבר הגיע ל-100%.'
        : 'Cannot add another row because total percent already reached 100%.';
    }

    if (!hasAvailableTraders) {
      return isHebrew
        ? 'לא ניתן להוסיף שורה נוספת כי כל הסוחרים כבר נבחרו.'
        : 'Cannot add another row because all traders are already selected.';
    }

    return null;
  }, [shareRows, appLang, isTotalAtLeastHundred, hasAvailableTraders]);

  const canAddShareRow = addRowBlockReason === null;

  const addShareRow = () => {
    if (!canAddShareRow) {
      setShowAddRowBlockReason(true);
      return;
    }

    setShowAddRowBlockReason(false);

    setShareRows((currentRows) => {
      const nextRowId = currentRows.reduce((maxId, row) => Math.max(maxId, row.rowId), 0) + 1;
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

  const resetForm = () => {
    setCategoryName('');
    setCategoryNotes('');
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

      if (!isValidPercent(shareRow.percent)) {
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
        shares: shareRows.map((shareRow) => ({
          traderId: shareRow.traderId as number,
          percent: Number(shareRow.percent),
        })),
      });

      setCategories((current) => [...current.filter((item) => item.id !== createdCategory.id), createdCategory].sort((a, b) => a.name.localeCompare(b.name, 'he')));
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
        shares: shareRows.map((shareRow) => ({
          traderId: shareRow.traderId as number,
          percent: Number(shareRow.percent),
        })),
      });

      setCategories((current) => [...current.filter((item) => item.id !== updated.id), updated].sort((a, b) => a.name.localeCompare(b.name, 'he')));
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
      onAdd: openAddDialog,
      onEdit: openEditDialog,
      onDelete: openDeleteDialog,
    });
  }, [onHeaderStateChange, filteredCategories.length, isAddDisabled, isEditDisabled, isDeleteDisabled, selectedCategory, loading, isSubmitting, seasonFilterId, sortedTraders.length]);

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
      loadingMessage={loading ? t.loading : null}
      errorMessage={shownError ?? (sortedTraders.length === 0 && !loading ? t.noTraders : null)}
      emptyMessage={!seasonFilterId ? t.noSeasonSelected : seasonFilterId && filteredCategories.length === 0 && !loading ? t.empty : null}
    >

      {filteredCategories.length > 0 ? (
        <ManagementCardsGrid>
          {filteredCategories.map((category) => {
            const isSelected = selectedCategoryId === category.id;
            const badge = category.name.trim().slice(0, 2).toUpperCase() || '#';

            return (
              <li key={category.id}>
                <ManagementSelectableCard
                  isSelected={isSelected}
                  badgeLabel={badge}
                  selector={
                    <span className={`profile-mini-card__avatar${isSelected ? ' is-selected' : ''}`}>
                      {isSelected ? '✓' : badge}
                    </span>
                  }
                  onToggle={() => {
                    setSelectedCategoryId((currentId) => (currentId === category.id ? null : category.id));
                  }}
                  topContent={
                    <span className="profile-mini-card__identity">
                      <span className="seasons-manager__year">{category.name}</span>
                      <span className="default-trader-categories-manager__top-id">{t.categoryId}: {category.id}</span>
                    </span>
                  }
                  bottomContent={
                    <span className="profile-mini-card__rows default-trader-categories-manager__rows">
                      {category.notes ? (
                        <span className="profile-detail-row">
                          <span className="profile-detail-row__label">{t.notesLabel}</span>
                          <strong className="profile-detail-row__value">{category.notes}</strong>
                        </span>
                      ) : null}

                      {category.shares.length > 0 ? (
                        <>
                          <span className="default-trader-categories-manager__shares-subtitle">{t.sharesDetailsTitle}</span>
                          {category.shares.map((share) => (
                            <span key={`${category.id}-${share.traderId}`} className="profile-detail-row">
                              <span className="profile-detail-row__label default-trader-categories-manager__share-name">{share.traderName}</span>
                              <strong className="profile-detail-row__value">{share.percent}%</strong>
                            </span>
                          ))}
                        </>
                      ) : null}
                    </span>
                  }
                />
              </li>
            );
          })}
        </ManagementCardsGrid>
      ) : null}

      <ConfirmDialog
        open={isDeleteDialogOpen}
        title={t.deleteTitle}
        message={selectedCategory ? t.deleteMessage(selectedCategory.name) : t.deleteFallback}
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
              {isAddDialogOpen ? t.addMessage : t.editMessage(selectedCategory?.name ?? '')}
            </div>

            <div className="default-trader-categories-manager__form-grid">
              <div className="default-trader-categories-manager__field">
                <label className="default-trader-categories-manager__label">{t.categoryNameLabel}</label>
                <input
                  className="seasons-manager__year-input"
                  type="text"
                  value={categoryName}
                  onChange={(event) => setCategoryName(event.target.value)}
                  placeholder={t.categoryNamePlaceholder}
                  autoFocus
                />
              </div>

              <div className="default-trader-categories-manager__field">
                <label className="default-trader-categories-manager__label">{t.notesLabel}</label>
                <input
                  className="seasons-manager__year-input"
                  type="text"
                  value={categoryNotes}
                  onChange={(event) => setCategoryNotes(event.target.value)}
                  placeholder={t.notesPlaceholder}
                />
              </div>
            </div>

            <p className="default-trader-categories-manager__shares-subtitle">{t.allocationSectionTitle}</p>

            <div className="default-trader-categories-manager__shares-area">
              {shareRows.map((row, index) => (
                <div key={row.rowId} className="default-trader-categories-manager__share-row">
                  {(() => {
                    const selectedTraderIdsInOtherRows = new Set(
                      shareRows
                        .filter((shareRow) => shareRow.rowId !== row.rowId && shareRow.traderId !== null)
                        .map((shareRow) => shareRow.traderId as number),
                    );

                    const availableTraders = sortedTraders.filter(
                      (trader) => trader.id === row.traderId || !selectedTraderIdsInOtherRows.has(trader.id),
                    );

                    return (
                  <select
                    className="seasons-manager__year-input"
                    value={row.traderId ?? ''}
                    onChange={(event) => {
                      const traderId = Number(event.target.value);
                      updateShareRow(row.rowId, {
                        traderId: Number.isFinite(traderId) && traderId > 0 ? traderId : null,
                      });
                    }}
                  >
                    <option value="">{t.selectTraderOption}</option>
                    {availableTraders.map((trader) => (
                      <option key={trader.id} value={trader.id}>{trader.name}</option>
                    ))}
                  </select>
                    );
                  })()}

                  <input
                    className="seasons-manager__year-input"
                    type="number"
                    min={0}
                    max={100}
                    step={DEFAULT_PERCENT_STEP}
                    value={row.percent}
                    onChange={(event) => updateShareRow(row.rowId, { percent: event.target.value })}
                    placeholder={t.percentPlaceholder(index + 1)}
                  />

                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => removeShareRow(row.rowId)}
                    disabled={shareRows.length <= 1}
                  >
                    {t.removeRow}
                  </button>
                </div>
              ))}

              <div className="default-trader-categories-manager__shares-actions">
                <button type="button" className="btn btn-primary" onClick={addShareRow}>
                  {t.addRow}
                </button>
                <strong className={`default-trader-categories-manager__total${isTotalExact ? '' : ' is-invalid'}`}>
                  {t.totalPercentLabel}: {totalPercent.toFixed(2)}%
                </strong>
              </div>

              {showAddRowBlockReason && addRowBlockReason ? <p className="seasons-manager__error">{addRowBlockReason}</p> : null}
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
                    void handleCreateCategory();
                    return;
                  }

                  void handleEditCategory();
                }}
                type="button"
                disabled={isSubmitting}
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

export default TraderCategoriesManagement;
