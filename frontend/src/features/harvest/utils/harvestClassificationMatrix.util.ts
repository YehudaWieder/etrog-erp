import type { TraderCategoryWithShares } from '../../../services/traderCategoriesApi';

export const PITAM_ROW_KEYS = ['WITH_PITAM', 'WITHOUT_PITAM', 'MIXED'] as const;
export type PitamRowKey = (typeof PITAM_ROW_KEYS)[number];

// Used as the single grade "column" key for CUSTOMER rows, whose grade is implied by the customer category.
export const SINGLE_GRADE_COLUMN_KEY = '__single__';

// Full set of grades, always displayed as columns for GENERAL/TRADER rows (disabled until a category enables them).
export const ALL_GRADE_COLUMNS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ללא'];

export type GradeQuantityMatrix = Record<PitamRowKey, Record<string, string>>;

export function createEmptyGradeQuantityMatrix(): GradeQuantityMatrix {
  return { WITH_PITAM: {}, WITHOUT_PITAM: {}, MIXED: {} };
}

// Columns to render for the matrix table, regardless of whether a category has been selected yet.
export function getDisplayGradeColumns(assignmentType: 'GENERAL' | 'TRADER' | 'CUSTOMER'): string[] {
  return assignmentType === 'CUSTOMER' ? [SINGLE_GRADE_COLUMN_KEY] : [...ALL_GRADE_COLUMNS];
}

// Columns whose inputs should actually be editable, based on the selected category.
export function getEnabledGradeColumns(
  assignmentType: 'GENERAL' | 'TRADER' | 'CUSTOMER',
  traderCategory: TraderCategoryWithShares | null | undefined,
  hasCustomerCategorySelected: boolean,
): string[] {
  if (assignmentType === 'CUSTOMER') {
    return hasCustomerCategorySelected ? [SINGLE_GRADE_COLUMN_KEY] : [];
  }

  return traderCategory?.supportedGrades ?? [];
}

export function setMatrixQuantity(
  matrix: GradeQuantityMatrix,
  pitamKey: PitamRowKey,
  gradeKey: string,
  value: string,
): GradeQuantityMatrix {
  return {
    ...matrix,
    [pitamKey]: {
      ...matrix[pitamKey],
      [gradeKey]: value,
    },
  };
}

export type FilledMatrixEntry = {
  pitamStatus: PitamRowKey;
  grade: string | null;
  quantity: number;
};

export function getFilledMatrixEntries(matrix: GradeQuantityMatrix): FilledMatrixEntry[] {
  const entries: FilledMatrixEntry[] = [];

  for (const pitamKey of PITAM_ROW_KEYS) {
    for (const [gradeKey, rawValue] of Object.entries(matrix[pitamKey] ?? {})) {
      if (!rawValue?.trim()) {
        continue;
      }

      const quantity = Number(rawValue);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        continue;
      }

      entries.push({
        pitamStatus: pitamKey,
        grade: gradeKey === SINGLE_GRADE_COLUMN_KEY ? null : gradeKey,
        quantity,
      });
    }
  }

  return entries;
}

export function getMatrixTotalQuantity(matrix: GradeQuantityMatrix): number {
  return getFilledMatrixEntries(matrix).reduce((sum, entry) => sum + entry.quantity, 0);
}

export function isMatrixEmpty(matrix: GradeQuantityMatrix): boolean {
  return getFilledMatrixEntries(matrix).length === 0;
}
