import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { addTrader, editTrader, fetchTraders, removeTrader } from '../../store/tradersSlice';
import type { AppDispatch, RootState } from '../../store';

const MIN_PAYMENT_PERCENT = 0;
const MAX_PAYMENT_PERCENT = 100;

const isValidPaymentPercent = (value: string): boolean => {
  if (value.trim() === '') {
    return true;
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
    const parsedPercent = newTraderPercent.trim() === '' ? undefined : Number(newTraderPercent);

    if (!trimmedName || !isValidPaymentPercent(newTraderPercent)) {
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
      'הוספת הסוחר נכשלה.';

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
    const parsedPercent = editTraderPercent.trim() === '' ? undefined : Number(editTraderPercent);

    if (!trimmedName) {
      setEditError('שם הסוחר לא יכול להיות ריק.');
      return;
    }

    if (!isValidPaymentPercent(editTraderPercent)) {
      setEditError('אחוז התשלום חייב להיות בין 0 ל-100.');
      return;
    }

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
      'עדכון הסוחר נכשל.';

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
      'לא ניתן למחוק את הסוחר שנבחר.';

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
          placeholder="שם סוחר חדש"
        />
        <input
          className="seasons-manager__year-input"
          type="number"
          min={MIN_PAYMENT_PERCENT}
          max={MAX_PAYMENT_PERCENT}
          step="0.01"
          value={newTraderPercent}
          onChange={(e) => setNewTraderPercent(e.target.value)}
          placeholder="אחוז תשלום (אופציונלי)"
        />
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            void handleAdd();
          }}
          disabled={loading}
        >
          הוסף סוחר
        </button>
      </div>

      {loading ? <p className="seasons-manager__state">טוען סוחרים...</p> : null}
      {shownError ? <p className="seasons-manager__error">{shownError}</p> : null}
      {newTraderName.trim() === '' && newTraderName !== '' ? (
        <p className="seasons-manager__error">שם הסוחר לא יכול להיות ריק.</p>
      ) : null}
      {!isValidPaymentPercent(newTraderPercent) ? (
        <p className="seasons-manager__error">אחוז התשלום חייב להיות בין 0 ל-100.</p>
      ) : null}

      {sortedTraders.length === 0 && !loading ? (
        <div className="seasons-manager__empty">אין סוחרים להצגה כרגע.</div>
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
                      מזהה סוחר: {trader.id}
                      {typeof trader.paymentPercent === 'number' ? ` | אחוז תשלום: ${trader.paymentPercent}%` : ''}
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
        title="מחיקת סוחר"
        message={
          selectedTrader
            ? `האם למחוק את הסוחר ${selectedTrader.name}? פעולה זו לא ניתנת לשחזור.`
            : 'האם למחוק את הסוחר שנבחר?'
        }
        confirmLabel="מחק"
        cancelLabel="ביטול"
        onConfirm={() => {
          void handleDeleteTrader();
        }}
        onCancel={() => setIsDeleteDialogOpen(false)}
      />

      {isEditDialogOpen ? (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <h3 className="modal-title">עריכת סוחר</h3>
            <div className="modal-message">
              {selectedTrader ? `עדכון פרטי הסוחר ${selectedTrader.name}` : 'עדכון פרטי סוחר נבחר'}
            </div>

            <input
              className="seasons-manager__year-input"
              type="text"
              value={editTraderName}
              onChange={(event) => setEditTraderName(event.target.value)}
              placeholder="שם סוחר"
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
              placeholder="אחוז תשלום (אופציונלי)"
            />

            {editError ? <p className="seasons-manager__error">{editError}</p> : null}

            <div className="modal-actions">
              <button className="btn btn-danger" onClick={() => setIsEditDialogOpen(false)} type="button">
                ביטול
              </button>
              <button
                className="btn btn-success"
                onClick={() => {
                  void handleEditTrader();
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

export default TradersManagement;