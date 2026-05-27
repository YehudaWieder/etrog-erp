import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import ManagementCardsGrid from '../../components/ui/ManagementCardsGrid';
import ManagementSelectableCard from '../../components/ui/ManagementSelectableCard';
import SettingsInnerTemplate from '../../components/ui/SettingsInnerTemplate';
import { addSeason, activateSeason, fetchSeasons, removeSeason } from '../../store/seasonsSlice';
import type { AppDispatch, RootState } from '../../store';
import { getManagementI18n, resolveAppLang } from '../settings/managementI18n';

const MIN_SEASON_YEAR = 2020;
const MAX_SEASON_YEAR = 2100;

const isSeasonYearInAllowedRange = (value: string): boolean => {
  const parsedYear = Number(value);

  return (
    Number.isInteger(parsedYear) &&
    parsedYear >= MIN_SEASON_YEAR &&
    parsedYear <= MAX_SEASON_YEAR
  );
};

export type SeasonsHeaderState = {
  count: number;
  isActivateDisabled: boolean;
  isDeleteDisabled: boolean;
  onActivate: () => void;
  onDelete: () => void;
};

type SeasonsManagementProps = {
  onHeaderStateChange?: (state: SeasonsHeaderState | null) => void;
};

const SeasonsManagement: React.FC<SeasonsManagementProps> = ({ onHeaderStateChange }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { items: seasons, loading, error, activeSeasonId } = useSelector((state: RootState) => state.seasons);
  const [newSeasonYear, setNewSeasonYear] = useState('');
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [secondaryCardWidth, setSecondaryCardWidth] = useState<number | null>(null);
  const t = getManagementI18n(resolveAppLang()).seasons;

  useEffect(() => {
    dispatch(fetchSeasons());
  }, [dispatch]);

  const sortedSeasons = useMemo(() => {
    const seasonsWithResolvedActiveFlag = seasons.map((season) => ({
      ...season,
      isActive: season.id === activeSeasonId || season.isActive,
    }));

    return [...seasonsWithResolvedActiveFlag].sort((a, b) => {
      if (a.isActive !== b.isActive) {
        return a.isActive ? -1 : 1;
      }

      return b.yearName - a.yearName;
    });
  }, [seasons, activeSeasonId]);

  useEffect(() => {
    if (selectedSeasonId && !sortedSeasons.some((season) => season.id === selectedSeasonId)) {
      setSelectedSeasonId(null);
    }
  }, [sortedSeasons, selectedSeasonId]);

  const selectedSeason = useMemo(
    () => sortedSeasons.find((season) => season.id === selectedSeasonId) ?? null,
    [sortedSeasons, selectedSeasonId],
  );

  const activeSeasons = useMemo(
    () => sortedSeasons.filter((season) => season.isActive),
    [sortedSeasons],
  );

  const nonActiveSeasons = useMemo(
    () => sortedSeasons.filter((season) => !season.isActive),
    [sortedSeasons],
  );

  useEffect(() => {
    if (nonActiveSeasons.length === 0) {
      setSecondaryCardWidth(null);
      return;
    }

    const activeCardSelector = '.seasons-manager__cards--secondary-grid .seasons-manager__card';
    const secondaryCard = document.querySelector<HTMLElement>(activeCardSelector);

    if (!secondaryCard) {
      setSecondaryCardWidth(null);
      return;
    }

    const updateCardWidth = () => {
      const measuredWidth = Math.round(secondaryCard.getBoundingClientRect().width);
      setSecondaryCardWidth(measuredWidth > 0 ? measuredWidth : null);
    };

    updateCardWidth();

    const resizeObserver = new ResizeObserver(() => {
      updateCardWidth();
    });

    resizeObserver.observe(secondaryCard);
    window.addEventListener('resize', updateCardWidth);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateCardWidth);
    };
  }, [nonActiveSeasons.length, sortedSeasons.length]);

  const handleAdd = async () => {
    const parsedYear = Number(newSeasonYear);

    if (!isSeasonYearInAllowedRange(newSeasonYear)) {
      return;
    }

    setAddError(null);
    const actionResult = await dispatch(addSeason({ yearName: parsedYear }));

    if (addSeason.fulfilled.match(actionResult)) {
      setNewSeasonYear('');
      return;
    }

    const failureMessage =
      (typeof actionResult.payload === 'string' && actionResult.payload) ||
      actionResult.error.message ||
      t.addFailed;

    setAddError(failureMessage);
  };

  const handleActivate = async () => {
    if (!selectedSeason || selectedSeason.isActive) {
      return;
    }

    setDeleteError(null);
    await dispatch(activateSeason(selectedSeason.id));
  };

  const handleOpenDeleteDialog = () => {
    if (!selectedSeason) {
      return;
    }

    if (selectedSeason.isActive) {
      setDeleteError(t.activeSeasonDeleteBlocked);
      return;
    }

    setDeleteError(null);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteSeason = async () => {
    if (!selectedSeason) {
      return;
    }

    const actionResult = await dispatch(removeSeason(selectedSeason.id));

    if (removeSeason.fulfilled.match(actionResult)) {
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

  const isNewYearValid = isSeasonYearInAllowedRange(newSeasonYear);
  const isActivateDisabled = !selectedSeason || selectedSeason.isActive || loading;
  const isDeleteDisabled = !selectedSeason || selectedSeason.isActive || loading;
  const shownError = addError ?? deleteError ?? error;

  useEffect(() => {
    if (!onHeaderStateChange) {
      return;
    }

    onHeaderStateChange({
      count: sortedSeasons.length,
      isActivateDisabled,
      isDeleteDisabled,
      onActivate: () => {
        void handleActivate();
      },
      onDelete: handleOpenDeleteDialog,
    });
  }, [onHeaderStateChange, sortedSeasons.length, isActivateDisabled, isDeleteDisabled, selectedSeason, loading]);

  useEffect(() => () => {
    onHeaderStateChange?.(null);
  }, [onHeaderStateChange]);


  return (
    <SettingsInnerTemplate
      toolbar={(
        <div className="seasons-manager__create-row">
          <input
            className="seasons-manager__year-input"
            type="number"
            min={MIN_SEASON_YEAR}
            max={MAX_SEASON_YEAR}
            step={1}
            value={newSeasonYear}
            onChange={(e) => setNewSeasonYear(e.target.value)}
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
      )}
      loadingMessage={loading ? t.loading : null}
      errorMessage={shownError}
      emptyMessage={sortedSeasons.length === 0 && !loading ? t.empty : null}
    >
      {!isNewYearValid && newSeasonYear.trim() !== '' ? (
        <p className="seasons-manager__error">{t.yearRangeError(MIN_SEASON_YEAR, MAX_SEASON_YEAR)}</p>
      ) : null}

      {activeSeasons.length > 0 ? (
        <>
          <h4 className="seasons-manager__section-title">{t.activeSeasonSectionTitle}</h4>
          <ManagementCardsGrid
            className="seasons-manager__cards--active-row"
            style={
              secondaryCardWidth
                ? ({ ['--active-season-card-width' as string]: `${secondaryCardWidth}px` } as React.CSSProperties)
                : undefined
            }
          >
            {activeSeasons.map((season) => {
              const isSelected = selectedSeasonId === season.id;

              return (
                <li key={season.id}>
                  <ManagementSelectableCard
                    isSelected={isSelected}
                    badgeLabel={String(season.yearName).slice(-2)}
                    onToggle={() => {
                      setSelectedSeasonId((previousSelectedId) =>
                        previousSelectedId === season.id ? null : season.id,
                      );
                    }}
                    topContent={
                      <>
                        <span className="seasons-manager__year">{season.yearName}</span>
                        <span className="seasons-manager__meta">{t.seasonId}: {season.id}</span>
                      </>
                    }
                    topAside={
                      <span className="seasons-manager__card-status is-active">
                        {t.active}
                      </span>
                    }
                  />
                </li>
              );
            })}
          </ManagementCardsGrid>
        </>
      ) : null}

      {nonActiveSeasons.length > 0 ? (
        <>
          <h4 className="seasons-manager__section-title">{t.inactiveSeasonsSectionTitle}</h4>
          <ManagementCardsGrid className="seasons-manager__cards--secondary-grid">
            {nonActiveSeasons.map((season) => {
              const isSelected = selectedSeasonId === season.id;

              return (
                <li key={season.id}>
                  <ManagementSelectableCard
                    isSelected={isSelected}
                    badgeLabel={String(season.yearName).slice(-2)}
                    onToggle={() => {
                      setSelectedSeasonId((previousSelectedId) =>
                        previousSelectedId === season.id ? null : season.id,
                      );
                    }}
                    topContent={
                      <>
                        <span className="seasons-manager__year">{season.yearName}</span>
                        <span className="seasons-manager__meta">{t.seasonId}: {season.id}</span>
                      </>
                    }
                    topAside={
                      <span className="seasons-manager__card-status">
                        {t.inactive}
                      </span>
                    }
                  />
                </li>
              );
            })}
          </ManagementCardsGrid>
        </>
      ) : null}

      <ConfirmDialog
        open={isDeleteDialogOpen}
        title={t.deleteTitle}
        message={
          selectedSeason
            ? t.deleteMessage(selectedSeason.yearName)
            : t.deleteFallback
        }
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
