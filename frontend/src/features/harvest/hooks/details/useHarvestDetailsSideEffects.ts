import { useEffect } from 'react';
import { getClassificationsByHarvest } from '../../../../services/classificationsApi';
import type { ClassificationRecord } from '../../../../services/classificationsApi';
import {
  getHarvestFieldReportDetailsBySeasonAndField,
  type HarvestFieldReportDetailsRecord,
  type HarvestRecord,
} from '../../../../services/harvestsApi';
import type { HarvestI18n } from '../../i18n';
import type { HarvestFieldReportRow } from '../../harvestPage.types';

type UseHarvestDetailsSideEffectsParams = {
  isFieldReportTab: boolean;
  isSortingDailyDetailsTab: boolean;
  seasonFilterId: number | null;
  fieldReportDetailsFieldId: number | null;
  fieldReportRows: HarvestFieldReportRow[];
  setFieldReportDetailsFieldId: (value: number | null) => void;
  setFieldReportDetailsPayload: (value: HarvestFieldReportDetailsRecord | null) => void;
  detailsRecord: HarvestRecord | null;
  filteredHarvestRows: HarvestRecord[];
  setDetailsRecord: (value: HarvestRecord | null) => void;
  setRelatedSortings: (value: ClassificationRecord[]) => void;
  setRelatedSortingsLoadError: (value: string) => void;
  setIsRelatedSortingsLoading: (value: boolean) => void;
  sortingDailyDetailsRowId: number | null;
  setSortingDailyDetailRows: (value: ClassificationRecord[]) => void;
  setSortingDailyDetailRowsLoadError: (value: string) => void;
  setIsSortingDailyDetailRowsLoading: (value: boolean) => void;
  lang: 'he' | 'en';
  t: HarvestI18n;
};

export function useHarvestDetailsSideEffects({
  isFieldReportTab,
  isSortingDailyDetailsTab,
  seasonFilterId,
  fieldReportDetailsFieldId,
  fieldReportRows,
  setFieldReportDetailsFieldId,
  setFieldReportDetailsPayload,
  detailsRecord,
  filteredHarvestRows,
  setDetailsRecord,
  setRelatedSortings,
  setRelatedSortingsLoadError,
  setIsRelatedSortingsLoading,
  sortingDailyDetailsRowId,
  setSortingDailyDetailRows,
  setSortingDailyDetailRowsLoadError,
  setIsSortingDailyDetailRowsLoading,
  lang,
  t,
}: UseHarvestDetailsSideEffectsParams) {
  useEffect(() => {
    if (fieldReportDetailsFieldId === null) {
      setFieldReportDetailsPayload(null);
      return;
    }

    if (!fieldReportRows.some((row) => row.id === fieldReportDetailsFieldId)) {
      setFieldReportDetailsFieldId(null);
      setFieldReportDetailsPayload(null);
    }
  }, [fieldReportDetailsFieldId, fieldReportRows, setFieldReportDetailsFieldId, setFieldReportDetailsPayload]);

  useEffect(() => {
    if (!isFieldReportTab || fieldReportDetailsFieldId === null || !seasonFilterId) {
      setFieldReportDetailsPayload(null);
      return;
    }

    let isMounted = true;

    const loadFieldReportDetails = async () => {
      try {
        const data = await getHarvestFieldReportDetailsBySeasonAndField(seasonFilterId, fieldReportDetailsFieldId);
        if (!isMounted) {
          return;
        }
        setFieldReportDetailsPayload(data);
      } catch {
        if (!isMounted) {
          return;
        }
        setFieldReportDetailsPayload(null);
      }
    };

    void loadFieldReportDetails();

    return () => {
      isMounted = false;
    };
  }, [fieldReportDetailsFieldId, isFieldReportTab, seasonFilterId, setFieldReportDetailsPayload]);

  useEffect(() => {
    if (!detailsRecord) {
      return;
    }

    if (!filteredHarvestRows.some((row) => row.id === detailsRecord.id)) {
      setDetailsRecord(null);
    }
  }, [detailsRecord, filteredHarvestRows, setDetailsRecord]);

  useEffect(() => {
    if (!detailsRecord) {
      setRelatedSortings([]);
      setRelatedSortingsLoadError('');
      setIsRelatedSortingsLoading(false);
      return;
    }

    let isMounted = true;

    const loadRelatedSortings = async () => {
      setIsRelatedSortingsLoading(true);
      setRelatedSortingsLoadError('');

      try {
        const rows = await getClassificationsByHarvest(detailsRecord.id);

        if (!isMounted) {
          return;
        }

        setRelatedSortings(rows);
      } catch {
        if (!isMounted) {
          return;
        }

        setRelatedSortings([]);
        setRelatedSortingsLoadError(t.dailyDetails.detailsPanel.relatedSortings.loadError);
      } finally {
        if (isMounted) {
          setIsRelatedSortingsLoading(false);
        }
      }
    };

    void loadRelatedSortings();

    return () => {
      isMounted = false;
    };
  }, [
    detailsRecord,
    setIsRelatedSortingsLoading,
    setRelatedSortings,
    setRelatedSortingsLoadError,
    t.dailyDetails.detailsPanel.relatedSortings.loadError,
  ]);

  useEffect(() => {
    if (!isSortingDailyDetailsTab || sortingDailyDetailsRowId === null) {
      setSortingDailyDetailRows([]);
      setSortingDailyDetailRowsLoadError('');
      setIsSortingDailyDetailRowsLoading(false);
      return;
    }

    let isMounted = true;

    const loadSortingDailyDetailRows = async () => {
      setIsSortingDailyDetailRowsLoading(true);
      setSortingDailyDetailRowsLoadError('');

      try {
        const rows = await getClassificationsByHarvest(sortingDailyDetailsRowId);

        if (!isMounted) {
          return;
        }

        setSortingDailyDetailRows(rows);
      } catch {
        if (!isMounted) {
          return;
        }

        setSortingDailyDetailRows([]);
        setSortingDailyDetailRowsLoadError(t.sortingDailyDetails.loadError);
      } finally {
        if (isMounted) {
          setIsSortingDailyDetailRowsLoading(false);
        }
      }
    };

    void loadSortingDailyDetailRows();

    return () => {
      isMounted = false;
    };
  }, [
    isSortingDailyDetailsTab,
    lang,
    setIsSortingDailyDetailRowsLoading,
    setSortingDailyDetailRows,
    setSortingDailyDetailRowsLoadError,
    sortingDailyDetailsRowId,
  ]);
}



