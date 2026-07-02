import { useEffect } from 'react';
import type { SeasonsHeaderState, SeasonsManagementProps } from '../seasonsManagement.types';
import { useSeasonsActions } from './useSeasonsActions';
import { useSeasonsData } from './useSeasonsData';

export function useSeasonsManagement({ onHeaderStateChange }: SeasonsManagementProps) {
  const {
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
  } = useSeasonsData();

  const { handleAdd, handleActivate, handleOpenDeleteDialog, handleDeleteSeason, isAdding } = useSeasonsActions({
    dispatch,
    t,
    newSeasonYear,
    setNewSeasonYear,
    selectedSeason,
    setAddError,
    setDeleteError,
    setIsDeleteDialogOpen,
  });

  useEffect(() => {
    if (!onHeaderStateChange) {
      return;
    }

    const headerState: SeasonsHeaderState = {
      count: sortedSeasons.length,
      isActivateDisabled,
      isDeleteDisabled,
      onActivate: () => {
        void handleActivate();
      },
      onDelete: handleOpenDeleteDialog,
    };

    onHeaderStateChange(headerState);
  }, [onHeaderStateChange, sortedSeasons.length, isActivateDisabled, isDeleteDisabled, handleActivate, handleOpenDeleteDialog]);

  useEffect(
    () => () => {
      onHeaderStateChange?.(null);
    },
    [onHeaderStateChange],
  );

  return {
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
    handleAdd,
    handleActivate,
    handleOpenDeleteDialog,
    handleDeleteSeason,
    isAdding,
  };
}
