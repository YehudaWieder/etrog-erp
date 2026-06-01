import type {
  CreateHarvestWithClassificationsPayload,
  HarvestBulkClassificationPayload,
} from '../../../services/harvestsApi';
import type { HarvestI18n } from '../i18n';
import type { HarvestFormClassificationDraft } from '../harvestPage.types';

type BuildHarvestFormSubmissionPayloadParams = {
  lang: 'he' | 'en';
  t: HarvestI18n['formSubmission'];
  seasonFilterId: number | null;
  currentUserId?: number;
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
};

type BuildHarvestFormSubmissionPayloadResult =
  | { payload: CreateHarvestWithClassificationsPayload; error?: never }
  | { payload?: never; error: string };

function parseNonNegativeNumber(value: string | number): number | null {
  if (typeof value === 'string' && !value.trim()) {
    return null;
  }

  const normalized = typeof value === 'number' ? value : Number(value.trim());
  if (!Number.isFinite(normalized) || normalized < 0) {
    return null;
  }

  return normalized;
}

export function areHarvestSortingTotalsFilled(params: {
  totalHarvested: string | number;
  totalRejected: string | number;
}) {
  return (
    parseNonNegativeNumber(params.totalHarvested) !== null
    && parseNonNegativeNumber(params.totalRejected) !== null
  );
}

export function getHarvestSortingQuantityState(params: {
  classifications: HarvestFormClassificationDraft[];
  totalHarvested: string | number;
  totalRejected: string | number;
  isPartialClassification: boolean;
}) {
  const parsedTotalHarvested = parseNonNegativeNumber(params.totalHarvested);
  const parsedTotalRejected = parseNonNegativeNumber(params.totalRejected);

  const maxSortingQuantity =
    parsedTotalHarvested !== null && parsedTotalRejected !== null
      ? Math.max(0, parsedTotalHarvested - parsedTotalRejected)
      : null;
  const partialSortingQuantityLimit = maxSortingQuantity !== null ? Math.max(0, maxSortingQuantity - 1) : null;
  const effectiveSortingQuantityLimit = params.isPartialClassification
    ? partialSortingQuantityLimit
    : maxSortingQuantity;

  const currentSortingQuantitySum = params.classifications.reduce((sum, draft) => {
    const quantity = Number(draft.quantity);
    return Number.isFinite(quantity) && quantity > 0 ? sum + quantity : sum;
  }, 0);

  return {
    maxSortingQuantity,
    partialSortingQuantityLimit,
    effectiveSortingQuantityLimit,
    currentSortingQuantitySum,
    reachedSortingQuantityLimit:
      effectiveSortingQuantityLimit !== null && currentSortingQuantitySum >= effectiveSortingQuantityLimit,
  };
}

export function isHarvestClassificationDraftComplete(draft: HarvestFormClassificationDraft): boolean {
  const quantity = Number(draft.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return false;
  }

  if (draft.assignmentType === 'GENERAL' || draft.assignmentType === 'TRADER') {
    const traderCategoryId = Number(draft.traderCategoryId);
    if (!Number.isFinite(traderCategoryId) || traderCategoryId <= 0) {
      return false;
    }

    if (!draft.grade.trim()) {
      return false;
    }
  }

  if (draft.assignmentType === 'TRADER') {
    const traderId = Number(draft.traderId);
    if (!Number.isFinite(traderId) || traderId <= 0) {
      return false;
    }
  }

  if (draft.assignmentType === 'CUSTOMER') {
    const customerId = Number(draft.customerId);
    const customerCategoryId = Number(draft.customerCategoryId);

    if (!Number.isFinite(customerId) || customerId <= 0) {
      return false;
    }

    if (!Number.isFinite(customerCategoryId) || customerCategoryId <= 0) {
      return false;
    }
  }

  return true;
}

export function buildHarvestFormSubmissionPayload({
  lang,
  t,
  seasonFilterId,
  currentUserId,
  form,
}: BuildHarvestFormSubmissionPayloadParams): BuildHarvestFormSubmissionPayloadResult {
  const trimmedHebrewDate = form.dateHebrew.trim();
  const trimmedTotalHarvested = form.totalHarvested.trim();
  const trimmedTotalRejected = form.totalRejected.trim();
  const parsedFieldId = Number(form.fieldId);
  const parsedGregorianDate = new Date(`${form.dateGregorian}T00:00:00.000Z`);
  const totalHarvested = Number(trimmedTotalHarvested);
  const totalRejected = Number(trimmedTotalRejected);

  if (!seasonFilterId) {
    return {
      error: t.seasonRequired,
    };
  }

  if (!Number.isFinite(parsedFieldId) || parsedFieldId <= 0) {
    return {
      error: t.fieldRequired,
    };
  }

  if (!form.dateGregorian || Number.isNaN(parsedGregorianDate.getTime())) {
    return {
      error: t.gregorianDateRequired,
    };
  }

  if (!trimmedHebrewDate) {
    return {
      error: t.hebrewDateRequired,
    };
  }

  if (!trimmedTotalHarvested || !Number.isFinite(totalHarvested) || totalHarvested < 0) {
    return {
      error: t.totalHarvestedRequired,
    };
  }

  if (!trimmedTotalRejected || !Number.isFinite(totalRejected) || totalRejected < 0) {
    return {
      error: t.totalRejectedRequired,
    };
  }

  const { maxSortingQuantity, currentSortingQuantitySum } = getHarvestSortingQuantityState({
    classifications: form.classifications,
    totalHarvested,
    totalRejected,
    isPartialClassification: form.isPartialClassification,
  });

  const parsedClassifications: HarvestBulkClassificationPayload[] = [];

  for (const [index, draft] of form.classifications.entries()) {
    const rowNumber = index + 1;
    const quantity = Number(draft.quantity);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return {
        error: t.sortingRowQuantityRequired(rowNumber),
      };
    }

    const classificationPayload: HarvestBulkClassificationPayload = {
      assignmentType: draft.assignmentType,
      pitamStatus: draft.pitamStatus,
      quantity,
    };

    if (draft.notes.trim()) {
      classificationPayload.notes = draft.notes.trim();
    }

    if (draft.assignmentType === 'GENERAL' || draft.assignmentType === 'TRADER') {
      const traderCategoryId = Number(draft.traderCategoryId);
      if (!Number.isFinite(traderCategoryId) || traderCategoryId <= 0) {
        return {
          error: t.traderCategoryRequired(rowNumber),
        };
      }

      const trimmedGrade = draft.grade.trim();
      if (!trimmedGrade) {
        return {
          error: t.gradeRequired(rowNumber),
        };
      }

      classificationPayload.traderCategoryId = traderCategoryId;
      classificationPayload.grade = trimmedGrade;
    }

    if (draft.assignmentType === 'TRADER') {
      const traderId = Number(draft.traderId);
      if (!Number.isFinite(traderId) || traderId <= 0) {
        return {
          error: t.traderRequired(rowNumber),
        };
      }

      classificationPayload.traderId = traderId;
    }

    if (draft.assignmentType === 'CUSTOMER') {
      const customerId = Number(draft.customerId);
      const customerCategoryId = Number(draft.customerCategoryId);

      if (!Number.isFinite(customerId) || customerId <= 0) {
        return {
          error: t.customerRequired(rowNumber),
        };
      }

      if (!Number.isFinite(customerCategoryId) || customerCategoryId <= 0) {
        return {
          error: t.customerCategoryRequired(rowNumber),
        };
      }

      classificationPayload.customerId = customerId;
      classificationPayload.customerCategoryId = customerCategoryId;
    }

    parsedClassifications.push(classificationPayload);
  }

  const partialSortingQuantityLimit = maxSortingQuantity !== null ? Math.max(0, maxSortingQuantity - 1) : null;

  if (maxSortingQuantity !== null && currentSortingQuantitySum > maxSortingQuantity) {
    return {
      error: t.sortingTotalExceedsAvailable(maxSortingQuantity),
    };
  }

  if (
    !form.isPartialClassification
    && form.classifications.length > 0
    && maxSortingQuantity !== null
    && currentSortingQuantitySum !== maxSortingQuantity
  ) {
    return {
      error: t.sortingTotalMustMatchAvailableForFullSorting(maxSortingQuantity),
    };
  }

  if (
    form.isPartialClassification
    && partialSortingQuantityLimit !== null
    && currentSortingQuantitySum > partialSortingQuantityLimit
  ) {
    return {
      error: t.sortingTotalMustBeAtMostAvailableMinusOneForPartialSorting(partialSortingQuantityLimit),
    };
  }

  const payload: CreateHarvestWithClassificationsPayload = {
    dateGregorian: parsedGregorianDate.toISOString(),
    dateHebrew: trimmedHebrewDate,
    fieldId: parsedFieldId,
    updatedById: currentUserId,
    isPartialClassification: form.isPartialClassification,
    totalHarvested,
    totalRejected,
    classifications: parsedClassifications,
  };

  const ownerHarvested = Number(form.ownerHarvested);
  if (Number.isFinite(ownerHarvested) && ownerHarvested >= 0) {
    payload.ownerHarvested = ownerHarvested;
  }

  const ownerRejected = Number(form.ownerRejected);
  if (Number.isFinite(ownerRejected) && ownerRejected >= 0) {
    payload.ownerRejected = ownerRejected;
  }

  if (form.notes.trim()) {
    payload.notes = form.notes.trim();
  }

  return { payload };
}
