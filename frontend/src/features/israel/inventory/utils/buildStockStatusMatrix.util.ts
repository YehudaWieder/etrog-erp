import type { IsraelStockRecord } from '../../../../services/israelStockApi';
import { HARVEST_GRADE_OPTIONS } from '../../../harvest/utils/harvestPage.utils';
import type {
  MatrixRow,
  PitamGradeCell,
} from '../../../harvest/components/shared/CategoryGradeMatrixTable';

export type IsraelInventoryStatusScope =
  | 'ALL'
  | 'NOT_PACKED'
  | 'PACKED'
  | 'SENT'
  | 'SELF_PICKUP'
  | 'WASTE';

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
  signedQty: number,
) {
  if (!catGradeMap.has(category)) catGradeMap.set(category, new Map());
  const gradeMap = catGradeMap.get(category)!;
  if (!gradeMap.has(grade)) gradeMap.set(grade, emptyCell());
  gradeMap.get(grade)![key] += signedQty;
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

function clampCell(cell: PitamGradeCell): PitamGradeCell {
  return {
    withPitam: Math.max(0, cell.withPitam),
    withoutPitam: Math.max(0, cell.withoutPitam),
    mixed: Math.max(0, cell.mixed),
  };
}

function absCell(cell: PitamGradeCell): PitamGradeCell {
  return {
    withPitam: Math.abs(cell.withPitam),
    withoutPitam: Math.abs(cell.withoutPitam),
    mixed: Math.abs(cell.mixed),
  };
}

function toCellsRecord(
  gradeMap: Map<string, PitamGradeCell> | undefined,
  transform: (cell: PitamGradeCell) => PitamGradeCell,
): Record<string, PitamGradeCell> {
  const record: Record<string, PitamGradeCell> = {};
  if (!gradeMap) return record;
  for (const [grade, cell] of gradeMap) record[grade] = transform(cell);
  return record;
}

const TYPES_BY_SCOPE: Record<IsraelInventoryStatusScope, string[]> = {
  ALL: ['HARVEST_IN', 'WASTE'],
  NOT_PACKED: ['HARVEST_IN', 'WASTE', 'PACKED_SHIPPED', 'SELF_PICKUP'],
  // No dedicated "packed" ledger entry exists yet (packing into a box happens
  // in the not-yet-built shipments module) — this scope stays empty until then.
  PACKED: [],
  SENT: ['PACKED_SHIPPED'],
  WASTE: ['WASTE'],
  SELF_PICKUP: ['SELF_PICKUP'],
};

export type StockStatusMatrix = {
  rows: MatrixRow[];
  grades: string[];
  grandTotalRow: { label: string; cells: Record<string, PitamGradeCell> };
};

export function buildStockStatusMatrix(
  records: IsraelStockRecord[],
  statusScope: IsraelInventoryStatusScope,
  grandTotalLabel: string,
  gradeFallback: string,
  categoryOrder: Map<string, number> | null,
  allCategoryNames: string[],
  fallbackGrades: readonly string[],
): StockStatusMatrix {
  const includedTypes = new Set(TYPES_BY_SCOPE[statusScope]);
  const isIsolatedScope = statusScope !== 'ALL' && statusScope !== 'NOT_PACKED';
  const catGradeMap = new Map<string, Map<string, PitamGradeCell>>();

  for (const record of records) {
    if (!includedTypes.has(record.type)) continue;
    if (record.quantity === 0) continue;

    const key = normalizePitamKey(record.pitamStatus);
    const grade = (record.grade || '').trim() || gradeFallback;
    const catName = record.category?.name?.trim() || gradeFallback;
    addToGradeMap(catGradeMap, catName, grade, key, record.quantity);
  }

  const cellTransform = isIsolatedScope ? absCell : clampCell;

  const usedGrades = new Set<string>();
  for (const gradeMap of catGradeMap.values()) {
    for (const grade of gradeMap.keys()) usedGrades.add(grade);
  }
  const grades =
    usedGrades.size > 0
      ? sortGrades([...usedGrades], gradeFallback)
      : sortGrades([...fallbackGrades], gradeFallback);

  const catNames =
    catGradeMap.size > 0 ? [...catGradeMap.keys()] : allCategoryNames;
  const sortedCats = sortCategoryNames(catNames, categoryOrder);
  const rows: MatrixRow[] = sortedCats.map((cat) => ({
    key: cat,
    label: cat,
    cells: toCellsRecord(catGradeMap.get(cat), cellTransform),
  }));

  return {
    rows,
    grades,
    grandTotalRow: {
      label: grandTotalLabel,
      cells: toCellsRecord(mergeGroup(catGradeMap), cellTransform),
    },
  };
}
