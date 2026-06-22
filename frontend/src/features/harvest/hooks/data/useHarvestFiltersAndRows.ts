import { useEffect, useRef } from 'react';
import { getSeasons, getActiveSeason, type Season } from '../../../../services/seasonsApi';
import { getFields, type Field } from '../../../../services/fieldsApi';
import {
  getHarvestFieldTotalsBySeason,
  getHarvestsBySeason,
  type HarvestRecord,
} from '../../../../services/harvestsApi';
import { getTraders, type Trader } from '../../../../services/tradersApi';
import { getCustomers, type Customer } from '../../../../services/customersApi';
import { setScopeFilter } from '../../../../store/globalFiltersSlice';
import { HARVEST_DAILY_FILTER_SCOPE } from '../../utils/harvestPage.utils';
import type { HarvestFieldReportRow } from '../../harvestPage.types';


type UseHarvestFiltersAndRowsParams = {
  requiresFiltersData: boolean;
  isSortingDailyDetailsTab: boolean;
  isSortingListTab: boolean;
  isDailyDetailsTab: boolean;
  requiresHarvestData: boolean;
  needsHarvestRecords: boolean;
  seasonFilterId: number | null;
  dailyLoadErrorMessage: string;
  dispatch: (action: ReturnType<typeof setScopeFilter>) => void;
  setHarvestLoadError: (value: string) => void;
  setSeasons: (value: Season[]) => void;
  setFields: (value: Field[]) => void;
  setTraders: (value: Trader[]) => void;
  setCustomers: (value: Customer[]) => void;
  setIsHarvestLoading: (value: boolean) => void;
  setHarvestRows: (value: HarvestRecord[]) => void;
  setFieldReportRows: (value: HarvestFieldReportRow[]) => void;
};

function mapFieldTotalsToReportRows(
  fieldTotals: Awaited<ReturnType<typeof getHarvestFieldTotalsBySeason>>,
): HarvestFieldReportRow[] {
  return fieldTotals.map(({ fieldId, ...rest }) => ({ id: fieldId, ...rest }));
}

export function useHarvestFiltersAndRows({
  requiresFiltersData,
  isSortingDailyDetailsTab,
  isSortingListTab,
  isDailyDetailsTab,
  requiresHarvestData,
  needsHarvestRecords,
  seasonFilterId,
  dailyLoadErrorMessage,
  dispatch,
  setHarvestLoadError,
  setSeasons,
  setFields,
  setTraders,
  setCustomers,
  setIsHarvestLoading,
  setHarvestRows,
  setFieldReportRows,
}: UseHarvestFiltersAndRowsParams): void {
  // When this effect loads harvest data itself, it sets this ref to the season ID.
  // The season-change reload effect reads it to avoid a duplicate API call.
  const harvestLoadedByMainEffectRef = useRef<number | null>(null);
  // Stores the last successfully loaded seasons so we can recover seasonFilterId
  // when AppShell's resetAllScopeFilters() clears it during intra-page navigation.
  const loadedSeasonsRef = useRef<Season[]>([]);

  // Main effect: loads filter data (seasons, fields, traders, customers) in parallel
  // with the active season endpoint, then immediately loads harvest data.
  // This avoids the previous 2-render-cycle delay (seasons → Redux dispatch → harvest data).
  //
  // seasonFilterId is intentionally NOT in the dep array: it is captured via closure
  // at the time any other dep changes, but season-filter changes alone should be handled
  // by the reload effect below (to avoid reloading all filter data on every season change).
  useEffect(() => {
    if (!requiresFiltersData) {
      return;
    }

    // Signal the reload effect to skip its next run (we are handling harvest data here).
    if (requiresHarvestData) {
      harvestLoadedByMainEffectRef.current = -1; // sentinel: loading in progress
    }

    let isMounted = true;

    const loadAll = async () => {
      setHarvestLoadError('');

      try {
        const needsTradersCustomers = requiresHarvestData || isSortingDailyDetailsTab || isSortingListTab;

        // eslint-disable-next-line react-hooks/exhaustive-deps
        const [nextSeasons, nextFields, nextTraders, nextCustomers, activeSeason] = await Promise.all([
          getSeasons(),
          getFields(),
          needsTradersCustomers ? getTraders() : Promise.resolve([] as Trader[]),
          needsTradersCustomers ? getCustomers() : Promise.resolve([] as Customer[]),
          // Fetch active season in parallel only when no season is selected yet;
          // this lets us start harvest data loading without waiting for a Redux round-trip.
          !seasonFilterId ? getActiveSeason().catch(() => null) : Promise.resolve(null),
        ]);

        if (!isMounted) {
          return;
        }

        setSeasons(nextSeasons);
        loadedSeasonsRef.current = nextSeasons;
        setFields(nextFields);
        setTraders(nextTraders);
        setCustomers(nextCustomers);

        // Determine effective season ID using the parallel active-season response,
        // so we never have to wait for a Redux dispatch + re-render to start loading harvest data.
        const effectiveSeasonId: number | null =
          // eslint-disable-next-line react-hooks/exhaustive-deps
          seasonFilterId ??
          activeSeason?.id ??
          nextSeasons.find((s) => s.isActive)?.id ??
          nextSeasons[0]?.id ??
          null;

        if (effectiveSeasonId !== null && !seasonFilterId) {
          dispatch(
            setScopeFilter({
              scope: HARVEST_DAILY_FILTER_SCOPE,
              key: 'seasonId',
              value: String(effectiveSeasonId),
            }),
          );
        }

        if (!requiresHarvestData || effectiveSeasonId === null) {
          harvestLoadedByMainEffectRef.current = null;
          return;
        }

        setIsHarvestLoading(true);

        try {
          const [records, fieldTotals] = await Promise.all([
            needsHarvestRecords
              ? getHarvestsBySeason(effectiveSeasonId)
              : Promise.resolve([] as HarvestRecord[]),
            getHarvestFieldTotalsBySeason(effectiveSeasonId),
          ]);

          if (!isMounted) {
            return;
          }

          setHarvestRows(records);
          setFieldReportRows(mapFieldTotalsToReportRows(fieldTotals));
          harvestLoadedByMainEffectRef.current = effectiveSeasonId;
        } catch {
          if (!isMounted) {
            return;
          }

          setHarvestRows([]);
          setFieldReportRows([]);
          setHarvestLoadError(dailyLoadErrorMessage);
          harvestLoadedByMainEffectRef.current = null;
        } finally {
          if (isMounted) {
            setIsHarvestLoading(false);
          }
        }
      } catch {
        if (!isMounted) {
          return;
        }

        setHarvestLoadError(dailyLoadErrorMessage);
        harvestLoadedByMainEffectRef.current = null;
      }
    };

    void loadAll();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dailyLoadErrorMessage,
    isDailyDetailsTab,
    isSortingDailyDetailsTab,
    needsHarvestRecords,
    requiresFiltersData,
    requiresHarvestData,
    // seasonFilterId intentionally omitted — see comment above
    dispatch,
    setCustomers,
    setFields,
    setHarvestLoadError,
    setHarvestRows,
    setFieldReportRows,
    setIsHarvestLoading,
    setSeasons,
    setTraders,
  ]);

  // Recovery effect: when AppShell's resetAllScopeFilters() wipes seasonFilterId during
  // intra-page sidebar navigation, the main effect (which has seasonFilterId intentionally
  // omitted from its deps) won't re-run. If we already have seasons loaded we can
  // immediately re-dispatch the active season so data loading resumes.
  useEffect(() => {
    if (!requiresFiltersData) return;
    if (seasonFilterId !== null) return;
    const cached = loadedSeasonsRef.current;
    if (cached.length === 0) return;
    const active = cached.find((s) => s.isActive) ?? cached[0];
    if (!active) return;
    dispatch(setScopeFilter({ scope: HARVEST_DAILY_FILTER_SCOPE, key: 'seasonId', value: String(active.id) }));
  }, [requiresFiltersData, seasonFilterId, dispatch]);

  // Reload harvest data when the user selects a different season from the filter.
  // Skips the reload if the main effect already loaded data for this season.
  useEffect(() => {
    if (!requiresHarvestData) {
      setHarvestRows([]);
      setFieldReportRows([]);
      return;
    }

    if (seasonFilterId === null) {
      return;
    }

    // Main effect already handled (or is handling) this season — skip to avoid duplicate API call.
    if (
      harvestLoadedByMainEffectRef.current === seasonFilterId ||
      harvestLoadedByMainEffectRef.current === -1
    ) {
      harvestLoadedByMainEffectRef.current = null;
      return;
    }

    // Invalidate the main-effect cache: we're about to load a different season's data,
    // so if the user later returns to the active season it must reload (not serve stale data).
    harvestLoadedByMainEffectRef.current = null;

    let isMounted = true;

    const reloadRows = async () => {
      setIsHarvestLoading(true);
      setHarvestLoadError('');

      try {
        const [records, fieldTotals] = await Promise.all([
          needsHarvestRecords
            ? getHarvestsBySeason(seasonFilterId)
            : Promise.resolve([] as HarvestRecord[]),
          getHarvestFieldTotalsBySeason(seasonFilterId),
        ]);

        if (!isMounted) {
          return;
        }

        setHarvestRows(records);
        setFieldReportRows(mapFieldTotalsToReportRows(fieldTotals));
      } catch {
        if (!isMounted) {
          return;
        }

        setHarvestRows([]);
        setFieldReportRows([]);
        setHarvestLoadError(dailyLoadErrorMessage);
      } finally {
        if (isMounted) {
          setIsHarvestLoading(false);
        }
      }
    };

    void reloadRows();

    return () => {
      isMounted = false;
    };
  }, [
    dailyLoadErrorMessage,
    isDailyDetailsTab,
    isSortingDailyDetailsTab,
    needsHarvestRecords,
    requiresHarvestData,
    seasonFilterId,
    setFieldReportRows,
    setHarvestLoadError,
    setHarvestRows,
    setIsHarvestLoading,
  ]);
}
