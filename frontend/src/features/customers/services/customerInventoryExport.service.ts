import type { CustomerInventorySummaryMatrixByCustomer } from '../utils/customerInventorySummaryMatrix.util';
import type { CustomerInventoryI18n } from '../i18n.inventory';

const C = {
  headerBg:        'FF1F5A32',
  headerFont:      'FFFFFFFF',
  firstColBg:      'FFEFF6F1',
  firstColFooter:  'FFD2E8D7',
  totalColBg:      'FFE4F0E7',
  totalColFooter:  'FFC8E4D0',
  footerBg:        'FFE1F0E5',
  sectionTitleBg:  'FF2D5A35',
  sectionTitleFont:'FFFFFFFF',
  customerNameBg:  'FF3A6E45',
  customerNameFont:'FFFFFFFF',
  categoryNameBg:  'FFD6EBD9',
  categoryNameFont:'FF1A3D20',
  zebraOdd:        'FFFAFCFA',
  zebraEven:       'FFF3F8F4',
  border:          'FFCCD9CF',
  footerBorder:    'FF8CB494',
} as const;

type CellDef = { value: string | number; bold?: boolean; bg?: string; fontColor?: string; align?: 'left' | 'center' | 'right' };

function border(color: string = C.border) {
  return {
    top:    { style: 'thin' as const, color: { argb: color } },
    left:   { style: 'thin' as const, color: { argb: color } },
    bottom: { style: 'thin' as const, color: { argb: color } },
    right:  { style: 'thin' as const, color: { argb: color } },
  };
}

export async function exportCustomerInventoryExcel({
  fileName,
  sheetName,
  filterRows,
  summaryMatrix,
  labels,
  rightToLeft,
}: {
  fileName: string;
  sheetName: string;
  filterRows: [string, string | number][];
  summaryMatrix: CustomerInventorySummaryMatrixByCustomer;
  labels: CustomerInventoryI18n['summary'];
  rightToLeft: boolean;
}) {
  if (typeof window === 'undefined') return;

  const { Workbook } = await import('exceljs');
  const workbook = new Workbook();
  const ws = workbook.addWorksheet(sheetName, { views: [{ rightToLeft }] });

  const COL_COUNT = 5;
  const pitamWith    = labels.values.pitamStatus.WITH_PITAM;
  const pitamWithout = labels.values.pitamStatus.WITHOUT_PITAM;
  const pitamMixed   = labels.values.pitamStatus.MIXED;
  const totalLabel   = labels.matrix.total;
  const gradeLabel   = labels.matrix.grade;
  const customerLabel = labels.columns.customer;
  const fmt = (n: number) => Math.abs(n);

  let rowNum = 0;

  function addFilterRow(label: string, value: string | number) {
    rowNum++;
    const row = ws.getRow(rowNum);
    row.getCell(1).value = label;
    row.getCell(2).value = value;
    row.commit();
  }

  function addEmptyRow() {
    rowNum++;
    ws.getRow(rowNum).commit();
  }

  function addHeaderRow(cells: string[]) {
    rowNum++;
    const row = ws.getRow(rowNum);
    cells.forEach((text, i) => {
      const cell = row.getCell(i + 1);
      cell.value = text;
      cell.font  = { bold: true, color: { argb: C.headerFont } };
      cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.headerBg } };
      cell.alignment = { horizontal: i === 0 ? 'left' : 'center', vertical: 'middle' };
      cell.border = border();
    });
    row.height = 20;
    row.commit();
  }

  function addDataRow(cells: CellDef[], footerStyle = false) {
    rowNum++;
    const row = ws.getRow(rowNum);
    cells.forEach((def, i) => {
      const cell = row.getCell(i + 1);
      cell.value = def.value;
      cell.font  = { bold: !!def.bold, color: { argb: def.fontColor ?? 'FF1F2A22' } };
      cell.alignment = { horizontal: def.align ?? 'center', vertical: 'middle' };
      if (def.bg) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: def.bg } };
      }
      cell.border = footerStyle
        ? { ...border(C.footerBorder), top: { style: 'medium', color: { argb: C.footerBorder } } }
        : border();
    });
    row.commit();
  }

  function addSectionTitleRow(text: string) {
    rowNum++;
    const row = ws.getRow(rowNum);
    const cell = row.getCell(1);
    cell.value = text;
    cell.font  = { bold: true, size: 13, color: { argb: C.sectionTitleFont } };
    cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.sectionTitleBg } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.mergeCells(rowNum, 1, rowNum, COL_COUNT);
    row.height = 22;
    row.commit();
  }

  function addCustomerNameRow(text: string) {
    rowNum++;
    const row = ws.getRow(rowNum);
    const cell = row.getCell(1);
    cell.value = text;
    cell.font  = { bold: true, size: 12, color: { argb: C.customerNameFont } };
    cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.customerNameBg } };
    cell.alignment = { horizontal: 'left', vertical: 'middle' };
    cell.border = border();
    for (let c = 2; c <= COL_COUNT; c++) {
      const sideCell = row.getCell(c);
      sideCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.customerNameBg } };
      sideCell.border = border();
    }
    row.height = 20;
    row.commit();
  }

  function addCategoryNameRow(text: string) {
    rowNum++;
    const row = ws.getRow(rowNum);
    const cell = row.getCell(1);
    cell.value = text;
    cell.font  = { bold: true, color: { argb: C.categoryNameFont } };
    cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.categoryNameBg } };
    cell.alignment = { horizontal: 'left', vertical: 'middle' };
    cell.border = border();
    for (let c = 2; c <= COL_COUNT; c++) {
      const sideCell = row.getCell(c);
      sideCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.categoryNameBg } };
      sideCell.border = border();
    }
    row.height = 18;
    row.commit();
  }

  function makeDataCells(firstVal: string | number, vals: number[], totalVal: number, zebraIndex: number): CellDef[] {
    const bg = zebraIndex % 2 === 0 ? C.zebraOdd : C.zebraEven;
    return [
      { value: firstVal, bold: true, bg: C.firstColBg, align: 'left' },
      ...vals.map((v) => ({ value: fmt(v), bg })),
      { value: fmt(totalVal), bold: true, bg: C.totalColBg },
    ];
  }

  function makeFooterCells(firstVal: string, vals: number[], totalVal: number): CellDef[] {
    return [
      { value: firstVal, bold: true, bg: C.firstColFooter, align: 'left' },
      ...vals.map((v) => ({ value: fmt(v), bold: true, bg: C.footerBg })),
      { value: fmt(totalVal), bold: true, bg: C.totalColFooter },
    ];
  }

  // ── filter rows ──────────────────────────────────────────────────────────────

  for (const [label, value] of filterRows) {
    addFilterRow(label, value);
  }
  addEmptyRow();

  // ── summary table (rows = customers) ────────────────────────────────────────

  addHeaderRow([customerLabel, pitamWith, pitamWithout, pitamMixed, totalLabel]);

  summaryMatrix.customers.forEach((customer, i) => {
    addDataRow(makeDataCells(
      customer.customerName,
      [customer.totalsByPitamStatus.WITH_PITAM, customer.totalsByPitamStatus.WITHOUT_PITAM, customer.totalsByPitamStatus.MIXED],
      customer.total,
      i,
    ));
  });

  addDataRow(makeFooterCells(
    totalLabel,
    [summaryMatrix.grandTotalByPitamStatus.WITH_PITAM, summaryMatrix.grandTotalByPitamStatus.WITHOUT_PITAM, summaryMatrix.grandTotalByPitamStatus.MIXED],
    summaryMatrix.grandTotal,
  ), true);

  // ── breakdown (per customer → per category → grades) ────────────────────────

  addEmptyRow();
  addSectionTitleRow(labels.breakdown.breakdownTitle);

  for (const customer of summaryMatrix.customers) {
    addEmptyRow();
    addCustomerNameRow(customer.customerName);

    for (const category of customer.categories) {
      addEmptyRow();
      addCategoryNameRow(category.label);
      addHeaderRow([gradeLabel, pitamWith, pitamWithout, pitamMixed, totalLabel]);

      summaryMatrix.grades.forEach((grade, i) => {
        const cell = summaryMatrix.gradeValues[grade]?.[category.key] ?? { WITH_PITAM: 0, WITHOUT_PITAM: 0, MIXED: 0 };
        const gradeTotal = cell.WITH_PITAM + cell.WITHOUT_PITAM + cell.MIXED;
        addDataRow(makeDataCells(grade, [cell.WITH_PITAM, cell.WITHOUT_PITAM, cell.MIXED], gradeTotal, i));
      });

      addDataRow(makeFooterCells(
        totalLabel,
        [category.totalsByPitamStatus.WITH_PITAM, category.totalsByPitamStatus.WITHOUT_PITAM, category.totalsByPitamStatus.MIXED],
        category.total,
      ), true);
    }
  }

  // ── column widths ────────────────────────────────────────────────────────────

  ws.eachRow((row) => {
    for (let c = 1; c <= COL_COUNT; c++) {
      const col = ws.getColumn(c);
      const len = String(row.getCell(c).value ?? '').length;
      if (!col.width || col.width < len + 3) {
        col.width = Math.max(12, Math.min(len + 3, 40));
      }
    }
  });

  ws.views = [{ state: 'frozen', ySplit: filterRows.length + 1, rightToLeft }];

  // ── download ─────────────────────────────────────────────────────────────────

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
