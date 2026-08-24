import type { IsraelSortCategory } from '../../../../services/israel/israelSortCategoriesApi';
import type { IsraelClassificationRecord } from '../../../../services/israel/israelClassificationsApi';
import {
  createEmptyGradeQuantityMatrix,
  getMatrixTotalQuantity,
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

// Grades whose quantity inputs should actually be editable for the selected sort category.
// The matrix itself always displays every possible grade column (see ALL_GRADE_COLUMNS), disabled
// until a category enables them, so users can see the full shape of the form immediately.
export function getIsraelCategoryEnabledGrades(
  categories: IsraelSortCategory[],
  categoryId: string,
): string[] {
  const parsedCategoryId = Number(categoryId);
  const category = categories.find((c) => c.id === parsedCategoryId);
  return category?.supportedGrades ?? [];
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

// A scaffold row auto-populated for an already-saved combo (see
// buildInitialIsraelClassificationDraftsFromExisting) represents data that's already saved, so leaving
// it untouched should never block adding a new row — the user may just want to add another sorting
// without editing any existing one.
export function isIsraelDraftEffectivelyComplete(
  draft: IsraelHarvestFormClassificationDraft,
): boolean {
  return Boolean(draft.isExistingScaffold) || isIsraelClassificationDraftComplete(draft);
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
    // Scaffold rows represent existing DB classifications and only occupy specific matrix cells
    // (grade + pitam), not the whole category slot. Excluding them here lets users add a new draft
    // row for the same category to enter a different grade alongside an existing one.
    if (draft.isExistingScaffold) {
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

// Groups a harvest's existing classification records into one scaffold draft per (fieldCategory,
// category) combo, so the edit dialog can show them as editable rows right away instead of requiring
// the user to manually recreate a matching row first. Quantities are left empty on purpose:
// IsraelHarvestClassificationRowsSection renders the actual saved quantities for these combos as
// locked/existing cells (with an add/subtract popup) once a draft row with a matching identity is present.
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
        isExistingScaffold: true,
        existingClassificationIds: [],
      };
      draftsByComboKey.set(comboKey, draft);
    } else if (!draft.notes && record.notes) {
      draft.notes = record.notes;
    }

    draft.existingClassificationIds = [
      ...(draft.existingClassificationIds ?? []),
      record.id,
    ];
  }

  return [...draftsByComboKey.values()];
}

// Cell-level quantities (fieldCategory + category + pitam status + grade) for classifications already
// saved on this harvest. Existing records only block the exact matrix cell they occupy, not the whole
// category, since the same category can still be sorted again under a different grade/pitam status.
export function buildIsraelExistingCellRecords(
  existingClassifications: IsraelClassificationRecord[],
): Map<string, { id: number; quantity: number }> {
  const records = new Map<string, { id: number; quantity: number }>();
  for (const record of existingClassifications) {
    const key = `${record.fieldCategoryId}:${record.categoryId}:${record.pitamStatus}:${record.grade}`;
    records.set(key, { id: record.id, quantity: record.quantity });
  }
  return records;
}
