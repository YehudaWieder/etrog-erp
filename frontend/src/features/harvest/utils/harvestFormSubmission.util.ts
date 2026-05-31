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

export function buildHarvestFormSubmissionPayload({
  lang,
  t,
  seasonFilterId,
  currentUserId,
  form,
}: BuildHarvestFormSubmissionPayloadParams): BuildHarvestFormSubmissionPayloadResult {
  const trimmedHebrewDate = form.dateHebrew.trim();
  const parsedFieldId = Number(form.fieldId);
  const parsedGregorianDate = new Date(`${form.dateGregorian}T00:00:00.000Z`);

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

  if (form.classifications.length < 1) {
    return {
      error: t.sortingRowRequired,
    };
  }

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

      classificationPayload.traderCategoryId = traderCategoryId;

      if (draft.grade.trim()) {
        classificationPayload.grade = draft.grade.trim();
      }
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

  const payload: CreateHarvestWithClassificationsPayload = {
    dateGregorian: parsedGregorianDate.toISOString(),
    dateHebrew: trimmedHebrewDate,
    fieldId: parsedFieldId,
    updatedById: currentUserId,
    isPartialClassification: form.isPartialClassification,
    classifications: parsedClassifications,
  };

  const totalHarvested = Number(form.totalHarvested);
  if (Number.isFinite(totalHarvested) && totalHarvested >= 0) {
    payload.totalHarvested = totalHarvested;
  }

  const totalRejected = Number(form.totalRejected);
  if (Number.isFinite(totalRejected) && totalRejected >= 0) {
    payload.totalRejected = totalRejected;
  }

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
