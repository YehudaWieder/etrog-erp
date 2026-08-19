import { useCallback, useMemo } from 'react';
import { FaWarehouse, FaBoxOpen, FaBoxesStacked, FaSeedling, FaPersonWalking, FaTrashCan, FaScaleBalanced } from 'react-icons/fa6';
import type { IsraelStockRecord } from '../../../../../services/israelStockApi';
import type { IsraelInventoryI18n } from '../../i18n';
import { HARVEST_GRADE_OPTIONS } from '../../../../harvest/utils/harvestPage.utils';
import { GlobalDataTable, type GlobalDataTableColumn, GLOBAL_DATA_TABLE_WIDTHS } from '../../../../../components/ui/GlobalDataTable';
import { GlobalFiltersBar, type GlobalFilterControl } from '../../../../../components/ui/GlobalFiltersBar';
import { openPrintableWindow } from '../../../../../services/printWindow';
import { downloadStyledExcel } from '../../../../../services/exportExcel';
import { TraderMovementsPrintExportActions } from '../../../../traders/components/TraderMovementsPrintExportActions';
import styles from '../../../../traders/components/styles/TraderMovementsSection.module.css';
import summaryStyles from '../../../../traders/components/styles/TraderInventoryAllSection.module.css';

const SHIPMENT_MOVEMENT_TYPES = new Set(['PACKED_SHIPPED', 'SELF_PICKUP']);
const MOVEMENT_TYPE_ICONS: Record<string, JSX.Element> = {
  HARVEST_IN: <FaSeedling aria-hidden="true" />,
  PACKED_SHIPPED: <FaBoxesStacked aria-hidden="true" />,
  SELF_PICKUP: <FaPersonWalking aria-hidden="true" />,
  WASTE: <FaTrashCan aria-hidden="true" />,
  ADJUSTMENT: <FaScaleBalanced aria-hidden="true" />,
};
const MOVEMENT_TYPE_ORDER = ['HARVEST_IN', 'PACKED_SHIPPED', 'SELF_PICKUP', 'WASTE', 'ADJUSTMENT'];

type FilterOption = {
  value: string;
  label: string;
};

type IsraelMovementsSectionProps = {
  lang: 'he' | 'en';
  labels: IsraelInventoryI18n['movements'];
  movements: IsraelStockRecord[];
  isLoading: boolean;
  error: string;
  onRetry: () => void;
  seasonId?: string;
  fieldId?: string;
  categoryId?: string;
  movementStatus?: 'ALL' | 'NON_SHIPMENT' | 'SHIPMENT';
  grade?: string;
  pitamStatus?: string;
  seasonOptions?: FilterOption[];
  fieldOptions?: FilterOption[];
  categoryOptions?: FilterOption[];
  onSeasonChange?: (seasonId: string) => void;
  onFieldChange?: (fieldId: string) => void;
  onCategoryChange?: (categoryId: string) => void;
  onMovementStatusChange?: (status: string) => void;
  onGradeChange?: (grade: string) => void;
  onPitamStatusChange?: (pitamStatus: string) => void;
};

export function IsraelMovementsSection({
  lang,
  labels,
  movements,
  isLoading,
  error,
  onRetry,
  seasonId = '',
  fieldId = 'all',
  categoryId = 'all',
  movementStatus = 'ALL',
  grade = 'ALL',
  pitamStatus = 'ALL',
  seasonOptions = [],
  fieldOptions = [],
  categoryOptions = [],
  onSeasonChange,
  onFieldChange,
  onCategoryChange,
  onMovementStatusChange,
  onGradeChange,
  onPitamStatusChange,
}: IsraelMovementsSectionProps) {
  const movementStatusOptions = useMemo<FilterOption[]>(
    () => [
      { value: 'ALL', label: labels.movementStatusOptions.all },
      { value: 'NON_SHIPMENT', label: labels.movementStatusOptions.nonShipment },
      { value: 'SHIPMENT', label: labels.movementStatusOptions.shipment },
    ],
    [labels],
  );

  const gradeOptions = useMemo<FilterOption[]>(() => {
    const defaultGrades = [...HARVEST_GRADE_OPTIONS] as string[];
    const dataGrades = Array.from(new Set(movements.map((movement) => movement.grade).filter(Boolean)));
    const extraGrades = dataGrades
      .filter((value) => !defaultGrades.includes(value))
      .sort((left, right) => left.localeCompare(right, lang === 'he' ? 'he' : 'en', { sensitivity: 'base' }));
    const uniqueGrades = [...defaultGrades, ...extraGrades];

    return [
      { value: 'ALL', label: labels.allGradesOption },
      ...uniqueGrades.map((value) => ({ value, label: value })),
    ];
  }, [labels.allGradesOption, lang, movements]);

  const pitamStatusOptions = useMemo<FilterOption[]>(() => {
    const defaultPitamStatuses = ['WITH_PITAM', 'WITHOUT_PITAM', 'MIXED'];
    const dataPitamStatuses = Array.from(new Set(movements.map((movement) => movement.pitamStatus).filter(Boolean)));
    const extraPitamStatuses = dataPitamStatuses.filter((status) => !defaultPitamStatuses.includes(status));
    const uniquePitamStatuses = [...defaultPitamStatuses, ...extraPitamStatuses];

    return [
      { value: 'ALL', label: labels.allPitamStatusesOption },
      ...uniquePitamStatuses.map((value) => ({
        value,
        label: labels.pitamStatuses[value as keyof typeof labels.pitamStatuses] || value,
      })),
    ];
  }, [labels, movements]);

  const filteredMovements = useMemo(() => {
    return movements.filter((movement) => {
      if (categoryId !== 'all' && String(movement.categoryId) !== categoryId) {
        return false;
      }

      if (movementStatus === 'SHIPMENT' && !SHIPMENT_MOVEMENT_TYPES.has(movement.type)) {
        return false;
      }

      if (movementStatus === 'NON_SHIPMENT' && SHIPMENT_MOVEMENT_TYPES.has(movement.type)) {
        return false;
      }

      if (grade !== 'ALL' && movement.grade !== grade) {
        return false;
      }

      if (pitamStatus !== 'ALL' && movement.pitamStatus !== pitamStatus) {
        return false;
      }

      return true;
    });
  }, [categoryId, grade, movementStatus, movements, pitamStatus]);

  const numberFormatter = useMemo(() => new Intl.NumberFormat(lang === 'he' ? 'he-IL' : 'en-US'), [lang]);

  const summaryTotals = useMemo(() => {
    let totalInventory = 0;
    let packed = 0;

    for (const movement of filteredMovements) {
      if (SHIPMENT_MOVEMENT_TYPES.has(movement.type)) {
        packed += Math.abs(movement.quantity);
      } else {
        totalInventory += movement.quantity;
      }
    }

    return { totalInventory, notPacked: totalInventory - packed, packed };
  }, [filteredMovements]);

  const summaryByType = useMemo(() => {
    const totals = new Map<string, number>();
    for (const movement of filteredMovements) {
      totals.set(movement.type, (totals.get(movement.type) ?? 0) + Math.abs(movement.quantity));
    }
    return MOVEMENT_TYPE_ORDER.filter((type) => totals.has(type)).map((type) => ({
      type,
      label: labels.movementTypes[type as keyof typeof labels.movementTypes] || type,
      quantity: totals.get(type) ?? 0,
    }));
  }, [filteredMovements, labels]);

  const filterControls = useMemo<GlobalFilterControl[]>(() => {
    const controls: GlobalFilterControl[] = [];

    if (seasonOptions.length > 0) {
      controls.push({
        id: 'movements-seasonId',
        label: labels.seasonFilterLabel,
        value: seasonId || '',
        options: seasonOptions.map((opt) => ({ value: opt.value, label: opt.label })),
        onChange: (value) => onSeasonChange?.(value),
      });
    }

    controls.push({
      id: 'movements-fieldId',
      label: labels.fieldFilterLabel,
      value: fieldId || 'all',
      options: [{ value: 'all', label: labels.allFieldsOption }, ...fieldOptions.map((opt) => ({ value: opt.value, label: opt.label }))],
      onChange: (value) => onFieldChange?.(value),
    });

    controls.push({
      id: 'movements-category',
      label: labels.categoryFilterLabel,
      value: categoryId || 'all',
      options: [{ value: 'all', label: labels.allCategoriesOption }, ...categoryOptions.map((opt) => ({ value: opt.value, label: opt.label }))],
      onChange: (value) => onCategoryChange?.(value),
    });

    controls.push({
      id: 'movements-status',
      label: labels.movementStatusFilterLabel,
      value: movementStatus || 'ALL',
      options: movementStatusOptions.map((opt) => ({ value: opt.value, label: opt.label })),
      onChange: (value) => onMovementStatusChange?.(value),
    });

    controls.push({
      id: 'movements-grade',
      label: labels.gradeFilterLabel,
      value: grade || 'ALL',
      options: gradeOptions.map((opt) => ({ value: opt.value, label: opt.label })),
      onChange: (value) => onGradeChange?.(value),
    });

    controls.push({
      id: 'movements-pitamStatus',
      label: labels.pitamStatusFilterLabel,
      value: pitamStatus || 'ALL',
      options: pitamStatusOptions.map((opt) => ({ value: opt.value, label: opt.label })),
      onChange: (value) => onPitamStatusChange?.(value),
    });

    return controls;
  }, [
    seasonId,
    seasonOptions,
    fieldId,
    fieldOptions,
    categoryId,
    categoryOptions,
    movementStatus,
    movementStatusOptions,
    grade,
    gradeOptions,
    pitamStatus,
    pitamStatusOptions,
    labels,
    onSeasonChange,
    onFieldChange,
    onCategoryChange,
    onMovementStatusChange,
    onGradeChange,
    onPitamStatusChange,
  ]);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US');
    } catch {
      return dateStr;
    }
  };

  const getMovementTypeLabel = (type: string): string =>
    labels.movementTypes[type as keyof typeof labels.movementTypes] || type;

  const getPitamStatusLabel = (status: string): string =>
    labels.pitamStatuses[status as keyof typeof labels.pitamStatuses] || status;

  const getMovementStatusLabel = (status: string): string => {
    if (status === 'SHIPMENT') return labels.movementStatusOptions.shipment;
    if (status === 'NON_SHIPMENT') return labels.movementStatusOptions.nonShipment;
    return labels.movementStatusOptions.all;
  };

  const getFieldLabel = (movement: IsraelStockRecord): string => movement.field?.name || '—';

  const columns = useMemo<GlobalDataTableColumn<IsraelStockRecord>[]>(() => {
    return [
      {
        id: 'date',
        header: labels.columns.date,
        headerLabel: labels.columns.date,
        sortKey: 'date',
        sortAccessor: (row) => row.date,
        minWidth: GLOBAL_DATA_TABLE_WIDTHS.dateLong,
        align: 'center',
        render: (row) => formatDate(row.date),
      },
      {
        id: 'type',
        header: labels.columns.type,
        headerLabel: labels.columns.type,
        sortKey: 'type',
        sortAccessor: (row) => getMovementTypeLabel(row.type),
        minWidth: '140px',
        align: 'center',
        render: (row) => getMovementTypeLabel(row.type),
      },
      {
        id: 'field',
        header: labels.columns.field,
        headerLabel: labels.columns.field,
        sortKey: 'field',
        sortAccessor: (row) => getFieldLabel(row),
        minWidth: '120px',
        align: 'center',
        render: (row) => getFieldLabel(row),
      },
      {
        id: 'category',
        header: labels.columns.category,
        headerLabel: labels.columns.category,
        sortKey: 'category',
        sortAccessor: (row) => row.category?.name || '',
        minWidth: '120px',
        align: 'center',
        render: (row) => row.category?.name || '—',
      },
      {
        id: 'grade',
        header: labels.columns.grade,
        headerLabel: labels.columns.grade,
        sortKey: 'grade',
        sortAccessor: (row) => row.grade,
        minWidth: '80px',
        align: 'center',
        render: (row) => row.grade,
      },
      {
        id: 'pitamStatus',
        header: labels.columns.pitamStatus,
        headerLabel: labels.columns.pitamStatus,
        sortKey: 'pitamStatus',
        sortAccessor: (row) => getPitamStatusLabel(row.pitamStatus),
        minWidth: '140px',
        align: 'center',
        render: (row) => getPitamStatusLabel(row.pitamStatus),
      },
      {
        id: 'quantity',
        header: labels.columns.quantity,
        headerLabel: labels.columns.quantity,
        sortKey: 'quantity',
        sortAccessor: (row) => row.quantity,
        minWidth: GLOBAL_DATA_TABLE_WIDTHS.numeric,
        align: 'center',
        render: (row) => String(row.quantity),
      },
    ];
  }, [labels]);

  const handlePrint = useCallback(() => {
    const escapeHtml = (text: string): string => {
      const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
      return String(text).replace(/[&<>"']/g, (char) => map[char]);
    };

    const getFilterDetails = (): string[] => {
      const filters: string[] = [];

      if (seasonId) {
        const seasonLabel = seasonOptions.find((opt) => opt.value === seasonId)?.label || seasonId;
        filters.push(`${labels.seasonFilterLabel}: ${escapeHtml(seasonLabel)}`);
      }

      if (fieldId && fieldId !== 'all') {
        const fieldLabel = fieldOptions.find((opt) => opt.value === fieldId)?.label || fieldId;
        filters.push(`${labels.fieldFilterLabel}: ${escapeHtml(fieldLabel)}`);
      }

      if (categoryId && categoryId !== 'all') {
        const categoryLabel = categoryOptions.find((opt) => opt.value === categoryId)?.label || categoryId;
        filters.push(`${labels.categoryFilterLabel}: ${escapeHtml(categoryLabel)}`);
      }

      if (movementStatus && movementStatus !== 'ALL') {
        filters.push(`${labels.movementStatusFilterLabel}: ${escapeHtml(getMovementStatusLabel(movementStatus))}`);
      }

      if (grade && grade !== 'ALL') {
        filters.push(`${labels.gradeFilterLabel}: ${escapeHtml(grade)}`);
      }

      if (pitamStatus && pitamStatus !== 'ALL') {
        filters.push(`${labels.pitamStatusFilterLabel}: ${escapeHtml(getPitamStatusLabel(pitamStatus))}`);
      }

      return filters;
    };

    const tableHeaderHtml = [
      labels.columns.date,
      labels.columns.type,
      labels.columns.field,
      labels.columns.category,
      labels.columns.grade,
      labels.columns.pitamStatus,
      labels.columns.quantity,
    ]
      .map((label) => `<th>${escapeHtml(label)}</th>`)
      .join('');

    const tableRowsHtml = filteredMovements
      .map(
        (m) => `
        <tr>
          <td>${escapeHtml(formatDate(m.date))}</td>
          <td>${escapeHtml(getMovementTypeLabel(m.type))}</td>
          <td>${escapeHtml(m.field?.name || '—')}</td>
          <td>${escapeHtml(m.category?.name || '—')}</td>
          <td>${escapeHtml(m.grade)}</td>
          <td>${escapeHtml(getPitamStatusLabel(m.pitamStatus))}</td>
          <td>${escapeHtml(String(m.quantity))}</td>
        </tr>
      `,
      )
      .join('');

    const filterDetailsArray = getFilterDetails();
    const filterDetailsHtml =
      filterDetailsArray.length > 0
        ? `
      <div style="margin-bottom: 20px; padding: 12px; background: #f5f5f5; border-radius: 4px; font-size: 12px; border: 1px solid #ddd;">
        <strong>${escapeHtml(labels.filtersTitle)}:</strong><br/>
        ${filterDetailsArray.map((f) => `<div style="margin-top: 4px;">${f}</div>`).join('')}
      </div>
    `
        : '';

    const tableHtml = `
      ${filterDetailsHtml}
      <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
        <thead>
          <tr>${tableHeaderHtml}</tr>
        </thead>
        <tbody>
          ${tableRowsHtml}
        </tbody>
      </table>
    `;

    const tableStyles = `
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #ccd9cf; padding: 8px; text-align: center; }
      th { background: #1f5a32; color: #fff; font-weight: 700; }
      tbody tr:nth-child(even) { background: #f8fcf9; }
    `;

    openPrintableWindow({
      title: labels.printTitle,
      heading: labels.printTitle,
      html: tableHtml,
      direction: lang === 'he' ? 'rtl' : 'ltr',
      extraStyles: tableStyles,
    });
  }, [lang, filteredMovements, labels, seasonId, fieldId, categoryId, movementStatus, grade, pitamStatus, seasonOptions, fieldOptions, categoryOptions]);

  const handleExport = useCallback(async () => {
    try {
      const getFilterDetails = (): Array<string[]> => {
        const filters: Array<string[]> = [];

        if (seasonId) {
          const seasonLabel = seasonOptions.find((opt) => opt.value === seasonId)?.label || seasonId;
          filters.push([`${labels.seasonFilterLabel}: ${seasonLabel}`, '', '', '', '', '', '']);
        }

        if (fieldId && fieldId !== 'all') {
          const fieldLabel = fieldOptions.find((opt) => opt.value === fieldId)?.label || fieldId;
          filters.push([`${labels.fieldFilterLabel}: ${fieldLabel}`, '', '', '', '', '', '']);
        }

        if (categoryId && categoryId !== 'all') {
          const categoryLabel = categoryOptions.find((opt) => opt.value === categoryId)?.label || categoryId;
          filters.push([`${labels.categoryFilterLabel}: ${categoryLabel}`, '', '', '', '', '', '']);
        }

        if (movementStatus && movementStatus !== 'ALL') {
          filters.push([`${labels.movementStatusFilterLabel}: ${getMovementStatusLabel(movementStatus)}`, '', '', '', '', '', '']);
        }

        if (grade && grade !== 'ALL') {
          filters.push([`${labels.gradeFilterLabel}: ${grade}`, '', '', '', '', '', '']);
        }

        if (pitamStatus && pitamStatus !== 'ALL') {
          filters.push([`${labels.pitamStatusFilterLabel}: ${getPitamStatusLabel(pitamStatus)}`, '', '', '', '', '', '']);
        }

        return filters;
      };

      const header = [
        labels.columns.date,
        labels.columns.type,
        labels.columns.field,
        labels.columns.category,
        labels.columns.grade,
        labels.columns.pitamStatus,
        labels.columns.quantity,
      ];

      const filterRows = getFilterDetails();
      const rows = [
        ...filterRows,
        [],
        ...filteredMovements.map((m) => [
          formatDate(m.date),
          getMovementTypeLabel(m.type),
          m.field?.name || '—',
          m.category?.name || '—',
          m.grade,
          getPitamStatusLabel(m.pitamStatus),
          m.quantity,
        ]),
      ];

      const dateStamp = new Date().toISOString().slice(0, 10);

      await downloadStyledExcel({
        sheetName: lang === 'he' ? 'תנועות' : 'Movements',
        fileName: `israel-inventory-movements-${dateStamp}.xlsx`,
        header,
        rows,
        rightToLeft: lang === 'he',
        filterRowCount: filterRows.length + 1,
      });
    } catch (err) {
      console.error('Export failed:', err);
      window.alert(lang === 'he' ? 'לא ניתן לייצא כעת' : 'Could not export right now');
    }
  }, [lang, filteredMovements, labels, seasonId, fieldId, categoryId, movementStatus, grade, pitamStatus, seasonOptions, fieldOptions, categoryOptions]);

  const renderFiltersBar = () => {
    const actions =
      filteredMovements.length > 0 ? (
        <TraderMovementsPrintExportActions
          onPrint={handlePrint}
          onExport={handleExport}
          printAriaLabel={labels.printAriaLabel}
          printTitle={labels.printTitle}
          exportAriaLabel={labels.exportAriaLabel}
          exportTitle={labels.exportTitle}
          tableActionsLabel={labels.tableActionsLabel}
        />
      ) : null;

    return (
      <section className={styles.filtersBarSection}>
        <GlobalFiltersBar controls={filterControls} direction={lang === 'he' ? 'rtl' : 'ltr'} actions={actions} />
      </section>
    );
  };

  return (
    <section className={styles.section}>
      <section className={summaryStyles.explainerSection}>
        <p className={summaryStyles.focusedExplanation}>{labels.description}</p>
      </section>

      {!isLoading && !error && (
        <div className={summaryStyles.summaryGrid}>
          <article className={summaryStyles.summaryCard}>
            <div className={summaryStyles.summaryIcon}>
              <FaWarehouse aria-hidden="true" />
            </div>
            <span className={summaryStyles.summaryLabel}>{labels.summary.totalInventory}</span>
            <strong className={summaryStyles.summaryValue}>{numberFormatter.format(summaryTotals.totalInventory)}</strong>
          </article>
          <article className={summaryStyles.summaryCard}>
            <div className={summaryStyles.summaryIcon}>
              <FaBoxOpen aria-hidden="true" />
            </div>
            <span className={summaryStyles.summaryLabel}>{labels.summary.notPacked}</span>
            <strong className={summaryStyles.summaryValue}>{numberFormatter.format(summaryTotals.notPacked)}</strong>
          </article>
          <article className={summaryStyles.summaryCard}>
            <div className={summaryStyles.summaryIcon}>
              <FaBoxesStacked aria-hidden="true" />
            </div>
            <span className={summaryStyles.summaryLabel}>{labels.summary.packed}</span>
            <strong className={summaryStyles.summaryValue}>{numberFormatter.format(summaryTotals.packed)}</strong>
          </article>
          {summaryByType.map(({ type, label, quantity }) => (
            <article className={summaryStyles.summaryCard} key={type}>
              <div className={summaryStyles.summaryIcon}>{MOVEMENT_TYPE_ICONS[type] ?? <FaScaleBalanced aria-hidden="true" />}</div>
              <span className={summaryStyles.summaryLabel}>{label}</span>
              <strong className={summaryStyles.summaryValue}>{numberFormatter.format(quantity)}</strong>
            </article>
          ))}
        </div>
      )}

      {renderFiltersBar()}

      {isLoading && <div className={styles.statusBox}>{labels.loading}</div>}

      {error && (
        <div className={styles.statusBox}>
          <p>{error}</p>
          <button onClick={onRetry} className={styles.retryButton}>
            {labels.retry}
          </button>
        </div>
      )}

      {!isLoading && !error && (
        <GlobalDataTable
          columns={columns}
          rows={filteredMovements}
          getRowKey={(row) => row.id}
          emptyLabel={movements && movements.length > 0 ? labels.noMatchingFilters : labels.empty}
          defaultSortState={{ key: 'date', direction: 'desc' }}
        />
      )}
    </section>
  );
}
