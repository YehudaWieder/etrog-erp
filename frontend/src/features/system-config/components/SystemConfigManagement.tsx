import React from 'react';
import { FaXmark } from 'react-icons/fa6';
import ManagementCardsGrid from '../../../components/ui/ManagementCardsGrid';
import ManagementSelectableCard from '../../../components/ui/ManagementSelectableCard';
import SettingsInnerTemplate from '../../../components/ui/SettingsInnerTemplate';
import { SubmitButton } from '../../../components/ui/SubmitButton';
import seasonCardStyles from '../../seasons/components/styles/SeasonsCardsSection.module.css';
import type { Lang } from '../../settings/settingsPage.types';
import feedbackStyles from '../../settings/styles/SettingsWorkspaceFeedback.module.css';
import { type CartonsHeaderState, useSystemConfigManagement } from '../hooks/useSystemConfigManagement';

export type { CartonsHeaderState };

type Props = {
  lang: Lang;
  onHeaderStateChange?: (state: CartonsHeaderState | null) => void;
};

const SystemConfigManagement: React.FC<Props> = ({ lang, onHeaderStateChange }) => {
  const {
    t,
    loading,
    saving,
    error,
    saveError,
    successMessage,
    validationError,
    seasonConfigs,
    selectedSeasonId,
    selectedConfig,
    secondaryCardWidth,
    small, setSmall,
    medium, setMedium,
    large, setLarge,
    isEditModalOpen,
    setIsEditModalOpen,
    handleSelectSeason,
    handleSave,
  } = useSystemConfigManagement({ lang, onHeaderStateChange });

  const hasSeasons = seasonConfigs.length > 0;
  const activeConfigs = seasonConfigs.filter((sc) => sc.season.isActive);
  const inactiveConfigs = seasonConfigs.filter((sc) => !sc.season.isActive);

  const renderCard = ({ season, config }: (typeof seasonConfigs)[number]) => {
    const isSelected = selectedSeasonId === season.id;
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
              {([
                [t.cardSmall, config.smallBoxCapacity],
                [t.cardMedium, config.mediumBoxCapacity],
                [t.cardLarge, config.largeBoxCapacity],
              ] as [string, number][]).map(([code, value]) => (
                <span key={code} className="seasons-manager__meta">
                  {t.cartonPrefix}{' '}
                  <span style={{ direction: 'ltr', unicodeBidi: 'bidi-override' }}>{code}: {value}</span>
                  {' '}{t.unitsLabel}
                </span>
              ))}
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
                <label htmlFor="edit-small">{t.smallBoxLabel}</label>
                <input
                  id="edit-small"
                  className="seasons-manager__year-input"
                  type="number"
                  min={1}
                  value={small}
                  onChange={(e) => setSmall(e.target.value)}
                  placeholder={t.smallBoxPlaceholder}
                />
              </div>
              <div>
                <label htmlFor="edit-medium">{t.mediumBoxLabel}</label>
                <input
                  id="edit-medium"
                  className="seasons-manager__year-input"
                  type="number"
                  min={1}
                  value={medium}
                  onChange={(e) => setMedium(e.target.value)}
                  placeholder={t.mediumBoxPlaceholder}
                />
              </div>
              <div>
                <label htmlFor="edit-large">{t.largeBoxLabel}</label>
                <input
                  id="edit-large"
                  className="seasons-manager__year-input"
                  type="number"
                  min={1}
                  value={large}
                  onChange={(e) => setLarge(e.target.value)}
                  placeholder={t.largeBoxPlaceholder}
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
              <button
                className="btn btn-danger"
                type="button"
                onClick={() => setIsEditModalOpen(false)}
              >
                {t.cancel}
              </button>
              <SubmitButton
                className="btn btn-success"
                type="button"
                onClick={() => { void handleSave(); }}
                disabled={!!validationError}
                isLoading={saving}
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

export default SystemConfigManagement;
