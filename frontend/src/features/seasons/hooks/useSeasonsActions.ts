import type { Dispatch, SetStateAction } from 'react';
import { addSeason, activateSeason, removeSeason } from '../../../store/seasonsSlice';
import type { AppDispatch } from '../../../store';
import type { ResolvedSeason } from '../seasonsManagement.types';
import { isSeasonYearInAllowedRange, toSeasonFailureMessage } from '../utils/seasonsManagement.utils';

type UseSeasonsActionsParams = {
  dispatch: AppDispatch;
  t: {
    addFailed: string;
    deleteFailed: string;
    activeSeasonDeleteBlocked: string;
  };
  newSeasonYear: string;
  setNewSeasonYear: Dispatch<SetStateAction<string>>;
  selectedSeason: ResolvedSeason | null;
  setAddError: Dispatch<SetStateAction<string | null>>;
  setDeleteError: Dispatch<SetStateAction<string | null>>;
  setIsDeleteDialogOpen: Dispatch<SetStateAction<boolean>>;
};

export function useSeasonsActions({
  dispatch,
  t,
  newSeasonYear,
  setNewSeasonYear,
  selectedSeason,
  setAddError,
  setDeleteError,
  setIsDeleteDialogOpen,
}: UseSeasonsActionsParams) {
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

    const failureMessage = toSeasonFailureMessage(actionResult.payload, actionResult.error.message, t.addFailed);
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

    const failureMessage = toSeasonFailureMessage(actionResult.payload, actionResult.error.message, t.deleteFailed);
    setDeleteError(failureMessage);
    setIsDeleteDialogOpen(false);
  };

  return {
    handleAdd,
    handleActivate,
    handleOpenDeleteDialog,
    handleDeleteSeason,
  };
}