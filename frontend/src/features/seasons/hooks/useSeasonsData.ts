import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchSeasons } from '../../../store/seasonsSlice';
import type { AppDispatch, RootState } from '../../../store';
import { getSeasonsI18n } from '../i18n';
import { getSortedSeasons, splitSeasonGroups } from '../services/seasonsView.service';
import { isSeasonYearInAllowedRange } from '../utils/seasonsManagement.utils';
import { useSeasonCardWidth } from './useSeasonCardWidth';

export function useSeasonsData() {
  const dispatch = useDispatch<AppDispatch>();
  const { items: seasons, loading, error, activeSeasonId } = useSelector((state: RootState) => state.seasons);
  const [newSeasonYear, setNewSeasonYear] = useState('');
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);

  const t = getSeasonsI18n();

  useEffect(() => {
    dispatch(fetchSeasons());
  }, [dispatch]);

  const sortedSeasons = useMemo(() => getSortedSeasons(seasons, activeSeasonId), [seasons, activeSeasonId]);

  useEffect(() => {
    if (selectedSeasonId && !sortedSeasons.some((season) => season.id === selectedSeasonId)) {
      setSelectedSeasonId(null);
    }
  }, [sortedSeasons, selectedSeasonId]);

  const selectedSeason = useMemo(
    () => sortedSeasons.find((season) => season.id === selectedSeasonId) ?? null,
    [sortedSeasons, selectedSeasonId],
  );

  const { activeSeasons, nonActiveSeasons } = useMemo(() => splitSeasonGroups(sortedSeasons), [sortedSeasons]);
  const secondaryCardWidth = useSeasonCardWidth(nonActiveSeasons.length, sortedSeasons.length);

  const isNewYearValid = isSeasonYearInAllowedRange(newSeasonYear);
  const isActivateDisabled = !selectedSeason || selectedSeason.isActive || loading;
  const isDeleteDisabled = !selectedSeason || selectedSeason.isActive || loading;
  const shownError = addError ?? deleteError ?? error;

  return {
    dispatch,
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
    isActivateDisabled,
    isDeleteDisabled,
    shownError,
    setAddError,
    setDeleteError,
  };
}