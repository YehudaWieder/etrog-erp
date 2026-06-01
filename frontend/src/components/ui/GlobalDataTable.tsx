import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import styles from './styles/GlobalDataTable.module.css';

export const GLOBAL_DATA_TABLE_WIDTHS = {
  action: '72px',
  dateShort: '120px',
  dateLong: '132px',
  fieldName: '116px',
  numeric: '104px',
  numericWide: '110px',
  numericPercent: '112px',
} as const;

export type GlobalDataTableColumn<RowT> = {
  id: string;
  header: ReactNode;
  headerLabel?: string;
  sortKey?: string;
  sortLabel?: string;
  defaultSortDirection?: 'asc' | 'desc';
  sortAccessor?: (row: RowT) => string | number | boolean | Date | null | undefined;
  sortComparator?: (left: RowT, right: RowT) => number;
  minWidth?: string;
  gridTemplate?: string;
  align?: 'start' | 'center' | 'end';
  render: (row: RowT) => ReactNode;
};

export type GlobalDataTableSortState = {
  key: string;
  direction: 'asc' | 'desc';
};

type GlobalDataTableProps<RowT> = {
  columns: GlobalDataTableColumn<RowT>[];
  rows: RowT[];
  getRowKey: (row: RowT) => string | number;
  emptyLabel: string;
  className?: string;
  sortState?: GlobalDataTableSortState | null;
  onSort?: (key: string) => void;
  defaultSortState?: GlobalDataTableSortState | null;
  onSortedRowsChange?: (rows: RowT[]) => void;
};

function normalizeSortableValue(value: string | number | boolean | Date | null | undefined): string | number {
  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (value == null) {
    return '';
  }

  return String(value);
}

function compareSortableValues(left: string | number, right: string | number): number {
  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }

  return String(left).localeCompare(String(right), undefined, {
    sensitivity: 'base',
    numeric: true,
  });
}

export function GlobalDataTable<RowT>({
  columns,
  rows,
  getRowKey,
  emptyLabel,
  className,
  sortState,
  onSort,
  defaultSortState,
  onSortedRowsChange,
}: GlobalDataTableProps<RowT>): JSX.Element {
  const [internalSortState, setInternalSortState] = useState<GlobalDataTableSortState | null>(defaultSortState ?? null);
  const lastSortedRowsSignatureRef = useRef<string>('');
  const alignClassName = {
    start: styles.cellStart,
    center: styles.cellCenter,
    end: styles.cellEnd,
  } as const;

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
  const activeSortState = sortState ?? internalSortState;

  const sortedRows = useMemo(() => {
    if (!activeSortState) {
      return rows;
    }

    const activeColumn = columns.find((column) => column.sortKey === activeSortState.key);
    if (!activeColumn) {
      return rows;
    }

    const directionFactor = activeSortState.direction === 'asc' ? 1 : -1;
    const nextRows = [...rows];

    nextRows.sort((leftRow, rightRow) => {
      let comparison = 0;

      if (activeColumn.sortComparator) {
        comparison = activeColumn.sortComparator(leftRow, rightRow);
      } else if (activeColumn.sortAccessor) {
        const leftValue = normalizeSortableValue(activeColumn.sortAccessor(leftRow));
        const rightValue = normalizeSortableValue(activeColumn.sortAccessor(rightRow));
        comparison = compareSortableValues(leftValue, rightValue);
      }

      if (comparison !== 0) {
        return comparison * directionFactor;
      }

      const leftKey = getRowKey(leftRow);
      const rightKey = getRowKey(rightRow);

      return compareSortableValues(normalizeSortableValue(leftKey), normalizeSortableValue(rightKey));
    });

    return nextRows;
  }, [activeSortState, columns, getRowKey, rows]);

  useEffect(() => {
    if (!onSortedRowsChange) {
      return;
    }

    const nextSignature = sortedRows.map((row) => String(getRowKey(row))).join('|');
    if (lastSortedRowsSignatureRef.current === nextSignature) {
      return;
    }

    lastSortedRowsSignatureRef.current = nextSignature;
    onSortedRowsChange(sortedRows);
  }, [getRowKey, onSortedRowsChange, sortedRows]);

  const handleSort = (column: GlobalDataTableColumn<RowT>) => {
    if (!column.sortKey) {
      return;
    }

    const nextSortState: GlobalDataTableSortState =
      activeSortState?.key !== column.sortKey
        ? {
            key: column.sortKey,
            direction: column.defaultSortDirection ?? 'desc',
          }
        : {
            key: column.sortKey,
            direction: activeSortState.direction === 'desc' ? 'asc' : 'desc',
          };

    if (onSort) {
      onSort(column.sortKey);
      return;
    }

    setInternalSortState(nextSortState);
  };

  const renderHeaderContent = (column: GlobalDataTableColumn<RowT>) => {
    if (!column.sortKey || (!onSort && !column.sortAccessor && !column.sortComparator)) {
      return column.header;
    }

    const isActive = activeSortState?.key === column.sortKey;
    const direction = isActive ? activeSortState.direction : null;
    const sortButtonLabel = column.sortLabel ?? getColumnLabel(column);

    return (
      <button
        type="button"
        className={`global-data-table__sort-button ${styles.sortButton}${isActive ? ` is-active ${styles.sortButtonActive}` : ''}`}
        onClick={() => handleSort(column)}
        aria-label={sortButtonLabel}
      >
        <span className={`global-data-table__sort-label ${styles.sortLabel}`}>{column.header}</span>
        <span className={`global-data-table__sort-indicator ${styles.sortIndicator}`} aria-hidden="true">
          {direction === 'asc' ? '▲' : direction === 'desc' ? '▼' : '↕'}
        </span>
      </button>
    );
  };

  return (
    <div className={`global-data-table ${styles.root}${className ? ` ${className}` : ''}`}>
      <div className={`global-data-table__viewport ${styles.viewport}`}>
        <div
          className={`global-data-table__header ${styles.header}`}
          style={{
            gridTemplateColumns: templateColumns,
            width: responsiveMinWidth,
            minWidth: responsiveMinWidth,
          }}
          role="row"
        >
          {columns.map((column) => (
            <div
              key={column.id}
              className={`global-data-table__cell global-data-table__cell--head global-data-table__cell--${column.align ?? 'center'} ${styles.cell} ${styles.cellHead} ${alignClassName[column.align ?? 'center']}`}
              role="columnheader"
            >
              {renderHeaderContent(column)}
            </div>
          ))}
        </div>

        {sortedRows.length === 0 ? (
          <div className={`global-data-table__empty ${styles.empty}`}>{emptyLabel}</div>
        ) : (
          <div className={`global-data-table__body ${styles.body}`} style={{ width: responsiveMinWidth, minWidth: responsiveMinWidth }} role="rowgroup">
            {sortedRows.map((row) => (
              <div
                key={getRowKey(row)}
                className={`global-data-table__row ${styles.row}`}
                style={{
                  gridTemplateColumns: templateColumns,
                  minWidth: responsiveMinWidth,
                  width: responsiveMinWidth,
                }}
                role="row"
              >
                {columns.map((column) => (
                  <div
                    key={column.id}
                    className={`global-data-table__cell global-data-table__cell--${column.align ?? 'center'} ${styles.cell} ${alignClassName[column.align ?? 'center']}`}
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
