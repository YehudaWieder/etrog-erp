import type { GradeGroup } from '../../../services/traderCategoriesApi';

export type GradeGroupPercentageRow = {
  groupName: string;
  total: number;
  percent: number;
};

const UNGROUPED_KEY = '__ungrouped__';

// Computes the percentage split of a category's grade totals across its configured gradeGroups.
// Grades not covered by any group are bucketed under `ungroupedLabel` so percentages still sum to 100%.
export function computeGradeGroupPercentages(
  gradeRows: Array<{ grade: string; total: number }>,
  gradeGroups: GradeGroup[],
  ungroupedLabel: string,
): GradeGroupPercentageRow[] {
  if (!gradeGroups.length) {
    return [];
  }

  const grandTotal = gradeRows.reduce((sum, row) => sum + row.total, 0);
  if (grandTotal <= 0) {
    return [];
  }

  const gradeToGroupName = new Map<string, string>();
  for (const group of gradeGroups) {
    for (const grade of group.grades) {
      gradeToGroupName.set(grade, group.name);
    }
  }

  const totalsByGroupName = new Map<string, number>();
  for (const row of gradeRows) {
    const groupName = gradeToGroupName.get(row.grade) ?? UNGROUPED_KEY;
    totalsByGroupName.set(groupName, (totalsByGroupName.get(groupName) ?? 0) + row.total);
  }

  const orderedGroupNames = gradeGroups.map((group) => group.name);
  if (totalsByGroupName.has(UNGROUPED_KEY)) {
    orderedGroupNames.push(UNGROUPED_KEY);
  }

  return orderedGroupNames
    .filter((name) => totalsByGroupName.has(name))
    .map((name) => {
      const total = totalsByGroupName.get(name) ?? 0;
      return {
        groupName: name === UNGROUPED_KEY ? ungroupedLabel : name,
        total,
        percent: (total / grandTotal) * 100,
      };
    });
}

export type ClassificationLikeRecord = {
  assignmentType: string;
  quantity: number;
  grade?: string | null;
  traderCategory?: { name: string } | null;
};

// Sums quantities per trader-category-name per grade, from GENERAL/TRADER classification rows only
// (grade groups are a trader-category concept — CUSTOMER-assigned rows are excluded).
export function buildCategoryGradeTotals(
  records: ClassificationLikeRecord[],
  gradeFallback: string,
): Map<string, Map<string, number>> {
  const map = new Map<string, Map<string, number>>();

  for (const record of records) {
    if (record.assignmentType !== 'GENERAL' && record.assignmentType !== 'TRADER') continue;
    const qty = record.quantity || 0;
    if (qty <= 0) continue;
    const catName = record.traderCategory?.name?.trim();
    if (!catName) continue;

    const grade = (record.grade || '').trim() || gradeFallback;
    if (!map.has(catName)) map.set(catName, new Map());
    const gradeMap = map.get(catName)!;
    gradeMap.set(grade, (gradeMap.get(grade) ?? 0) + qty);
  }

  return map;
}

export function buildGradeGroupsByCategory(
  categories: Array<{ name: string; gradeGroups?: GradeGroup[] }>,
): Map<string, GradeGroup[]> {
  const map = new Map<string, GradeGroup[]>();
  for (const category of categories) {
    if (category.gradeGroups?.length) {
      map.set(category.name, category.gradeGroups);
    }
  }
  return map;
}

export type CategoryGradeGroupSplit = {
  category: string;
  rows: GradeGroupPercentageRow[];
};

export function buildCategoryGradeGroupSplits(
  categoryGradeTotals: Map<string, Map<string, number>>,
  gradeGroupsByCategory: Map<string, GradeGroup[]>,
  traderCategoryOrder: Map<string, number> | null,
  ungroupedLabel: string,
): CategoryGradeGroupSplit[] {
  const categoryNames = [...gradeGroupsByCategory.keys()]
    .filter((name) => categoryGradeTotals.has(name))
    .sort((a, b) => {
      const ai = traderCategoryOrder?.get(a);
      const bi = traderCategoryOrder?.get(b);
      if (ai !== undefined && bi !== undefined) return ai - bi;
      if (ai !== undefined) return -1;
      if (bi !== undefined) return 1;
      return a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true });
    });

  const splits: CategoryGradeGroupSplit[] = [];
  for (const catName of categoryNames) {
    const groups = gradeGroupsByCategory.get(catName)!;
    const gradeTotals = categoryGradeTotals.get(catName)!;
    const gradeRows = [...gradeTotals.entries()].map(([grade, total]) => ({ grade, total }));
    const rows = computeGradeGroupPercentages(gradeRows, groups, ungroupedLabel);
    if (rows.length) {
      splits.push({ category: catName, rows });
    }
  }
  return splits;
}
