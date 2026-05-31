import { useCallback } from 'react';
import {
  createHarvestWithClassifications,
  getHarvestFieldTotalsBySeason,
  getHarvestsBySeason,
  type HarvestRecord,
} from '../../../../services/harvestsApi';
import {
  getClassificationDailySummaryBySeason,
  type ClassificationDailySummaryCategory,
  type ClassificationDailySummaryRow,
} from '../../../../services/classificationsApi';
import type { HarvestI18n } from '../../i18n';
import { buildHarvestFormSubmissionPayload } from '../../utils/harvestFormSubmission.util';
import type { HarvestFieldReportRow, HarvestFormClassificationDraft } from '../../harvestPage.types';

type UseHarvestFormSubmissionParams = {
  lang: 'he' | 'en';
  t: HarvestI18n;
  seasonFilterId: number | null;
  currentUserId: number | null | undefined;
  form: {
    dateGregorian: string;
    dateHebrew: string;
    fieldId: string;
    totalHarvested: string;
    totalRejected: string;
    ownerHarvested: string;
    ownerRejected: string;
    notes: string;
    isPartialClassification: boolean;
    classifications: HarvestFormClassificationDraft[];
  };
  setIsSubmittingHarvestForm: (value: boolean) => void;
  setHarvestFormError: (value: string) => void;
  setIsHarvestFormOpen: (value: boolean) => void;
  setHarvestRows: (rows: HarvestRecord[]) => void;
  setFieldReportRows: (rows: HarvestFieldReportRow[]) => void;
  setSortingDailyRows: (rows: ClassificationDailySummaryRow[]) => void;
  setSortingDailyCategories: (rows: ClassificationDailySummaryCategory[]) => void;
  setSortingDailyLoadError: (value: string) => void;
};

export function useHarvestFormSubmission({
  lang,
  t,
  seasonFilterId,
  currentUserId,
  form,
  setIsSubmittingHarvestForm,
  setHarvestFormError,
  setIsHarvestFormOpen,
  setHarvestRows,
  setFieldReportRows,
  setSortingDailyRows,
  setSortingDailyCategories,
  setSortingDailyLoadError,
}: UseHarvestFormSubmissionParams) {
  const refreshHarvestWorkspaceData = useCallback(async () => {
    if (!seasonFilterId) {
      return;
    }

    const [records, fieldTotals] = await Promise.all([
      getHarvestsBySeason(seasonFilterId),
      getHarvestFieldTotalsBySeason(seasonFilterId),
    ]);

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

    try {
      const sortingSummary = await getClassificationDailySummaryBySeason(seasonFilterId);
      setSortingDailyRows(sortingSummary.rows);
      setSortingDailyCategories(sortingSummary.categories);
      setSortingDailyLoadError('');
    } catch {
      // Keep current sorting summary when refresh fallback endpoint fails.
    }
  }, [
    seasonFilterId,
    setFieldReportRows,
    setHarvestRows,
    setSortingDailyCategories,
    setSortingDailyLoadError,
    setSortingDailyRows,
  ]);

  const handleSubmitHarvestGlobalForm = useCallback(async () => {
    const submission = buildHarvestFormSubmissionPayload({
      lang,
      t: t.formSubmission,
      seasonFilterId,
      currentUserId: currentUserId ?? undefined,
      form,
    });

    if (!submission.payload) {
      setHarvestFormError(submission.error);
      return;
    }

    setIsSubmittingHarvestForm(true);
    setHarvestFormError('');

    try {
      await createHarvestWithClassifications(submission.payload);
      await refreshHarvestWorkspaceData();
      setIsHarvestFormOpen(false);
    } catch (error) {
      if (error instanceof Error && error.message.trim()) {
        setHarvestFormError(error.message);
      } else {
        setHarvestFormError(lang === 'he' ? 'שמירת הקטיף נכשלה. נסה שוב.' : 'Failed to save the harvest. Please try again.');
      }
    } finally {
      setIsSubmittingHarvestForm(false);
    }
  }, [
    currentUserId,
    form,
    lang,
    refreshHarvestWorkspaceData,
    seasonFilterId,
    setHarvestFormError,
    setIsHarvestFormOpen,
    setIsSubmittingHarvestForm,
  ]);

  return {
    handleSubmitHarvestGlobalForm,
  };
}



