import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchSeasons } from '../../../store/seasonsSlice';
import { fetchTraders } from '../../../store/tradersSlice';
import { setScopeFilter } from '../../../store/globalFiltersSlice';
import {
  fetchTraderSeasonSettings,
  removeTraderSeasonSettings,
  saveTraderSeasonSettings,
} from '../../../store/traderSeasonSettingsSlice';
import type { AppDispatch, RootState } from '../../../store';
import type { Currency } from '../../../services/traderSeasonSettingsApi';
import { getTraderSeasonSettingsI18n } from '../i18n';
import { sortByHebrewName } from '../services/traderCollections.service';
import { isValidPaymentPercent } from '../utils/traderPayments.util';
import { buildTraderSeasonSettingsFiltersConfig, parseSeasonFilterId } from '../utils/traderSeasonSettingsFilters.util';
import type { TraderSeasonSettingsFormState, TraderSeasonSettingsManagementProps } from '../tradersManagement.types';

const FILTER_SCOPE = 'trader-season-settings-management';
const EMPTY_FILTERS: Record<string, string> = {};

const createInitialFormState = (): TraderSeasonSettingsFormState => ({
  traderId: '',
  paymentPercent: '',
  pricePerEtrog: '',
  currency: '',
});

function isValidPrice(value: string): boolean {
  if (value.trim() === '') {
    return false;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue >= 0;
}

export function useTraderSeasonSettingsManagement({ onHeaderStateChange }: TraderSeasonSettingsManagementProps) {
  const dispatch = useDispatch<AppDispatch>();
  const t = getTraderSeasonSettingsI18n();

  const traders = useSelector((state: RootState) => state.traders.items);
  const settings = useSelector((state: RootState) => state.traderSeasonSettings.items);
  const settingsLoading = useSelector((state: RootState) => state.traderSeasonSettings.loading);
  const settingsError = useSelector((state: RootState) => state.traderSeasonSettings.error);
  const seasons = useSelector((state: RootState) => state.seasons.items);
  const activeSeasonId = useSelector((state: RootState) => state.seasons.activeSeasonId);

  const [selectedEntryId, setSelectedEntryId] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const [formState, setFormState] = useState<TraderSeasonSettingsFormState>(() => createInitialFormState());
  const [addError, setAddError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const globalFilterValues = useSelector(
    (state: RootState) => state.globalFilters.scopes[FILTER_SCOPE] ?? EMPTY_FILTERS,
  );

  useEffect(() => {
    dispatch(fetchSeasons());
    dispatch(fetchTraders());
  }, [dispatch]);

  const seasonFilterId = useMemo(() => {
    return parseSeasonFilterId(globalFilterValues.seasonId ?? '');
  }, [globalFilterValues.seasonId]);

  useEffect(() => {
    if (activeSeasonId && (seasonFilterId === null || !seasons.some((season) => season.id === seasonFilterId))) {
      dispatch(
        setScopeFilter({
          scope: FILTER_SCOPE,
          key: 'seasonId',
          value: String(activeSeasonId),
        }),
      );
      return;
    }

    if (!activeSeasonId && seasonFilterId !== null && !seasons.some((season) => season.id === seasonFilterId)) {
      dispatch(
        setScopeFilter({
          scope: FILTER_SCOPE,
          key: 'seasonId',
          value: seasons[0] ? String(seasons[0].id) : '',
        }),
      );
    }
  }, [activeSeasonId, dispatch, seasonFilterId, seasons]);

  useEffect(() => {
    if (!seasonFilterId) {
      return;
    }

    dispatch(fetchTraderSeasonSettings(seasonFilterId));
  }, [dispatch, seasonFilterId]);

  const sortedTraders = useMemo(() => sortByHebrewName(traders), [traders]);

  const traderById = useMemo(() => new Map(sortedTraders.map((trader) => [trader.id, trader.name])), [sortedTraders]);

  const entriesForSeason = useMemo(
    () => settings.filter((entry) => entry.seasonId === seasonFilterId),
    [settings, seasonFilterId],
  );

  const sortedEntries = useMemo(
    () =>
      [...entriesForSeason].sort((a, b) => {
        const nameA = a.trader?.name ?? traderById.get(a.traderId) ?? '';
        const nameB = b.trader?.name ?? traderById.get(b.traderId) ?? '';
        return nameA.localeCompare(nameB, 'he');
      }),
    [entriesForSeason, traderById],
  );

  const availableTradersForAdd = useMemo(
    () => sortedTraders.filter((trader) => !entriesForSeason.some((entry) => entry.traderId === trader.id)),
    [sortedTraders, entriesForSeason],
  );

  useEffect(() => {
    if (selectedEntryId && !sortedEntries.some((entry) => entry.id === selectedEntryId)) {
      setSelectedEntryId(null);
    }
  }, [selectedEntryId, sortedEntries]);

  const selectedEntry = useMemo(
    () => sortedEntries.find((entry) => entry.id === selectedEntryId) ?? null,
    [selectedEntryId, sortedEntries],
  );

  const selectedEntryTraderName = selectedEntry
    ? selectedEntry.trader?.name ?? traderById.get(selectedEntry.traderId) ?? ''
    : '';

  const filters = useMemo(
    () =>
      buildTraderSeasonSettingsFiltersConfig({
        activeSeasonId,
        seasons,
        seasonFilterLabel: t.seasonFilterLabel,
        activeSeasonBadge: t.activeSeasonBadge,
        noActiveSeason: t.noActiveSeason,
      }),
    [activeSeasonId, seasons, t.activeSeasonBadge, t.noActiveSeason, t.seasonFilterLabel],
  );

  const validateFormState = (
    state: TraderSeasonSettingsFormState,
  ):
    | { ok: true; payload: { traderId: number; paymentPercent: number; pricePerEtrog: number; currency: Currency } }
    | { ok: false; error: string } => {
    if (!state.traderId) {
      return { ok: false, error: t.selectTrader };
    }

    if (!isValidPaymentPercent(state.paymentPercent)) {
      return { ok: false, error: t.invalidPercent };
    }

    if (!isValidPrice(state.pricePerEtrog)) {
      return { ok: false, error: t.invalidPrice };
    }

    if (!state.currency) {
      return { ok: false, error: t.selectCurrency };
    }

    return {
      ok: true,
      payload: {
        traderId: state.traderId,
        paymentPercent: Number(state.paymentPercent),
        pricePerEtrog: Number(state.pricePerEtrog),
        currency: state.currency,
      },
    };
  };

  const handleOpenAddDialog = () => {
    if (!seasonFilterId) {
      return;
    }

    setAddError(null);
    setFormState(createInitialFormState());
    setIsAddDialogOpen(true);
  };

  const handleOpenEditDialog = () => {
    if (!selectedEntry) {
      return;
    }

    setEditError(null);
    setFormState({
      traderId: selectedEntry.traderId,
      paymentPercent: String(selectedEntry.paymentPercent),
      pricePerEtrog: String(selectedEntry.pricePerEtrog),
      currency: selectedEntry.currency,
    });
    setIsEditDialogOpen(true);
  };

  const handleOpenDeleteDialog = () => {
    if (!selectedEntry) {
      return;
    }

    setDeleteError(null);
    setIsDeleteDialogOpen(true);
  };

  const handleAddEntry = async () => {
    if (!seasonFilterId) {
      return;
    }

    const validation = validateFormState(formState);
    if (!validation.ok) {
      setAddError(validation.error);
      return;
    }

    setAddError(null);
    setIsSubmitting(true);

    try {
      const actionResult = await dispatch(
        saveTraderSeasonSettings({
          seasonId: seasonFilterId,
          ...validation.payload,
        }),
      );

      if (saveTraderSeasonSettings.fulfilled.match(actionResult)) {
        setIsAddDialogOpen(false);
        return;
      }

      const failureMessage =
        (typeof actionResult.payload === 'string' && actionResult.payload) ||
        actionResult.error.message ||
        t.addFailed;

      setAddError(failureMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditEntry = async () => {
    if (!selectedEntry || !seasonFilterId) {
      return;
    }

    const validation = validateFormState(formState);
    if (!validation.ok) {
      setEditError(validation.error);
      return;
    }

    setEditError(null);
    setIsSubmitting(true);

    try {
      const actionResult = await dispatch(
        saveTraderSeasonSettings({
          seasonId: seasonFilterId,
          ...validation.payload,
        }),
      );

      if (saveTraderSeasonSettings.fulfilled.match(actionResult)) {
        setIsEditDialogOpen(false);
        return;
      }

      const failureMessage =
        (typeof actionResult.payload === 'string' && actionResult.payload) ||
        actionResult.error.message ||
        t.editFailed;

      setEditError(failureMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEntry = async () => {
    if (!selectedEntry) {
      return;
    }

    const actionResult = await dispatch(removeTraderSeasonSettings(selectedEntry.id));

    if (removeTraderSeasonSettings.fulfilled.match(actionResult)) {
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

  const isViewingNonActiveSeason = seasonFilterId !== null && seasonFilterId !== activeSeasonId;
  const isAddDisabled =
    settingsLoading ||
    isSubmitting ||
    !seasonFilterId ||
    availableTradersForAdd.length === 0 ||
    isViewingNonActiveSeason;
  const isEditDisabled = !selectedEntry || settingsLoading || isSubmitting || isViewingNonActiveSeason;
  const isDeleteDisabled = !selectedEntry || settingsLoading || isSubmitting || isViewingNonActiveSeason;
  const shownError = addError ?? editError ?? deleteError ?? settingsError;

  useEffect(() => {
    if (!onHeaderStateChange) {
      return;
    }

    onHeaderStateChange({
      count: sortedEntries.length,
      isAddDisabled,
      isEditDisabled,
      isDeleteDisabled,
      onAdd: handleOpenAddDialog,
      onEdit: handleOpenEditDialog,
      onDelete: handleOpenDeleteDialog,
    });
  }, [
    onHeaderStateChange,
    sortedEntries.length,
    isAddDisabled,
    isEditDisabled,
    isDeleteDisabled,
    selectedEntry,
    settingsLoading,
    isSubmitting,
    seasonFilterId,
    availableTradersForAdd.length,
  ]);

  useEffect(() => () => {
    onHeaderStateChange?.(null);
  }, [onHeaderStateChange]);

  return {
    t,
    FILTER_SCOPE,
    filters,
    loading: settingsLoading,
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
  };
}
