import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { addSeason, activateSeason, fetchSeasons, removeSeason } from '../../store/seasonsSlice';
import type { AppDispatch, RootState } from '../../store';

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
      'הוספת העונה נכשלה.';

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
      'לא ניתן למחוק את העונה שנבחרה.';

    setDeleteError(failureMessage);
    setIsDeleteDialogOpen(false);
  };

  const isNewYearValid = isSeasonYearInAllowedRange(newSeasonYear);
  const isActivateDisabled = !selectedSeason || selectedSeason.isActive || loading;
  const isDeleteDisabled = !selectedSeason || loading;
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
    <div className="seasons-manager">
      <div className="seasons-manager__create-row">
        <input
          className="seasons-manager__year-input"
          type="number"
          min={MIN_SEASON_YEAR}
          max={MAX_SEASON_YEAR}
          step={1}
          value={newSeasonYear}
          onChange={(e) => setNewSeasonYear(e.target.value)}
          placeholder={`שנת עונה חדשה (${MIN_SEASON_YEAR}-${MAX_SEASON_YEAR})`}
        />
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            void handleAdd();
          }}
          disabled={loading}
        >
          הוסף עונה
        </button>
      </div>

      {loading ? <p className="seasons-manager__state">טוען עונות...</p> : null}
      {shownError ? <p className="seasons-manager__error">{shownError}</p> : null}
      {!isNewYearValid && newSeasonYear.trim() !== '' ? (
        <p className="seasons-manager__error">ניתן להוסיף שנה רק בין {MIN_SEASON_YEAR} ל-{MAX_SEASON_YEAR}.</p>
      ) : null}

      {sortedSeasons.length === 0 && !loading ? (
        <div className="seasons-manager__empty">אין עונות להצגה כרגע.</div>
      ) : null}

      {sortedSeasons.length > 0 ? (
        <ul className="seasons-manager__cards">
          {sortedSeasons.map((season) => {
            const isSelected = selectedSeasonId === season.id;

            return (
              <li key={season.id}>
                <button
                  type="button"
                  className={`seasons-manager__card${isSelected ? ' is-selected' : ''}`}
                  onClick={() => {
                    setSelectedSeasonId((previousSelectedId) =>
                      previousSelectedId === season.id ? null : season.id,
                    );
                  }}
                >
                  <span className={`seasons-manager__selector${isSelected ? ' is-selected' : ''}`}>
                    {isSelected ? '✓' : String(season.yearName).slice(-2)}
                  </span>

                  <span className="seasons-manager__card-main">
                    <span className="seasons-manager__year">{season.yearName}</span>
                    <span className="seasons-manager__meta">מזהה עונה: {season.id}</span>
                  </span>

                  <span className={`seasons-manager__card-status${season.isActive ? ' is-active' : ''}`}>
                    {season.isActive ? 'פעיל' : 'לא פעיל'}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      <ConfirmDialog
        open={isDeleteDialogOpen}
        title="מחיקת עונה"
        message={
          selectedSeason
            ? `האם למחוק את עונת ${selectedSeason.yearName}? פעולה זו לא ניתנת לשחזור.`
            : 'האם למחוק את העונה שנבחרה?'
        }
        confirmLabel="מחק"
        cancelLabel="ביטול"
        onConfirm={() => {
          void handleDeleteSeason();
        }}
        onCancel={() => setIsDeleteDialogOpen(false)}
      />
    </div>
  );
};

export default SeasonsManagement;
