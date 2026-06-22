import type { HarvestI18n } from '../i18n';
import { downloadStyledExcel } from '../../../services/exportExcel';

type PitamTotals = { WITH_PITAM: number; WITHOUT_PITAM: number; MIXED: number };

export type SortingSummaryExportRow = {
  label: string;
  pitam: PitamTotals;
  total: number;
  isSeparator?: boolean;
};

export type SortingBreakdownGradeRow = {
  key: string;
  category?: string;
  grade: string;
  pitam: PitamTotals;
  total: number;
};

export type SortingBreakdownEntry = {
  key: string;
  label: string;
  showCategoryColumn: boolean;
  rows: SortingBreakdownGradeRow[];
  grandPitam: PitamTotals;
  grandTotal: number;
};

type ExportParams = {
  lang: 'he' | 'en';
  labels: HarvestI18n['sortingSummary'];
  summaryRows: SortingSummaryExportRow[];
  grandTotal: PitamTotals;
  breakdown: SortingBreakdownEntry[];
  seasonLabel: string | null;
};

const HEADER_BG = 'FF1F5A32';
const HEADER_FONT = 'FFFFFFFF';
const TOTALS_BG = 'FFE7F2EB';
const ZEBRA_BG = 'FFF8FCF9';
const BORDER = 'FFCCD9CF';
const FILTER_BG = 'FFF5F5F5';

const PRINT_STYLE = `
  * { box-sizing: border-box; }
  body { margin: 0; padding: 22px; font-family: Assistant, sans-serif; color: #1f2a22; background: #fff; }
  h1 { margin: 0 0 14px; font-size: 22px; color: #1f4f29; text-align: center; }
  h2 { margin: 24px 0 10px; font-size: 16px; color: #1f4f29; }
  h3 { margin: 20px 0 8px; font-size: 13px; color: #2d6e4a; }
  .filters { margin-bottom: 20px; padding: 10px 14px; background: #f5f5f5; border-radius: 4px; font-size: 12px; border: 1px solid #ddd; break-inside: avoid; page-break-inside: avoid; }
  .filters strong { display: block; margin-bottom: 4px; }
  .section { break-inside: avoid; page-break-inside: avoid; }
  .subsection { break-inside: avoid; page-break-inside: avoid; margin-bottom: 16px; }
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
  tfoot tr th, tfoot tr td { background: #e7f2eb; font-weight: 700; }
  @page { size: A4 landscape; margin: 8mm; }
`;

function esc(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmt(n: number): string {
  return n.toLocaleString();
}

function filtersHtml(seasonLabel: string | null, labels: HarvestI18n['sortingSummary'], lang: 'he' | 'en'): string {
  if (!seasonLabel) return '';
  return `<div class="filters"><strong>${esc(lang === 'he' ? 'סינונים פעילים' : 'Active Filters')}:</strong><div>${esc(labels.seasonFilterLabel)}: ${esc(seasonLabel)}</div></div>`;
}

function summaryTableHtml(
  summaryRows: SortingSummaryExportRow[],
  grandTotal: PitamTotals,
  labels: HarvestI18n['sortingSummary'],
): string {
  const { withPitam, withoutPitam, mixed, total, category } = labels.columns;
  const thead = `<thead><tr><th class="row-label">${esc(category)}</th><th>${esc(withPitam)}</th><th>${esc(withoutPitam)}</th><th>${esc(mixed)}</th><th>${esc(total)}</th></tr></thead>`;
  const tbody = summaryRows.map((r) =>
    `<tr${r.isSeparator ? ' class="separator"' : ''}><th class="row-label">${esc(r.label)}</th><td>${fmt(r.pitam.WITH_PITAM)}</td><td>${fmt(r.pitam.WITHOUT_PITAM)}</td><td>${fmt(r.pitam.MIXED)}</td><td>${fmt(r.total)}</td></tr>`,
  ).join('');
  const grandSum = grandTotal.WITH_PITAM + grandTotal.WITHOUT_PITAM + grandTotal.MIXED;
  const tfoot = `<tfoot><tr><th class="row-label">${esc(labels.rows.grandTotal)}</th><td>${fmt(grandTotal.WITH_PITAM)}</td><td>${fmt(grandTotal.WITHOUT_PITAM)}</td><td>${fmt(grandTotal.MIXED)}</td><td>${fmt(grandSum)}</td></tr></tfoot>`;
  return `<table>${thead}<tbody>${tbody}</tbody>${tfoot}</table>`;
}

function breakdownEntryHtml(entry: SortingBreakdownEntry, labels: HarvestI18n['sortingSummary']): string {
  const { withPitam, withoutPitam, mixed, total } = labels.columns;
  const { grade, category } = labels.breakdown;
  const catTh = entry.showCategoryColumn ? `<th class="row-label">${esc(category)}</th>` : '';
  const gradeTh = `<th${entry.showCategoryColumn ? '' : ' class="row-label"'}>${esc(grade)}</th>`;
  const thead = `<thead><tr>${catTh}${gradeTh}<th>${esc(withPitam)}</th><th>${esc(withoutPitam)}</th><th>${esc(mixed)}</th><th>${esc(total)}</th></tr></thead>`;
  const emptyColSpan = entry.showCategoryColumn ? 6 : 5;
  const tbody = entry.rows.length > 0
    ? entry.rows.map((r) => {
        const catTd = entry.showCategoryColumn ? `<th class="row-label">${esc(r.category ?? '')}</th>` : '';
        return `<tr>${catTd}<td><strong>${esc(r.grade)}</strong></td><td>${fmt(r.pitam.WITH_PITAM)}</td><td>${fmt(r.pitam.WITHOUT_PITAM)}</td><td>${fmt(r.pitam.MIXED)}</td><td>${fmt(r.total)}</td></tr>`;
      }).join('')
    : `<tr><td colspan="${emptyColSpan}" style="text-align:center;color:#888">—</td></tr>`;
  const colSpan = entry.showCategoryColumn ? 2 : 1;
  const tfoot = `<tfoot><tr><th class="row-label" colspan="${colSpan}">${esc(total)}</th><td>${fmt(entry.grandPitam.WITH_PITAM)}</td><td>${fmt(entry.grandPitam.WITHOUT_PITAM)}</td><td>${fmt(entry.grandPitam.MIXED)}</td><td>${fmt(entry.grandTotal)}</td></tr></tfoot>`;
  return `<div class="subsection"><h3>${esc(entry.label)}</h3><table>${thead}<tbody>${tbody}</tbody>${tfoot}</table></div>`;
}

export function printHarvestSortingSummary({ lang, labels, summaryRows, grandTotal, breakdown, seasonLabel }: ExportParams): void {
  if (typeof window === 'undefined') return;
  const win = window.open('', '_blank', 'width=1100,height=760');
  if (!win) return;

  const dir = lang === 'he' ? 'rtl' : 'ltr';
  const summaryHtml = `<div class="section"><h2>${esc(labels.tableTitle)}</h2>${summaryTableHtml(summaryRows, grandTotal, labels)}</div>`;
  const breakdownHtml = breakdown.map((e) => breakdownEntryHtml(e, labels)).join('');
  const breakdownSection = `<div class="section"><h2>${esc(labels.breakdown.breakdownTitle)}</h2>${breakdownHtml}</div>`;

  win.document.write(`<!doctype html><html lang="${lang === 'he' ? 'he' : 'en'}" dir="${dir}"><head><meta charset="UTF-8"/><title>${esc(labels.printTitle)}</title><style>${PRINT_STYLE}</style></head><body><h1>${esc(labels.printTitle)}</h1>${filtersHtml(seasonLabel, labels, lang)}${summaryHtml}${breakdownSection}</body></html>`);
  win.document.close();
  win.focus();
  win.print();
  win.close();
}

export async function exportHarvestSortingSummaryToExcel({ lang, labels, summaryRows, grandTotal, breakdown, seasonLabel }: ExportParams): Promise<void> {
  if (typeof window === 'undefined') return;

  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(lang === 'he' ? 'סיכום מיונים' : 'Sorting Summary', {
    views: [{ rightToLeft: lang === 'he' }],
  });

  type RowMeta =
    | { type: 'filter' | 'blank' }
    | { type: 'sectionHeader'; colCount: number }
    | { type: 'tableHeader' | 'data' | 'totals' };

  const metaList: RowMeta[] = [];

  const push = (values: (string | number)[], meta: RowMeta) => {
    worksheet.addRow(values);
    metaList.push(meta);
  };

  const summaryColCount = 5; // category, withPitam, withoutPitam, mixed, total

  // Filter row
  if (seasonLabel) {
    push([`${labels.seasonFilterLabel}: ${seasonLabel}`], { type: 'filter' });
    push([], { type: 'blank' });
  }

  // Summary section header
  push([labels.tableTitle], { type: 'sectionHeader', colCount: summaryColCount });
  // Summary table header
  push([labels.columns.category, labels.columns.withPitam, labels.columns.withoutPitam, labels.columns.mixed, labels.columns.total], { type: 'tableHeader' });
  // Summary rows
  for (const r of summaryRows) {
    push([r.label, r.pitam.WITH_PITAM, r.pitam.WITHOUT_PITAM, r.pitam.MIXED, r.total], { type: 'data' });
  }
  // Grand total
  const grandSum = grandTotal.WITH_PITAM + grandTotal.WITHOUT_PITAM + grandTotal.MIXED;
  push([labels.rows.grandTotal, grandTotal.WITH_PITAM, grandTotal.WITHOUT_PITAM, grandTotal.MIXED, grandSum], { type: 'totals' });

  // Blank row
  push([], { type: 'blank' });

  // Breakdown section header
  push([labels.breakdown.breakdownTitle], { type: 'sectionHeader', colCount: 6 });

  for (const entry of breakdown) {
    push([], { type: 'blank' });
    const bColCount = entry.showCategoryColumn ? 6 : 5;
    push([entry.label], { type: 'sectionHeader', colCount: bColCount });
    const hdrs = entry.showCategoryColumn
      ? [labels.breakdown.category, labels.breakdown.grade, labels.columns.withPitam, labels.columns.withoutPitam, labels.columns.mixed, labels.columns.total]
      : [labels.breakdown.grade, labels.columns.withPitam, labels.columns.withoutPitam, labels.columns.mixed, labels.columns.total];
    push(hdrs, { type: 'tableHeader' });
    for (const r of entry.rows) {
      const row = entry.showCategoryColumn
        ? [r.category ?? '', r.grade, r.pitam.WITH_PITAM, r.pitam.WITHOUT_PITAM, r.pitam.MIXED, r.total]
        : [r.grade, r.pitam.WITH_PITAM, r.pitam.WITHOUT_PITAM, r.pitam.MIXED, r.total];
      push(row, { type: 'data' });
    }
    const grandRow = entry.showCategoryColumn
      ? [labels.columns.total, '', entry.grandPitam.WITH_PITAM, entry.grandPitam.WITHOUT_PITAM, entry.grandPitam.MIXED, entry.grandTotal]
      : [labels.columns.total, entry.grandPitam.WITH_PITAM, entry.grandPitam.WITHOUT_PITAM, entry.grandPitam.MIXED, entry.grandTotal];
    push(grandRow, { type: 'totals' });
  }

  // Apply styles
  let tableDataRowCount = 0;
  worksheet.eachRow((wsRow, rowNum) => {
    const meta = metaList[rowNum - 1];
    if (!meta) return;

    if (meta.type === 'sectionHeader' && meta.colCount > 1) {
      worksheet.mergeCells(rowNum, 1, rowNum, meta.colCount);
    }

    wsRow.eachCell({ includeEmpty: false }, (cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: BORDER } },
        left: { style: 'thin', color: { argb: BORDER } },
        bottom: { style: 'thin', color: { argb: BORDER } },
        right: { style: 'thin', color: { argb: BORDER } },
      };

      if (meta.type === 'sectionHeader' || meta.type === 'tableHeader') {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } };
        cell.font = { color: { argb: HEADER_FONT }, bold: true };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      } else if (meta.type === 'totals') {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TOTALS_BG } };
        cell.font = { bold: true };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (meta.type === 'data') {
        if (tableDataRowCount % 2 === 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA_BG } };
        }
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (meta.type === 'filter') {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: FILTER_BG } };
        cell.font = { italic: true };
      }
    });

    if (meta.type === 'data') {
      tableDataRowCount++;
    } else if (meta.type === 'tableHeader') {
      tableDataRowCount = 0;
    }
  });

  // Column widths
  worksheet.columns.forEach((col) => {
    col.width = 18;
  });

  const dateStamp = new Date().toISOString().slice(0, 10);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sorting-summary-${dateStamp}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
