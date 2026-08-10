import type {
  MatrixRow,
  PitamGradeCell,
} from '../components/shared/CategoryGradeMatrixTable';
import { HARVEST_GRADE_OPTIONS } from './harvestPage.utils';

export type SortingMatrix = {
  rows: MatrixRow[];
  grades: string[];
  grandTotalRow: { label: string; cells: Record<string, PitamGradeCell> };
};

export function emptyPitamCell(): PitamGradeCell {
  return { withPitam: 0, withoutPitam: 0, mixed: 0 };
}

export function normalizePitamKey(value?: string | null): keyof PitamGradeCell {
  const normalized = (value ?? '').replace(/\s+/g, '_').toUpperCase();
  if (normalized === 'WITH_PITAM') return 'withPitam';
  if (normalized === 'WITHOUT_PITAM') return 'withoutPitam';
  return 'mixed';
}

export function resolveGrade(
  record: {
    grade?: string | null;
    customerCategory?: { grade?: string | null } | null;
  },
  fallback: string,
): string {
  return (
    (record.grade || record.customerCategory?.grade || '').trim() || fallback
  );
}

export function sortCategoryNames(
  names: string[],
  orderByName: Map<string, number> | null,
  lastLabel?: string,
): string[] {
  return [...names].sort((a, b) => {
    if (lastLabel !== undefined) {
      if (a === lastLabel) return 1;
      if (b === lastLabel) return -1;
    }

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

export function sortGrades(grades: string[], fallback: string): string[] {
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

export function addToGradeMap(
  catGradeMap: Map<string, Map<string, PitamGradeCell>>,
  category: string,
  grade: string,
  key: keyof PitamGradeCell,
  qty: number,
): void {
  if (!catGradeMap.has(category)) catGradeMap.set(category, new Map());
  const gradeMap = catGradeMap.get(category)!;
  if (!gradeMap.has(grade)) gradeMap.set(grade, emptyPitamCell());
  gradeMap.get(grade)![key] += qty;
}

export function mergeGradeMaps(
  catGradeMap: Map<string, Map<string, PitamGradeCell>>,
): Map<string, PitamGradeCell> {
  const merged = new Map<string, PitamGradeCell>();
  for (const gradeMap of catGradeMap.values()) {
    for (const [grade, cell] of gradeMap) {
      if (!merged.has(grade)) merged.set(grade, emptyPitamCell());
      const target = merged.get(grade)!;
      target.withPitam += cell.withPitam;
      target.withoutPitam += cell.withoutPitam;
      target.mixed += cell.mixed;
    }
  }
  return merged;
}

export function toCellsRecord(
  gradeMap: Map<string, PitamGradeCell> | undefined,
): Record<string, PitamGradeCell> {
  const record: Record<string, PitamGradeCell> = {};
  if (!gradeMap) return record;
  for (const [grade, cell] of gradeMap) record[grade] = cell;
  return record;
}

export function buildGroupMatrix(
  catGradeMap: Map<string, Map<string, PitamGradeCell>>,
  gradeFallback: string,
  grandTotalLabel: string,
  orderByName: Map<string, number> | null,
  noCategoryLabel?: string,
): SortingMatrix {
  const usedGrades = new Set<string>();
  for (const gradeMap of catGradeMap.values()) {
    for (const grade of gradeMap.keys()) usedGrades.add(grade);
  }
  const grades = sortGrades([...usedGrades], gradeFallback);

  const sortedCats = sortCategoryNames(
    [...catGradeMap.keys()],
    orderByName,
    noCategoryLabel,
  );
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
      cells: toCellsRecord(mergeGradeMaps(catGradeMap)),
    },
  };
}
