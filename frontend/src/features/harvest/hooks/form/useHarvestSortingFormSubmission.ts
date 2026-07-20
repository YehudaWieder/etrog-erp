import { useCallback, useMemo } from 'react';
import {
  restoreHarvestClassification,
  saveHarvestSortingBatch,
  getClassificationDailySummaryBySeason,
  getClassificationsBySeason,
  type ClassificationListRecord,
} from '../../../../services/classificationsApi';
import { getHarvestFieldTotalsBySeason, getHarvestsBySeason, type HarvestRecord } from '../../../../services/harvestsApi';
import type { ClassificationDailySummaryCategory, ClassificationDailySummaryRow, ClassificationRecord } from '../../../../services/classificationsApi';
import type { TraderCategoryWithShares } from '../../../../services/traderCategoriesApi';
import type { HarvestFieldReportRow, HarvestFormClassificationDraft } from '../../harvestPage.types';
import type { HarvestI18n } from '../../i18n';
import { buildHarvestSortingFormSubmissionPayload } from '../../utils/harvestSortingFormSubmission.util';
import { buildExistingHarvestClassificationsPayload } from '../../utils/harvestFormSubmission.util';
import { translateHarvestApiError } from '../../utils/translateHarvestApiError';
import { sortSortingDailyCategories } from '../../utils/harvestPage.utils';

type UseHarvestSortingFormSubmissionParams = {
  lang: 'he' | 'en';
  t: HarvestI18n;
  seasonFilterId: number | null;
  selectedHarvestSummary: {
    totalHarvested: number;
    totalRejected: number;
    classifiedTotal: number;
    ownerHarvested?: number;
    ownerRejected?: number;
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
  harvestFormClassifications: HarvestFormClassificationDraft[];
  existingHarvestClassifications: ClassificationRecord[];
  pendingExistingClassificationEdits: Record<number, string>;
  setPendingExistingClassificationEdits: (value: Record<number, string>) => void;
  additionalRejectedQuantity?: number;
  additionalOwnerRejectedQuantity?: number;
  hasTotalHarvestedEdit?: boolean;
  hasOwnerHarvestedEdit?: boolean;
  setIsSubmittingHarvestSortingForm: (value: boolean) => void;
  setHarvestSortingFormError: (value: string) => void;
  setIsHarvestSortingFormOpen: (value: boolean) => void;
  setHarvestRows: (rows: HarvestRecord[]) => void;
  setFieldReportRows: (rows: HarvestFieldReportRow[]) => void;
  setSortingDailyRows: (rows: ClassificationDailySummaryRow[]) => void;
  setSortingDailyCategories: (rows: ClassificationDailySummaryCategory[]) => void;
  setSortingDailyLoadError: (value: string) => void;
  setSortingListRows?: (rows: ClassificationListRecord[]) => void;
  deletedClassificationId?: number;
  onRestoreSuccess?: (restoredId: number) => void;
  traderCategories?: TraderCategoryWithShares[];
};

export function useHarvestSortingFormSubmission({
  lang,
  t,
  seasonFilterId,
  selectedHarvestSummary,
  form,
  harvestFormClassifications,
  existingHarvestClassifications,
  pendingExistingClassificationEdits,
  setPendingExistingClassificationEdits,
  additionalRejectedQuantity = 0,
  additionalOwnerRejectedQuantity = 0,
  hasTotalHarvestedEdit = false,
  hasOwnerHarvestedEdit = false,
  setIsSubmittingHarvestSortingForm,
  setHarvestSortingFormError,
  setIsHarvestSortingFormOpen,
  setHarvestRows,
  setFieldReportRows,
  setSortingDailyRows,
  setSortingDailyCategories,
  setSortingDailyLoadError,
  setSortingListRows,
  deletedClassificationId,
  onRestoreSuccess,
  traderCategories = [],
}: UseHarvestSortingFormSubmissionParams) {
  const traderCategoryOrder = useMemo(() => {
    const map = new Map<string, number>();
    for (const category of traderCategories) {
      map.set(category.name, category.orderIndex);
    }
    return map;
  }, [traderCategories]);
  const refreshHarvestWorkspaceData = useCallback(async () => {
    if (!seasonFilterId) {
      return;
    }

    const [records, fieldTotals, sortingSummary, sortingListRows] = await Promise.all([
      getHarvestsBySeason(seasonFilterId),
      getHarvestFieldTotalsBySeason(seasonFilterId),
      getClassificationDailySummaryBySeason(seasonFilterId),
      setSortingListRows ? getClassificationsBySeason(seasonFilterId) : Promise.resolve(null),
    ]);

    setHarvestRows(records);
    if (sortingListRows) {
      setSortingListRows?.(sortingListRows);
    }
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
    setSortingDailyCategories(sortSortingDailyCategories(sortingSummary.categories, traderCategoryOrder));
    setSortingDailyLoadError('');
  }, [
    seasonFilterId,
    setFieldReportRows,
    setHarvestRows,
    setSortingDailyCategories,
    setSortingDailyLoadError,
    setSortingDailyRows,
    setSortingListRows,
    traderCategoryOrder,
  ]);

  const handleSubmitHarvestSortingGlobalForm = useCallback(async (): Promise<boolean> => {
    setIsSubmittingHarvestSortingForm(true);
    setHarvestSortingFormError('');

    try {
      if (deletedClassificationId !== undefined) {
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

        await restoreHarvestClassification({ ...submission.payload, deletedClassificationId });
        onRestoreSuccess?.(deletedClassificationId);
      } else {
        const pendingEditEntries = Object.entries(pendingExistingClassificationEdits);
        const classificationsById = new Map(existingHarvestClassifications.map((record) => [record.id, record]));

        const edits: { classificationId: number; quantity: number }[] = [];
        let classifiedTotalAdjustment = 0;
        for (const [classificationIdStr, rawValue] of pendingEditEntries) {
          const classificationId = Number(classificationIdStr);
          const quantity = Number(rawValue);
          if (!Number.isFinite(quantity) || quantity < 0) {
            setHarvestSortingFormError(t.bulkForm.existingClassificationCellInvalidQuantityError);
            return false;
          }
          const oldQuantity = classificationsById.get(classificationId)?.quantity ?? 0;
          classifiedTotalAdjustment += quantity - oldQuantity;
          edits.push({ classificationId, quantity });
        }

        const submission = buildExistingHarvestClassificationsPayload({
          t: t.formSubmission,
          harvestId: form.harvestId,
          isPartialClassification: form.isPartialClassification,
          selectedHarvestSummary: selectedHarvestSummary
            ? { ...selectedHarvestSummary, classifiedTotal: selectedHarvestSummary.classifiedTotal + classifiedTotalAdjustment }
            : null,
          classifications: harvestFormClassifications,
        });

        if (!submission.payloads) {
          setHarvestSortingFormError(submission.error);
          return false;
        }

        const parsedHarvestId = Number(form.harvestId);

        const harvestUpdate = selectedHarvestSummary
          ? {
              ...(hasTotalHarvestedEdit ? { totalHarvested: selectedHarvestSummary.totalHarvested } : {}),
              ...(additionalRejectedQuantity > 0 ? { totalRejected: selectedHarvestSummary.totalRejected } : {}),
              ...(hasOwnerHarvestedEdit && selectedHarvestSummary.ownerHarvested !== undefined
                ? { ownerHarvested: selectedHarvestSummary.ownerHarvested }
                : {}),
              ...(additionalOwnerRejectedQuantity > 0 && selectedHarvestSummary.ownerRejected !== undefined
                ? { ownerRejected: selectedHarvestSummary.ownerRejected }
                : {}),
            }
          : {};
        const hasHarvestUpdate = Object.keys(harvestUpdate).length > 0;

        // Edits to existing classifications, creation of new ones, and any inline harvest field
        // updates (direct edits to harvested/owner-harvested, added rejected/owner-rejected quantities)
        // are all sent together so the backend can apply everything inside a single transaction —
        // either everything lands, or nothing does.
        try {
          await saveHarvestSortingBatch({
            harvestId: parsedHarvestId,
            isPartialClassification: form.isPartialClassification,
            edits,
            creates: submission.payloads.map(({ harvestId: _harvestId, isPartialClassification: _isPartial, ...item }) => item),
            harvestUpdate: hasHarvestUpdate ? harvestUpdate : undefined,
          });
        } catch (error) {
          if (error instanceof Error && error.message.trim()) {
            setHarvestSortingFormError(translateHarvestApiError(error.message, t.formSubmission));
          } else {
            setHarvestSortingFormError(t.bulkForm.existingClassificationCellSaveError);
          }
          return false;
        }

        setPendingExistingClassificationEdits({});
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
    additionalRejectedQuantity,
    additionalOwnerRejectedQuantity,
    hasTotalHarvestedEdit,
    hasOwnerHarvestedEdit,
    deletedClassificationId,
    existingHarvestClassifications,
    form,
    harvestFormClassifications,
    lang,
    onRestoreSuccess,
    pendingExistingClassificationEdits,
    refreshHarvestWorkspaceData,
    seasonFilterId,
    selectedHarvestSummary,
    setHarvestSortingFormError,
    setIsHarvestSortingFormOpen,
    setIsSubmittingHarvestSortingForm,
    setPendingExistingClassificationEdits,
    t.bulkForm,
    t.formSubmission,
  ]);

  return {
    handleSubmitHarvestSortingGlobalForm,
  };
}