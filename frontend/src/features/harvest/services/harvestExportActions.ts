import type { MutableRefObject } from 'react';
import type { Row } from 'exceljs';
import { HARVEST_PRINT_BASE_STYLE } from './harvestPrintStyles';
import type { HarvestI18n } from '../i18n';
import type { HarvestExportTableData } from '../harvestPage.types';

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
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function downloadStyledExcel({
  sheetName,
  fileName,
  header,
  rows,
  rightToLeft,
}: {
  sheetName: string;
  fileName: string;
  header: Array<string | number>;
  rows: Array<Array<string | number>>;
  rightToLeft: boolean;
}) {
  if (typeof window === 'undefined') {
    return;
  }

  const { Workbook } = await import('exceljs');
  const workbook = new Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  worksheet.addRow(header);
  for (const row of rows) {
    worksheet.addRow(row);
  }

  const headerBg = 'FF1F5A32';
  const headerFont = 'FFFFFFFF';
  const borderColor = 'FFCCD9CF';
  const zebraBg = 'FFF8FCF9';

  for (let rowIndex = 1; rowIndex <= worksheet.rowCount; rowIndex += 1) {
    const row = worksheet.getRow(rowIndex);
    for (let colIndex = 1; colIndex <= worksheet.columnCount; colIndex += 1) {
      const cell = row.getCell(colIndex);
      const isHeader = rowIndex === 1;
      const isZebraDataRow = rowIndex > 1 && rowIndex % 2 === 0;

      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true,
      };

      cell.border = {
        top: { style: 'thin', color: { argb: borderColor } },
        left: { style: 'thin', color: { argb: borderColor } },
        bottom: { style: 'thin', color: { argb: borderColor } },
        right: { style: 'thin', color: { argb: borderColor } },
      };

      if (isHeader) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: headerBg },
        };

        cell.font = {
          bold: true,
          color: { argb: headerFont },
        };
      } else if (isZebraDataRow) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: zebraBg },
        };
      }
    }
  }

  for (let colIndex = 1; colIndex <= worksheet.columnCount; colIndex += 1) {
    let maxLength = 0;

    worksheet.eachRow((row: Row) => {
      const rawValue = row.getCell(colIndex).value;
      const textValue = rawValue === null || rawValue === undefined ? '' : String(rawValue);
      if (textValue.length > maxLength) {
        maxLength = textValue.length;
      }
    });

    worksheet.getColumn(colIndex).width = Math.max(10, Math.min(maxLength + 2, 40));
  }

  worksheet.views = [{ state: 'frozen', ySplit: 1, rightToLeft }];

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
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

    try {
      await downloadStyledExcel({
        sheetName: lang === 'he' ? 'קטיף יומי' : 'Harvest Daily',
        fileName: `harvest-daily-${dateStamp}.xlsx`,
        header,
        rows,
        rightToLeft: lang === 'he',
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

    try {
      await downloadStyledExcel({
        sheetName: t.fieldReport.sheetName,
        fileName: `harvest-field-report-${dateStamp}.xlsx`,
        header,
        rows,
        rightToLeft: lang === 'he',
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

            return `<tr>${fixedCells}${valueCells}</tr>`;
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
        const { Workbook } = await import('exceljs');
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
        ];

        const gradesHeaderRow: Array<string | number> = [
          '',
          '',
          '',
          ...groups.flatMap((group) => group.pitamGroups.flatMap((pitamGroup) => pitamGroup.grades)),
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

          return [row.dateGregorian, row.dateHebrew, row.fieldName, ...valueColumns];
        });

        const numericColumnCount = bodyRows[0]?.length ? Math.max(0, bodyRows[0].length - 3) : 0;
        const summaryValues = Array.from({ length: numericColumnCount }, (_, index) =>
          bodyRows.reduce((sum, row) => sum + (Number(row[index + 3]) || 0), 0),
        );
        const summaryRow: Array<string | number> = [lang === 'he' ? 'סה"כ' : 'Total', '', '', ...summaryValues];

        const workbook = new Workbook();
        const worksheet = workbook.addWorksheet(t.sortingDailyDetails.expandedSheetName);
        const excelRows = [topHeaderRow, pitamHeaderRow, gradesHeaderRow, ...bodyRows, summaryRow];

        for (const row of excelRows) {
          worksheet.addRow(row);
        }

        const headerBg = 'FF1F5A32';
        const headerFont = 'FFFFFFFF';
        const borderColor = 'FFCCD9CF';
        const zebraBg = 'FFF8FCF9';
        const summaryBg = 'FFE7F2EB';

        for (let fixedCol = 1; fixedCol <= matrix.fixedHeaders.length; fixedCol += 1) {
          worksheet.mergeCells(1, fixedCol, 3, fixedCol);
        }

        let currentCol = matrix.fixedHeaders.length + 1;

        for (const group of groups) {
          const groupColumns = group.pitamGroups.reduce((sum, pitamGroup) => sum + pitamGroup.grades.length, 0);
          if (groupColumns <= 0) {
            continue;
          }

          worksheet.mergeCells(1, currentCol, 1, currentCol + groupColumns - 1);

          for (const pitamGroup of group.pitamGroups) {
            const pitamColumns = pitamGroup.grades.length;
            if (pitamColumns <= 0) {
              continue;
            }

            worksheet.mergeCells(2, currentCol, 2, currentCol + pitamColumns - 1);
            currentCol += pitamColumns;
          }
        }

        const maxCol = worksheet.columnCount;
        const bodyStartRow = 4;
        const summaryRowIndex = bodyStartRow + bodyRows.length;
        for (let rowIndex = 1; rowIndex <= worksheet.rowCount; rowIndex += 1) {
          const row = worksheet.getRow(rowIndex);
          for (let colIndex = 1; colIndex <= maxCol; colIndex += 1) {
            const cell = row.getCell(colIndex);
            const isHeader = rowIndex <= 3;
            const isSummary = rowIndex === summaryRowIndex;
            const isZebraDataRow = rowIndex >= bodyStartRow && rowIndex < summaryRowIndex && rowIndex % 2 === 0;

            cell.alignment = {
              horizontal: 'center',
              vertical: 'middle',
              wrapText: true,
            };

            cell.border = {
              top: { style: 'thin', color: { argb: borderColor } },
              left: { style: 'thin', color: { argb: borderColor } },
              bottom: { style: 'thin', color: { argb: borderColor } },
              right: { style: 'thin', color: { argb: borderColor } },
            };

            if (isHeader) {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: headerBg },
              };

              cell.font = {
                bold: true,
                color: { argb: headerFont },
              };
            } else if (isSummary) {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: summaryBg },
              };

              cell.font = {
                bold: true,
                color: { argb: 'FF1F4F29' },
              };
            } else if (isZebraDataRow) {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: zebraBg },
              };

              cell.font = {
                color: { argb: 'FF1F2A22' },
              };
            } else {
              cell.font = {
                color: { argb: 'FF1F2A22' },
              };
            }
          }
        }

        const minimumWidths = [14, 14, 20];
        for (let colIndex = 1; colIndex <= worksheet.columnCount; colIndex += 1) {
          let maxLength = 0;

          worksheet.eachRow((row: Row) => {
            const rawValue = row.getCell(colIndex).value;
            const textValue = rawValue === null || rawValue === undefined ? '' : String(rawValue);
            if (textValue.length > maxLength) {
              maxLength = textValue.length;
            }
          });

          const minWidth = minimumWidths[colIndex - 1] ?? 8;
          worksheet.getColumn(colIndex).width = Math.max(minWidth, Math.min(maxLength + 2, 36));
        }

        worksheet.views = [{ state: 'frozen', xSplit: 3, ySplit: 3, rightToLeft: lang === 'he' }];

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');

        const dateStamp = new Date().toISOString().slice(0, 10);
        link.href = url;
        link.download = `sorting-daily-expanded-${dateStamp}.xlsx`;
        document.body.append(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } catch {
        window.alert(t.sortingDailyDetails.expandedExportError);
      }

      return;
    }

    try {
      const { header, rows } = createSortingDailyExportRows();
      const dateStamp = new Date().toISOString().slice(0, 10);

      await downloadStyledExcel({
        sheetName: t.sortingDailyDetails.sheetName,
        fileName: `sorting-daily-${dateStamp}.xlsx`,
        header,
        rows,
        rightToLeft: lang === 'he',
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
