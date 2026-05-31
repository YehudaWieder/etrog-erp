import React from 'react';
import { FaXmark } from 'react-icons/fa6';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import ManagementCardsGrid from '../../components/ui/ManagementCardsGrid';
import ManagementSelectableCard from '../../components/ui/ManagementSelectableCard';
import SettingsInnerTemplate from '../../components/ui/SettingsInnerTemplate';
import { useTradersManagement } from './hooks/useTradersManagement';
import type { TradersHeaderState, TradersManagementProps } from './tradersManagement.types';
import { MAX_PAYMENT_PERCENT, MIN_PAYMENT_PERCENT } from './utils/traderPayments.util';

export type { TradersHeaderState };

const TradersManagement: React.FC<TradersManagementProps> = ({ onHeaderStateChange }) => {
  const {
    t,
    loading,
    newTraderName,
    setNewTraderName,
    newTraderPercent,
    setNewTraderPercent,
    selectedTraderId,
    setSelectedTraderId,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    isEditDialogOpen,
    setIsEditDialogOpen,
    sortedTraders,
    selectedTrader,
    editTraderName,
    setEditTraderName,
    editTraderPercent,
    setEditTraderPercent,
    editError,
    shownError,
    handleAdd,
    handleDeleteTrader,
    handleEditTrader,
    isValidPaymentPercent,
  } = useTradersManagement({ onHeaderStateChange });

  return (
    <SettingsInnerTemplate
      toolbar={(
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
      )}
      loadingMessage={loading ? t.loading : null}
      errorMessage={shownError}
      emptyMessage={sortedTraders.length === 0 && !loading ? t.empty : null}
    >
      {newTraderName.trim() === '' && newTraderName !== '' ? (
        <p className="seasons-manager__error">{t.emptyName}</p>
      ) : null}
      {newTraderPercent.trim() === '' && newTraderName.trim() !== '' ? (
        <p className="seasons-manager__error">{t.paymentRequired}</p>
      ) : null}
      {newTraderPercent.trim() !== '' && !isValidPaymentPercent(newTraderPercent) ? (
        <p className="seasons-manager__error">{t.invalidPercent}</p>
      ) : null}

      {sortedTraders.length > 0 ? (
        <ManagementCardsGrid>
          {sortedTraders.map((trader) => {
            const isSelected = selectedTraderId === trader.id;
            const traderBadgeLabel = trader.name.trim().slice(0, 2).toUpperCase() || '#';

            return (
              <li key={trader.id}>
                <ManagementSelectableCard
                  isSelected={isSelected}
                  badgeLabel={traderBadgeLabel}
                  onToggle={() => {
                    setSelectedTraderId((previousSelectedId) =>
                      previousSelectedId === trader.id ? null : trader.id,
                    );
                  }}
                  topContent={
                    <>
                      <span className="seasons-manager__year">{trader.name}</span>
                      <span className="seasons-manager__meta">{t.traderId}: {trader.id}</span>
                    </>
                  }
                  bottomContent={
                    typeof trader.paymentPercent === 'number' ? (
                      <span className="seasons-manager__meta">{t.paymentPercentLabel}: {trader.paymentPercent}%</span>
                    ) : null
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
          <div className="modal-dialog modal-dialog--form">
            <button className="modal-close" type="button" aria-label={t.cancel} onClick={() => setIsEditDialogOpen(false)}>
              <FaXmark />
            </button>
            <h3 className="modal-title">{t.editTitle}</h3>
            <div className="modal-message">
              {selectedTrader ? t.editMessage(selectedTrader.name) : t.editFallback}
            </div>

            <div className="management-form-grid">
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
            </div>

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
    </SettingsInnerTemplate>
  );
};

export default TradersManagement;