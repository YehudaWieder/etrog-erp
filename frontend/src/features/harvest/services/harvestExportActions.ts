import type { MutableRefObject } from 'react';
import { HARVEST_PRINT_BASE_STYLE } from './harvestPrintStyles';
import type { HarvestI18n } from '../i18n';
import type { HarvestExportTableData } from '../harvestPage.types';
import type { Season } from '../../../services/seasonsApi';
import type { Field } from '../../../services/fieldsApi';
import { downloadStyledExcel } from '../../../services/exportExcel';

type ExpandedMatrixData = {
  fixedHeaders: string[];
  groups: Array<{
    categoryLabel: string;
    total: number;
    pitamGroups: Array<{
      key: string;
      label: string;
      grades: string[];
    }>;
  }>;
  rows: Array<{
    dateGregorian: string;
    dateHebrew: string;
    fieldName: string;
    traderTotal: number;
    customerTotal: number;
    values: Record<string, number>;
  }>;
};

type HarvestExportActionsParams = {
  lang: 'he' | 'en';
  t: HarvestI18n;
  numberFormatter: Intl.NumberFormat;
  sortingDownloadMenuCloseTimeoutRef: MutableRefObject<number | null>;
  createHarvestExportRows: () => HarvestExportTableData;
  createFieldReportExportRows: () => HarvestExportTableData;
  createSortingDailyExportRows: () => HarvestExportTableData;
  createSortingDailyExpandedMatrixData: () => Promise<ExpandedMatrixData>;
  filterValues?: Record<string, string>;
  seasons?: Season[];
  fields?: Field[];
};

function buildSortingDailyFilterRows(
  filterValues: Record<string, string> | undefined,
  seasons: Season[] | undefined,
  fields: Field[] | undefined,
  t: HarvestI18n,
  columnCount: number,
): Array<Array<string | number>> {
  const filterRows: Array<Array<string | number>> = [];

  if (filterValues?.seasonId && filterValues.seasonId !== 'undefined') {
    const season = seasons?.find(s => String(s.id) === filterValues.seasonId);
    const seasonLabel = season?.yearName || filterValues.seasonId;
    if (seasonLabel && seasonLabel !== 'undefined') {
      filterRows.push([
        `${t.sortingDailyDetails.filters.seasonFilterLabel}: ${seasonLabel}`,
        ...Array(columnCount - 1).fill(''),
      ]);
    }
  }

  if (filterValues?.fieldId && filterValues.fieldId !== 'all') {
    const field = fields?.find(f => String(f.id) === filterValues.fieldId);
    const fieldLabel = field?.name || filterValues.fieldId;
    if (fieldLabel && fieldLabel !== 'undefined') {
      filterRows.push([
        `${t.sortingDailyDetails.filters.fieldFilterLabel}: ${fieldLabel}`,
        ...Array(columnCount - 1).fill(''),
      ]);
    }
  }

  if (filterValues?.sortingAssignmentType && filterValues.sortingAssignmentType !== 'all') {
    let assignmentLabel = '';
    if (filterValues.sortingAssignmentType === 'trader') {
      assignmentLabel = t.sortingDailyDetails.filters.assignmentOptions.trader;
    } else if (filterValues.sortingAssignmentType === 'customer') {
      assignmentLabel = t.sortingDailyDetails.filters.assignmentOptions.customer;
    }
    if (assignmentLabel) {
      filterRows.push([
        `${t.sortingDailyDetails.filters.assignmentFilterLabel}: ${assignmentLabel}`,
        ...Array(columnCount - 1).fill(''),
      ]);
    }
  }

  return filterRows;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildFilterDetailsHtml(
  filterValues: Record<string, string> | undefined,
  seasons: Season[] | undefined,
  fields: Field[] | undefined,
  t: HarvestI18n,
  lang: 'he' | 'en',
  variant: 'daily' | 'field-report' | 'sorting-daily' = 'daily',
): string {
  if (!filterValues) {
    return '';
  }

  const filters: string[] = [];

  // Season filter
  if (filterValues.seasonId && filterValues.seasonId !== 'undefined') {
    const season = seasons?.find(s => String(s.id) === filterValues.seasonId);
    const seasonLabel = season?.yearName || filterValues.seasonId;
    const label = variant === 'sorting-daily' 
      ? t.sortingDailyDetails.filters.seasonFilterLabel 
      : t.dailyDetails.filters.seasonFilterLabel;
    if (seasonLabel && seasonLabel !== 'undefined') {
      filters.push(`${label}: ${seasonLabel}`);
    }
  }

  // Field filter
  if (filterValues.fieldId && filterValues.fieldId !== 'all') {
    const field = fields?.find(f => String(f.id) === filterValues.fieldId);
    const fieldLabel = field?.name || filterValues.fieldId;
    const label = variant === 'sorting-daily'
      ? t.sortingDailyDetails.filters.fieldFilterLabel
      : t.dailyDetails.filters.fieldFilterLabel;
    if (fieldLabel && fieldLabel !== 'undefined') {
      filters.push(`${label}: ${fieldLabel}`);
    }
  }

  // Sorting assignment filter (for sorting-daily only)
  if (variant === 'sorting-daily' && filterValues.sortingAssignmentType) {
    const assignmentType = filterValues.sortingAssignmentType;
    let assignmentLabel = '';
    
    if (assignmentType === 'all') {
      assignmentLabel = t.sortingDailyDetails.filters.assignmentOptions.all;
    } else if (assignmentType === 'trader') {
      assignmentLabel = t.sortingDailyDetails.filters.assignmentOptions.trader;
    } else if (assignmentType === 'customer') {
      assignmentLabel = t.sortingDailyDetails.filters.assignmentOptions.customer;
    }
    
    if (assignmentLabel) {
      filters.push(`${t.sortingDailyDetails.filters.assignmentFilterLabel}: ${assignmentLabel}`);
    }
  }

  if (filters.length === 0) {
    return '';
  }

  return `
    <div style="margin-bottom: 20px; padding: 12px; background: #f5f5f5; border-radius: 4px; font-size: 12px; border: 1px solid #ddd;">
      <strong>${escapeHtml(lang === 'he' ? 'סינונים פעילים' : 'Active Filters')}:</strong><br/>
      ${filters.map(f => `<div style="margin-top: 4px;">${escapeHtml(f)}</div>`).join('')}
    </div>
  `;
}

export function createHarvestExportActions({
  lang,
  t,
  numberFormatter,
  sortingDownloadMenuCloseTimeoutRef,
  createHarvestExportRows,
  createFieldReportExportRows,
  createSortingDailyExportRows,
  createSortingDailyExpandedMatrixData,
  filterValues = {},
  seasons = [],
  fields = [],
}: HarvestExportActionsParams) {
  const handlePrintHarvestTable = () => {
    if (typeof window === 'undefined') {
      return;
    }

    const { header, rows } = createHarvestExportRows();
    const tableHeaderHtml = header.map((label) => `<th>${escapeHtml(String(label))}</th>`).join('');
    const tableRowsHtml = rows
      .map((row) => `<tr>${row.map((value) => `<td>${escapeHtml(String(value))}</td>`).join('')}</tr>`)
      .join('');

    const printWindow = window.open('', '_blank', 'width=1100,height=760');
    if (!printWindow) {
      return;
    }

    const printTitle = t.dailyDetails.printWindowTitle;
    const filterDetailsHtml = buildFilterDetailsHtml(filterValues, seasons, fields, t, lang, 'daily');

    printWindow.document.write(`
      <!doctype html>
      <html lang="${lang === 'he' ? 'he' : 'en'}" dir="${lang === 'he' ? 'rtl' : 'ltr'}">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${escapeHtml(printTitle)}</title>
          <style>${HARVEST_PRINT_BASE_STYLE}</style>
        </head>
        <body>
          <h1>${escapeHtml(printTitle)}</h1>
          ${filterDetailsHtml}
          <table>
            <thead>
              <tr>${tableHeaderHtml}</tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const handleExportHarvestTableToExcel = async () => {
    if (typeof window === 'undefined') {
      return;
    }

    const { header, rows } = createHarvestExportRows();
    const dateStamp = new Date().toISOString().slice(0, 10);
    const columnCount = header.length;

    // Build filter information rows (one row per filter)
    const filterRows: Array<Array<string | number>> = [];
    if (filterValues.seasonId && filterValues.seasonId !== 'undefined') {
      const season = seasons.find(s => String(s.id) === filterValues.seasonId);
      const seasonLabel = season?.yearName || filterValues.seasonId;
      if (seasonLabel && seasonLabel !== 'undefined') {
        const filterRow = [
          `${t.dailyDetails.filters.seasonFilterLabel}: ${seasonLabel}`,
          ...Array(columnCount - 1).fill(''),
        ];
        filterRows.push(filterRow);
      }
    }
    if (filterValues.fieldId && filterValues.fieldId !== 'all') {
      const field = fields.find(f => String(f.id) === filterValues.fieldId);
      const fieldLabel = field?.name || filterValues.fieldId;
      if (fieldLabel && fieldLabel !== 'undefined') {
        const filterRow = [
          `${t.dailyDetails.filters.fieldFilterLabel}: ${fieldLabel}`,
          ...Array(columnCount - 1).fill(''),
        ];
        filterRows.push(filterRow);
      }
    }

    try {
      await downloadStyledExcel({
        sheetName: lang === 'he' ? 'קטיף יומי' : 'Harvest Daily',
        fileName: `harvest-daily-${dateStamp}.xlsx`,
        header,
        rows: [...filterRows, [], ...rows],
        rightToLeft: lang === 'he',
        filterRowCount: filterRows.length + 1,
      });
    } catch {
      window.alert(t.dailyDetails.exportError);
    }
  };

  const handlePrintFieldReportTable = () => {
    if (typeof window === 'undefined') {
      return;
    }

    const { header, rows } = createFieldReportExportRows();
    const tableHeaderHtml = header.map((label) => `<th>${escapeHtml(String(label))}</th>`).join('');
    const tableRowsHtml = rows
      .map((row) => `<tr>${row.map((value) => `<td>${escapeHtml(String(value))}</td>`).join('')}</tr>`)
      .join('');

    const printWindow = window.open('', '_blank', 'width=1200,height=760');
    if (!printWindow) {
      return;
    }

    const printTitle = t.fieldReport.printWindowTitle;
    const filterDetailsHtml = buildFilterDetailsHtml(filterValues, seasons, fields, t, lang, 'field-report');

    printWindow.document.write(`
      <!doctype html>
      <html lang="${lang === 'he' ? 'he' : 'en'}" dir="${lang === 'he' ? 'rtl' : 'ltr'}">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${escapeHtml(printTitle)}</title>
          <style>${HARVEST_PRINT_BASE_STYLE}</style>
        </head>
        <body>
          <h1>${escapeHtml(printTitle)}</h1>
          ${filterDetailsHtml}
          <table>
            <thead>
              <tr>${tableHeaderHtml}</tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const handleExportFieldReportTableToExcel = async () => {
    if (typeof window === 'undefined') {
      return;
    }

    const { header, rows } = createFieldReportExportRows();
    const dateStamp = new Date().toISOString().slice(0, 10);
    const columnCount = header.length;

    // Build filter information rows (one row per filter)
    const filterRows: Array<Array<string | number>> = [];
    if (filterValues.seasonId && filterValues.seasonId !== 'undefined') {
      const season = seasons.find(s => String(s.id) === filterValues.seasonId);
      const seasonLabel = season?.yearName || filterValues.seasonId;
      if (seasonLabel && seasonLabel !== 'undefined') {
        const filterRow = [
          `${t.dailyDetails.filters.seasonFilterLabel}: ${seasonLabel}`,
          ...Array(columnCount - 1).fill(''),
        ];
        filterRows.push(filterRow);
      }
    }

    try {
      await downloadStyledExcel({
        sheetName: t.fieldReport.sheetName,
        fileName: `harvest-field-report-${dateStamp}.xlsx`,
        header,
        rows: [...filterRows, [], ...rows],
        rightToLeft: lang === 'he',
        filterRowCount: filterRows.length + 1,
      });
    } catch {
      window.alert(t.fieldReport.exportError);
    }
  };

  const closeSortingActionMenu = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const menu = target.closest('.global-filters-bar__icon-menu');
    if (menu instanceof HTMLDetailsElement) {
      menu.open = false;
    }
  };

  const cancelSortingDownloadMenuClose = () => {
    if (sortingDownloadMenuCloseTimeoutRef.current !== null) {
      window.clearTimeout(sortingDownloadMenuCloseTimeoutRef.current);
      sortingDownloadMenuCloseTimeoutRef.current = null;
    }
  };

  const scheduleSortingDownloadMenuClose = (menu: HTMLDetailsElement) => {
    cancelSortingDownloadMenuClose();
    sortingDownloadMenuCloseTimeoutRef.current = window.setTimeout(() => {
      menu.open = false;
      sortingDownloadMenuCloseTimeoutRef.current = null;
    }, 180);
  };

  const handlePrintSortingDailyTable = async (variant: 'summary' | 'expanded') => {
    if (typeof window === 'undefined') {
      return;
    }

    let tableHeaderHtml = '';
    let tableRowsHtml = '';

    if (variant === 'expanded') {
      try {
        const matrix = await createSortingDailyExpandedMatrixData();
        const groups = matrix.groups.filter(
          (group) => group.pitamGroups.reduce((sum, pitamGroup) => sum + pitamGroup.grades.length, 0) > 0,
        );

        const topHeader = [
          ...matrix.fixedHeaders.map((label) => `<th rowspan="3">${escapeHtml(label)}</th>`),
          ...groups.map((group) => {
            const groupColumnCount = group.pitamGroups.reduce((sum, pitamGroup) => sum + pitamGroup.grades.length, 0);
            return `<th colspan="${groupColumnCount}">${escapeHtml(group.categoryLabel)} (${escapeHtml(numberFormatter.format(group.total))})</th>`;
          }),
          `<th rowspan="3">${escapeHtml(t.sortingDailyDetails.columns.traderTotal)}</th>`,
          `<th rowspan="3">${escapeHtml(t.sortingDailyDetails.columns.customerTotal)}</th>`,
          `<th rowspan="3">${escapeHtml(t.sortingDailyDetails.columns.totalSorted)}</th>`,
        ].join('');

        const pitamHeader = groups
          .flatMap((group) =>
            group.pitamGroups.map(
              (pitamGroup) => `<th colspan="${pitamGroup.grades.length}">${escapeHtml(pitamGroup.label)}</th>`,
            ),
          )
          .join('');

        const gradeHeader = groups
          .flatMap((group) =>
            group.pitamGroups.flatMap((pitamGroup) => pitamGroup.grades.map((grade) => `<th>${escapeHtml(grade)}</th>`)),
          )
          .join('');

        tableHeaderHtml = `<tr>${topHeader}</tr><tr>${pitamHeader}</tr><tr>${gradeHeader}</tr>`;

        tableRowsHtml = matrix.rows
          .map((row) => {
            const fixedCells = [
              `<td>${escapeHtml(row.dateGregorian)}</td>`,
              `<td>${escapeHtml(row.dateHebrew)}</td>`,
              `<td>${escapeHtml(row.fieldName)}</td>`,
            ].join('');

            const valueCells = groups
              .flatMap((group) =>
                group.pitamGroups.flatMap((pitamGroup) =>
                  pitamGroup.grades.map((grade) => {
                    const cellKey = `${group.categoryLabel}::${pitamGroup.key}::${grade}`;
                    return `<td>${escapeHtml(numberFormatter.format(row.values[cellKey] ?? 0))}</td>`;
                  }),
                ),
              )
              .join('');

            const rowDailyTotal = Object.values(row.values).reduce((sum, value) => sum + (Number(value) || 0), 0) + row.traderTotal + row.customerTotal;

            const summaryCells = [
              `<td><strong>${escapeHtml(numberFormatter.format(row.traderTotal))}</strong></td>`,
              `<td><strong>${escapeHtml(numberFormatter.format(row.customerTotal))}</strong></td>`,
              `<td><strong>${escapeHtml(numberFormatter.format(rowDailyTotal))}</strong></td>`,
            ].join('');

            return `<tr>${fixedCells}${valueCells}${summaryCells}</tr>`;
          })
          .join('');
      } catch {
        window.alert(t.sortingDailyDetails.expandedPrintError);
        return;
      }
    } else {
      const { header, rows } = createSortingDailyExportRows();
      tableHeaderHtml = `<tr>${header.map((label) => `<th>${escapeHtml(String(label))}</th>`).join('')}</tr>`;
      tableRowsHtml = rows
        .map((row) => `<tr>${row.map((value) => `<td>${escapeHtml(String(value))}</td>`).join('')}</tr>`)
        .join('');
    }

    const printWindow = window.open('', '_blank', 'width=1200,height=760');
    if (!printWindow) {
      return;
    }

    const printTitle = variant === 'expanded' ? t.sortingDailyDetails.expandedPrintWindowTitle : t.sortingDailyDetails.printWindowTitle;
    const filterDetailsHtml = buildFilterDetailsHtml(filterValues, seasons, fields, t, lang, 'sorting-daily');

    printWindow.document.write(`
      <!doctype html>
      <html lang="${lang === 'he' ? 'he' : 'en'}" dir="${lang === 'he' ? 'rtl' : 'ltr'}">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${escapeHtml(printTitle)}</title>
          <style>${HARVEST_PRINT_BASE_STYLE}</style>
        </head>
        <body>
          <h1>${escapeHtml(printTitle)}</h1>
          ${filterDetailsHtml}
          <table>
            <thead>
              ${tableHeaderHtml}
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const handleExportSortingDailyTableToExcel = async (variant: 'summary' | 'expanded') => {
    if (typeof window === 'undefined') {
      return;
    }

    if (variant === 'expanded') {
      try {
        const matrix = await createSortingDailyExpandedMatrixData();
        const groups = matrix.groups.filter(
          (group) => group.pitamGroups.reduce((sum, pitamGroup) => sum + pitamGroup.grades.length, 0) > 0,
        );

        const topHeaderRow: Array<string | number> = [
          ...matrix.fixedHeaders,
          ...groups.flatMap((group) =>
            group.pitamGroups.flatMap((pitamGroup, pitamIndex) =>
              pitamGroup.grades.map((_, gradeIndex) =>
                pitamIndex === 0 && gradeIndex === 0 ? `${group.categoryLabel} (${numberFormatter.format(group.total)})` : '',
              ),
            ),
          ),
          t.sortingDailyDetails.columns.traderTotal,
          t.sortingDailyDetails.columns.customerTotal,
          t.sortingDailyDetails.columns.totalSorted,
        ];

        const pitamHeaderRow: Array<string | number> = [
          '',
          '',
          '',
          ...groups.flatMap((group) =>
            group.pitamGroups.flatMap((pitamGroup) =>
              pitamGroup.grades.map((_, gradeIndex) => (gradeIndex === 0 ? pitamGroup.label : '')),
            ),
          ),
          '',
          '',
        ];

        const gradesHeaderRow: Array<string | number> = [
          '',
          '',
          '',
          ...groups.flatMap((group) => group.pitamGroups.flatMap((pitamGroup) => pitamGroup.grades)),
          '',
          '',
        ];

        const bodyRows = matrix.rows.map((row) => {
          const valueColumns = groups.flatMap((group) =>
            group.pitamGroups.flatMap((pitamGroup) =>
              pitamGroup.grades.map((grade) => {
                const cellKey = `${group.categoryLabel}::${pitamGroup.key}::${grade}`;
                return row.values[cellKey] ?? 0;
              }),
            ),
          );

          const rowDailyTotal = valueColumns.reduce((sum, value) => sum + (Number(value) || 0), 0) + row.traderTotal + row.customerTotal;
          return [row.dateGregorian, row.dateHebrew, row.fieldName, ...valueColumns, row.traderTotal, row.customerTotal, rowDailyTotal];
        });

        const numericColumnCount = bodyRows[0]?.length ? Math.max(0, bodyRows[0].length - 3) : 0;
        const summaryValues = Array.from({ length: numericColumnCount }, (_, index) =>
          bodyRows.reduce((sum, row) => sum + (Number(row[index + 3]) || 0), 0),
        );
        const summaryRow: Array<string | number> = [t.sortingDailyDetails.table.total, '', '', ...summaryValues];

        const filterRows = buildSortingDailyFilterRows(filterValues, seasons, fields, t, numericColumnCount + 3);
        const dateStamp = new Date().toISOString().slice(0, 10);
        const emptyRowAfterFilters = filterRows.length > 0 ? [[]] : [];
        
        await downloadStyledExcel({
          sheetName: t.sortingDailyDetails.expandedSheetName,
          fileName: `sorting-daily-expanded-${dateStamp}.xlsx`,
          header: [topHeaderRow, pitamHeaderRow, gradesHeaderRow],
          rows: [...filterRows, ...emptyRowAfterFilters, ...bodyRows, summaryRow],
          rightToLeft: lang === 'he',
          filterRowCount: filterRows.length + emptyRowAfterFilters.length,
        });
      } catch {
        window.alert(t.sortingDailyDetails.expandedExportError);
      }

      return;
    }

    try {
      const { header, rows } = createSortingDailyExportRows();
      const dateStamp = new Date().toISOString().slice(0, 10);
      const columnCount = header.length;

      const filterRows = buildSortingDailyFilterRows(filterValues, seasons, fields, t, columnCount);

      await downloadStyledExcel({
        sheetName: t.sortingDailyDetails.sheetName,
        fileName: `sorting-daily-${dateStamp}.xlsx`,
        header,
        rows: [...filterRows, [], ...rows],
        rightToLeft: lang === 'he',
        filterRowCount: filterRows.length + 1,
      });
    } catch {
      window.alert(t.sortingDailyDetails.exportError);
    }
  };

  return {
    handlePrintHarvestTable,
    handleExportHarvestTableToExcel,
    handlePrintFieldReportTable,
    handleExportFieldReportTableToExcel,
    closeSortingActionMenu,
    cancelSortingDownloadMenuClose,
    scheduleSortingDownloadMenuClose,
    handlePrintSortingDailyTable,
    handleExportSortingDailyTableToExcel,
  };
}
