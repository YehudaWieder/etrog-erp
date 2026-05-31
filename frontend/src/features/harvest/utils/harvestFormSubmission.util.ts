import type {
  CreateHarvestWithClassificationsPayload,
  HarvestBulkClassificationPayload,
} from '../../../services/harvestsApi';
import type { HarvestFormClassificationDraft } from '../harvestPage.types';

type BuildHarvestFormSubmissionPayloadParams = {
  lang: 'he' | 'en';
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
  seasonFilterId,
  currentUserId,
  form,
}: BuildHarvestFormSubmissionPayloadParams): BuildHarvestFormSubmissionPayloadResult {
  const trimmedHebrewDate = form.dateHebrew.trim();
  const parsedFieldId = Number(form.fieldId);
  const parsedGregorianDate = new Date(`${form.dateGregorian}T00:00:00.000Z`);

  if (!seasonFilterId) {
    return {
      error: lang === 'he' ? 'יש לבחור עונה לפני פתיחת טופס הקטיף.' : 'Select a season before creating a harvest.',
    };
  }

  if (!Number.isFinite(parsedFieldId) || parsedFieldId <= 0) {
    return {
      error: lang === 'he' ? 'יש לבחור שדה.' : 'Please select a field.',
    };
  }

  if (!form.dateGregorian || Number.isNaN(parsedGregorianDate.getTime())) {
    return {
      error: lang === 'he' ? 'יש להזין תאריך לועזי תקין.' : 'Please provide a valid Gregorian date.',
    };
  }

  if (!trimmedHebrewDate) {
    return {
      error: lang === 'he' ? 'יש להזין תאריך עברי.' : 'Please provide the Hebrew date.',
    };
  }

  if (form.classifications.length < 1) {
    return {
      error: lang === 'he' ? 'יש להוסיף לפחות שורת מיון אחת.' : 'At least one sorting row is required.',
    };
  }

  const parsedClassifications: HarvestBulkClassificationPayload[] = [];

  for (const [index, draft] of form.classifications.entries()) {
    const rowNumber = index + 1;
    const quantity = Number(draft.quantity);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return {
        error:
          lang === 'he'
            ? `בשורת מיון ${rowNumber} חייבת להיות כמות גדולה מאפס.`
            : `Sorting row ${rowNumber} must include a quantity greater than zero.`,
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
          error:
            lang === 'he'
              ? `בשורת מיון ${rowNumber} יש לבחור קטגוריית סוחר.`
              : `Sorting row ${rowNumber} must include a trader category.`,
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
          error:
            lang === 'he'
              ? `בשורת מיון ${rowNumber} יש לבחור סוחר.`
              : `Sorting row ${rowNumber} must include a trader.`,
        };
      }

      classificationPayload.traderId = traderId;
    }

    if (draft.assignmentType === 'CUSTOMER') {
      const customerId = Number(draft.customerId);
      const customerCategoryId = Number(draft.customerCategoryId);

      if (!Number.isFinite(customerId) || customerId <= 0) {
        return {
          error:
            lang === 'he'
              ? `בשורת מיון ${rowNumber} יש לבחור לקוח.`
              : `Sorting row ${rowNumber} must include a customer.`,
        };
      }

      if (!Number.isFinite(customerCategoryId) || customerCategoryId <= 0) {
        return {
          error:
            lang === 'he'
              ? `בשורת מיון ${rowNumber} יש לבחור קטגוריית לקוח.`
              : `Sorting row ${rowNumber} must include a customer category.`,
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
