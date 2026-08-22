import type { IsraelSortCategory } from '../../../../services/israel/israelSortCategoriesApi';
import type { IsraelClassificationRecord } from '../../../../services/israel/israelClassificationsApi';
import {
  createEmptyGradeQuantityMatrix,
  getMatrixTotalQuantity,
  setMatrixQuantity,
} from '../../../harvest/utils/harvestClassificationMatrix.util';
import type { PitamRowKey } from '../../../harvest/utils/harvestClassificationMatrix.util';
import type { IsraelHarvestFormClassificationDraft } from '../israelHarvestPage.types';

export function createEmptyIsraelHarvestClassificationDraft(
  id: string,
): IsraelHarvestFormClassificationDraft {
  return {
    id,
    fieldCategoryId: '',
    categoryId: '',
    notes: '',
    quantities: createEmptyGradeQuantityMatrix(),
  };
}

export function getIsraelCategoryGradeEntries(
  categories: IsraelSortCategory[],
  categoryId: string,
): Array<[string, string]> {
  const parsedCategoryId = Number(categoryId);
  const category = categories.find((c) => c.id === parsedCategoryId);
  return category
    ? category.supportedGrades.map((grade) => [grade, grade])
    : [];
}

export function isIsraelClassificationDraftComplete(
  draft: IsraelHarvestFormClassificationDraft,
): boolean {
  return (
    Boolean(draft.fieldCategoryId) &&
    Boolean(draft.categoryId) &&
    getMatrixTotalQuantity(draft.quantities) > 0
  );
}

function getIsraelDraftComboKey(
  draft: IsraelHarvestFormClassificationDraft,
): string | null {
  return draft.fieldCategoryId && draft.categoryId
    ? `${draft.fieldCategoryId}:${draft.categoryId}`
    : null;
}

export function getUsedIsraelCategoryCombos(
  drafts: IsraelHarvestFormClassificationDraft[],
  excludeDraftId: string | null,
): Set<string> {
  const keys = new Set<string>();
  for (const draft of drafts) {
    if (draft.id === excludeDraftId) {
      continue;
    }
    const key = getIsraelDraftComboKey(draft);
    if (key) {
      keys.add(key);
    }
  }
  return keys;
}

export function isIsraelDraftComboDuplicate(
  draft: IsraelHarvestFormClassificationDraft,
  drafts: IsraelHarvestFormClassificationDraft[],
): boolean {
  const key = getIsraelDraftComboKey(draft);
  if (!key) {
    return false;
  }
  return getUsedIsraelCategoryCombos(drafts, draft.id).has(key);
}

export function getIsraelHarvestDraftsTotalQuantity(
  drafts: IsraelHarvestFormClassificationDraft[],
): number {
  return drafts.reduce(
    (sum, draft) => sum + getMatrixTotalQuantity(draft.quantities),
    0,
  );
}

// Groups a harvest's existing classification records into one draft per (fieldCategory, category)
// combo, so the edit dialog can show them pre-filled instead of starting from an empty form.
export function buildInitialIsraelClassificationDraftsFromExisting(
  existingClassifications: IsraelClassificationRecord[],
): IsraelHarvestFormClassificationDraft[] {
  const draftsByComboKey = new Map<string, IsraelHarvestFormClassificationDraft>();

  for (const record of existingClassifications) {
    const comboKey = `${record.fieldCategoryId}:${record.categoryId}`;
    let draft = draftsByComboKey.get(comboKey);
    if (!draft) {
      draft = {
        id: `existing-${comboKey}`,
        fieldCategoryId: String(record.fieldCategoryId),
        categoryId: String(record.categoryId),
        notes: record.notes ?? '',
        quantities: createEmptyGradeQuantityMatrix(),
      };
      draftsByComboKey.set(comboKey, draft);
    } else if (!draft.notes && record.notes) {
      draft.notes = record.notes;
    }

    draft.quantities = setMatrixQuantity(
      draft.quantities,
      record.pitamStatus as PitamRowKey,
      record.grade,
      String(record.quantity),
    );
  }

  return [...draftsByComboKey.values()];
}
