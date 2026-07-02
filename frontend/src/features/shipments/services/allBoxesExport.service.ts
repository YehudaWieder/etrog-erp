import type { BoxesTableLabels, BoxesTableRow } from '../shipments.types';
import type { BoxStatus } from '../../../services/boxesApi';
import { downloadStyledExcel } from '../../../services/exportExcel';

type FilterDisplay = {
  seasonLabel: string | null;
  shipmentNumberLabel: string | null;
  boxNumberLabel: string | null;
  statusLabel: string | null;
  ownershipLabel: string | null;
};

type ExportParams = {
  lang: 'he' | 'en';
  labels: BoxesTableLabels;
  rows: BoxesTableRow[];
  filterDisplayValues: FilterDisplay;
};

const PRINT_STYLE = `
  * { box-sizing: border-box; }
  body { margin: 0; padding: 22px; font-family: Assistant, sans-serif; color: #1f2a22; background: #fff; }
  h1 { margin: 0 0 14px; font-size: 22px; color: #1f4f29; text-align: center; }
  .filters { margin-bottom: 20px; padding: 10px 14px; background: #f5f5f5; border-radius: 4px; font-size: 12px; border: 1px solid #ddd; break-inside: avoid; page-break-inside: avoid; }
  .filters strong { display: block; margin-bottom: 4px; }
  .section { break-inside: avoid; page-break-inside: avoid; }
  table { width: 100%; border-collapse: collapse; table-layout: auto; font-size: 10px; }
  thead { display: table-header-group; }
  tr { break-inside: avoid; page-break-inside: avoid; }
  td { break-inside: avoid; page-break-inside: avoid; }
  th, td { border: 1px solid #ccd9cf; padding: 5px; text-align: center; white-space: nowrap; }
  th { background: #1f5a32; color: #fff; font-weight: 700; }
  tbody tr:nth-child(even) { background: #f8fcf9; }
  @page { size: A4 landscape; margin: 8mm; }
`;

function esc(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildHeader(labels: BoxesTableLabels): string[] {
  return [
    labels.colBoxNumber,
    labels.colShipmentNumber,
    labels.colBoxType,
    labels.colQuantity,
    labels.colStatus,
    labels.colOwnership,
  ];
}

function buildDataRows(rows: BoxesTableRow[], labels: BoxesTableLabels): string[][] {
  return rows.map((r) => [
    String(r.boxNumber),
    String(r.shipmentNumber),
    labels.boxTypeLabels[r.boxType] ?? r.boxType,
    String(r.totalQuantity),
    labels.statusLabels[r.status as BoxStatus] ?? r.status,
    r.ownership,
  ]);
}

function filtersHtml(filterDisplayValues: FilterDisplay, labels: BoxesTableLabels, lang: 'he' | 'en'): string {
  const parts: string[] = [];
  if (filterDisplayValues.seasonLabel) parts.push(`${esc(labels.seasonFilterLabel)}: ${esc(filterDisplayValues.seasonLabel)}`);
  if (filterDisplayValues.shipmentNumberLabel) parts.push(`${esc(labels.shipmentNumberFilterLabel)}: ${esc(filterDisplayValues.shipmentNumberLabel)}`);
  if (filterDisplayValues.boxNumberLabel) parts.push(`${esc(labels.boxNumberFilterLabel)}: ${esc(filterDisplayValues.boxNumberLabel)}`);
  if (filterDisplayValues.statusLabel) parts.push(`${esc(labels.boxStatusFilterLabel)}: ${esc(filterDisplayValues.statusLabel)}`);
  if (filterDisplayValues.ownershipLabel) parts.push(`${esc(labels.ownershipFilterLabel)}: ${esc(filterDisplayValues.ownershipLabel)}`);
  if (parts.length === 0) return '';
  return `<div class="filters"><strong>${esc(lang === 'he' ? 'סינונים פעילים' : 'Active Filters')}:</strong>${parts.map((p) => `<div>${p}</div>`).join('')}</div>`;
}

function buildFilterRows(filterDisplayValues: FilterDisplay, labels: BoxesTableLabels, colCount: number): string[][] {
  const rows: string[][] = [];
  const empty = Array<string>(colCount - 1).fill('');
  if (filterDisplayValues.seasonLabel) rows.push([`${labels.seasonFilterLabel}: ${filterDisplayValues.seasonLabel}`, ...empty]);
  if (filterDisplayValues.shipmentNumberLabel) rows.push([`${labels.shipmentNumberFilterLabel}: ${filterDisplayValues.shipmentNumberLabel}`, ...empty]);
  if (filterDisplayValues.boxNumberLabel) rows.push([`${labels.boxNumberFilterLabel}: ${filterDisplayValues.boxNumberLabel}`, ...empty]);
  if (filterDisplayValues.statusLabel) rows.push([`${labels.boxStatusFilterLabel}: ${filterDisplayValues.statusLabel}`, ...empty]);
  if (filterDisplayValues.ownershipLabel) rows.push([`${labels.ownershipFilterLabel}: ${filterDisplayValues.ownershipLabel}`, ...empty]);
  return rows;
}

export function printAllBoxes({ lang, labels, rows, filterDisplayValues }: ExportParams): void {
  if (typeof window === 'undefined') return;
  const win = window.open('', '_blank', 'width=1100,height=760');
  if (!win) return;

  const header = buildHeader(labels);
  const dataRows = buildDataRows(rows, labels);
  const dir = lang === 'he' ? 'rtl' : 'ltr';
  const thHtml = header.map((h) => `<th>${esc(h)}</th>`).join('');
  const tbodyHtml = dataRows.map((r) => `<tr>${r.map((v) => `<td>${esc(v)}</td>`).join('')}</tr>`).join('');

  win.document.write(`<!doctype html><html lang="${lang === 'he' ? 'he' : 'en'}" dir="${dir}"><head><meta charset="UTF-8"/><title>${esc(labels.tablePrintTitle)}</title><style>${PRINT_STYLE}</style></head><body><h1>${esc(labels.tablePrintTitle)}</h1>${filtersHtml(filterDisplayValues, labels, lang)}<div class="section"><table><thead><tr>${thHtml}</tr></thead><tbody>${tbodyHtml}</tbody></table></div></body></html>`);
  win.document.close();
  win.focus();
  win.print();
  win.close();
}

export async function exportAllBoxesToExcel({ lang, labels, rows, filterDisplayValues }: ExportParams): Promise<void> {
  if (typeof window === 'undefined') return;

  const header = buildHeader(labels);
  const dataRows = buildDataRows(rows, labels);
  const filterRows = buildFilterRows(filterDisplayValues, labels, header.length);
  const dateStamp = new Date().toISOString().slice(0, 10);

  await downloadStyledExcel({
    sheetName: lang === 'he' ? 'כל הקרטונים' : 'All Boxes',
    fileName: `all-boxes-${dateStamp}.xlsx`,
    header,
    rows: filterRows.length > 0 ? [...filterRows, [], ...dataRows] : dataRows,
    rightToLeft: lang === 'he',
    filterRowCount: filterRows.length > 0 ? filterRows.length + 1 : 0,
  });
}
