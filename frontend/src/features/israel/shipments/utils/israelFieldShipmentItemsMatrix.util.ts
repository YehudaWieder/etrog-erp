import type { IsraelFieldShipmentItemsTableRow } from '../israelShipments.types';
import type { MatrixRow, PitamGradeCell } from '../../../harvest/components/shared/CategoryGradeMatrixTable';

const GRADE_ORDER = ['א', 'ב', 'ג', 'ד', 'ה', 'ו'];

export type IsraelFieldShipmentItemsMatrix = {
  rows: MatrixRow[];
  grades: string[];
  grandTotalRow: { label: string; cells: Record<string, PitamGradeCell> };
};

function emptyCell(): PitamGradeCell {
  return { withPitam: 0, withoutPitam: 0, mixed: 0 };
}

function normalizePitamKey(value: string | null): keyof PitamGradeCell {
  if (value === 'WITH_PITAM') return 'withPitam';
  if (value === 'WITHOUT_PITAM') return 'withoutPitam';
  return 'mixed';
}

function sortGrades(grades: string[], fallback: string): string[] {
  return [...grades].sort((a, b) => {
    if (a === fallback) return 1;
    if (b === fallback) return -1;
    const ai = GRADE_ORDER.indexOf(a);
    const bi = GRADE_ORDER.indexOf(b);
    if (ai >= 0 && bi >= 0) return ai - bi;
    if (ai >= 0) return -1;
    if (bi >= 0) return 1;
    return a.localeCompare(b, 'he', { sensitivity: 'base', numeric: true });
  });
}

function sortCategoryNames(names: string[], orderByName: Map<string, number> | null): string[] {
  return [...names].sort((a, b) => {
    if (orderByName) {
      const ai = orderByName.get(a);
      const bi = orderByName.get(b);
      if (ai !== undefined && bi !== undefined) return ai - bi;
      if (ai !== undefined) return -1;
      if (bi !== undefined) return 1;
    }
    return a.localeCompare(b, 'he', { sensitivity: 'base', numeric: true });
  });
}

export function buildIsraelFieldShipmentItemsMatrix(
  rows: IsraelFieldShipmentItemsTableRow[],
  gradeFallback: string,
  grandTotalLabel: string,
  orderByName: Map<string, number> | null,
): IsraelFieldShipmentItemsMatrix {
  const catGradeMap = new Map<string, Map<string, PitamGradeCell>>();

  for (const row of rows) {
    if (!row.quantity) continue;
    const category = row.category;
    const grade = row.grade || gradeFallback;
    const key = normalizePitamKey(row.pitamStatus);

    if (!catGradeMap.has(category)) catGradeMap.set(category, new Map());
    const gradeMap = catGradeMap.get(category)!;
    if (!gradeMap.has(grade)) gradeMap.set(grade, emptyCell());
    gradeMap.get(grade)![key] += Math.abs(row.quantity);
  }

  const usedGrades = new Set<string>();
  for (const gradeMap of catGradeMap.values()) {
    for (const grade of gradeMap.keys()) usedGrades.add(grade);
  }
  const grades = sortGrades([...usedGrades], gradeFallback);

  const sortedCategories = sortCategoryNames([...catGradeMap.keys()], orderByName);
  const rowsOut: MatrixRow[] = sortedCategories.map((category) => {
    const gradeMap = catGradeMap.get(category)!;
    const cells: Record<string, PitamGradeCell> = {};
    for (const [grade, cell] of gradeMap) cells[grade] = cell;
    return { key: category, label: category, cells };
  });

  const grandCells: Record<string, PitamGradeCell> = {};
  for (const grade of grades) grandCells[grade] = emptyCell();
  for (const gradeMap of catGradeMap.values()) {
    for (const [grade, cell] of gradeMap) {
      const target = grandCells[grade];
      target.withPitam += cell.withPitam;
      target.withoutPitam += cell.withoutPitam;
      target.mixed += cell.mixed;
    }
  }

  return { rows: rowsOut, grades, grandTotalRow: { label: grandTotalLabel, cells: grandCells } };
}

export type IsraelFieldShipmentItemsSummaryTotals = {
  totalShipments: number;
  totalBoxes: number;
  totalQuantity: number;
};

export function buildIsraelFieldShipmentItemsSummaryTotals(
  rows: IsraelFieldShipmentItemsTableRow[],
): IsraelFieldShipmentItemsSummaryTotals {
  let totalQuantity = 0;
  const shipmentNumbers = new Set<number>();
  const boxIds = new Set<number>();

  for (const row of rows) {
    totalQuantity += row.quantity;
    if (row.shipmentNumber !== null) shipmentNumbers.add(row.shipmentNumber);
    boxIds.add(row.boxId);
  }

  return { totalShipments: shipmentNumbers.size, totalBoxes: boxIds.size, totalQuantity };
}
