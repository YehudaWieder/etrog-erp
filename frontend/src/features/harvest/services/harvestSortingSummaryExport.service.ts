import type { HarvestI18n } from '../i18n';
import type { CategoryGradeGroupSplit } from '../utils/gradeGroupBreakdown.util';

type PitamGradeCell = {
  withPitam: number;
  withoutPitam: number;
  mixed: number;
};

export type SortingSummaryExportRow = {
  key: string;
  label: string;
  cells: Record<string, PitamGradeCell>;
  variant?: 'separator' | 'subtotal';
};

export type SortingSummaryExportMatrix = {
  title: string;
  rows: SortingSummaryExportRow[];
  grades: string[];
  grandTotalRow: { label: string; cells: Record<string, PitamGradeCell> };
};

type ExportParams = {
  lang: 'he' | 'en';
  labels: HarvestI18n['sortingSummary'];
  matrices: SortingSummaryExportMatrix[];
  gradeGroupSplits: CategoryGradeGroupSplit[];
  seasonLabel: string | null;
};

const HEADER_BG = 'FF1F5A32';
const HEADER_FONT = 'FFFFFFFF';
const SECTION_BG = 'FF163F22';
const SECTION_FONT = 'FFFFFFFF';
const TOTALS_BG = 'FFE7F2EB';
const SUBTOTAL_BG = 'FFDCEDE1';
const ZEBRA_BG = 'FFF8FCF9';
const BORDER = 'FFCCD9CF';
const FILTER_BG = 'FFF5F5F5';

const EMPTY_CELL: PitamGradeCell = { withPitam: 0, withoutPitam: 0, mixed: 0 };

const PRINT_STYLE = `
  * { box-sizing: border-box; }
  body { margin: 0; padding: 22px; font-family: Assistant, sans-serif; color: #1f2a22; background: #fff; }
  h1 { margin: 0 0 14px; font-size: 22px; color: #1f4f29; text-align: center; }
  h2 { margin: 22px 0 8px; font-size: 16px; color: #1f4f29; break-after: avoid; page-break-after: avoid; }
  h2:first-of-type { margin-top: 0; }
  h3 { margin: 12px 0 6px; font-size: 12px; color: #1f4f29; break-after: avoid; page-break-after: avoid; }
  .filters { margin-bottom: 20px; padding: 10px 14px; background: #f5f5f5; border-radius: 4px; font-size: 12px; border: 1px solid #ddd; break-inside: avoid; page-break-inside: avoid; }
  .filters strong { display: block; margin-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; table-layout: auto; font-size: 10px; margin-bottom: 6px; }
  thead { display: table-header-group; }
  tfoot { display: table-footer-group; }
  tr { break-inside: avoid; page-break-inside: avoid; }
  td { break-inside: avoid; page-break-inside: avoid; }
  th, td { border: 1px solid #ccd9cf; padding: 5px; text-align: center; white-space: nowrap; }
  th { background: #1f5a32; color: #fff; font-weight: 700; }
  .row-label { text-align: start; }
  tbody tr:nth-child(even) { background: #f8fcf9; }
  tbody tr.separator td, tbody tr.separator th { border-top: 2px solid #1f5a32; }
  tbody tr.subtotal td, tbody tr.subtotal th { background: #e7f2eb; font-weight: 700; }
  tfoot tr th, tfoot tr td { background: #e7f2eb; font-weight: 700; }
  .group-tables { display: flex; flex-wrap: wrap; gap: 14px; }
  .group-table-block { min-width: 220px; break-inside: avoid; page-break-inside: avoid; }
  @page { size: A4 landscape; margin: 8mm; }
`;

function esc(v: string): string {
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmt(n: number): string {
  return n.toLocaleString();
}

function fmtPercent(n: number): string {
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
}

function filtersHtml(
  seasonLabel: string | null,
  labels: HarvestI18n['sortingSummary'],
): string {
  if (!seasonLabel) return '';
  return `<div class="filters"><strong>${esc('סינונים פעילים')}:</strong><div>${esc(labels.seasonFilterLabel)}: ${esc(seasonLabel)}</div></div>`;
}

function cellOf(
  cells: Record<string, PitamGradeCell>,
  grade: string,
): PitamGradeCell {
  return cells[grade] ?? EMPTY_CELL;
}

function rowTotal(
  cells: Record<string, PitamGradeCell>,
  grades: string[],
): number {
  return grades.reduce((sum, grade) => {
    const cell = cellOf(cells, grade);
    return sum + cell.withPitam + cell.withoutPitam + cell.mixed;
  }, 0);
}

function gradeColumnVisibility(
  allRows: { cells: Record<string, PitamGradeCell> }[],
  grades: string[],
): Record<
  string,
  { withPitam: boolean; withoutPitam: boolean; mixed: boolean }
> {
  const result: Record<
    string,
    { withPitam: boolean; withoutPitam: boolean; mixed: boolean }
  > = {};
  for (const grade of grades) {
    result[grade] = {
      withPitam: allRows.some((r) => (r.cells[grade]?.withPitam ?? 0) > 0),
      withoutPitam: allRows.some(
        (r) => (r.cells[grade]?.withoutPitam ?? 0) > 0,
      ),
      mixed: allRows.some((r) => (r.cells[grade]?.mixed ?? 0) > 0),
    };
  }
  return result;
}

function summaryTableHtml(
  rows: SortingSummaryExportRow[],
  grades: string[],
  grandTotalRow: { label: string; cells: Record<string, PitamGradeCell> },
  labels: HarvestI18n['sortingSummary'],
): string {
  const { withPitam, withoutPitam, mixed, total, category } = labels.columns;
  const visibility = gradeColumnVisibility(
    [...rows, { cells: grandTotalRow.cells }],
    grades,
  );

  const gradeHeadCells = grades
    .map((g) => {
      const cols = visibility[g];
      const colSpan =
        Number(cols.withPitam) + Number(cols.withoutPitam) + Number(cols.mixed);
      return `<th colspan="${colSpan}">${esc(g)}</th>`;
    })
    .join('');
  const subHeadCells = grades
    .map((g) => {
      const cols = visibility[g];
      let cells = '';
      if (cols.withPitam) cells += `<th>${esc(withPitam)}</th>`;
      if (cols.withoutPitam) cells += `<th>${esc(withoutPitam)}</th>`;
      if (cols.mixed) cells += `<th>${esc(mixed)}</th>`;
      return cells;
    })
    .join('');
  const thead = `<thead><tr><th class="row-label" rowspan="2">${esc(category)}</th>${gradeHeadCells}<th rowspan="2">${esc(total)}</th></tr><tr>${subHeadCells}</tr></thead>`;

  const dataCellsHtml = (cells: Record<string, PitamGradeCell>) =>
    grades
      .map((g) => {
        const cols = visibility[g];
        const cell = cellOf(cells, g);
        let out = '';
        if (cols.withPitam) out += `<td>${fmt(cell.withPitam)}</td>`;
        if (cols.withoutPitam) out += `<td>${fmt(cell.withoutPitam)}</td>`;
        if (cols.mixed) out += `<td>${fmt(cell.mixed)}</td>`;
        return out;
      })
      .join('');

  const tbody = rows
    .map((r) => {
      const rowClass = r.variant ? ` class="${r.variant}"` : '';
      return `<tr${rowClass}><th class="row-label">${esc(r.label)}</th>${dataCellsHtml(r.cells)}<td>${fmt(rowTotal(r.cells, grades))}</td></tr>`;
    })
    .join('');

  const tfoot = `<tfoot><tr><th class="row-label">${esc(grandTotalRow.label)}</th>${dataCellsHtml(grandTotalRow.cells)}<td>${fmt(rowTotal(grandTotalRow.cells, grades))}</td></tr></tfoot>`;

  return `<table>${thead}<tbody>${tbody}</tbody>${tfoot}</table>`;
}

function matrixSectionsHtml(
  matrices: SortingSummaryExportMatrix[],
  labels: HarvestI18n['sortingSummary'],
): string {
  return matrices
    .filter((matrix) => matrix.rows.length > 0)
    .map(
      (matrix) =>
        `<h2>${esc(matrix.title)}</h2>${summaryTableHtml(matrix.rows, matrix.grades, matrix.grandTotalRow, labels)}`,
    )
    .join('');
}

function gradeGroupSplitsHtml(
  splits: CategoryGradeGroupSplit[],
  labels: HarvestI18n['sortingSummary'],
): string {
  if (splits.length === 0) return '';

  const blocks = splits
    .map((split) => {
      const rows = split.rows
        .map(
          (row) =>
            `<tr><td class="row-label">${esc(row.groupName)}</td><td>${fmtPercent(row.percent)}</td></tr>`,
        )
        .join('');
      return `<div class="group-table-block"><h3>${esc(split.category)}</h3><table><thead><tr><th class="row-label">${esc(labels.gradeGroups.groupColumn)}</th><th>${esc(labels.gradeGroups.percentColumn)}</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    })
    .join('');

  return `<h2>${esc(labels.gradeGroups.title)}</h2><div class="group-tables">${blocks}</div>`;
}

export function printHarvestSortingSummary({
  lang,
  labels,
  matrices,
  gradeGroupSplits,
  seasonLabel,
}: ExportParams): void {
  if (typeof window === 'undefined') return;
  const win = window.open('', '_blank', 'width=1100,height=760');
  if (!win) return;

  const dir = lang === 'he' ? 'rtl' : 'ltr';
  const bodyHtml = `${matrixSectionsHtml(matrices, labels)}${gradeGroupSplitsHtml(gradeGroupSplits, labels)}`;

  win.document.write(
    `<!doctype html><html lang="${lang === 'he' ? 'he' : 'en'}" dir="${dir}"><head><meta charset="UTF-8"/><title>${esc(labels.printTitle)}</title><style>${PRINT_STYLE}</style></head><body><h1>${esc(labels.printTitle)}</h1>${filtersHtml(seasonLabel, labels)}${bodyHtml}</body></html>`,
  );
  win.document.close();
  win.focus();
  win.print();
  win.close();
}

type RowMeta =
  | { type: 'filter' | 'blank' }
  | { type: 'sectionTitle' }
  | { type: 'tableHeader' }
  | { type: 'data' | 'subtotal' | 'totals' }
  | { type: 'groupCategoryHeader' }
  | { type: 'groupHeader' }
  | { type: 'groupRow' };

export async function exportHarvestSortingSummaryToExcel({
  lang,
  labels,
  matrices,
  gradeGroupSplits,
  seasonLabel,
}: ExportParams): Promise<void> {
  if (typeof window === 'undefined') return;

  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(
    lang === 'he' ? 'סיכום מיונים' : 'Sorting Summary',
    {
      views: [{ rightToLeft: lang === 'he' }],
    },
  );

  const metaList: RowMeta[] = [];
  let maxColCount = 3;
  const push = (values: (string | number)[], meta: RowMeta) => {
    worksheet.addRow(values);
    metaList.push(meta);
    maxColCount = Math.max(maxColCount, values.length);
  };

  if (seasonLabel) {
    push([`${labels.seasonFilterLabel}: ${seasonLabel}`], { type: 'filter' });
    push([], { type: 'blank' });
  }

  const visibleMatrices = matrices.filter((matrix) => matrix.rows.length > 0);

  visibleMatrices.forEach((matrix, matrixIndex) => {
    const visibility = gradeColumnVisibility(
      [...matrix.rows, { cells: matrix.grandTotalRow.cells }],
      matrix.grades,
    );
    const gradeSubColCount = (g: string) => {
      const cols = visibility[g];
      return (
        Number(cols.withPitam) + Number(cols.withoutPitam) + Number(cols.mixed)
      );
    };
    const totalColCount =
      1 + matrix.grades.reduce((sum, g) => sum + gradeSubColCount(g), 0) + 1;

    push([matrix.title], { type: 'sectionTitle' });
    worksheet.mergeCells(
      worksheet.rowCount,
      1,
      worksheet.rowCount,
      Math.max(totalColCount, 1),
    );

    const gradeHeaderRow: (string | number)[] = [labels.columns.category];
    for (const g of matrix.grades) {
      gradeHeaderRow.push(g);
      for (let i = 1; i < gradeSubColCount(g); i += 1) gradeHeaderRow.push('');
    }
    gradeHeaderRow.push(labels.columns.total);
    push(gradeHeaderRow, { type: 'tableHeader' });
    const gradeHeaderRowNum = worksheet.rowCount;
    worksheet.mergeCells(gradeHeaderRowNum, 1, gradeHeaderRowNum + 1, 1);
    worksheet.mergeCells(
      gradeHeaderRowNum,
      totalColCount,
      gradeHeaderRowNum + 1,
      totalColCount,
    );
    let mergeCol = 2;
    for (const g of matrix.grades) {
      const span = gradeSubColCount(g);
      if (span > 1)
        worksheet.mergeCells(
          gradeHeaderRowNum,
          mergeCol,
          gradeHeaderRowNum,
          mergeCol + span - 1,
        );
      mergeCol += span;
    }

    const subHeaderRow: (string | number)[] = [''];
    for (const g of matrix.grades) {
      const cols = visibility[g];
      if (cols.withPitam) subHeaderRow.push(labels.columns.withPitam);
      if (cols.withoutPitam) subHeaderRow.push(labels.columns.withoutPitam);
      if (cols.mixed) subHeaderRow.push(labels.columns.mixed);
    }
    subHeaderRow.push('');
    push(subHeaderRow, { type: 'tableHeader' });

    const dataCellsOf = (cells: Record<string, PitamGradeCell>): number[] => {
      const values: number[] = [];
      for (const g of matrix.grades) {
        const cols = visibility[g];
        const cell = cellOf(cells, g);
        if (cols.withPitam) values.push(cell.withPitam);
        if (cols.withoutPitam) values.push(cell.withoutPitam);
        if (cols.mixed) values.push(cell.mixed);
      }
      return values;
    };

    for (const r of matrix.rows) {
      push(
        [r.label, ...dataCellsOf(r.cells), rowTotal(r.cells, matrix.grades)],
        { type: r.variant === 'subtotal' ? 'subtotal' : 'data' },
      );
    }
    push(
      [
        matrix.grandTotalRow.label,
        ...dataCellsOf(matrix.grandTotalRow.cells),
        rowTotal(matrix.grandTotalRow.cells, matrix.grades),
      ],
      { type: 'totals' },
    );

    if (
      matrixIndex < visibleMatrices.length - 1 ||
      gradeGroupSplits.length > 0
    ) {
      push([], { type: 'blank' });
    }
  });

  if (gradeGroupSplits.length > 0) {
    push([labels.gradeGroups.title], { type: 'sectionTitle' });
    worksheet.mergeCells(
      worksheet.rowCount,
      1,
      worksheet.rowCount,
      Math.max(maxColCount, 2),
    );

    gradeGroupSplits.forEach((split, splitIndex) => {
      push([split.category], { type: 'groupCategoryHeader' });
      push([labels.gradeGroups.groupColumn, labels.gradeGroups.percentColumn], {
        type: 'groupHeader',
      });
      for (const row of split.rows) {
        push([row.groupName, fmtPercent(row.percent)], { type: 'groupRow' });
      }
      if (splitIndex < gradeGroupSplits.length - 1) {
        push([], { type: 'blank' });
      }
    });
  }

  // Apply styles
  let tableDataRowCount = 0;
  worksheet.eachRow((wsRow, rowNum) => {
    const meta = metaList[rowNum - 1];
    if (!meta) return;

    wsRow.eachCell({ includeEmpty: false }, (cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: BORDER } },
        left: { style: 'thin', color: { argb: BORDER } },
        bottom: { style: 'thin', color: { argb: BORDER } },
        right: { style: 'thin', color: { argb: BORDER } },
      };

      if (meta.type === 'sectionTitle') {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: SECTION_BG },
        };
        cell.font = { color: { argb: SECTION_FONT }, bold: true, size: 13 };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (meta.type === 'tableHeader' || meta.type === 'groupHeader') {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: HEADER_BG },
        };
        cell.font = { color: { argb: HEADER_FONT }, bold: true };
        cell.alignment = {
          horizontal: 'center',
          vertical: 'middle',
          wrapText: true,
        };
      } else if (meta.type === 'groupCategoryHeader') {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: SUBTOTAL_BG },
        };
        cell.font = { bold: true };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (meta.type === 'totals') {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: TOTALS_BG },
        };
        cell.font = { bold: true };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (meta.type === 'subtotal') {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: SUBTOTAL_BG },
        };
        cell.font = { bold: true };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (meta.type === 'data' || meta.type === 'groupRow') {
        if (tableDataRowCount % 2 === 1) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: ZEBRA_BG },
          };
        }
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (meta.type === 'filter') {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: FILTER_BG },
        };
        cell.font = { italic: true };
      }
    });

    if (meta.type === 'data' || meta.type === 'groupRow') {
      tableDataRowCount++;
    } else {
      tableDataRowCount = 0;
    }
  });

  worksheet.columns.forEach((col) => {
    col.width = 14;
  });
  worksheet.getColumn(1).width = 22;

  const dateStamp = new Date().toISOString().slice(0, 10);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sorting-summary-${dateStamp}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
