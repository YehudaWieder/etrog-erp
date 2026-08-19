import React from 'react';
import { FaTriangleExclamation, FaXmark } from 'react-icons/fa6';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { SubmitButton } from '../../components/ui/SubmitButton';
import { CustomSelect } from '../../components/ui/CustomSelect';
import { GlobalScopedFilters } from '../../components/ui/GlobalScopedFilters';
import ManagementCardsGrid from '../../components/ui/ManagementCardsGrid';
import ManagementSelectableCard from '../../components/ui/ManagementSelectableCard';
import SettingsInnerTemplate from '../../components/ui/SettingsInnerTemplate';
import { useTraderSeasonSettingsManagement } from './hooks/useTraderSeasonSettingsManagement';
import type { TraderSeasonSettingsHeaderState, TraderSeasonSettingsManagementProps } from './tradersManagement.types';
import type { Currency } from '../../services/traderSeasonSettingsApi';
import { MIN_PAYMENT_PERCENT, MAX_PAYMENT_PERCENT } from './utils/traderPayments.util';
import styles from './components/styles/TraderCategoriesShared.module.css';

export type { TraderSeasonSettingsHeaderState };

const CURRENCIES: Currency[] = ['ILS', 'USD', 'EUR'];

const TraderSeasonSettingsManagement: React.FC<TraderSeasonSettingsManagementProps> = ({ onHeaderStateChange }) => {
  const {
    t,
    FILTER_SCOPE,
    filters,
    loading,
    shownError,
    seasonFilterId,
    isViewingNonActiveSeason,
    sortedEntries,
    traderById,
    availableTradersForAdd,
    selectedEntry,
    selectedEntryId,
    setSelectedEntryId,
    selectedEntryTraderName,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    isAddDialogOpen,
    setIsAddDialogOpen,
    isEditDialogOpen,
    setIsEditDialogOpen,
    formState,
    setFormState,
    addError,
    editError,
    isSubmitting,
    handleDeleteEntry,
    handleAddEntry,
    handleEditEntry,
  } = useTraderSeasonSettingsManagement({ onHeaderStateChange });

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
      errorMessage={shownError}
      emptyMessage={!seasonFilterId ? t.empty : seasonFilterId && sortedEntries.length === 0 && !loading ? t.seasonEmpty : null}
    >
      <p className={styles.warningNotice}>
        <FaTriangleExclamation aria-hidden="true" />
        <span>{t.warningNotice}</span>
        <FaTriangleExclamation aria-hidden="true" />
      </p>

      {sortedEntries.length > 0 ? (
        <ManagementCardsGrid>
          {sortedEntries.map((entry) => {
            const isSelected = selectedEntryId === entry.id;
            const traderName = entry.trader?.name ?? traderById.get(entry.traderId) ?? `#${entry.traderId}`;
            const badgeLabel = traderName.trim().slice(0, 2).toUpperCase() || '#';

            return (
              <li key={entry.id}>
                <ManagementSelectableCard
                  isSelected={isSelected}
                  badgeLabel={badgeLabel}
                  onToggle={() => {
                    if (isViewingNonActiveSeason) {
                      return;
                    }
                    setSelectedEntryId((previousId) => (previousId === entry.id ? null : entry.id));
                  }}
                  disabled={isViewingNonActiveSeason}
                  className={styles.centeredCard}
                  topContent={
                    <span className="seasons-manager__year">{traderName}</span>
                  }
                  bottomContent={
                    <span className={`seasons-manager__meta ${styles.meta}`}>
                      <span className={styles.metaLine}>{t.paymentPercentLabel}: {entry.paymentPercent}%</span>
                      <span className={styles.metaLine}>{t.pricePerEtrogLabel}: {entry.pricePerEtrog} {entry.currency}</span>
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
        message={selectedEntry ? t.deleteMessage(selectedEntryTraderName) : t.deleteFallback}
        confirmLabel={t.deleteConfirm}
        cancelLabel={t.cancel}
        onConfirm={() => {
          void handleDeleteEntry();
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
              {isAddDialogOpen ? t.addMessage : t.editMessage(selectedEntryTraderName)}
            </div>

            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label className={styles.label}>{t.traderLabel}</label>
                <CustomSelect
                  className="seasons-manager__year-input"
                  value={String(formState.traderId)}
                  disabled={isEditDialogOpen}
                  onChange={(value) => {
                    setFormState((previous) => ({
                      ...previous,
                      traderId: value ? Number(value) : '',
                    }));
                  }}
                  placeholder={t.selectTrader}
                  options={
                    isEditDialogOpen && selectedEntry
                      ? [{ value: String(selectedEntry.traderId), label: selectedEntryTraderName }]
                      : availableTradersForAdd.map((trader) => ({ value: String(trader.id), label: trader.name }))
                  }
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>{t.paymentPercentLabel}</label>
                <input
                  className="seasons-manager__year-input"
                  type="number"
                  min={MIN_PAYMENT_PERCENT}
                  max={MAX_PAYMENT_PERCENT}
                  step="0.01"
                  value={formState.paymentPercent}
                  onChange={(event) => {
                    setFormState((previous) => ({ ...previous, paymentPercent: event.target.value }));
                  }}
                  placeholder={t.paymentPercentPlaceholder}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>{t.pricePerEtrogLabel}</label>
                <input
                  className="seasons-manager__year-input"
                  type="number"
                  min={0}
                  step="0.01"
                  value={formState.pricePerEtrog}
                  onChange={(event) => {
                    setFormState((previous) => ({ ...previous, pricePerEtrog: event.target.value }));
                  }}
                  placeholder={t.pricePerEtrogPlaceholder}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>{t.currencyLabel}</label>
                <CustomSelect
                  className="seasons-manager__year-input"
                  value={formState.currency}
                  onChange={(value) => {
                    setFormState((previous) => ({ ...previous, currency: value as Currency | '' }));
                  }}
                  placeholder={t.selectCurrency}
                  options={CURRENCIES.map((currency) => ({ value: currency, label: currency }))}
                />
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
              <SubmitButton
                className="btn btn-success"
                onClick={() => {
                  if (isAddDialogOpen) {
                    void handleAddEntry();
                    return;
                  }

                  void handleEditEntry();
                }}
                type="button"
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

export default TraderSeasonSettingsManagement;
