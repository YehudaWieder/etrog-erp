import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import ManagementCardsGrid from '../../components/ui/ManagementCardsGrid';
import ManagementSelectableCard from '../../components/ui/ManagementSelectableCard';
import SettingsInnerTemplate from '../../components/ui/SettingsInnerTemplate';
import {
  createDefaultTraderCategoryShare,
  createDefaultTraderCategoryWithShares,
  deleteDefaultTraderCategoryShare,
  deleteDefaultTraderCategory,
  getDefaultTraderCategories,
  type DefaultTraderCategory,
  updateDefaultTraderCategory,
  updateDefaultTraderCategoryShare,
} from '../../services/defaultTraderCategoriesApi';
import { fetchTraders } from '../../store/tradersSlice';
import type { AppDispatch, RootState } from '../../store';
import { getManagementI18n, resolveAppLang } from '../settings/managementI18n';

type ShareRow = {
  rowId: number;
  traderId: number | null;
  percent: string;
};

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

export type DefaultTraderCategoriesHeaderState = {
  count: number;
  isAddDisabled: boolean;
  isEditDisabled: boolean;
  isDeleteDisabled: boolean;
  onAdd: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

type DefaultTraderCategoriesManagementProps = {
  onHeaderStateChange?: (state: DefaultTraderCategoriesHeaderState | null) => void;
};

const DefaultTraderCategoriesManagement: React.FC<DefaultTraderCategoriesManagementProps> = ({ onHeaderStateChange }) => {
  const dispatch = useDispatch<AppDispatch>();
  const t = getManagementI18n(resolveAppLang()).defaultTraderCategories;
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
  const [error, setError] = useState<string | null>(null);

  const [categoryName, setCategoryName] = useState('');
  const [categoryNotes, setCategoryNotes] = useState('');
  const [shareRows, setShareRows] = useState<ShareRow[]>([createEmptyShareRow(1)]);

  useEffect(() => {
    void dispatch(fetchTraders());
  }, [dispatch]);

  useEffect(() => {
    void loadCategories();
  }, []);

  const sortedTraders = useMemo(
    () => [...traders].sort((a, b) => a.name.localeCompare(b.name, 'he')),
    [traders],
  );

  const selectedCategory = useMemo(
    () => categories.find((item) => item.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId],
  );

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.name.localeCompare(b.name, 'he')),
    [categories],
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
  const canAddShareRow =
    shareRows.length > 0
    && isShareRowComplete(shareRows[shareRows.length - 1])
    && !isTotalAtLeastHundred
    && hasAvailableTraders;

  const addShareRow = () => {
    if (!canAddShareRow) {
      return;
    }

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
  };

  const loadCategories = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getDefaultTraderCategories();
      setCategories(result.sort((a, b) => a.name.localeCompare(b.name, 'he')));
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
      await updateDefaultTraderCategory({
        id: selectedCategory.id,
        name: categoryName.trim(),
        notes: categoryNotes.trim() || undefined,
      });

      const currentByTrader = new Map(
        selectedCategory.shares.map((share) => [share.traderId, Number(share.percent)]),
      );
      const nextByTrader = new Map(
        shareRows.map((shareRow) => [shareRow.traderId as number, Number(shareRow.percent)]),
      );

      const deletedTraderIds = [...currentByTrader.keys()].filter((traderId) => !nextByTrader.has(traderId));
      for (const traderId of deletedTraderIds) {
        await deleteDefaultTraderCategoryShare(selectedCategory.id, traderId);
      }

      const decreasedTraderIds = [...currentByTrader.keys()].filter((traderId) => {
        const nextPercent = nextByTrader.get(traderId);
        return typeof nextPercent === 'number' && nextPercent < (currentByTrader.get(traderId) ?? 0);
      });
      for (const traderId of decreasedTraderIds) {
        await updateDefaultTraderCategoryShare({
          defaultTraderCategoryId: selectedCategory.id,
          traderId,
          percent: nextByTrader.get(traderId) as number,
        });
      }

      const createdTraderIds = [...nextByTrader.keys()].filter((traderId) => !currentByTrader.has(traderId));
      for (const traderId of createdTraderIds) {
        await createDefaultTraderCategoryShare({
          defaultTraderCategoryId: selectedCategory.id,
          traderId,
          percent: nextByTrader.get(traderId) as number,
        });
      }

      const increasedTraderIds = [...currentByTrader.keys()].filter((traderId) => {
        const nextPercent = nextByTrader.get(traderId);
        return typeof nextPercent === 'number' && nextPercent > (currentByTrader.get(traderId) ?? 0);
      });
      for (const traderId of increasedTraderIds) {
        await updateDefaultTraderCategoryShare({
          defaultTraderCategoryId: selectedCategory.id,
          traderId,
          percent: nextByTrader.get(traderId) as number,
        });
      }

      const refreshed = await getDefaultTraderCategories();
      const sorted = refreshed.sort((a, b) => a.name.localeCompare(b.name, 'he'));
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
      onAdd: openAddDialog,
      onEdit: openEditDialog,
      onDelete: openDeleteDialog,
    });
  }, [onHeaderStateChange, sortedCategories.length, isAddDisabled, isEditDisabled, isDeleteDisabled, selectedCategory, loading, isSubmitting, sortedTraders.length]);

  useEffect(() => () => {
    onHeaderStateChange?.(null);
  }, [onHeaderStateChange]);

  return (
    <SettingsInnerTemplate
      loadingMessage={loading ? t.loading : null}
      errorMessage={shownError ?? (sortedTraders.length === 0 && !loading ? t.noTraders : null)}
      emptyMessage={sortedCategories.length === 0 && !loading ? t.empty : null}
    >

      {sortedCategories.length > 0 ? (
        <ManagementCardsGrid>
          {sortedCategories.map((category) => {
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
                <button type="button" className="btn btn-secondary" onClick={addShareRow} disabled={!canAddShareRow}>
                  {t.addRow}
                </button>
                <strong className={isTotalExact ? '' : 'seasons-manager__error'}>
                  {t.totalPercentLabel}: {totalPercent.toFixed(2)}%
                </strong>
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

export default DefaultTraderCategoriesManagement;
