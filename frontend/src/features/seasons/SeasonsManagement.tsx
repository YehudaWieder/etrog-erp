import React from 'react';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import SettingsInnerTemplate from '../../components/ui/SettingsInnerTemplate';
import { SeasonsCardsSection } from './components/SeasonsCardsSection';
import { useSeasonsManagement } from './hooks/useSeasonsManagement';
import type { SeasonsHeaderState, SeasonsManagementProps } from './seasonsManagement.types';
import { MAX_SEASON_YEAR, MIN_SEASON_YEAR } from './utils/seasonsManagement.utils';
import styles from './components/styles/SeasonsCardsSection.module.css';

export type { SeasonsHeaderState };

const SeasonsManagement: React.FC<SeasonsManagementProps> = ({ onHeaderStateChange }) => {
  const {
    t,
    loading,
    newSeasonYear,
    setNewSeasonYear,
    selectedSeasonId,
    setSelectedSeasonId,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    selectedSeason,
    sortedSeasons,
    activeSeasons,
    nonActiveSeasons,
    secondaryCardWidth,
    isNewYearValid,
    shownError,
    handleAdd,
    handleDeleteSeason,
  } = useSeasonsManagement({ onHeaderStateChange });

  return (
    <SettingsInnerTemplate
      toolbar={
        <div className="seasons-manager__create-row">
          <input
            className="seasons-manager__year-input"
            type="number"
            min={MIN_SEASON_YEAR}
            max={MAX_SEASON_YEAR}
            step={1}
            value={newSeasonYear}
            onChange={(event) => setNewSeasonYear(event.target.value)}
            placeholder={t.newSeasonPlaceholder(MIN_SEASON_YEAR, MAX_SEASON_YEAR)}
          />
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              void handleAdd();
            }}
            disabled={loading}
          >
            {t.addSeason}
          </button>
        </div>
      }
      loadingMessage={loading ? t.loading : null}
      errorMessage={shownError}
      emptyMessage={sortedSeasons.length === 0 && !loading ? t.empty : null}
    >
      {!isNewYearValid && newSeasonYear.trim() !== '' ? (
        <p className="seasons-manager__error">{t.yearRangeError(MIN_SEASON_YEAR, MAX_SEASON_YEAR)}</p>
      ) : null}

      <SeasonsCardsSection
        title={t.activeSeasonSectionTitle}
        seasons={activeSeasons}
        selectedSeasonId={selectedSeasonId}
        onToggleSeason={(seasonId) => {
          setSelectedSeasonId((previousSelectedId) => (previousSelectedId === seasonId ? null : seasonId));
        }}
        t={t}
        gridClassName={`${styles.activeRow} seasons-manager__cards--active-row`}
        style={
          secondaryCardWidth
            ? ({ ['--active-season-card-width' as string]: `${secondaryCardWidth}px` } as React.CSSProperties)
            : undefined
        }
        statusLabel={t.active}
        activeStatus
      />

      <SeasonsCardsSection
        title={t.inactiveSeasonsSectionTitle}
        seasons={nonActiveSeasons}
        selectedSeasonId={selectedSeasonId}
        onToggleSeason={(seasonId) => {
          setSelectedSeasonId((previousSelectedId) => (previousSelectedId === seasonId ? null : seasonId));
        }}
        t={t}
        gridClassName={`${styles.secondaryGrid} seasons-manager__cards--secondary-grid`}
        statusLabel={t.inactive}
      />

      <ConfirmDialog
        open={isDeleteDialogOpen}
        title={t.deleteTitle}
        message={selectedSeason ? t.deleteMessage(selectedSeason.yearName) : t.deleteFallback}
        confirmLabel={t.deleteConfirm}
        cancelLabel={t.cancel}
        onConfirm={() => {
          void handleDeleteSeason();
        }}
        onCancel={() => setIsDeleteDialogOpen(false)}
      />
    </SettingsInnerTemplate>
  );
};

export default SeasonsManagement;
