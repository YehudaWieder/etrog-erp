import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import type {
  ClassificationDailySummaryCategory,
  ClassificationDailySummaryRow,
} from '../../../../services/classificationsApi';
import type { HarvestRecord } from '../../../../services/harvestsApi';
import type {
  FieldReportNumericColumnKey,
  HarvestFieldReportRow,
  HarvestNumericColumnKey,
  NumericSelectableColumnKey,
  NumericSelectionScope,
  SortingDailyNumericColumnKey,
} from '../../harvestPage.types';
import {
  FIELD_REPORT_NUMERIC_COLUMNS,
  HARVEST_NUMERIC_COLUMNS,
  SORTING_DAILY_NUMERIC_COLUMNS,
} from '../../utils/harvestPage.utils';
import interactiveStyles from '../../components/styles/HarvestInteractive.module.css';

type UseHarvestNumericSelectionParams = {
  lang: 'he' | 'en';
  isDailyDetailsTab: boolean;
  isFieldReportTab: boolean;
  isSortingDailyDetailsTab: boolean;
  harvestRows: HarvestRecord[];
  fieldFilterId: number | 'all';
  fieldReportRows: HarvestFieldReportRow[];
  sortingDailyRows: ClassificationDailySummaryRow[];
  sortingDailyCategories: ClassificationDailySummaryCategory[];
  isDragSelecting: boolean;
  setIsDragSelecting: (value: boolean) => void;
};

export function useHarvestNumericSelection({
  lang,
  isDailyDetailsTab,
  isFieldReportTab,
  isSortingDailyDetailsTab,
  harvestRows,
  fieldFilterId,
  fieldReportRows,
  sortingDailyRows,
  sortingDailyCategories,
  isDragSelecting,
  setIsDragSelecting,
}: UseHarvestNumericSelectionParams) {
  const [selectedNumericCells, setSelectedNumericCells] = useState<Record<string, number>>({});
  const dragSelectModeRef = useRef<'add' | 'remove'>('add');

  const buildNumericCellId = useCallback(
    (scope: NumericSelectionScope, rowId: number, column: NumericSelectableColumnKey) => `${scope}:${rowId}:${column}`,
    [],
  );

  const applyNumericCellSelection = useCallback((cellId: string, value: number) => {
    setSelectedNumericCells((prev) => {
      const next = { ...prev };

      if (dragSelectModeRef.current === 'add') {
        next[cellId] = value;
      } else {
        delete next[cellId];
      }

      return next;
    });
  }, []);

  const handleNumericCellPointerDown = useCallback(
    (scope: NumericSelectionScope, rowId: number, column: NumericSelectableColumnKey, value: number) =>
      (event: ReactPointerEvent) => {
        if (event.pointerType === 'mouse' && event.button !== 0) {
          return;
        }

        event.preventDefault();

        const cellId = buildNumericCellId(scope, rowId, column);
        dragSelectModeRef.current = selectedNumericCells[cellId] !== undefined ? 'remove' : 'add';
        applyNumericCellSelection(cellId, value);
        setIsDragSelecting(true);
      },
    [applyNumericCellSelection, buildNumericCellId, selectedNumericCells, setIsDragSelecting],
  );

  const handleNumericCellPointerEnter = useCallback(
    (scope: NumericSelectionScope, rowId: number, column: NumericSelectableColumnKey, value: number) => () => {
      if (!isDragSelecting) {
        return;
      }

      const cellId = buildNumericCellId(scope, rowId, column);
      applyNumericCellSelection(cellId, value);
    },
    [applyNumericCellSelection, buildNumericCellId, isDragSelecting],
  );

  const renderNumericCell = useCallback(
    (row: HarvestRecord, column: HarvestNumericColumnKey, value: number, content?: ReactNode) => {
      const cellId = buildNumericCellId('daily', row.id, column);
      const isSelected = selectedNumericCells[cellId] !== undefined;

      return (
        <button
          type="button"
          className={`${interactiveStyles.numericCell}${isSelected ? ` ${interactiveStyles.numericCellSelected}` : ''}`}
          onPointerDown={handleNumericCellPointerDown('daily', row.id, column, value)}
          onPointerEnter={handleNumericCellPointerEnter('daily', row.id, column, value)}
          aria-pressed={isSelected}
        >
          {content ?? value}
        </button>
      );
    },
    [buildNumericCellId, handleNumericCellPointerDown, handleNumericCellPointerEnter, selectedNumericCells],
  );

  const renderFieldReportNumericCell = useCallback(
    (row: HarvestFieldReportRow, column: FieldReportNumericColumnKey, value: number, content?: ReactNode) => {
      const cellId = buildNumericCellId('field-report', row.id, column);
      const isSelected = selectedNumericCells[cellId] !== undefined;

      return (
        <button
          type="button"
          className={`${interactiveStyles.numericCell}${isSelected ? ` ${interactiveStyles.numericCellSelected}` : ''}`}
          onPointerDown={handleNumericCellPointerDown('field-report', row.id, column, value)}
          onPointerEnter={handleNumericCellPointerEnter('field-report', row.id, column, value)}
          aria-pressed={isSelected}
        >
          {content ?? value}
        </button>
      );
    },
    [buildNumericCellId, handleNumericCellPointerDown, handleNumericCellPointerEnter, selectedNumericCells],
  );

  const renderSortingNumericCell = useCallback(
    (
      row: ClassificationDailySummaryRow,
      column: SortingDailyNumericColumnKey,
      value: number,
      content?: ReactNode,
      className?: string,
      selectedClassName?: string,
    ) => {
      const cellId = buildNumericCellId('sorting-daily', row.harvestId, column);
      const isSelected = selectedNumericCells[cellId] !== undefined;
      const baseClassName = className ?? interactiveStyles.numericCell;
      const appliedSelectedClassName = className
        ? selectedClassName
          ? ` ${selectedClassName}`
          : ' is-selected'
        : ` ${interactiveStyles.numericCellSelected}`;

      return (
        <button
          type="button"
          className={`${baseClassName}${isSelected ? appliedSelectedClassName : ''}`}
          onPointerDown={handleNumericCellPointerDown('sorting-daily', row.harvestId, column, value)}
          onPointerEnter={handleNumericCellPointerEnter('sorting-daily', row.harvestId, column, value)}
          aria-pressed={isSelected}
        >
          {content ?? value}
        </button>
      );
    },
    [buildNumericCellId, handleNumericCellPointerDown, handleNumericCellPointerEnter, selectedNumericCells],
  );

  useEffect(() => {
    const filteredHarvestRows = harvestRows.filter((row) => (fieldFilterId === 'all' ? true : row.fieldId === fieldFilterId));

    const activeScope: NumericSelectionScope | null = isDailyDetailsTab
      ? 'daily'
      : isFieldReportTab
        ? 'field-report'
        : isSortingDailyDetailsTab
          ? 'sorting-daily'
          : null;
    const activeRows = isDailyDetailsTab
      ? filteredHarvestRows
      : isFieldReportTab
        ? fieldReportRows
        : isSortingDailyDetailsTab
          ? sortingDailyRows
          : [];
    const activeColumns: NumericSelectableColumnKey[] = isDailyDetailsTab
      ? HARVEST_NUMERIC_COLUMNS
      : isFieldReportTab
        ? FIELD_REPORT_NUMERIC_COLUMNS
        : isSortingDailyDetailsTab
          ? [
              ...SORTING_DAILY_NUMERIC_COLUMNS,
              ...sortingDailyCategories.map((category) => `category:${category.key}` as SortingDailyNumericColumnKey),
            ]
          : [];

    if (!activeScope || activeRows.length === 0) {
      setSelectedNumericCells((prev) => (Object.keys(prev).length > 0 ? {} : prev));
      return;
    }

    const validIds = new Set(
      activeRows.map((row) => String('harvestId' in row ? row.harvestId : row.id)),
    );

    setSelectedNumericCells((prev) => {
      let changed = false;
      const next: Record<string, number> = {};

      for (const [cellId, value] of Object.entries(prev)) {
        const [scope, rowId, ...columnParts] = cellId.split(':');
        const column = columnParts.join(':');
        if (scope === activeScope && validIds.has(rowId) && activeColumns.includes(column as NumericSelectableColumnKey)) {
          next[cellId] = value;
        } else {
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [
    fieldFilterId,
    fieldReportRows,
    harvestRows,
    isDailyDetailsTab,
    isFieldReportTab,
    isSortingDailyDetailsTab,
    sortingDailyCategories,
    sortingDailyRows,
  ]);

  const selectedCellsCount = useMemo(() => Object.keys(selectedNumericCells).length, [selectedNumericCells]);

  const selectedCellsTotal = useMemo(
    () => Object.values(selectedNumericCells).reduce((sum, value) => sum + value, 0),
    [selectedNumericCells],
  );

  const formattedSelectedTotal = useMemo(() => {
    const locale = lang === 'he' ? 'he-IL' : 'en-US';
    return new Intl.NumberFormat(locale).format(selectedCellsTotal);
  }, [lang, selectedCellsTotal]);

  const clearSelectedNumericCells = useCallback(() => {
    setSelectedNumericCells({});
  }, []);

  return {
    clearSelectedNumericCells,
    formattedSelectedTotal,
    renderFieldReportNumericCell,
    renderNumericCell,
    renderSortingNumericCell,
    selectedCellsCount,
  };
}



