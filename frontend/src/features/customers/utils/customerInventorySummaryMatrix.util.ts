import type {
  CustomerInventoryPitamStatus,
  CustomerInventorySummaryRow,
} from '../customerInventory.types';

type MatrixGradeCell = Record<CustomerInventoryPitamStatus, number>;

export type CustomerInventorySummaryMatrixCategory = {
  key: string;
  label: string;
  totalsByPitamStatus: Record<CustomerInventoryPitamStatus, number>;
  total: number;
};

export type CustomerInventorySummaryMatrix = {
  grades: string[];
  categories: CustomerInventorySummaryMatrixCategory[];
  gradeValues: Record<string, Record<string, MatrixGradeCell>>;
  rowTotals: Record<string, number>;
  grandTotalByPitamStatus: Record<CustomerInventoryPitamStatus, number>;
  grandTotal: number;
};

export type CustomerInventorySummaryMatrixCustomer = {
  customerId: number;
  customerName: string;
  totalsByPitamStatus: Record<CustomerInventoryPitamStatus, number>;
  total: number;
  categories: {
    key: string;
    label: string;
    totalsByPitamStatus: Record<CustomerInventoryPitamStatus, number>;
    total: number;
  }[];
};

export type CustomerInventorySummaryMatrixByCustomer = {
  customers: CustomerInventorySummaryMatrixCustomer[];
  grades: string[];
  gradeValues: Record<string, Record<string, MatrixGradeCell>>;
  grandTotalByPitamStatus: Record<CustomerInventoryPitamStatus, number>;
  grandTotal: number;
};

const EMPTY_PITAM_TOTALS: Record<CustomerInventoryPitamStatus, number> = {
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

function getCategoryKey(row: CustomerInventorySummaryRow): string {
  return `${row.customerId}:${row.customerCategoryId}`;
}

function getCategoryLabel(
  row: CustomerInventorySummaryRow,
  fallbackCategoryLabel: string,
): string {
  const customerName = row.customerName?.trim() || fallbackCategoryLabel;
  const categoryName = row.customerCategoryName?.trim() || fallbackCategoryLabel;
  return `${customerName} | ${categoryName}`;
}

function getGradeKey(row: CustomerInventorySummaryRow): string {
  return row.categoryGrade?.trim() || 'ללא דרגה';
}

export function buildCustomerInventorySummaryMatrix(
  rows: CustomerInventorySummaryRow[],
  fallbackCategoryLabel: string,
): CustomerInventorySummaryMatrix {
  const categoryMap = new Map<string, CustomerInventorySummaryMatrixCategory>();
  const gradeValues: Record<string, Record<string, MatrixGradeCell>> = {};
  const rowTotals: Record<string, number> = {};
  const grandTotalByPitamStatus = { ...EMPTY_PITAM_TOTALS };

  for (const row of rows) {
    const categoryKey = getCategoryKey(row);
    const gradeKey = getGradeKey(row);

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

  const categories = Array.from(categoryMap.values()).sort((left, right) =>
    left.label.localeCompare(right.label, 'he', { sensitivity: 'base', numeric: true }),
  );

  const seenGrades = new Set(Object.keys(gradeValues));
  const orderedKnownGrades = GRADE_ORDER.filter((grade) => seenGrades.has(grade));
  const otherGrades = Array.from(seenGrades)
    .filter((grade) => !GRADE_ORDER.includes(grade))
    .sort((left, right) => left.localeCompare(right, 'he', { sensitivity: 'base', numeric: true }));
  const grades = [...orderedKnownGrades, ...otherGrades];

  const grandTotal = Object.values(grandTotalByPitamStatus).reduce(
    (accumulator, value) => accumulator + value,
    0,
  );

  return {
    grades,
    categories,
    gradeValues,
    rowTotals,
    grandTotalByPitamStatus,
    grandTotal,
  };
}

export function buildCustomerInventorySummaryMatrixByCustomer(
  rows: CustomerInventorySummaryRow[],
  fallbackLabel: string,
): CustomerInventorySummaryMatrixByCustomer {
  const customerMap = new Map<number, CustomerInventorySummaryMatrixCustomer>();
  const categoryDataMap = new Map<string, { key: string; label: string; totalsByPitamStatus: Record<CustomerInventoryPitamStatus, number>; total: number; customerId: number }>();
  const gradeValues: Record<string, Record<string, MatrixGradeCell>> = {};
  const grandTotalByPitamStatus = { ...EMPTY_PITAM_TOTALS };

  for (const row of rows) {
    const customerId = row.customerId;
    const customerName = row.customerName?.trim() || fallbackLabel;
    const categoryKey = `${row.customerId}:${row.customerCategoryId}`;
    const categoryLabel = row.customerCategoryName?.trim() || fallbackLabel;
    const gradeKey = getGradeKey(row);

    if (!customerMap.has(customerId)) {
      customerMap.set(customerId, {
        customerId,
        customerName,
        totalsByPitamStatus: { ...EMPTY_PITAM_TOTALS },
        total: 0,
        categories: [],
      });
    }

    if (!categoryDataMap.has(categoryKey)) {
      categoryDataMap.set(categoryKey, {
        key: categoryKey,
        label: categoryLabel,
        totalsByPitamStatus: { ...EMPTY_PITAM_TOTALS },
        total: 0,
        customerId,
      });
    }

    if (!gradeValues[gradeKey]) gradeValues[gradeKey] = {};
    if (!gradeValues[gradeKey][categoryKey]) gradeValues[gradeKey][categoryKey] = createEmptyGradeCell();
    gradeValues[gradeKey][categoryKey][row.pitamStatus] += row.quantity;

    const categoryData = categoryDataMap.get(categoryKey)!;
    categoryData.totalsByPitamStatus[row.pitamStatus] += row.quantity;
    categoryData.total += row.quantity;

    const customerData = customerMap.get(customerId)!;
    customerData.totalsByPitamStatus[row.pitamStatus] += row.quantity;
    customerData.total += row.quantity;

    grandTotalByPitamStatus[row.pitamStatus] += row.quantity;
  }

  const customers = Array.from(customerMap.values()).sort((a, b) =>
    a.customerName.localeCompare(b.customerName, 'he', { sensitivity: 'base', numeric: true }),
  );

  for (const customer of customers) {
    customer.categories = Array.from(categoryDataMap.values())
      .filter((c) => c.customerId === customer.customerId)
      .sort((a, b) => a.label.localeCompare(b.label, 'he', { sensitivity: 'base', numeric: true }))
      .map(({ key, label, totalsByPitamStatus, total }) => ({ key, label, totalsByPitamStatus, total }));
  }

  const seenGrades = new Set(Object.keys(gradeValues));
  const orderedKnownGrades = GRADE_ORDER.filter((g) => seenGrades.has(g));
  const otherGrades = Array.from(seenGrades)
    .filter((g) => !GRADE_ORDER.includes(g))
    .sort((a, b) => a.localeCompare(b, 'he', { sensitivity: 'base', numeric: true }));
  const grades = [...orderedKnownGrades, ...otherGrades];

  const grandTotal = Object.values(grandTotalByPitamStatus).reduce((acc, v) => acc + v, 0);

  return { customers, grades, gradeValues, grandTotalByPitamStatus, grandTotal };
}
