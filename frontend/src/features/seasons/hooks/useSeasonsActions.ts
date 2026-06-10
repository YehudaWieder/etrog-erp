import { useCallback, type Dispatch, type SetStateAction } from 'react';
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
  const handleAdd = useCallback(async () => {
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
  }, [dispatch, newSeasonYear, setAddError, setNewSeasonYear, t.addFailed]);

  const handleActivate = useCallback(async () => {
    if (!selectedSeason || selectedSeason.isActive) {
      return;
    }

    setDeleteError(null);
    await dispatch(activateSeason(selectedSeason.id));
  }, [dispatch, selectedSeason, setDeleteError]);

  const handleOpenDeleteDialog = useCallback(() => {
    if (!selectedSeason) {
      return;
    }

    if (selectedSeason.isActive) {
      setDeleteError(t.activeSeasonDeleteBlocked);
      return;
    }

    setDeleteError(null);
    setIsDeleteDialogOpen(true);
  }, [selectedSeason, setDeleteError, setIsDeleteDialogOpen, t.activeSeasonDeleteBlocked]);

  const handleDeleteSeason = useCallback(async () => {
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
  }, [dispatch, selectedSeason, setDeleteError, setIsDeleteDialogOpen, t.deleteFailed]);

  return {
    handleAdd,
    handleActivate,
    handleOpenDeleteDialog,
    handleDeleteSeason,
  };
}