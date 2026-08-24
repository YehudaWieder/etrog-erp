import type { IsraelClassificationSeasonRecord } from '../../../../services/israel/israelClassificationsApi';
import { HARVEST_GRADE_OPTIONS } from '../../../harvest/utils/harvestPage.utils';
import type {
  MatrixRow,
  PitamGradeCell,
} from '../../../harvest/components/shared/CategoryGradeMatrixTable';

function emptyCell(): PitamGradeCell {
  return { withPitam: 0, withoutPitam: 0, mixed: 0 };
}

function normalizePitamKey(value?: string | null): keyof PitamGradeCell {
  const normalized = (value ?? '').replace(/\s+/g, '_').toUpperCase();
  if (normalized === 'WITH_PITAM') return 'withPitam';
  if (normalized === 'WITHOUT_PITAM') return 'withoutPitam';
  return 'mixed';
}

function sortCategoryNames(
  names: string[],
  orderByName: Map<string, number> | null,
): string[] {
  return [...names].sort((a, b) => {
    if (orderByName) {
      const ai = orderByName.get(a);
      const bi = orderByName.get(b);
      if (ai !== undefined && bi !== undefined) return ai - bi;
      if (ai !== undefined) return -1;
      if (bi !== undefined) return 1;
    }

    return a.localeCompare(b, undefined, {
      sensitivity: 'base',
      numeric: true,
    });
  });
}

function sortGrades(grades: string[], fallback: string): string[] {
  const fixed = [...HARVEST_GRADE_OPTIONS] as string[];
  return [...grades].sort((a, b) => {
    if (a === fallback) return 1;
    if (b === fallback) return -1;
    const ai = fixed.indexOf(a);
    const bi = fixed.indexOf(b);
    if (ai >= 0 && bi >= 0) return ai - bi;
    if (ai >= 0) return -1;
    if (bi >= 0) return 1;
    return a.localeCompare(b, undefined, {
      sensitivity: 'base',
      numeric: true,
    });
  });
}

function addToGradeMap(
  catGradeMap: Map<string, Map<string, PitamGradeCell>>,
  category: string,
  grade: string,
  key: keyof PitamGradeCell,
  qty: number,
) {
  if (!catGradeMap.has(category)) catGradeMap.set(category, new Map());
  const gradeMap = catGradeMap.get(category)!;
  if (!gradeMap.has(grade)) gradeMap.set(grade, emptyCell());
  gradeMap.get(grade)![key] += qty;
}

function mergeGroup(
  catGradeMap: Map<string, Map<string, PitamGradeCell>>,
): Map<string, PitamGradeCell> {
  const merged = new Map<string, PitamGradeCell>();
  for (const gradeMap of catGradeMap.values()) {
    for (const [grade, cell] of gradeMap) {
      if (!merged.has(grade)) merged.set(grade, emptyCell());
      const target = merged.get(grade)!;
      target.withPitam += cell.withPitam;
      target.withoutPitam += cell.withoutPitam;
      target.mixed += cell.mixed;
    }
  }
  return merged;
}

function toCellsRecord(
  gradeMap: Map<string, PitamGradeCell> | undefined,
): Record<string, PitamGradeCell> {
  const record: Record<string, PitamGradeCell> = {};
  if (!gradeMap) return record;
  for (const [grade, cell] of gradeMap) record[grade] = cell;
  return record;
}

export type SortingMatrix = {
  rows: MatrixRow[];
  grades: string[];
  grandTotalRow: { label: string; cells: Record<string, PitamGradeCell> };
};

export function buildSortingMatrix(
  records: IsraelClassificationSeasonRecord[],
  grandTotalLabel: string,
  gradeFallback: string,
  categoryOrder: Map<string, number> | null,
  allCategoryNames: string[],
  fallbackGrades: readonly string[],
): SortingMatrix {
  const catGradeMap = new Map<string, Map<string, PitamGradeCell>>();

  for (const record of records) {
    const qty = record.quantity || 0;
    if (qty <= 0) continue;
    const key = normalizePitamKey(record.pitamStatus);
    const grade = (record.grade || '').trim() || gradeFallback;
    const catName = record.category?.name?.trim() || gradeFallback;
    addToGradeMap(catGradeMap, catName, grade, key, qty);
  }

  const usedGrades = new Set<string>();
  for (const gradeMap of catGradeMap.values()) {
    for (const grade of gradeMap.keys()) usedGrades.add(grade);
  }
  // Always show the full set of grade columns, regardless of whether every grade has data yet,
  // so the table's shape stays consistent instead of columns appearing/disappearing as data comes in.
  const grades = sortGrades(
    [...new Set([...fallbackGrades, ...usedGrades])],
    gradeFallback,
  );

  const catNames = [...new Set([...allCategoryNames, ...catGradeMap.keys()])];
  const sortedCats = sortCategoryNames(catNames, categoryOrder);
  const rows: MatrixRow[] = sortedCats.map((cat) => ({
    key: cat,
    label: cat,
    cells: toCellsRecord(catGradeMap.get(cat)),
  }));

  return {
    rows,
    grades,
    grandTotalRow: {
      label: grandTotalLabel,
      cells: toCellsRecord(mergeGroup(catGradeMap)),
    },
  };
}
