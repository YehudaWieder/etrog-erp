import type { Row } from 'exceljs';

export async function downloadStyledExcel({
  sheetName,
  fileName,
  header,
  rows,
  rightToLeft,
  filterRowCount = 0,
}: {
  sheetName: string;
  fileName: string;
  header: Array<string | number> | Array<Array<string | number>>;
  rows: Array<Array<string | number>>;
  rightToLeft: boolean;
  filterRowCount?: number;
}) {
  if (typeof window === 'undefined') {
    return;
  }

  const { Workbook } = await import('exceljs');
  const workbook = new Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  // Determine if header is multi-row or single row
  const isMultiRowHeader = Array.isArray(header[0]);
  const headerRows = isMultiRowHeader ? (header as Array<Array<string | number>>) : [header as Array<string | number>];
  const headerRowCount = headerRows.length;

  // Add filter info rows first (if any)
  for (let i = 0; i < filterRowCount; i++) {
    if (i < rows.length) {
      worksheet.addRow(rows[i]);
    }
  }

  // Add header rows
  for (const headerRow of headerRows) {
    worksheet.addRow(headerRow);
  }

  // Merge category header cells (first header row if multi-row headers)
  if (isMultiRowHeader && headerRows.length > 0) {
    const firstHeaderRowIndex = filterRowCount + 1;
    const firstHeaderRow = worksheet.getRow(firstHeaderRowIndex);
    const processedCols = new Set<number>();

    for (let col = 1; col <= firstHeaderRow.cellCount; col++) {
      if (processedCols.has(col)) continue;

      const cell = firstHeaderRow.getCell(col);
      const cellValue = cell.value;

      // Skip empty cells
      if (cellValue === null || cellValue === '' || cellValue === undefined) continue;

      // Find how many empty cells follow this cell
      let endCol = col + 1;
      while (endCol <= firstHeaderRow.cellCount) {
        const nextCell = firstHeaderRow.getCell(endCol);
        if (nextCell.value === null || nextCell.value === '' || nextCell.value === undefined) {
          endCol++;
        } else {
          break;
        }
      }
      endCol--;

      // Merge if there are empty cells after this cell
      if (endCol > col) {
        worksheet.mergeCells(firstHeaderRowIndex, col, firstHeaderRowIndex, endCol);
        // Mark all columns in the merge as processed
        for (let i = col; i <= endCol; i++) {
          processedCols.add(i);
        }
      }
    }
  }

  // Add data rows (everything after filter rows)
  for (let i = filterRowCount; i < rows.length; i++) {
    worksheet.addRow(rows[i]);
  }

  const headerBg = 'FF1F5A32';
  const headerFont = 'FFFFFFFF';
  const borderColor = 'FFCCD9CF';
  const zebraBg = 'FFF8FCF9';

  for (let rowIndex = 1; rowIndex <= worksheet.rowCount; rowIndex += 1) {
    const row = worksheet.getRow(rowIndex);
    for (let colIndex = 1; colIndex <= worksheet.columnCount; colIndex += 1) {
      const cell = row.getCell(colIndex);
      const isFilterRow = rowIndex <= filterRowCount;
      const isHeader = rowIndex > filterRowCount && rowIndex <= filterRowCount + headerRowCount;
      const isDataRow = rowIndex > filterRowCount + headerRowCount;
      const isZebraDataRow = isDataRow && (rowIndex - filterRowCount - headerRowCount) % 2 === 1;

      // Only set alignment and borders for non-filter rows
      if (!isFilterRow) {
        cell.alignment = {
          horizontal: 'center',
          vertical: 'middle',
          wrapText: true,
        };

        cell.border = {
          top: { style: 'thin' as any, color: { argb: borderColor } },
          left: { style: 'thin' as any, color: { argb: borderColor } },
          bottom: { style: 'thin' as any, color: { argb: borderColor } },
          right: { style: 'thin' as any, color: { argb: borderColor } },
        };
      }

      if (isHeader) {
        cell.fill = {
          type: 'pattern' as any,
          pattern: 'solid' as any,
          fgColor: { argb: headerBg },
        };

        cell.font = {
          bold: true,
          color: { argb: headerFont },
        };
      } else if (isZebraDataRow) {
        cell.fill = {
          type: 'pattern' as any,
          pattern: 'solid' as any,
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
