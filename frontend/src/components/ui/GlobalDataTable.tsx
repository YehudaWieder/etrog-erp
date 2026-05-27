import type { ReactNode } from 'react';

export type GlobalDataTableColumn<RowT> = {
  id: string;
  header: ReactNode;
  headerLabel?: string;
  minWidth?: string;
  gridTemplate?: string;
  align?: 'start' | 'center' | 'end';
  render: (row: RowT) => ReactNode;
};

type GlobalDataTableProps<RowT> = {
  columns: GlobalDataTableColumn<RowT>[];
  rows: RowT[];
  getRowKey: (row: RowT) => string | number;
  emptyLabel: string;
  className?: string;
};

export function GlobalDataTable<RowT>({
  columns,
  rows,
  getRowKey,
  emptyLabel,
  className,
}: GlobalDataTableProps<RowT>): JSX.Element {
  const getColumnLabel = (column: GlobalDataTableColumn<RowT>): string => {
    if (column.headerLabel) {
      return column.headerLabel;
    }

    return typeof column.header === 'string' ? column.header : '';
  };

  const templateColumns = columns
    .map((column) => column.gridTemplate ?? `minmax(${column.minWidth ?? '120px'}, 1fr)`)
    .join(' ');
  const minTableWidthPx = columns.reduce((total, column) => {
    const parsed = Number.parseFloat(column.minWidth ?? '120');
    return Number.isFinite(parsed) ? total + parsed : total + 120;
  }, 0);
  const minTableWidth = `${Math.max(minTableWidthPx, 0)}px`;
  const responsiveMinWidth = `max(100%, ${minTableWidth})`;

  return (
    <div className={`global-data-table${className ? ` ${className}` : ''}`}>
      <div className="global-data-table__viewport">
        <div
          className="global-data-table__header"
          style={{
            gridTemplateColumns: templateColumns,
            minWidth: responsiveMinWidth,
          }}
          role="row"
        >
          {columns.map((column) => (
            <div
              key={column.id}
              className={`global-data-table__cell global-data-table__cell--head global-data-table__cell--${column.align ?? 'start'}`}
              role="columnheader"
            >
              {column.header}
            </div>
          ))}
        </div>

        {rows.length === 0 ? (
          <div className="global-data-table__empty">{emptyLabel}</div>
        ) : (
          <div className="global-data-table__body" style={{ minWidth: responsiveMinWidth }} role="rowgroup">
            {rows.map((row) => (
              <div
                key={getRowKey(row)}
                className="global-data-table__row"
                style={{ gridTemplateColumns: templateColumns }}
                role="row"
              >
                {columns.map((column) => (
                  <div
                    key={column.id}
                    className={`global-data-table__cell global-data-table__cell--${column.align ?? 'start'}`}
                    data-label={getColumnLabel(column)}
                    role="cell"
                  >
                    {column.render(row)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
