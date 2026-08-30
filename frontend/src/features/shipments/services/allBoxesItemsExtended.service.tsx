import ReactDOMServer from 'react-dom/server';
import { getShipmentItemsByBox } from '../../../services/shipmentItemsApi';
import { getTraderCategoriesWithShares } from '../../../services/traderCategoriesApi';
import { openPrintableWindow } from '../../../services/printWindow';
import { downloadStyledExcel } from '../../../services/exportExcel';
import type { BoxesTableLabels, BoxesTableRow } from '../shipments.types';
import { buildBoxItemsDetailRows, computeShipmentItemDetailRowSpans, type ShipmentItemDetailRow } from './shipmentItemsDetailRows.service';
import { SHIPMENT_DETAILS_PRINT_EXTRA_STYLES } from './shipmentDetailsPrintStyles';
import { ShipmentItemsDetailTable } from '../components/ShipmentItemsDetailTable';

type ExtendedParams = {
  lang: 'he' | 'en';
  labels: BoxesTableLabels;
  rows: BoxesTableRow[];
  seasonId: number | null;
  filterDisplayValues: {
    seasonLabel: string | null;
    shipmentNumberLabel: string | null;
    boxNumberLabel: string | null;
    statusLabel: string | null;
    ownershipLabel: string | null;
  };
};

function esc(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildFiltersHtml(
  filterDisplayValues: ExtendedParams['filterDisplayValues'],
  labels: BoxesTableLabels,
  lang: 'he' | 'en',
): string {
  const parts: string[] = [];
  if (filterDisplayValues.seasonLabel) parts.push(`${esc(labels.seasonFilterLabel)}: ${esc(filterDisplayValues.seasonLabel)}`);
  if (filterDisplayValues.shipmentNumberLabel) parts.push(`${esc(labels.shipmentNumberFilterLabel)}: ${esc(filterDisplayValues.shipmentNumberLabel)}`);
  if (filterDisplayValues.boxNumberLabel) parts.push(`${esc(labels.boxNumberFilterLabel)}: ${esc(filterDisplayValues.boxNumberLabel)}`);
  if (filterDisplayValues.statusLabel) parts.push(`${esc(labels.boxStatusFilterLabel)}: ${esc(filterDisplayValues.statusLabel)}`);
  if (filterDisplayValues.ownershipLabel) parts.push(`${esc(labels.ownershipFilterLabel)}: ${esc(filterDisplayValues.ownershipLabel)}`);
  if (parts.length === 0) return '';
  return `<div class="filters"><strong>${esc(lang === 'he' ? 'סינונים פעילים' : 'Active Filters')}:</strong>${parts.map((p) => `<div>${p}</div>`).join('')}</div>`;
}

async function buildExtendedRows(rows: BoxesTableRow[], labels: BoxesTableLabels, seasonId: number | null): Promise<ShipmentItemDetailRow[]> {
  const traderCategoryOrder = new Map<string, number>();
  if (seasonId) {
    try {
      const categories = await getTraderCategoriesWithShares(seasonId);
      for (const category of categories) {
        traderCategoryOrder.set(category.name, category.orderIndex);
      }
    } catch {
      // fall back to unordered categories
    }
  }

  const rowsByBox = await Promise.all(
    rows.map(async (row) => {
      const items = await getShipmentItemsByBox(row.id);
      return buildBoxItemsDetailRows(items, row.boxNumber, labels.detailsItemsTable, traderCategoryOrder, row.shipmentNumber);
    }),
  );

  return rowsByBox.flat();
}

export async function printAllBoxesItemsExtended({ lang, labels, rows, seasonId, filterDisplayValues }: ExtendedParams): Promise<void> {
  if (typeof window === 'undefined' || rows.length === 0) {
    return;
  }

  const detailRows = await buildExtendedRows(rows, labels, seasonId);
  const table = (
    <ShipmentItemsDetailTable
      rows={detailRows}
      labels={labels.detailsItemsTable}
      shipmentNumberColumnLabel={labels.colShipmentNumber}
    />
  );

  openPrintableWindow({
    title: labels.tableExtendedPrintTitle,
    heading: labels.tableExtendedPrintTitle,
    direction: lang === 'he' ? 'rtl' : 'ltr',
    html: buildFiltersHtml(filterDisplayValues, labels, lang) + ReactDOMServer.renderToStaticMarkup(table),
    extraStyles: `${SHIPMENT_DETAILS_PRINT_EXTRA_STYLES}
      .filters { margin: 0 0 20px; padding: 10px 14px; background: #f5f5f5; border-radius: 4px; font-size: 12px; border: 1px solid #ddd; break-inside: avoid; page-break-inside: avoid; }
      .filters strong { display: block; margin-bottom: 4px; }
    `,
  });
}

export async function exportAllBoxesItemsExtendedToExcel({ lang, labels, rows, seasonId, filterDisplayValues }: ExtendedParams): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  const detailRows = await buildExtendedRows(rows, labels, seasonId);
  const itemsLabels = labels.detailsItemsTable;
  const header = [
    labels.colShipmentNumber,
    itemsLabels.colBoxNumber,
    itemsLabels.colOwnership,
    itemsLabels.colStockSource,
    itemsLabels.colCategory,
    itemsLabels.colGrade,
    itemsLabels.colPitamStatus,
    itemsLabels.colQuantity,
    itemsLabels.colGeneralSourceBreakdown,
    itemsLabels.colNotes,
  ];

  const dataRows = detailRows.map((row) => [
    String(row.shipmentNumber ?? ''),
    String(row.boxNumber),
    row.ownership,
    row.stockSource,
    row.category,
    row.grade,
    row.pitamStatus,
    String(row.quantity),
    row.generalSourceBreakdown && row.generalSourceBreakdown.length > 0
      ? row.generalSourceBreakdown
          .map((entry) => `${entry.traderName ?? itemsLabels.generalSourceModuloLabel}: ${entry.quantity}`)
          .join('; ')
      : '',
    row.notes,
  ]);

  const dateStamp = new Date().toISOString().slice(0, 10);
  const filterRows: Array<Array<string>> = [];
  if (filterDisplayValues.seasonLabel) filterRows.push([`${labels.seasonFilterLabel}: ${filterDisplayValues.seasonLabel}`, ...Array(header.length - 1).fill('')]);
  if (filterDisplayValues.shipmentNumberLabel) filterRows.push([`${labels.shipmentNumberFilterLabel}: ${filterDisplayValues.shipmentNumberLabel}`, ...Array(header.length - 1).fill('')]);
  if (filterDisplayValues.boxNumberLabel) filterRows.push([`${labels.boxNumberFilterLabel}: ${filterDisplayValues.boxNumberLabel}`, ...Array(header.length - 1).fill('')]);
  if (filterDisplayValues.statusLabel) filterRows.push([`${labels.boxStatusFilterLabel}: ${filterDisplayValues.statusLabel}`, ...Array(header.length - 1).fill('')]);
  if (filterDisplayValues.ownershipLabel) filterRows.push([`${labels.ownershipFilterLabel}: ${filterDisplayValues.ownershipLabel}`, ...Array(header.length - 1).fill('')]);

  const rowSpans = computeShipmentItemDetailRowSpans(detailRows);

  await downloadStyledExcel({
    sheetName: lang === 'he' ? 'פירוט פריטים' : 'Items breakdown',
    fileName: `all-boxes-items-${dateStamp}.xlsx`,
    header,
    rows: filterRows.length > 0 ? [...filterRows, [], ...dataRows] : dataRows,
    rightToLeft: lang === 'he',
    filterRowCount: filterRows.length > 0 ? filterRows.length + 1 : 0,
    mergeColumns: [
      { colIndex: 2, rowSpans: rowSpans.boxNumber },
      { colIndex: 3, rowSpans: rowSpans.ownership },
      { colIndex: 4, rowSpans: rowSpans.stockSource },
      { colIndex: 5, rowSpans: rowSpans.category },
    ],
  });
}
