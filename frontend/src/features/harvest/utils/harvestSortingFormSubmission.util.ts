import type { CreateHarvestClassificationPayload } from '../../../services/classificationsApi';
import type { HarvestI18n } from '../i18n';

type BuildHarvestSortingFormSubmissionPayloadParams = {
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
    pitamStatus: 'WITH_PITAM' | 'WITHOUT_PITAM' | 'MIXED';
    quantity: string;
    notes: string;
    isPartialClassification: boolean;
  };
  t: HarvestI18n['formSubmission'];
};

type BuildHarvestSortingFormSubmissionPayloadResult =
  | { payload: CreateHarvestClassificationPayload; error?: never }
  | { payload?: never; error: string };

export function buildHarvestSortingFormSubmissionPayload({
  seasonFilterId,
  selectedHarvestSummary,
  form,
  t,
}: BuildHarvestSortingFormSubmissionPayloadParams): BuildHarvestSortingFormSubmissionPayloadResult {
  if (!seasonFilterId) {
    return { error: t.seasonRequired };
  }

  const harvestId = Number(form.harvestId);
  if (!Number.isFinite(harvestId) || harvestId <= 0) {
    return { error: t.sortingHarvestRequired };
  }

  const quantity = Number(form.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { error: t.sortingQuantityRequired };
  }

  if (!selectedHarvestSummary) {
    return { error: t.sortingHarvestRequired };
  }

  const availableSortingTotal = selectedHarvestSummary.totalHarvested - selectedHarvestSummary.totalRejected;
  const maximumPartialSortingTotal = Math.max(0, availableSortingTotal - 1);
  const expectedFullSortingTotal = availableSortingTotal - selectedHarvestSummary.classifiedTotal;

  const payload: CreateHarvestClassificationPayload = {
    harvestId,
    isPartialClassification: form.isPartialClassification,
    assignmentType: form.assignmentType,
    pitamStatus: form.pitamStatus,
    quantity,
  };

  if (form.notes.trim()) {
    payload.notes = form.notes.trim();
  }

  if (form.assignmentType === 'GENERAL' || form.assignmentType === 'TRADER') {
    const traderCategoryId = Number(form.traderCategoryId);
    if (!Number.isFinite(traderCategoryId) || traderCategoryId <= 0) {
      return { error: t.sortingTraderCategoryRequired };
    }

    const trimmedGrade = form.grade.trim();
    if (!trimmedGrade) {
      return { error: t.sortingGradeRequired };
    }

    payload.traderCategoryId = traderCategoryId;
    payload.grade = trimmedGrade;
  }

  if (form.assignmentType === 'TRADER') {
    const traderId = Number(form.traderId);
    if (!Number.isFinite(traderId) || traderId <= 0) {
      return { error: t.sortingTraderRequired };
    }

    payload.traderId = traderId;
  }

  if (form.assignmentType === 'CUSTOMER') {
    const customerId = Number(form.customerId);
    const customerCategoryId = Number(form.customerCategoryId);

    if (!Number.isFinite(customerId) || customerId <= 0) {
      return { error: t.sortingCustomerRequired };
    }

    if (!Number.isFinite(customerCategoryId) || customerCategoryId <= 0) {
      return { error: t.sortingCustomerCategoryRequired };
    }

    payload.customerId = customerId;
    payload.customerCategoryId = customerCategoryId;
  }

  if (quantity > availableSortingTotal) {
    return {
      error: t.sortingTotalExceedsAvailable(availableSortingTotal),
    };
  }

  if (!form.isPartialClassification && quantity !== expectedFullSortingTotal) {
    return {
      error: t.sortingTotalWithClassifiedMustMatchAvailableForFullSorting(availableSortingTotal),
    };
  }

  if (form.isPartialClassification && quantity > maximumPartialSortingTotal) {
    return {
      error: t.sortingTotalMustBeAtMostAvailableMinusOneForPartialSorting(maximumPartialSortingTotal),
    };
  }

  return { payload };
}