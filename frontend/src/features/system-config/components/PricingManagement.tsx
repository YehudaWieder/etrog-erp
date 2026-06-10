import React from 'react';
import { FaXmark } from 'react-icons/fa6';
import ManagementCardsGrid from '../../../components/ui/ManagementCardsGrid';
import ManagementSelectableCard from '../../../components/ui/ManagementSelectableCard';
import SettingsInnerTemplate from '../../../components/ui/SettingsInnerTemplate';
import seasonCardStyles from '../../seasons/components/styles/SeasonsCardsSection.module.css';
import type { Lang } from '../../settings/settingsPage.types';
import feedbackStyles from '../../settings/styles/SettingsWorkspaceFeedback.module.css';
import { CURRENCIES } from '../../../services/systemConfigApi';
import { type PricingHeaderState, usePricingManagement } from '../hooks/usePricingManagement';

export type { PricingHeaderState };

type Props = {
  lang: Lang;
  onHeaderStateChange?: (state: PricingHeaderState | null) => void;
};

const PricingManagement: React.FC<Props> = ({ lang, onHeaderStateChange }) => {
  const {
    t,
    loading,
    saving,
    error,
    saveError,
    successMessage,
    validationError,
    seasonPricings,
    selectedSeasonId,
    secondaryCardWidth,
    currency, setCurrency,
    unitPrice, setUnitPrice,
    isEditModalOpen,
    setIsEditModalOpen,
    handleSelectSeason,
    handleSave,
  } = usePricingManagement({ lang, onHeaderStateChange });

  const hasSeasons = seasonPricings.length > 0;
  const activeConfigs = seasonPricings.filter((sp) => sp.season.isActive);
  const inactiveConfigs = seasonPricings.filter((sp) => !sp.season.isActive);

  const selectedConfig = seasonPricings.find((sp) => sp.season.id === selectedSeasonId) ?? null;

  const renderCard = ({ season, config }: (typeof seasonPricings)[number]) => {
    const isSelected = selectedSeasonId === season.id;
    const priceDisplay = config.unitPrice && config.currency
      ? `${config.unitPrice} ${config.currency}`
      : t.notSet;

    return (
      <li key={season.id}>
        <ManagementSelectableCard
          isSelected={isSelected}
          badgeLabel={String(season.yearName).slice(-2)}
          onToggle={() => handleSelectSeason(season.id)}
          topContent={
            <span className="seasons-manager__year">{season.yearName}</span>
          }
          topAside={
            <span className={`${seasonCardStyles.cardStatus}${season.isActive ? ` ${seasonCardStyles.cardStatusActive}` : ''}`}>
              {season.isActive ? t.activeBadge : t.inactiveBadge}
            </span>
          }
          bottomContent={
            <>
              <span className="seasons-manager__meta">
                {t.unitPriceLabel}:{' '}
                {config.unitPrice && config.currency
                  ? <span style={{ direction: 'ltr', unicodeBidi: 'bidi-override' }}>{priceDisplay}</span>
                  : priceDisplay}
              </span>
            </>
          }
        />
      </li>
    );
  };

  return (
    <SettingsInnerTemplate
      loadingMessage={loading ? t.loading : null}
      errorMessage={error}
      emptyMessage={!loading && !hasSeasons ? t.noSeasons : null}
    >
      {successMessage ? (
        <p className={feedbackStyles.saved}>{successMessage}</p>
      ) : null}

      {activeConfigs.length > 0 ? (
        <>
          <h4 className="seasons-manager__section-title">{t.activeSeasonSectionTitle}</h4>
          <ManagementCardsGrid
            className={`${seasonCardStyles.activeRow} seasons-manager__cards--active-row`}
            style={
              secondaryCardWidth
                ? ({ ['--active-season-card-width' as string]: `${secondaryCardWidth}px` } as React.CSSProperties)
                : undefined
            }
          >
            {activeConfigs.map(renderCard)}
          </ManagementCardsGrid>
        </>
      ) : null}

      {inactiveConfigs.length > 0 ? (
        <>
          <h4 className="seasons-manager__section-title">{t.inactiveSeasonsSectionTitle}</h4>
          <ManagementCardsGrid className={`${seasonCardStyles.secondaryGrid} seasons-manager__cards--secondary-grid`}>
            {inactiveConfigs.map(renderCard)}
          </ManagementCardsGrid>
        </>
      ) : null}

      {isEditModalOpen && selectedConfig ? (
        <div className="modal-overlay">
          <div className="modal-dialog modal-dialog--form">
            <button
              className="modal-close"
              type="button"
              aria-label={t.cancel}
              onClick={() => setIsEditModalOpen(false)}
            >
              <FaXmark />
            </button>
            <h3 className="modal-title">{selectedConfig.season.yearName}</h3>

            <div className="management-form-grid">
              <div>
                <label htmlFor="edit-currency">{t.currencyLabel}</label>
                <select
                  id="edit-currency"
                  className="seasons-manager__year-input"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as typeof currency)}
                >
                  <option value="">—</option>
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>{t.currencyOptions[c]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="edit-unit-price">{t.unitPriceLabel}</label>
                <input
                  id="edit-unit-price"
                  className="seasons-manager__year-input"
                  type="number"
                  min={0}
                  step="0.01"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  placeholder={t.unitPricePlaceholder}
                />
              </div>
            </div>

            {validationError ? (
              <p className="seasons-manager__error">{validationError}</p>
            ) : null}
            {saveError ? (
              <p className="seasons-manager__error">{saveError}</p>
            ) : null}

            <div className="modal-actions">
              <button className="btn btn-danger" type="button" onClick={() => setIsEditModalOpen(false)}>
                {t.cancel}
              </button>
              <button
                className="btn btn-success"
                type="button"
                onClick={() => { void handleSave(); }}
                disabled={saving || !!validationError}
              >
                {saving ? t.saving : t.save}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </SettingsInnerTemplate>
  );
};

export default PricingManagement;
