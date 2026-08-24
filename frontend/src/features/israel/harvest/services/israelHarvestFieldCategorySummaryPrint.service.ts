import type { IsraelHarvestI18n } from '../i18n';
import type { IsraelFieldCategorySummaryField } from '../../../../services/israel/israelClassificationsApi';

type PrintParams = {
  lang: 'he' | 'en';
  labels: IsraelHarvestI18n['fieldCategorySummary'];
  fields: IsraelFieldCategorySummaryField[];
  seasonLabel: string | null;
};

const PRINT_STYLE = `
  * { box-sizing: border-box; }
  body { margin: 0; padding: 22px; font-family: Assistant, sans-serif; color: #1f2a22; background: #fff; }
  h1 { margin: 0 0 14px; font-size: 22px; color: #1f4f29; text-align: center; }
  h2 { margin: 0 0 10px; font-size: 18px; color: #1f4f29; break-after: avoid; page-break-after: avoid; }
  .filters { margin-bottom: 20px; padding: 10px 14px; background: #f5f5f5; border-radius: 4px; font-size: 12px; border: 1px solid #ddd; break-inside: avoid; page-break-inside: avoid; }
  .filters strong { display: block; margin-bottom: 4px; }
  .field-page { break-before: page; page-break-before: always; }
  .field-page:first-of-type { break-before: avoid; page-break-before: avoid; }
  table { width: 100%; border-collapse: collapse; table-layout: auto; font-size: 11px; margin-bottom: 10px; }
  tr { break-inside: avoid; page-break-inside: avoid; }
  th, td { border: 1px solid #ccd9cf; padding: 6px 8px; text-align: center; }
  th { background: #1f5a32; color: #fff; font-weight: 700; white-space: nowrap; }
  td { white-space: nowrap; }
  .row-label, .breakdown-cell { text-align: start; white-space: normal; }
  .breakdown-line { display: flex; justify-content: flex-start; gap: 8px; }
  .breakdown-line + .breakdown-line { margin-top: 6px; }
  tbody tr:nth-child(even) { background: #f8fcf9; }
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
  labels: IsraelHarvestI18n['fieldCategorySummary'],
): string {
  if (!seasonLabel) return '';
  return `<div class="filters"><strong>${esc('סינונים פעילים')}:</strong><div>${esc(labels.seasonFilterLabel)}: ${esc(seasonLabel)}</div></div>`;
}

function breakdownText(
  splits: IsraelFieldCategorySummaryField['categories'][number]['gradeGroupSplits'],
  labels: IsraelHarvestI18n['fieldCategorySummary'],
): string {
  return splits
    .map(
      (split) =>
        `<div class="breakdown-line"><span>${esc(split.groupName ?? labels.ungroupedLabel)}</span><span>${fmtPercent(split.percent)}</span></div>`,
    )
    .join('');
}

function fieldTableHtml(
  field: IsraelFieldCategorySummaryField,
  labels: IsraelHarvestI18n['fieldCategorySummary'],
): string {
  const rows = field.categories
    .map(
      (category) =>
        `<tr><th class="row-label">${esc(category.fieldCategoryName)}</th><td>${fmt(category.quantity)}</td><td class="breakdown-cell">${breakdownText(category.gradeGroupSplits, labels)}</td><td>${fmt(category.price)} ${esc(category.currency)}</td><td>${fmt(category.total)} ${esc(category.currency)}</td></tr>`,
    )
    .join('');

  return `<table><thead><tr><th class="row-label">${esc(labels.columns.fieldCategory)}</th><th>${esc(labels.columns.quantity)}</th><th>${esc(labels.columns.breakdown)}</th><th>${esc(labels.columns.price)}</th><th>${esc(labels.columns.total)}</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function fieldPageHtml(
  field: IsraelFieldCategorySummaryField,
  labels: IsraelHarvestI18n['fieldCategorySummary'],
): string {
  return `<div class="field-page"><h2>${esc(field.fieldName)}</h2>${fieldTableHtml(field, labels)}</div>`;
}

export function printIsraelHarvestFieldCategorySummary({
  lang,
  labels,
  fields,
  seasonLabel,
}: PrintParams): void {
  if (typeof window === 'undefined') return;
  const win = window.open('', '_blank', 'width=1100,height=760');
  if (!win) return;

  const dir = lang === 'he' ? 'rtl' : 'ltr';
  const bodyHtml = fields.map((field) => fieldPageHtml(field, labels)).join('');

  win.document.write(
    `<!doctype html><html lang="${lang === 'he' ? 'he' : 'en'}" dir="${dir}"><head><meta charset="UTF-8"/><title>${esc(labels.printWindowTitle)}</title><style>${PRINT_STYLE}</style></head><body><h1>${esc(labels.printWindowTitle)}</h1>${filtersHtml(seasonLabel, labels)}${bodyHtml}</body></html>`,
  );
  win.document.close();
  win.focus();
  win.print();
  win.close();
}

const HEADER_BG = 'FF1F5A32';
const HEADER_FONT = 'FFFFFFFF';
const SECTION_BG = 'FF163F22';
const SECTION_FONT = 'FFFFFFFF';
const ZEBRA_BG = 'FFF8FCF9';
const BORDER = 'FFCCD9CF';
const FILTER_BG = 'FFF5F5F5';

function breakdownCellText(
  splits: IsraelFieldCategorySummaryField['categories'][number]['gradeGroupSplits'],
  labels: IsraelHarvestI18n['fieldCategorySummary'],
): string {
  return splits
    .map(
      (split) =>
        `${split.groupName ?? labels.ungroupedLabel}  ${fmtPercent(split.percent)}`,
    )
    .join('\n');
}

type RowMeta =
  | { type: 'filter' | 'blank' }
  | { type: 'sectionTitle' }
  | { type: 'tableHeader' }
  | { type: 'data' };

export async function exportIsraelHarvestFieldCategorySummaryToExcel({
  lang,
  labels,
  fields,
  seasonLabel,
}: PrintParams): Promise<void> {
  if (typeof window === 'undefined') return;

  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(
    lang === 'he' ? 'סיכום קטגוריות מוכר' : 'Seller Category Summary',
    { views: [{ rightToLeft: lang === 'he' }] },
  );

  const metaList: RowMeta[] = [];
  const push = (values: (string | number)[], meta: RowMeta) => {
    worksheet.addRow(values);
    metaList.push(meta);
  };

  if (seasonLabel) {
    push([`${labels.seasonFilterLabel}: ${seasonLabel}`], { type: 'filter' });
    push([], { type: 'blank' });
  }

  fields.forEach((field, fieldIndex) => {
    push([field.fieldName], { type: 'sectionTitle' });
    worksheet.mergeCells(worksheet.rowCount, 1, worksheet.rowCount, 5);

    push(
      [
        labels.columns.fieldCategory,
        labels.columns.quantity,
        labels.columns.breakdown,
        labels.columns.price,
        labels.columns.total,
      ],
      { type: 'tableHeader' },
    );

    for (const category of field.categories) {
      push(
        [
          category.fieldCategoryName,
          category.quantity,
          breakdownCellText(category.gradeGroupSplits, labels),
          `${category.price} ${category.currency}`,
          `${category.total} ${category.currency}`,
        ],
        { type: 'data' },
      );
    }

    if (fieldIndex < fields.length - 1) {
      push([], { type: 'blank' });
    }
  });

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
      } else if (meta.type === 'tableHeader') {
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
      } else if (meta.type === 'data') {
        if (tableDataRowCount % 2 === 1) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: ZEBRA_BG },
          };
        }
        cell.alignment = {
          horizontal: 'center',
          vertical: 'middle',
          wrapText: true,
        };
      } else if (meta.type === 'filter') {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: FILTER_BG },
        };
        cell.font = { italic: true };
      }
    });

    if (meta.type === 'data') {
      tableDataRowCount++;
    } else {
      tableDataRowCount = 0;
    }
  });

  worksheet.columns.forEach((col) => {
    col.width = 16;
  });
  worksheet.getColumn(1).width = 22;
  worksheet.getColumn(3).width = 28;

  const dateStamp = new Date().toISOString().slice(0, 10);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `israel-field-category-summary-${dateStamp}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
