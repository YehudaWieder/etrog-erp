import type { ShipmentItemsTableRow } from '../shipments.types';
import type { MatrixRow, PitamGradeCell } from '../../harvest/components/shared/CategoryGradeMatrixTable';

const GRADE_ORDER = ['א', 'ב', 'ג', 'ד', 'ה', 'ו'];

export type ShipmentCategoryGradeGroupMatrix = {
  rows: MatrixRow[];
  grades: string[];
  grandTotalRow: { label: string; cells: Record<string, PitamGradeCell> };
};

export type ShipmentDetailedMatrices = {
  shipmentNumber: number;
  general: ShipmentCategoryGradeGroupMatrix;
  privateSelection: ShipmentCategoryGradeGroupMatrix;
  customers: ShipmentCategoryGradeGroupMatrix;
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

function buildGroupMatrix(
  groupRows: ShipmentItemsTableRow[],
  gradeFallback: string,
  grandTotalLabel: string,
  orderByName: Map<string, number> | null,
): ShipmentCategoryGradeGroupMatrix {
  const catGradeMap = new Map<string, Map<string, PitamGradeCell>>();

  for (const row of groupRows) {
    if (!row.quantity) continue;
    const category = row.category;
    const grade = row.customGrade ?? row.grade ?? gradeFallback;
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
  const rows: MatrixRow[] = sortedCategories.map((category) => {
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

  return { rows, grades, grandTotalRow: { label: grandTotalLabel, cells: grandCells } };
}

export function buildShipmentDetailedMatrices(
  rows: ShipmentItemsTableRow[],
  gradeFallback: string,
  grandTotalLabel: string,
  categoryOrderByName: Map<string, number> | null,
): ShipmentDetailedMatrices[] {
  const shipmentMap = new Map<number, ShipmentItemsTableRow[]>();
  for (const row of rows) {
    if (!shipmentMap.has(row.shipmentNumber)) shipmentMap.set(row.shipmentNumber, []);
    shipmentMap.get(row.shipmentNumber)!.push(row);
  }

  const result: ShipmentDetailedMatrices[] = [];
  for (const [shipmentNumber, shipmentRows] of shipmentMap.entries()) {
    const generalRows = shipmentRows.filter((row) => row.ownershipType !== 'CUSTOMER' && !row.isPrivateSelection);
    const privateRows = shipmentRows.filter((row) => row.ownershipType === 'TRADER' && row.isPrivateSelection);
    const customerRows = shipmentRows.filter((row) => row.ownershipType === 'CUSTOMER');

    result.push({
      shipmentNumber,
      general: buildGroupMatrix(generalRows, gradeFallback, grandTotalLabel, categoryOrderByName),
      privateSelection: buildGroupMatrix(privateRows, gradeFallback, grandTotalLabel, categoryOrderByName),
      customers: buildGroupMatrix(customerRows, gradeFallback, grandTotalLabel, null),
    });
  }

  return result.sort((a, b) => a.shipmentNumber - b.shipmentNumber);
}
