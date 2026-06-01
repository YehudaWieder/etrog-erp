import { useEffect } from 'react';
import { getSeasons, type Season } from '../../../../services/seasonsApi';
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
  activeSeasonId: number | null;
  seasonFilterId: number | null;
  seasons: Season[];
  requiresHarvestData: boolean;
  isDailyDetailsTab: boolean;
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

export function useHarvestFiltersAndRows({
  requiresFiltersData,
  isSortingDailyDetailsTab,
  activeSeasonId,
  seasonFilterId,
  seasons,
  requiresHarvestData,
  isDailyDetailsTab,
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
  useEffect(() => {
    if (!requiresFiltersData) {
      return;
    }

    let isMounted = true;

    const loadFiltersData = async () => {
      setHarvestLoadError('');

      try {
        const [nextSeasons, nextFields, nextTraders, nextCustomers] = await Promise.all([
          getSeasons(),
          getFields(),
          requiresHarvestData || isSortingDailyDetailsTab ? getTraders() : Promise.resolve([] as Trader[]),
          requiresHarvestData || isSortingDailyDetailsTab ? getCustomers() : Promise.resolve([] as Customer[]),
        ]);

        if (!isMounted) {
          return;
        }

        setSeasons(nextSeasons);
        setFields(nextFields);
        setTraders(nextTraders);
        setCustomers(nextCustomers);
      } catch {
        if (!isMounted) {
          return;
        }

        setHarvestLoadError(dailyLoadErrorMessage);
      }
    };

    void loadFiltersData();

    return () => {
      isMounted = false;
    };
  }, [
    dailyLoadErrorMessage,
    isSortingDailyDetailsTab,
    requiresFiltersData,
    setCustomers,
    setFields,
    setHarvestLoadError,
    setSeasons,
    setTraders,
  ]);

  useEffect(() => {
    if (!requiresFiltersData) {
      return;
    }

    if (activeSeasonId && (seasonFilterId === null || !seasons.some((season) => season.id === seasonFilterId))) {
      dispatch(
        setScopeFilter({
          scope: HARVEST_DAILY_FILTER_SCOPE,
          key: 'seasonId',
          value: String(activeSeasonId),
        }),
      );
      return;
    }

    if (!activeSeasonId && seasonFilterId !== null && !seasons.some((season) => season.id === seasonFilterId)) {
      dispatch(
        setScopeFilter({
          scope: HARVEST_DAILY_FILTER_SCOPE,
          key: 'seasonId',
          value: seasons[0] ? String(seasons[0].id) : '',
        }),
      );
    }
  }, [activeSeasonId, dispatch, requiresFiltersData, seasonFilterId, seasons]);

  useEffect(() => {
    if (!requiresHarvestData) {
      return;
    }

    if (!seasonFilterId) {
      setHarvestRows([]);
      setFieldReportRows([]);
      return;
    }

    let isMounted = true;

    const loadHarvestRows = async () => {
      setIsHarvestLoading(true);
      setHarvestLoadError('');

      try {
        const [records, fieldTotals] = await Promise.all([
          isDailyDetailsTab || isSortingDailyDetailsTab ? getHarvestsBySeason(seasonFilterId) : Promise.resolve([]),
          getHarvestFieldTotalsBySeason(seasonFilterId),
        ]);

        if (!isMounted) {
          return;
        }

        setHarvestRows(records);
        setFieldReportRows(
          fieldTotals.map((row) => ({
            id: row.fieldId,
            fieldName: row.fieldName,
            recordCount: row.recordCount,
            totalHarvested: row.totalHarvested,
            totalRejected: row.totalRejected,
            totalAfterRejected: row.totalAfterRejected,
            classifiedTotal: row.classifiedTotal,
            rejectionRate: row.rejectionRate,
            ownerHarvested: row.ownerHarvested,
            ownerRejected: row.ownerRejected,
            ownerAfterRejected: row.ownerAfterRejected,
            ownerRejectionRate: row.ownerRejectionRate,
            differenceHarvested: row.differenceHarvested,
            differenceRejected: row.differenceRejected,
            differenceAfterRejected: row.differenceAfterRejected,
            differenceRejectionRate: row.differenceRejectionRate,
            hasOwnerOverrides: row.hasOwnerOverrides,
            isPartialClassification: row.isPartialClassification,
          })),
        );
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

    void loadHarvestRows();

    return () => {
      isMounted = false;
    };
  }, [
    dailyLoadErrorMessage,
    isDailyDetailsTab,
    requiresHarvestData,
    seasonFilterId,
    setFieldReportRows,
    setHarvestLoadError,
    setHarvestRows,
    setIsHarvestLoading,
  ]);
}



