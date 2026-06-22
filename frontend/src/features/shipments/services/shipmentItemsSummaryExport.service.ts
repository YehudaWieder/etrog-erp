import type { ShipmentItemsSummaryMatrix } from './shipmentItemsSummaryMatrix.service';
import type { ShipmentBreakdownMatrix } from './shipmentItemsCategoryMatrix.service';
import type { ShipmentItemsTableLabels, ShipmentRecord, ShipmentStatus } from '../shipments.types';

type ExportParams = {
  lang: 'he' | 'en';
  labels: ShipmentItemsTableLabels;
  summaryMatrix: ShipmentItemsSummaryMatrix;
  shipments: ShipmentRecord[];
  perShipmentMatrices: ShipmentBreakdownMatrix[];
  filterDisplayValues: { seasonLabel: string | null; ownershipLabel: string | null };
};

const PRINT_STYLE = `
  * { box-sizing: border-box; }
  body { margin: 0; padding: 22px; font-family: Assistant, sans-serif; color: #1f2a22; background: #fff; }
  h1 { margin: 0 0 14px; font-size: 22px; color: #1f4f29; text-align: center; }
  h2 { margin: 0 0 8px; font-size: 15px; color: #1f4f29; border-bottom: 2px solid #ccd9cf; padding-bottom: 4px; }
  h3 { margin: 0 0 6px; font-size: 13px; color: #2f5238; }
  .filters { margin-bottom: 20px; padding: 10px 14px; background: #f5f5f5; border-radius: 4px; font-size: 12px; border: 1px solid #ddd; break-inside: avoid; page-break-inside: avoid; }
  .filters strong { display: block; margin-bottom: 4px; }
  .section { margin-top: 20px; break-inside: avoid; page-break-inside: avoid; }
  .subsection { margin-top: 12px; break-inside: avoid; page-break-inside: avoid; }
  table { width: 100%; border-collapse: collapse; table-layout: auto; font-size: 10px; margin-bottom: 0; }
  thead { display: table-header-group; }
  tfoot { display: table-footer-group; }
  tr { break-inside: avoid; page-break-inside: avoid; }
  td { break-inside: avoid; page-break-inside: avoid; }
  th, td { border: 1px solid #ccd9cf; padding: 5px; text-align: center; white-space: nowrap; }
  th { background: #1f5a32; color: #fff; font-weight: 700; }
  tfoot tr { background: #e7f2eb !important; font-weight: 700; }
  tbody tr:nth-child(even) { background: #f8fcf9; }
  @page { size: A4 landscape; margin: 8mm; }
`;

function esc(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function filtersHtml(
  filterDisplayValues: ExportParams['filterDisplayValues'],
  labels: ShipmentItemsTableLabels,
  lang: 'he' | 'en',
): string {
  const parts: string[] = [];
  if (filterDisplayValues.seasonLabel) {
    parts.push(`${esc(labels.seasonFilterLabel)}: ${esc(filterDisplayValues.seasonLabel)}`);
  }
  if (filterDisplayValues.ownershipLabel) {
    parts.push(`${esc(labels.ownershipFilterLabel)}: ${esc(filterDisplayValues.ownershipLabel)}`);
  }
  if (parts.length === 0) return '';
  return `<div class="filters"><strong>${esc(lang === 'he' ? 'סינונים פעילים' : 'Active Filters')}:</strong>${parts.map((p) => `<div>${p}</div>`).join('')}</div>`;
}

function boxStatusTableHtml(shipments: ShipmentRecord[], labels: ShipmentItemsTableLabels): string {
  if (shipments.length === 0) return '';
  const sorted = [...shipments].sort((a, b) => a.shipmentNumber - b.shipmentNumber);
  const head = [labels.colShipmentNumber, labels.perShipmentTable.rowBoxes, labels.perShipmentTable.rowStatus];
  const thHtml = head.map((h) => `<th>${esc(h)}</th>`).join('');
  const tbodyHtml = sorted
    .map((s) => `<tr><td><strong>${s.shipmentNumber}</strong></td><td>${s.totalBoxes}</td><td>${esc(labels.perShipmentTable.statusLabels[s.status as ShipmentStatus] ?? s.status)}</td></tr>`)
    .join('');
  return `<div class="section"><h2>${esc(labels.perShipmentTable.title)}</h2><table><thead><tr>${thHtml}</tr></thead><tbody>${tbodyHtml}</tbody></table></div>`;
}

function summaryMatrixTableHtml(matrix: ShipmentItemsSummaryMatrix, labels: ShipmentItemsTableLabels): string {
  if (matrix.shipmentNumbers.length === 0) return '';
  const sm = labels.summaryMatrix;
  const header = [labels.colShipmentNumber, ...matrix.generalCategories.map((c) => c.categoryName), sm.privateSelectionLabel, sm.customersLabel, labels.summary.total];
  const thHtml = header.map((h) => `<th>${esc(String(h))}</th>`).join('');
  const tbodyHtml = matrix.shipmentNumbers
    .map((num) => {
      const cells = [
        `<td><strong>${num}</strong></td>`,
        ...matrix.generalCategories.map((c) => `<td>${c.bucket.quantities[num] ?? 0}</td>`),
        `<td>${matrix.privateSelection.quantities[num] ?? 0}</td>`,
        `<td>${matrix.customers.quantities[num] ?? 0}</td>`,
        `<td>${matrix.columnTotals[num] ?? 0}</td>`,
      ];
      return `<tr>${cells.join('')}</tr>`;
    })
    .join('');
  const tfootCells = [
    `<td><strong>${esc(sm.grandTotalLabel)}</strong></td>`,
    ...matrix.generalCategories.map((c) => `<td>${c.bucket.total}</td>`),
    `<td>${matrix.privateSelection.total}</td>`,
    `<td>${matrix.customers.total}</td>`,
    `<td>${matrix.grandTotal}</td>`,
  ];
  const tfootHtml = `<tr>${tfootCells.join('')}</tr>`;
  return `<div class="section"><h2>${esc(sm.title)}</h2><table><thead><tr>${thHtml}</tr></thead><tbody>${tbodyHtml}</tbody><tfoot>${tfootHtml}</tfoot></table></div>`;
}

function breakdownTablesHtml(perShipmentMatrices: ShipmentBreakdownMatrix[], labels: ShipmentItemsTableLabels): string {
  if (perShipmentMatrices.length === 0) return '';
  const sm = labels.summaryMatrix;
  const sections = perShipmentMatrices.map((m) => {
    const colLabels = m.columnKeys.map((k) => {
      if (k === 'privateSelection') return sm.privateSelectionLabel;
      if (k === 'customers') return sm.customersLabel;
      return k;
    });
    const header = [sm.ownerColumnLabel, ...colLabels, labels.summary.total];
    const thHtml = header.map((h) => `<th>${esc(String(h))}</th>`).join('');
    const tbodyHtml = m.ownershipNames
      .map((o) => {
        const cells = [
          `<td><strong>${esc(o)}</strong></td>`,
          ...m.columnKeys.map((k) => `<td>${m.values[o]?.[k] ?? 0}</td>`),
          `<td>${m.rowTotals[o] ?? 0}</td>`,
        ];
        return `<tr>${cells.join('')}</tr>`;
      })
      .join('');
    const tfootCells = [
      `<td><strong>${esc(sm.grandTotalLabel)}</strong></td>`,
      ...m.columnKeys.map((k) => `<td>${m.columnTotals[k] ?? 0}</td>`),
      `<td>${m.grandTotal}</td>`,
    ];
    return `<div class="subsection"><h3>${esc(sm.shipmentLabel)} ${m.shipmentNumber}</h3><table><thead><tr>${thHtml}</tr></thead><tbody>${tbodyHtml}</tbody><tfoot><tr>${tfootCells.join('')}</tr></tfoot></table></div>`;
  });
  return `<div class="section"><h2>${esc(labels.summaryMatrix.categoriesTitle)}</h2>${sections.join('')}</div>`;
}

export function printShipmentsSummary({
  lang,
  labels,
  summaryMatrix,
  shipments,
  perShipmentMatrices,
  filterDisplayValues,
}: ExportParams): void {
  if (typeof window === 'undefined') return;
  const win = window.open('', '_blank', 'width=1100,height=760');
  if (!win) return;
  const dir = lang === 'he' ? 'rtl' : 'ltr';
  const filtersSection = filtersHtml(filterDisplayValues, labels, lang);
  const section1 = boxStatusTableHtml(shipments, labels);
  const section2 = summaryMatrixTableHtml(summaryMatrix, labels);
  const section3 = breakdownTablesHtml(perShipmentMatrices, labels);
  win.document.write(`<!doctype html><html lang="${lang === 'he' ? 'he' : 'en'}" dir="${dir}"><head><meta charset="UTF-8"/><title>${esc(labels.summaryPrintTitle)}</title><style>${PRINT_STYLE}</style></head><body><h1>${esc(labels.summaryPrintTitle)}</h1>${filtersSection}${section1}${section2}${section3}</body></html>`);
  win.document.close();
  win.focus();
  win.print();
  win.close();
}

type ExcelRow = Array<string | number>;

type RowMeta =
  | { type: 'filter' | 'blank' }
  | { type: 'sectionHeader' | 'subHeader'; colCount: number }
  | { type: 'tableHeader' | 'data' | 'totals' };

const HEADER_BG = 'FF1F5A32';
const HEADER_FONT = 'FFFFFFFF';
const TOTALS_BG = 'FFE7F2EB';
const ZEBRA_BG = 'FFF8FCF9';
const BORDER = 'FFCCD9CF';
const FILTER_BG = 'FFF5F5F5';

export async function exportShipmentsSummaryToExcel({
  lang,
  labels,
  summaryMatrix,
  shipments,
  perShipmentMatrices,
  filterDisplayValues,
}: ExportParams): Promise<void> {
  if (typeof window === 'undefined') return;

  const { Workbook } = await import('exceljs');
  const workbook = new Workbook();
  const worksheet = workbook.addWorksheet(lang === 'he' ? 'סיכום משלוחים' : 'Shipments Summary');
  worksheet.views = [{ rightToLeft: lang === 'he' }];

  const allRows: ExcelRow[] = [];
  const meta: RowMeta[] = [];

  const push = (row: ExcelRow, m: RowMeta) => { allRows.push(row); meta.push(m); };

  // Filter rows
  const filterParts: string[] = [];
  if (filterDisplayValues.seasonLabel) filterParts.push(`${labels.seasonFilterLabel}: ${filterDisplayValues.seasonLabel}`);
  if (filterDisplayValues.ownershipLabel) filterParts.push(`${labels.ownershipFilterLabel}: ${filterDisplayValues.ownershipLabel}`);
  if (filterParts.length > 0) {
    push([lang === 'he' ? 'סינונים פעילים' : 'Active Filters'], { type: 'filter' });
    for (const part of filterParts) push([part], { type: 'filter' });
    push([], { type: 'blank' });
  }

  // Section 1: Box Status
  if (shipments.length > 0) {
    const sorted = [...shipments].sort((a, b) => a.shipmentNumber - b.shipmentNumber);
    const header: ExcelRow = [labels.colShipmentNumber, labels.perShipmentTable.rowBoxes, labels.perShipmentTable.rowStatus];
    push([labels.perShipmentTable.title], { type: 'sectionHeader', colCount: header.length });
    push(header, { type: 'tableHeader' });
    for (const s of sorted) push([s.shipmentNumber, s.totalBoxes, labels.perShipmentTable.statusLabels[s.status as ShipmentStatus] ?? s.status], { type: 'data' });
    push([], { type: 'blank' });
  }

  // Section 2: Summary Matrix
  if (summaryMatrix.shipmentNumbers.length > 0) {
    const sm = labels.summaryMatrix;
    const header: ExcelRow = [labels.colShipmentNumber, ...summaryMatrix.generalCategories.map((c) => c.categoryName), sm.privateSelectionLabel, sm.customersLabel, labels.summary.total];
    push([sm.title], { type: 'sectionHeader', colCount: header.length });
    push(header, { type: 'tableHeader' });
    for (const num of summaryMatrix.shipmentNumbers) {
      push([num, ...summaryMatrix.generalCategories.map((c) => c.bucket.quantities[num] ?? 0), summaryMatrix.privateSelection.quantities[num] ?? 0, summaryMatrix.customers.quantities[num] ?? 0, summaryMatrix.columnTotals[num] ?? 0], { type: 'data' });
    }
    push([sm.grandTotalLabel, ...summaryMatrix.generalCategories.map((c) => c.bucket.total), summaryMatrix.privateSelection.total, summaryMatrix.customers.total, summaryMatrix.grandTotal], { type: 'totals' });
    push([], { type: 'blank' });
  }

  // Section 3: Per-shipment breakdown
  if (perShipmentMatrices.length > 0) {
    const sm = labels.summaryMatrix;
    const maxBreakdownCols = Math.max(...perShipmentMatrices.map((m) => m.columnKeys.length + 2));
    push([labels.summaryMatrix.categoriesTitle], { type: 'sectionHeader', colCount: maxBreakdownCols });
    push([], { type: 'blank' });
    for (const m of perShipmentMatrices) {
      const colCount = m.columnKeys.length + 2;
      const colLabels = m.columnKeys.map((k) => k === 'privateSelection' ? sm.privateSelectionLabel : k === 'customers' ? sm.customersLabel : k);
      push([`${sm.shipmentLabel} ${m.shipmentNumber}`], { type: 'subHeader', colCount });
      push([sm.ownerColumnLabel, ...colLabels, labels.summary.total], { type: 'tableHeader' });
      for (const o of m.ownershipNames) push([o, ...m.columnKeys.map((k) => m.values[o]?.[k] ?? 0), m.rowTotals[o] ?? 0], { type: 'data' });
      push([sm.grandTotalLabel, ...m.columnKeys.map((k) => m.columnTotals[k] ?? 0), m.grandTotal], { type: 'totals' });
      push([], { type: 'blank' });
    }
  }

  // Write rows and apply styling
  let tableDataRowCount = 0;
  for (let i = 0; i < allRows.length; i++) {
    const wsRow = worksheet.addRow(allRows[i]);
    const m = meta[i];
    if (!m || m.type === 'blank') { tableDataRowCount = 0; continue; }

    const colCount = m.type === 'sectionHeader' || m.type === 'subHeader' ? m.colCount : allRows[i].length;

    // Reset zebra counter at each new table
    if (m.type === 'tableHeader') tableDataRowCount = 0;
    if (m.type === 'data') tableDataRowCount++;

    for (let col = 1; col <= colCount; col++) {
      const cell = wsRow.getCell(col);

      if (m.type === 'filter') {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: FILTER_BG } };
        cell.font = { size: 10, italic: true };
        continue;
      }

      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: false };
      cell.border = {
        top: { style: 'thin', color: { argb: BORDER } },
        left: { style: 'thin', color: { argb: BORDER } },
        bottom: { style: 'thin', color: { argb: BORDER } },
        right: { style: 'thin', color: { argb: BORDER } },
      };

      if (m.type === 'sectionHeader' || m.type === 'subHeader' || m.type === 'tableHeader') {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } };
        cell.font = { bold: true, color: { argb: HEADER_FONT } };
        if (m.type !== 'tableHeader') {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
      } else if (m.type === 'totals') {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TOTALS_BG } };
        cell.font = { bold: true };
      } else if (m.type === 'data' && tableDataRowCount % 2 === 0) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA_BG } };
      }
    }

    // Merge section/sub header across full table width
    if ((m.type === 'sectionHeader' || m.type === 'subHeader') && m.colCount > 1) {
      worksheet.mergeCells(wsRow.number, 1, wsRow.number, m.colCount);
    }
  }

  // Auto-fit columns
  const maxCols = allRows.reduce((max, row) => Math.max(max, row.length), 0);
  for (let col = 1; col <= maxCols; col++) {
    let maxLen = 0;
    worksheet.eachRow((row) => {
      const val = row.getCell(col).value;
      const len = val == null ? 0 : String(val).length;
      if (len > maxLen) maxLen = len;
    });
    worksheet.getColumn(col).width = Math.max(10, Math.min(maxLen + 2, 40));
  }

  const dateStamp = new Date().toISOString().slice(0, 10);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `shipments-summary-${dateStamp}.xlsx`;
  document.body.append(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
