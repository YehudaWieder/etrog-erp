import { useCallback } from 'react';
import {
  createHarvestClassification,
  restoreHarvestClassification,
  getClassificationDailySummaryBySeason,
} from '../../../../services/classificationsApi';
import { getHarvestFieldTotalsBySeason, getHarvestsBySeason, type HarvestRecord } from '../../../../services/harvestsApi';
import type { ClassificationDailySummaryCategory, ClassificationDailySummaryRow } from '../../../../services/classificationsApi';
import type { HarvestFieldReportRow } from '../../harvestPage.types';
import type { HarvestI18n } from '../../i18n';
import { buildHarvestSortingFormSubmissionPayload } from '../../utils/harvestSortingFormSubmission.util';
import { translateHarvestApiError } from '../../utils/translateHarvestApiError';

type UseHarvestSortingFormSubmissionParams = {
  lang: 'he' | 'en';
  t: HarvestI18n;
  seasonFilterId: number | null;
  selectedHarvestSummary: {
    totalHarvested: number;
    totalRejected: number;
    classifiedTotal: number;
  } | null;
  form: {
    harvestId: string;
    assignmentType: 'GENERAL' | 'TRADER' | 'CUSTOMER';
    traderId: string;
    customerId: string;
    traderCategoryId: string;
    customerCategoryId: string;
    grade: string;
    pitamStatus: 'WITH_PITAM' | 'WITHOUT_PITAM' | 'MIXED' | '';
    quantity: string;
    notes: string;
    isPartialClassification: boolean;
  };
  setIsSubmittingHarvestSortingForm: (value: boolean) => void;
  setHarvestSortingFormError: (value: string) => void;
  setIsHarvestSortingFormOpen: (value: boolean) => void;
  setHarvestRows: (rows: HarvestRecord[]) => void;
  setFieldReportRows: (rows: HarvestFieldReportRow[]) => void;
  setSortingDailyRows: (rows: ClassificationDailySummaryRow[]) => void;
  setSortingDailyCategories: (rows: ClassificationDailySummaryCategory[]) => void;
  setSortingDailyLoadError: (value: string) => void;
  deletedClassificationId?: number;
  onRestoreSuccess?: (restoredId: number) => void;
};

export function useHarvestSortingFormSubmission({
  lang,
  t,
  seasonFilterId,
  selectedHarvestSummary,
  form,
  setIsSubmittingHarvestSortingForm,
  setHarvestSortingFormError,
  setIsHarvestSortingFormOpen,
  setHarvestRows,
  setFieldReportRows,
  setSortingDailyRows,
  setSortingDailyCategories,
  setSortingDailyLoadError,
  deletedClassificationId,
  onRestoreSuccess,
}: UseHarvestSortingFormSubmissionParams) {
  const refreshHarvestWorkspaceData = useCallback(async () => {
    if (!seasonFilterId) {
      return;
    }

    const [records, fieldTotals, sortingSummary] = await Promise.all([
      getHarvestsBySeason(seasonFilterId),
      getHarvestFieldTotalsBySeason(seasonFilterId),
      getClassificationDailySummaryBySeason(seasonFilterId),
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
    setSortingDailyRows(sortingSummary.rows);
    setSortingDailyCategories(sortingSummary.categories);
    setSortingDailyLoadError('');
  }, [
    seasonFilterId,
    setFieldReportRows,
    setHarvestRows,
    setSortingDailyCategories,
    setSortingDailyLoadError,
    setSortingDailyRows,
  ]);

  const handleSubmitHarvestSortingGlobalForm = useCallback(async (): Promise<boolean> => {
    const submission = buildHarvestSortingFormSubmissionPayload({
      seasonFilterId,
      selectedHarvestSummary,
      form,
      t: t.formSubmission,
    });

    if (!submission.payload) {
      setHarvestSortingFormError(submission.error);
      return false;
    }

    setIsSubmittingHarvestSortingForm(true);
    setHarvestSortingFormError('');

    try {
      if (deletedClassificationId !== undefined) {
        await restoreHarvestClassification({ ...submission.payload, deletedClassificationId });
        onRestoreSuccess?.(deletedClassificationId);
      } else {
        await createHarvestClassification(submission.payload);
      }
      await refreshHarvestWorkspaceData();
      setIsHarvestSortingFormOpen(false);
      return true;
    } catch (error) {
      if (error instanceof Error && error.message.trim()) {
        setHarvestSortingFormError(translateHarvestApiError(error.message, t.formSubmission));
      } else {
        setHarvestSortingFormError(t.formSubmission.sortingSaveFailed);
      }
      return false;
    } finally {
      setIsSubmittingHarvestSortingForm(false);
    }
  }, [
    deletedClassificationId,
    form,
    lang,
    onRestoreSuccess,
    refreshHarvestWorkspaceData,
    seasonFilterId,
    selectedHarvestSummary,
    setHarvestSortingFormError,
    setIsHarvestSortingFormOpen,
    setIsSubmittingHarvestSortingForm,
    t.formSubmission,
  ]);

  return {
    handleSubmitHarvestSortingGlobalForm,
  };
}