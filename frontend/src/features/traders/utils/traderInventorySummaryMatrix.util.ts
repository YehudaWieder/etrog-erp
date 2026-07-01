import type {
  TraderInventoryPitamStatus,
  TraderInventorySummaryRow,
} from '../traderInventory.types';

type MatrixGradeCell = Record<TraderInventoryPitamStatus, number>;

export type TraderInventorySummaryMatrixCategory = {
  key: string;
  label: string;
  totalsByPitamStatus: Record<TraderInventoryPitamStatus, number>;
  total: number;
};

export type TraderInventorySummaryMatrix = {
  grades: string[];
  categories: TraderInventorySummaryMatrixCategory[];
  gradeValues: Record<string, Record<string, MatrixGradeCell>>;
  rowTotals: Record<string, number>;
  grandTotalByPitamStatus: Record<TraderInventoryPitamStatus, number>;
  grandTotal: number;
};

const EMPTY_PITAM_TOTALS: Record<TraderInventoryPitamStatus, number> = {
  WITH_PITAM: 0,
  WITHOUT_PITAM: 0,
  MIXED: 0,
};

const GRADE_ORDER = ['א', 'ב', 'ג', 'ד', 'ה', 'ו'];

function createEmptyGradeCell(): MatrixGradeCell {
  return {
    WITH_PITAM: 0,
    WITHOUT_PITAM: 0,
    MIXED: 0,
  };
}

function getCategoryKey(row: TraderInventorySummaryRow): string {
  return `${row.traderCategoryId}:${row.traderCategoryName ?? ''}`;
}

function getCategoryLabel(row: TraderInventorySummaryRow, fallbackCategoryLabel: string): string {
  if (!row.traderCategoryName || row.traderCategoryName.trim().length === 0) {
    return fallbackCategoryLabel;
  }

  return row.traderCategoryName;
}

export function buildTraderInventorySummaryMatrix(
  rows: TraderInventorySummaryRow[],
  fallbackCategoryLabel: string,
  categoryOrderByName?: Map<string, number> | null,
): TraderInventorySummaryMatrix {
  const categoryMap = new Map<string, TraderInventorySummaryMatrixCategory>();
  const gradeValues: Record<string, Record<string, MatrixGradeCell>> = {};
  const rowTotals: Record<string, number> = {};
  const grandTotalByPitamStatus = { ...EMPTY_PITAM_TOTALS };

  for (const row of rows) {
    const categoryKey = getCategoryKey(row);
    const gradeKey = row.grade;

    if (!categoryMap.has(categoryKey)) {
      categoryMap.set(categoryKey, {
        key: categoryKey,
        label: getCategoryLabel(row, fallbackCategoryLabel),
        totalsByPitamStatus: { ...EMPTY_PITAM_TOTALS },
        total: 0,
      });
    }

    if (!gradeValues[gradeKey]) {
      gradeValues[gradeKey] = {};
    }

    if (!gradeValues[gradeKey][categoryKey]) {
      gradeValues[gradeKey][categoryKey] = createEmptyGradeCell();
    }

    gradeValues[gradeKey][categoryKey][row.pitamStatus] += row.quantity;
    rowTotals[gradeKey] = (rowTotals[gradeKey] ?? 0) + row.quantity;

    const category = categoryMap.get(categoryKey);
    if (category) {
      category.totalsByPitamStatus[row.pitamStatus] += row.quantity;
      category.total += row.quantity;
    }

    grandTotalByPitamStatus[row.pitamStatus] += row.quantity;
  }

  const categories = Array.from(categoryMap.values()).sort((left, right) => {
    if (categoryOrderByName) {
      const li = categoryOrderByName.get(left.label);
      const ri = categoryOrderByName.get(right.label);
      if (li !== undefined && ri !== undefined) return li - ri;
      if (li !== undefined) return -1;
      if (ri !== undefined) return 1;
    }
    return left.label.localeCompare(right.label, 'he', { sensitivity: 'base', numeric: true });
  });

  const seenGrades = new Set(Object.keys(gradeValues));
  const orderedKnownGrades = GRADE_ORDER.filter((grade) => seenGrades.has(grade));
  const otherGrades = Array.from(seenGrades)
    .filter((grade) => !GRADE_ORDER.includes(grade))
    .sort((left, right) => left.localeCompare(right, 'he', { sensitivity: 'base', numeric: true }));
  const grades = [...orderedKnownGrades, ...otherGrades];

  const grandTotal = Object.values(grandTotalByPitamStatus).reduce((accumulator, value) => accumulator + value, 0);

  return {
    grades,
    categories,
    gradeValues,
    rowTotals,
    grandTotalByPitamStatus,
    grandTotal,
  };
}
