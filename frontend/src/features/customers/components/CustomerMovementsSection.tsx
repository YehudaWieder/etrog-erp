import { useCallback, useMemo } from 'react';
import { GlobalDataTable, type GlobalDataTableColumn, GLOBAL_DATA_TABLE_WIDTHS } from '../../../components/ui/GlobalDataTable';
import { GlobalFiltersBar, type GlobalFilterControl } from '../../../components/ui/GlobalFiltersBar';
import { downloadStyledExcel } from '../../../services/exportExcel';
import { openPrintableWindow } from '../../../services/printWindow';
import type { CustomerInventoryI18n } from '../i18n.inventory';
import type { CustomerMovement } from '../hooks/useCustomerMovements';
import { buildCustomerMovementsSummaryTotals } from '../services/customerMovementsSummary.service';
import { CustomerMovementsPrintExportActions } from './CustomerMovementsPrintExportActions';
import styles from './styles/CustomerMovementsSection.module.css';
import summaryStyles from '../../traders/components/styles/TraderInventoryAllSection.module.css';

type AppLang = 'he' | 'en';

type FilterOption = {
  value: string;
  label: string;
};

type CustomerMovementsSectionProps = {
  lang: AppLang;
  labels: CustomerInventoryI18n['movements'];
  movements: CustomerMovement[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  seasonId?: string;
  customerId?: string;
  movementStatus?: string;
  categoryId?: string;
  grade?: string;
  pitamStatus?: string;
  seasonOptions?: FilterOption[];
  customerOptions?: FilterOption[];
  movementStatusOptions?: FilterOption[];
  onSeasonChange?: (seasonId: string) => void;
  onCustomerChange?: (customerId: string) => void;
  onMovementStatusChange?: (status: string) => void;
  onCategoryChange?: (categoryId: string) => void;
  onGradeChange?: (grade: string) => void;
  onPitamStatusChange?: (pitamStatus: string) => void;
};

export function CustomerMovementsSection({
  lang,
  labels,
  movements,
  isLoading,
  error,
  onRetry,
  seasonId = '',
  customerId = 'ALL',
  movementStatus = 'ALL',
  categoryId = 'ALL',
  grade = 'ALL',
  pitamStatus = 'ALL',
  seasonOptions = [],
  customerOptions = [],
  movementStatusOptions = [],
  onSeasonChange,
  onCustomerChange,
  onMovementStatusChange,
  onCategoryChange,
  onGradeChange,
  onPitamStatusChange,
}: CustomerMovementsSectionProps) {
  const categoryOptions = useMemo<FilterOption[]>(() => {
    const uniqueCategories = Array.from(
      new Set(movements.map((movement) => movement.customerCategory?.name).filter(Boolean)),
    ).sort((left, right) =>
      String(left).localeCompare(String(right), lang === 'he' ? 'he' : 'en', { sensitivity: 'base' }),
    );

    return [
      { value: 'ALL', label: labels.filters.allCategoriesOption },
      ...uniqueCategories.map((value) => ({ value: String(value), label: String(value) })),
    ];
  }, [labels.filters.allCategoriesOption, lang, movements]);

  const gradeOptions = useMemo<FilterOption[]>(() => {
    const uniqueGrades = Array.from(
      new Set(movements.map((movement) => movement.customerCategory?.grade).filter(Boolean)),
    ).sort((left, right) =>
      String(left).localeCompare(String(right), lang === 'he' ? 'he' : 'en', { sensitivity: 'base' }),
    );

    return [
      { value: 'ALL', label: labels.filters.allGradesOption },
      ...uniqueGrades.map((value) => ({ value: String(value), label: String(value) })),
    ];
  }, [labels.filters.allGradesOption, lang, movements]);

  const pitamStatusOptions = useMemo<FilterOption[]>(() => {
    const defaultPitamStatuses = ['WITH_PITAM', 'WITHOUT_PITAM', 'MIXED'];
    const dataPitamStatuses = Array.from(new Set(movements.map((movement) => movement.pitamStatus).filter(Boolean)));
    const extraPitamStatuses = dataPitamStatuses
      .filter((status) => !defaultPitamStatuses.includes(status))
      .sort((left, right) => {
        const leftLabel = labels.pitamStatuses[left as keyof typeof labels.pitamStatuses] || left;
        const rightLabel = labels.pitamStatuses[right as keyof typeof labels.pitamStatuses] || right;
        return leftLabel.localeCompare(rightLabel, lang === 'he' ? 'he' : 'en', { sensitivity: 'base' });
      });

    const uniquePitamStatuses = [...defaultPitamStatuses, ...extraPitamStatuses];

    return [
      { value: 'ALL', label: labels.filters.allPitamStatusesOption },
      ...uniquePitamStatuses.map((value) => ({
        value,
        label: labels.pitamStatuses[value as keyof typeof labels.pitamStatuses] || value,
      })),
    ];
  }, [labels.filters.allPitamStatusesOption, labels.pitamStatuses, lang, movements]);

  const filteredMovements = useMemo(() => {
    return movements.filter((movement) => {
      if (categoryId !== 'ALL' && movement.customerCategory?.name !== categoryId) {
        return false;
      }

      if (grade !== 'ALL' && movement.customerCategory?.grade !== grade) {
        return false;
      }

      if (pitamStatus !== 'ALL' && movement.pitamStatus !== pitamStatus) {
        return false;
      }

      return true;
    });
  }, [categoryId, grade, movements, pitamStatus]);

  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(lang === 'he' ? 'he-IL' : 'en-US'),
    [lang],
  );

  const summaryTotals = useMemo(
    () => buildCustomerMovementsSummaryTotals(filteredMovements),
    [filteredMovements],
  );

  const filterControls = useMemo<GlobalFilterControl[]>(() => {
    const controls: GlobalFilterControl[] = [];

    if (seasonOptions.length > 0) {
      controls.push({
        id: 'customer-movements-seasonId',
        label: labels.filters.seasonLabel,
        value: seasonId || '',
        options: seasonOptions.map((option) => ({ value: option.value, label: option.label })),
        onChange: (value) => onSeasonChange?.(value),
      });
    }

    if (customerOptions.length > 0) {
      controls.push({
        id: 'customer-movements-customerId',
        label: labels.filters.customerLabel,
        value: customerId || 'ALL',
        options: customerOptions.map((option) => ({ value: option.value, label: option.label })),
        onChange: (value) => onCustomerChange?.(value),
      });
    }

    if (movementStatusOptions.length > 0) {
      controls.push({
        id: 'customer-movements-movementStatus',
        label: labels.filters.movementStatusLabel,
        value: movementStatus || 'ALL',
        options: movementStatusOptions.map((option) => ({ value: option.value, label: option.label })),
        onChange: (value) => onMovementStatusChange?.(value),
      });
    }

    if (categoryOptions.length > 0) {
      controls.push({
        id: 'customer-movements-category',
        label: labels.filters.categoryLabel,
        value: categoryId || 'ALL',
        options: categoryOptions.map((option) => ({ value: option.value, label: option.label })),
        onChange: (value) => onCategoryChange?.(value),
      });
    }

    if (gradeOptions.length > 0) {
      controls.push({
        id: 'customer-movements-grade',
        label: labels.filters.gradeLabel,
        value: grade || 'ALL',
        options: gradeOptions.map((option) => ({ value: option.value, label: option.label })),
        onChange: (value) => onGradeChange?.(value),
      });
    }

    if (pitamStatusOptions.length > 0) {
      controls.push({
        id: 'customer-movements-pitamStatus',
        label: labels.filters.pitamStatusLabel,
        value: pitamStatus || 'ALL',
        options: pitamStatusOptions.map((option) => ({ value: option.value, label: option.label })),
        onChange: (value) => onPitamStatusChange?.(value),
      });
    }

    return controls;
  }, [
    seasonOptions,
    labels.filters.seasonLabel,
    labels.filters.customerLabel,
    labels.filters.movementStatusLabel,
    labels.filters.categoryLabel,
    labels.filters.gradeLabel,
    labels.filters.pitamStatusLabel,
    seasonId,
    customerOptions,
    customerId,
    movementStatusOptions,
    movementStatus,
    categoryOptions,
    categoryId,
    gradeOptions,
    grade,
    pitamStatusOptions,
    pitamStatus,
    onSeasonChange,
    onCustomerChange,
    onMovementStatusChange,
    onCategoryChange,
    onGradeChange,
    onPitamStatusChange,
  ]);

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US');
    } catch {
      return dateStr;
    }
  };

  const getMovementTypeLabel = (type: string): string => {
    return labels.movementTypes[type as keyof typeof labels.movementTypes] || type;
  };

  const getPitamStatusLabel = (status: string): string => {
    return labels.pitamStatuses[status as keyof typeof labels.pitamStatuses] || status;
  };

  const columns = useMemo<GlobalDataTableColumn<CustomerMovement>[]>(() => {
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
        minWidth: '160px',
        align: 'center',
        render: (row) => getMovementTypeLabel(row.type),
      },
      {
        id: 'customer',
        header: labels.columns.customer,
        headerLabel: labels.columns.customer,
        sortKey: 'customer',
        sortAccessor: (row) => row.customer?.customerName || '',
        minWidth: '150px',
        align: 'center',
        render: (row) => row.customer?.customerName || '—',
      },
      {
        id: 'category',
        header: labels.columns.category,
        headerLabel: labels.columns.category,
        sortKey: 'category',
        sortAccessor: (row) => row.customerCategory?.name || '',
        minWidth: '120px',
        align: 'center',
        render: (row) => row.customerCategory?.name || '—',
      },
      {
        id: 'grade',
        header: labels.columns.grade,
        headerLabel: labels.columns.grade,
        sortKey: 'grade',
        sortAccessor: (row) => row.customerCategory?.grade || '',
        minWidth: '90px',
        align: 'center',
        render: (row) => row.customerCategory?.grade || '—',
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
      const map: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      };
      return String(text).replace(/[&<>"']/g, (char) => map[char]);
    };

    const filterRows: string[] = [];

    if (seasonId) {
      const seasonLabel = seasonOptions.find((option) => option.value === seasonId)?.label || seasonId;
      filterRows.push(`${labels.filters.seasonLabel}: ${escapeHtml(seasonLabel)}`);
    }

    if (customerId && customerId !== 'ALL') {
      const customerLabel = customerOptions.find((option) => option.value === customerId)?.label || customerId;
      filterRows.push(`${labels.filters.customerLabel}: ${escapeHtml(customerLabel)}`);
    }

    if (movementStatus && movementStatus !== 'ALL') {
      const movementStatusLabel = movementStatusOptions.find((option) => option.value === movementStatus)?.label || movementStatus;
      filterRows.push(`${labels.filters.movementStatusLabel}: ${escapeHtml(movementStatusLabel)}`);
    }

    if (categoryId && categoryId !== 'ALL') {
      filterRows.push(`${labels.filters.categoryLabel}: ${escapeHtml(categoryId)}`);
    }

    if (grade && grade !== 'ALL') {
      filterRows.push(`${labels.filters.gradeLabel}: ${escapeHtml(grade)}`);
    }

    if (pitamStatus && pitamStatus !== 'ALL') {
      const pitamStatusLabel = pitamStatusOptions.find((option) => option.value === pitamStatus)?.label || pitamStatus;
      filterRows.push(`${labels.filters.pitamStatusLabel}: ${escapeHtml(pitamStatusLabel)}`);
    }

    const tableHeaderHtml = [
      labels.columns.date,
      labels.columns.type,
      labels.columns.customer,
      labels.columns.category,
      labels.columns.grade,
      labels.columns.pitamStatus,
      labels.columns.quantity,
    ]
      .map((label) => `<th>${escapeHtml(label)}</th>`)
      .join('');

    const tableRowsHtml = filteredMovements
      .map(
        (movement) => `
          <tr>
            <td>${escapeHtml(formatDate(movement.date))}</td>
            <td>${escapeHtml(getMovementTypeLabel(movement.type))}</td>
            <td>${escapeHtml(movement.customer?.customerName || '—')}</td>
            <td>${escapeHtml(movement.customerCategory?.name || '—')}</td>
            <td>${escapeHtml(movement.customerCategory?.grade || '—')}</td>
            <td>${escapeHtml(getPitamStatusLabel(movement.pitamStatus))}</td>
            <td>${escapeHtml(String(movement.quantity))}</td>
          </tr>
        `,
      )
      .join('');

    const filtersHtml = filterRows.length
      ? `
        <div style="margin-bottom: 20px; padding: 12px; background: #f5f5f5; border-radius: 4px; font-size: 12px; border: 1px solid #ddd;">
          <strong>${escapeHtml(labels.filters.title)}:</strong><br/>
          ${filterRows.map((row) => `<div style="margin-top: 4px;">${row}</div>`).join('')}
        </div>
      `
      : '';

    const tableHtml = `
      ${filtersHtml}
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
  }, [
    customerId,
    customerOptions,
    filteredMovements,
    grade,
    labels,
    lang,
    movementStatus,
    movementStatusOptions,
    pitamStatus,
    pitamStatusOptions,
    seasonId,
    seasonOptions,
    categoryId,
  ]);

  const handleExport = useCallback(async () => {
    const filterRows: (string | number)[][] = [];

    if (seasonId) {
      const seasonLabel = seasonOptions.find((option) => option.value === seasonId)?.label || seasonId;
      filterRows.push([`${labels.filters.seasonLabel}: ${seasonLabel}`, '', '', '', '', '', '']);
    }

    if (customerId && customerId !== 'ALL') {
      const customerLabel = customerOptions.find((option) => option.value === customerId)?.label || customerId;
      filterRows.push([`${labels.filters.customerLabel}: ${customerLabel}`, '', '', '', '', '', '']);
    }

    if (movementStatus && movementStatus !== 'ALL') {
      const movementStatusLabel = movementStatusOptions.find((option) => option.value === movementStatus)?.label || movementStatus;
      filterRows.push([`${labels.filters.movementStatusLabel}: ${movementStatusLabel}`, '', '', '', '', '', '']);
    }

    if (categoryId && categoryId !== 'ALL') {
      filterRows.push([`${labels.filters.categoryLabel}: ${categoryId}`, '', '', '', '', '', '']);
    }

    if (grade && grade !== 'ALL') {
      filterRows.push([`${labels.filters.gradeLabel}: ${grade}`, '', '', '', '', '', '']);
    }

    if (pitamStatus && pitamStatus !== 'ALL') {
      const pitamStatusLabel = pitamStatusOptions.find((option) => option.value === pitamStatus)?.label || pitamStatus;
      filterRows.push([`${labels.filters.pitamStatusLabel}: ${pitamStatusLabel}`, '', '', '', '', '', '']);
    }

    const header = [
      labels.columns.date,
      labels.columns.type,
      labels.columns.customer,
      labels.columns.category,
      labels.columns.grade,
      labels.columns.pitamStatus,
      labels.columns.quantity,
    ];

    const rows = [
      ...filterRows,
      [],
      ...filteredMovements.map((movement) => [
        formatDate(movement.date),
        getMovementTypeLabel(movement.type),
        movement.customer?.customerName || '—',
        movement.customerCategory?.name || '—',
        movement.customerCategory?.grade || '—',
        getPitamStatusLabel(movement.pitamStatus),
        movement.quantity,
      ]),
    ];

    const dateStamp = new Date().toISOString().slice(0, 10);

    await downloadStyledExcel({
      sheetName: lang === 'he' ? 'תנועות לקוחות' : 'Customer Movements',
      fileName: `customer-movements-${dateStamp}.xlsx`,
      header,
      rows,
      rightToLeft: lang === 'he',
      filterRowCount: filterRows.length + 1,
    });
  }, [
    categoryId,
    customerId,
    customerOptions,
    filteredMovements,
    grade,
    labels,
    lang,
    movementStatus,
    movementStatusOptions,
    pitamStatus,
    pitamStatusOptions,
    seasonId,
    seasonOptions,
  ]);

  const actions = filteredMovements.length > 0 ? (
    <CustomerMovementsPrintExportActions
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
    <section className={styles.section}>
      {!isLoading && !error && filteredMovements.length > 0 && (
        <div className={summaryStyles.summaryGrid}>
          <article className={summaryStyles.summaryCard}>
            <span className={summaryStyles.summaryLabel}>{labels.summary.totalInventory}</span>
            <strong className={summaryStyles.summaryValue}>{numberFormatter.format(summaryTotals.totalInventory)}</strong>
          </article>
          <article className={summaryStyles.summaryCard}>
            <span className={summaryStyles.summaryLabel}>{labels.summary.notPacked}</span>
            <strong className={summaryStyles.summaryValue}>{numberFormatter.format(summaryTotals.notPacked)}</strong>
          </article>
          <article className={summaryStyles.summaryCard}>
            <span className={summaryStyles.summaryLabel}>{labels.summary.packed}</span>
            <strong className={summaryStyles.summaryValue}>{numberFormatter.format(summaryTotals.packed)}</strong>
          </article>
        </div>
      )}

      {filterControls.length > 0 ? (
        <section className={styles.filtersBarSection}>
          <GlobalFiltersBar
            controls={filterControls}
            direction={lang === 'he' ? 'rtl' : 'ltr'}
            actions={actions}
          />
        </section>
      ) : null}

      {isLoading ? <div className={styles.statusBox}>{labels.loading}</div> : null}

      {error ? (
        <div className={styles.statusBox}>
          <p>{labels.error}</p>
          <button type="button" onClick={onRetry} className={styles.retryButton}>
            {labels.retry}
          </button>
        </div>
      ) : null}

      {!isLoading && !error && movements.length === 0 ? (
        <div className={styles.statusBox}>{labels.empty}</div>
      ) : null}

      {!isLoading && !error && movements.length > 0 && filteredMovements.length === 0 ? (
        <div className={styles.statusBox}>{labels.noMatchingFilters}</div>
      ) : null}

      {!isLoading && !error && filteredMovements.length > 0 ? (
        <GlobalDataTable
          columns={columns}
          rows={filteredMovements}
          getRowKey={(row) => row.id}
          emptyLabel={labels.empty}
          defaultSortState={{ key: 'date', direction: 'desc' }}
        />
      ) : null}
    </section>
  );
}
