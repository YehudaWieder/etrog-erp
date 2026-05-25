import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { addTrader, editTrader, fetchTraders, removeTrader } from '../../store/tradersSlice';
import type { AppDispatch, RootState } from '../../store';
import { getManagementI18n, resolveAppLang } from '../settings/managementI18n';

const MIN_PAYMENT_PERCENT = 0;
const MAX_PAYMENT_PERCENT = 100;

const isValidPaymentPercent = (value: string): boolean => {
  if (value.trim() === '') {
    return false;
  }

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) && parsedValue >= MIN_PAYMENT_PERCENT && parsedValue <= MAX_PAYMENT_PERCENT;
};

export type TradersHeaderState = {
  count: number;
  isEditDisabled: boolean;
  isDeleteDisabled: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

type TradersManagementProps = {
  onHeaderStateChange?: (state: TradersHeaderState | null) => void;
};

const TradersManagement: React.FC<TradersManagementProps> = ({ onHeaderStateChange }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { items: traders, loading, error } = useSelector((state: RootState) => state.traders);
  const [newTraderName, setNewTraderName] = useState('');
  const [newTraderPercent, setNewTraderPercent] = useState('');
  const [selectedTraderId, setSelectedTraderId] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editTraderName, setEditTraderName] = useState('');
  const [editTraderPercent, setEditTraderPercent] = useState('');
  const t = getManagementI18n(resolveAppLang()).traders;

  useEffect(() => {
    dispatch(fetchTraders());
  }, [dispatch]);

  const sortedTraders = useMemo(
    () => [...traders].sort((a, b) => a.name.localeCompare(b.name, 'he')),
    [traders],
  );

  useEffect(() => {
    if (selectedTraderId && !sortedTraders.some((trader) => trader.id === selectedTraderId)) {
      setSelectedTraderId(null);
    }
  }, [sortedTraders, selectedTraderId]);

  const selectedTrader = useMemo(
    () => sortedTraders.find((trader) => trader.id === selectedTraderId) ?? null,
    [sortedTraders, selectedTraderId],
  );

  const handleAdd = async () => {
    const trimmedName = newTraderName.trim();
    const trimmedPercent = newTraderPercent.trim();

    if (!trimmedName) {
      return;
    }

    if (trimmedPercent === '') {
      setAddError(t.paymentRequired);
      return;
    }

    const parsedPercent = Number(trimmedPercent);

    if (!isValidPaymentPercent(trimmedPercent)) {
      return;
    }

    setAddError(null);
    const actionResult = await dispatch(
      addTrader({
        name: trimmedName,
        paymentPercent: parsedPercent,
      }),
    );

    if (addTrader.fulfilled.match(actionResult)) {
      setNewTraderName('');
      setNewTraderPercent('');
      return;
    }

    const failureMessage =
      (typeof actionResult.payload === 'string' && actionResult.payload) ||
      actionResult.error.message ||
      t.addFailed;

    setAddError(failureMessage);
  };

  const handleOpenDeleteDialog = () => {
    if (!selectedTrader) {
      return;
    }

    setDeleteError(null);
    setIsDeleteDialogOpen(true);
  };

  const handleOpenEditDialog = () => {
    if (!selectedTrader) {
      return;
    }

    setEditError(null);
    setEditTraderName(selectedTrader.name);
    setEditTraderPercent(
      typeof selectedTrader.paymentPercent === 'number'
        ? String(selectedTrader.paymentPercent)
        : '',
    );
    setIsEditDialogOpen(true);
  };

  const handleEditTrader = async () => {
    if (!selectedTrader) {
      return;
    }

    const trimmedName = editTraderName.trim();
    const trimmedPercent = editTraderPercent.trim();

    if (!trimmedName) {
      setEditError(t.emptyName);
      return;
    }

    if (trimmedPercent === '') {
      setEditError(t.paymentRequired);
      return;
    }

    if (!isValidPaymentPercent(trimmedPercent)) {
      setEditError(t.invalidPercent);
      return;
    }

    const parsedPercent = Number(trimmedPercent);

    const actionResult = await dispatch(
      editTrader({
        id: selectedTrader.id,
        name: trimmedName,
        paymentPercent: parsedPercent,
      }),
    );

    if (editTrader.fulfilled.match(actionResult)) {
      setEditError(null);
      setIsEditDialogOpen(false);
      return;
    }

    const failureMessage =
      (typeof actionResult.payload === 'string' && actionResult.payload) ||
      actionResult.error.message ||
      t.editFailed;

    setEditError(failureMessage);
  };

  const handleDeleteTrader = async () => {
    if (!selectedTrader) {
      return;
    }

    const actionResult = await dispatch(removeTrader(selectedTrader.id));

    if (removeTrader.fulfilled.match(actionResult)) {
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

  const isEditDisabled = !selectedTrader || loading;
  const isDeleteDisabled = !selectedTrader || loading;
  const shownError = addError ?? editError ?? deleteError ?? error;

  useEffect(() => {
    if (!onHeaderStateChange) {
      return;
    }

    onHeaderStateChange({
      count: sortedTraders.length,
      isEditDisabled,
      isDeleteDisabled,
      onEdit: handleOpenEditDialog,
      onDelete: handleOpenDeleteDialog,
    });
  }, [onHeaderStateChange, sortedTraders.length, isEditDisabled, isDeleteDisabled, selectedTrader, loading]);

  useEffect(() => () => {
    onHeaderStateChange?.(null);
  }, [onHeaderStateChange]);

  return (
    <div className="seasons-manager">
      <div className="seasons-manager__create-row">
        <input
          className="seasons-manager__year-input"
          type="text"
          value={newTraderName}
          onChange={(e) => setNewTraderName(e.target.value)}
          placeholder={t.newTraderPlaceholder}
        />
        <input
          className="seasons-manager__year-input"
          type="number"
          min={MIN_PAYMENT_PERCENT}
          max={MAX_PAYMENT_PERCENT}
          step="0.01"
          value={newTraderPercent}
          onChange={(e) => setNewTraderPercent(e.target.value)}
          placeholder={t.paymentPlaceholder}
        />
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            void handleAdd();
          }}
          disabled={loading}
        >
          {t.addTrader}
        </button>
      </div>

      {loading ? <p className="seasons-manager__state">{t.loading}</p> : null}
      {shownError ? <p className="seasons-manager__error">{shownError}</p> : null}
      {newTraderName.trim() === '' && newTraderName !== '' ? (
        <p className="seasons-manager__error">{t.emptyName}</p>
      ) : null}
      {newTraderPercent.trim() === '' && newTraderName.trim() !== '' ? (
        <p className="seasons-manager__error">{t.paymentRequired}</p>
      ) : null}
      {newTraderPercent.trim() !== '' && !isValidPaymentPercent(newTraderPercent) ? (
        <p className="seasons-manager__error">{t.invalidPercent}</p>
      ) : null}

      {sortedTraders.length === 0 && !loading ? (
        <div className="seasons-manager__empty">{t.empty}</div>
      ) : null}

      {sortedTraders.length > 0 ? (
        <ul className="seasons-manager__cards">
          {sortedTraders.map((trader) => {
            const isSelected = selectedTraderId === trader.id;
            const traderBadgeLabel = trader.name.trim().slice(0, 2).toUpperCase() || '#';

            return (
              <li key={trader.id}>
                <button
                  type="button"
                  className={`seasons-manager__card${isSelected ? ' is-selected' : ''}`}
                  onClick={() => {
                    setSelectedTraderId((previousSelectedId) =>
                      previousSelectedId === trader.id ? null : trader.id,
                    );
                  }}
                >
                  <span className={`seasons-manager__selector${isSelected ? ' is-selected' : ''}`}>
                    {isSelected ? '✓' : traderBadgeLabel}
                  </span>

                  <span className="seasons-manager__card-main">
                    <span className="seasons-manager__year">{trader.name}</span>
                    <span className="seasons-manager__meta">
                      {t.traderId}: {trader.id}
                      {typeof trader.paymentPercent === 'number' ? ` | ${t.paymentPercentLabel}: ${trader.paymentPercent}%` : ''}
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
        title={t.deleteTitle}
        message={
          selectedTrader
            ? t.deleteMessage(selectedTrader.name)
            : t.deleteFallback
        }
        confirmLabel={t.deleteConfirm}
        cancelLabel={t.cancel}
        onConfirm={() => {
          void handleDeleteTrader();
        }}
        onCancel={() => setIsDeleteDialogOpen(false)}
      />

      {isEditDialogOpen ? (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <h3 className="modal-title">{t.editTitle}</h3>
            <div className="modal-message">
              {selectedTrader ? t.editMessage(selectedTrader.name) : t.editFallback}
            </div>

            <input
              className="seasons-manager__year-input"
              type="text"
              value={editTraderName}
              onChange={(event) => setEditTraderName(event.target.value)}
              placeholder={t.traderPlaceholder}
              autoFocus
            />

            <input
              className="seasons-manager__year-input"
              type="number"
              min={MIN_PAYMENT_PERCENT}
              max={MAX_PAYMENT_PERCENT}
              step="0.01"
              value={editTraderPercent}
              onChange={(event) => setEditTraderPercent(event.target.value)}
              placeholder={t.paymentPlaceholder}
            />

            {editError ? <p className="seasons-manager__error">{editError}</p> : null}

            <div className="modal-actions">
              <button className="btn btn-danger" onClick={() => setIsEditDialogOpen(false)} type="button">
                {t.cancel}
              </button>
              <button
                className="btn btn-success"
                onClick={() => {
                  void handleEditTrader();
                }}
                type="button"
              >
                {t.save}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default TradersManagement;