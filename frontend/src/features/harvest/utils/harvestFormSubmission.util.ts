import type {
  CreateHarvestWithClassificationsPayload,
  HarvestBulkClassificationPayload,
} from '../../../services/harvestsApi';
import type { HarvestI18n } from '../i18n';
import type { HarvestFormClassificationDraft } from '../harvestPage.types';
import { getFilledMatrixEntries, getMatrixTotalQuantity } from './harvestClassificationMatrix.util';

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
    uncalculatedRejected: string;
    remainsInItalyGradeH: boolean;
    remainsInItalyGradeV: boolean;
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

  const currentSortingQuantitySum = params.classifications.reduce(
    (sum, draft) => sum + getMatrixTotalQuantity(draft.quantities),
    0,
  );

  return {
    maxSortingQuantity,
    partialSortingQuantityLimit,
    effectiveSortingQuantityLimit,
    currentSortingQuantitySum,
    reachedSortingQuantityLimit:
      effectiveSortingQuantityLimit !== null && currentSortingQuantitySum >= effectiveSortingQuantityLimit,
  };
}

export type ClassificationComboIdentity = {
  assignmentType: string;
  traderName?: string | null;
  customerName?: string | null;
  categoryName?: string | null;
  // Customer categories can share a display name across different grades (e.g. "מהודר" grade א vs. grade ב),
  // so the combo key must include the grade to avoid conflating them as the same category.
  categoryGrade?: string | null;
};

export function buildClassificationComboKey({
  assignmentType,
  traderName,
  customerName,
  categoryName,
  categoryGrade,
}: ClassificationComboIdentity): string | null {
  if (!categoryName) {
    return null;
  }

  if (assignmentType === 'TRADER') {
    return traderName ? `TRADER:${traderName}:${categoryName}` : null;
  }

  if (assignmentType === 'CUSTOMER') {
    return customerName ? `CUSTOMER:${customerName}:${categoryName}:${categoryGrade ?? ''}` : null;
  }

  return `GENERAL:${categoryName}`;
}

export function isHarvestClassificationDraftComplete(draft: HarvestFormClassificationDraft): boolean {
  if (getFilledMatrixEntries(draft.quantities).length === 0) {
    return false;
  }

  if (draft.assignmentType === 'GENERAL' || draft.assignmentType === 'TRADER') {
    const traderCategoryId = Number(draft.traderCategoryId);
    if (!Number.isFinite(traderCategoryId) || traderCategoryId <= 0) {
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

type ParseHarvestClassificationRowsResult =
  | { ok: true; items: HarvestBulkClassificationPayload[] }
  | { ok: false; error: string };

export function parseHarvestClassificationRows(
  classifications: HarvestFormClassificationDraft[],
  t: HarvestI18n['formSubmission'],
): ParseHarvestClassificationRowsResult {
  const items: HarvestBulkClassificationPayload[] = [];

  for (const [index, draft] of classifications.entries()) {
    const rowNumber = index + 1;
    const filledEntries = getFilledMatrixEntries(draft.quantities);

    // A row can exist purely to surface an already-saved combo's matrix for inline editing (via the
    // pencil icon on existing cells) without adding any new quantity. Such a row has nothing to submit
    // here, so skip it instead of blocking the form with a "quantity required" error.
    if (filledEntries.length === 0) {
      continue;
    }

    if (draft.assignmentType === 'GENERAL' || draft.assignmentType === 'TRADER') {
      const traderCategoryId = Number(draft.traderCategoryId);
      if (!Number.isFinite(traderCategoryId) || traderCategoryId <= 0) {
        return { ok: false, error: t.traderCategoryRequired(rowNumber) };
      }
    }

    if (draft.assignmentType === 'TRADER') {
      const traderId = Number(draft.traderId);
      if (!Number.isFinite(traderId) || traderId <= 0) {
        return { ok: false, error: t.traderRequired(rowNumber) };
      }
    }

    if (draft.assignmentType === 'CUSTOMER') {
      const customerId = Number(draft.customerId);
      const customerCategoryId = Number(draft.customerCategoryId);

      if (!Number.isFinite(customerId) || customerId <= 0) {
        return { ok: false, error: t.customerRequired(rowNumber) };
      }

      if (!Number.isFinite(customerCategoryId) || customerCategoryId <= 0) {
        return { ok: false, error: t.customerCategoryRequired(rowNumber) };
      }
    }

    for (const entry of filledEntries) {
      const classificationPayload: HarvestBulkClassificationPayload = {
        assignmentType: draft.assignmentType,
        pitamStatus: entry.pitamStatus,
        quantity: entry.quantity,
      };

      if (draft.notes.trim()) {
        classificationPayload.notes = draft.notes.trim();
      }

      if (draft.assignmentType === 'GENERAL' || draft.assignmentType === 'TRADER') {
        classificationPayload.traderCategoryId = Number(draft.traderCategoryId);
        classificationPayload.grade = entry.grade ?? undefined;
      }

      if (draft.assignmentType === 'TRADER') {
        classificationPayload.traderId = Number(draft.traderId);
      }

      if (draft.assignmentType === 'CUSTOMER') {
        classificationPayload.customerId = Number(draft.customerId);
        classificationPayload.customerCategoryId = Number(draft.customerCategoryId);
      }

      items.push(classificationPayload);
    }
  }

  return { ok: true, items };
}

type BuildExistingHarvestClassificationsPayloadParams = {
  t: HarvestI18n['formSubmission'];
  harvestId: string;
  isPartialClassification: boolean;
  selectedHarvestSummary: {
    totalHarvested: number;
    totalRejected: number;
    classifiedTotal: number;
  } | null;
  classifications: HarvestFormClassificationDraft[];
};

export type ExistingHarvestClassificationPayload = HarvestBulkClassificationPayload & {
  harvestId: number;
  isPartialClassification: boolean;
};

type BuildExistingHarvestClassificationsPayloadResult =
  | { payloads: ExistingHarvestClassificationPayload[]; error?: never }
  | { payloads?: never; error: string };

export function buildExistingHarvestClassificationsPayload({
  t,
  harvestId,
  isPartialClassification,
  selectedHarvestSummary,
  classifications,
}: BuildExistingHarvestClassificationsPayloadParams): BuildExistingHarvestClassificationsPayloadResult {
  const parsedHarvestId = Number(harvestId);
  if (!Number.isFinite(parsedHarvestId) || parsedHarvestId <= 0) {
    return { error: t.sortingHarvestRequired };
  }

  if (!selectedHarvestSummary) {
    return { error: t.sortingHarvestRequired };
  }

  const parsed = parseHarvestClassificationRows(classifications, t);
  if (!parsed.ok) {
    return { error: parsed.error };
  }

  // Nothing new is being classified in this submission, so there's nothing here to validate against
  // capacity/full-vs-partial matching — that constraint is about what a batch of *new* rows must add
  // up to, not a standing requirement whenever this function happens to be called (e.g. the harvest
  // edit dialog calls this on every save even when the user only changed totals and touched no rows).
  if (parsed.items.length === 0) {
    return { payloads: [] };
  }

  const availableSortingTotal = selectedHarvestSummary.totalHarvested - selectedHarvestSummary.totalRejected;
  // Remaining room for new rows: the net harvested total minus what's already classified on this harvest
  // (including any pending edits to existing rows the caller has folded into classifiedTotal).
  const remainingSortingCapacity = Math.max(0, availableSortingTotal - selectedHarvestSummary.classifiedTotal);
  const maximumPartialSortingTotal = Math.max(0, remainingSortingCapacity - 1);
  const expectedFullSortingTotal = remainingSortingCapacity;
  const totalQuantity = parsed.items.reduce((sum, item) => sum + item.quantity, 0);

  if (totalQuantity > remainingSortingCapacity) {
    return {
      error: t.sortingTotalExceedsAvailable(
        remainingSortingCapacity,
        selectedHarvestSummary.classifiedTotal,
        availableSortingTotal,
      ),
    };
  }

  if (!isPartialClassification && totalQuantity !== expectedFullSortingTotal) {
    return { error: t.sortingTotalWithClassifiedMustMatchAvailableForFullSorting(availableSortingTotal) };
  }

  if (isPartialClassification && totalQuantity > maximumPartialSortingTotal) {
    return {
      error: t.sortingTotalMustBeAtMostAvailableMinusOneForPartialSorting(
        maximumPartialSortingTotal,
        selectedHarvestSummary.classifiedTotal,
        availableSortingTotal,
      ),
    };
  }

  return {
    payloads: parsed.items.map((item) => ({ ...item, harvestId: parsedHarvestId, isPartialClassification })),
  };
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

  const uncalculatedRejected = parseNonNegativeNumber(form.uncalculatedRejected) ?? 0;
  if (uncalculatedRejected > totalRejected) {
    return {
      error: t.uncalculatedRejectedExceedsTotal(uncalculatedRejected, totalRejected),
    };
  }

  const { maxSortingQuantity, currentSortingQuantitySum } = getHarvestSortingQuantityState({
    classifications: form.classifications,
    totalHarvested,
    totalRejected,
    isPartialClassification: form.isPartialClassification,
  });

  const parsedRows = parseHarvestClassificationRows(form.classifications, t);
  if (!parsedRows.ok) {
    return { error: parsedRows.error };
  }

  const parsedClassifications = parsedRows.items;

  const partialSortingQuantityLimit = maxSortingQuantity !== null ? Math.max(0, maxSortingQuantity - 1) : null;

  if (maxSortingQuantity !== null && currentSortingQuantitySum > maxSortingQuantity) {
    return {
      error: t.sortingTotalExceedsAvailable(maxSortingQuantity, 0, maxSortingQuantity),
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
    && maxSortingQuantity !== null
    && currentSortingQuantitySum > partialSortingQuantityLimit
  ) {
    return {
      error: t.sortingTotalMustBeAtMostAvailableMinusOneForPartialSorting(partialSortingQuantityLimit, 0, maxSortingQuantity),
    };
  }

  const payload: CreateHarvestWithClassificationsPayload = {
    dateGregorian: parsedGregorianDate.toISOString(),
    dateHebrew: trimmedHebrewDate,
    fieldId: parsedFieldId,
    updatedById: currentUserId,
    isPartialClassification: form.isPartialClassification,
    uncalculatedRejected,
    remainsInItalyGradeH: form.remainsInItalyGradeH,
    remainsInItalyGradeV: form.remainsInItalyGradeV,
    totalHarvested,
    totalRejected,
    classifications: parsedClassifications,
  };

  const ownerHarvestedStr = form.ownerHarvested.trim();
  if (ownerHarvestedStr) {
    const ownerHarvested = Number(ownerHarvestedStr);
    if (Number.isFinite(ownerHarvested) && ownerHarvested >= 0) {
      payload.ownerHarvested = ownerHarvested;
    }
  }

  const ownerRejectedStr = form.ownerRejected.trim();
  if (ownerRejectedStr) {
    const ownerRejected = Number(ownerRejectedStr);
    if (Number.isFinite(ownerRejected) && ownerRejected >= 0) {
      payload.ownerRejected = ownerRejected;
    }
  }

  if (form.notes.trim()) {
    payload.notes = form.notes.trim();
  }

  return { payload };
}
