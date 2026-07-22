import React from 'react';
import { FaXmark } from 'react-icons/fa6';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import ManagementCardsGrid from '../../components/ui/ManagementCardsGrid';
import ManagementSelectableCard from '../../components/ui/ManagementSelectableCard';
import SettingsInnerTemplate from '../../components/ui/SettingsInnerTemplate';
import { SubmitButton } from '../../components/ui/SubmitButton';
import { useTradersManagement } from './hooks/useTradersManagement';
import type { TradersHeaderState, TradersManagementProps } from './tradersManagement.types';

export type { TradersHeaderState };

const TradersManagement: React.FC<TradersManagementProps> = ({ onHeaderStateChange }) => {
  const {
    t,
    loading,
    newTraderName,
    setNewTraderName,
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
    editError,
    shownError,
    handleAdd,
    handleDeleteTrader,
    handleEditTrader,
    isSubmitting,
    isAdding,
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
          <SubmitButton
            className="btn btn-primary"
            onClick={() => {
              void handleAdd();
            }}
            disabled={loading}
            isLoading={isAdding}
            loadingText={t.adding}
          >
            {t.addTrader}
          </SubmitButton>
        </div>
      )}
      loadingMessage={loading ? t.loading : null}
      errorMessage={shownError}
      emptyMessage={sortedTraders.length === 0 && !loading ? t.empty : null}
    >
      {newTraderName.trim() === '' && newTraderName !== '' ? (
        <p className="seasons-manager__error">{t.emptyName}</p>
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
            </div>

            {editError ? <p className="seasons-manager__error">{editError}</p> : null}

            <div className="modal-actions">
              <button className="btn btn-danger" onClick={() => setIsEditDialogOpen(false)} type="button">
                {t.cancel}
              </button>
              <SubmitButton
                className="btn btn-success"
                onClick={() => {
                  void handleEditTrader();
                }}
                isLoading={isSubmitting}
                loadingText={t.saving}
              >
                {t.save}
              </SubmitButton>
            </div>
          </div>
        </div>
      ) : null}
    </SettingsInnerTemplate>
  );
};

export default TradersManagement;
