import React, { useCallback, useMemo } from 'react';
import type { AppLang } from '../i18n';
import { getTraderMovementsI18n } from '../i18n';
import type { TraderMovement } from '../hooks/useTraderMovements';
import { GlobalDataTable, type GlobalDataTableColumn, GLOBAL_DATA_TABLE_WIDTHS } from '../../../components/ui/GlobalDataTable';
import { GlobalFiltersBar, type GlobalFilterControl } from '../../../components/ui/GlobalFiltersBar';
import { openPrintableWindow } from '../../../services/printWindow';
import { downloadStyledExcel } from '../../../services/exportExcel';
import { TraderMovementsPrintExportActions } from './TraderMovementsPrintExportActions';
import styles from './styles/TraderMovementsSection.module.css';

type FilterOption = {
  value: string;
  label: string;
};

type TraderMovementsSectionProps = {
  lang: AppLang;
  movements: TraderMovement[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  seasonId?: string;
  traderId?: string;
  movementStatus?: string;
  seasonOptions?: FilterOption[];
  traderOptions?: FilterOption[];
  movementStatusOptions?: FilterOption[];
  onSeasonChange?: (seasonId: string) => void;
  onTraderChange?: (traderId: string) => void;
  onMovementStatusChange?: (status: string) => void;
};

export function TraderMovementsSection({
  lang,
  movements,
  isLoading,
  error,
  onRetry,
  seasonId = '',
  traderId = 'ALL',
  movementStatus = 'ALL',
  seasonOptions = [],
  traderOptions = [],
  movementStatusOptions = [],
  onSeasonChange,
  onTraderChange,
  onMovementStatusChange,
}: TraderMovementsSectionProps) {
  const i18n = getTraderMovementsI18n();

  const filterControls = useMemo<GlobalFilterControl[]>(() => {
    const controls: GlobalFilterControl[] = [];

    if (seasonOptions.length > 0) {
      controls.push({
        id: 'movements-seasonId',
        label: i18n.filters.seasonLabel,
        value: seasonId || '',
        options: seasonOptions.map((opt) => ({ value: opt.value, label: opt.label })),
        onChange: (value) => onSeasonChange?.(value),
      });
    }

    if (traderOptions.length > 0) {
      controls.push({
        id: 'movements-traderId',
        label: i18n.filters.traderLabel,
        value: traderId || 'ALL',
        options: traderOptions.map((opt) => ({ value: opt.value, label: opt.label })),
        onChange: (value) => onTraderChange?.(value),
      });
    }

    if (movementStatusOptions.length > 0) {
      controls.push({
        id: 'movements-movementStatus',
        label: i18n.filters.movementStatusLabel,
        value: movementStatus || 'ALL',
        options: movementStatusOptions.map((opt) => ({ value: opt.value, label: opt.label })),
        onChange: (value) => onMovementStatusChange?.(value),
      });
    }

    return controls;
  }, [
    seasonId,
    seasonOptions,
    traderId,
    traderOptions,
    movementStatus,
    movementStatusOptions,
    i18n.filters.seasonLabel,
    i18n.filters.traderLabel,
    i18n.filters.movementStatusLabel,
    onSeasonChange,
    onTraderChange,
    onMovementStatusChange,
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
    return i18n.movementTypes[type as keyof typeof i18n.movementTypes] || type;
  };

  const getPitamStatusLabel = (status: string): string => {
    return i18n.pitamStatuses[status as keyof typeof i18n.pitamStatuses] || status;
  };

  const columns = useMemo<GlobalDataTableColumn<TraderMovement>[]>(() => {
    return [
      {
        id: 'date',
        header: i18n.columns.date,
        headerLabel: i18n.columns.date,
        sortKey: 'date',
        sortAccessor: (row) => row.date,
        minWidth: GLOBAL_DATA_TABLE_WIDTHS.dateLong,
        align: 'center',
        render: (row) => formatDate(row.date),
      },
      {
        id: 'type',
        header: i18n.columns.type,
        headerLabel: i18n.columns.type,
        sortKey: 'type',
        sortAccessor: (row) => getMovementTypeLabel(row.type),
        minWidth: '140px',
        align: 'center',
        render: (row) => getMovementTypeLabel(row.type),
      },
      {
        id: 'trader',
        header: i18n.columns.trader,
        headerLabel: i18n.columns.trader,
        sortKey: 'trader',
        sortAccessor: (row) => (row.isModulo ? 'כללי' : row.traderName || ''),
        minWidth: '120px',
        align: 'center',
        render: (row) => row.isModulo ? 'כללי' : row.traderName || '—',
      },
      {
        id: 'category',
        header: i18n.columns.category,
        headerLabel: i18n.columns.category,
        sortKey: 'category',
        sortAccessor: (row) => row.categoryName,
        minWidth: '120px',
        align: 'center',
        render: (row) => row.categoryName,
      },
      {
        id: 'grade',
        header: i18n.columns.grade,
        headerLabel: i18n.columns.grade,
        sortKey: 'grade',
        sortAccessor: (row) => row.grade,
        minWidth: '80px',
        align: 'center',
        render: (row) => row.grade,
      },
      {
        id: 'pitamStatus',
        header: i18n.columns.pitamStatus,
        headerLabel: i18n.columns.pitamStatus,
        sortKey: 'pitamStatus',
        sortAccessor: (row) => getPitamStatusLabel(row.pitamStatus),
        minWidth: '140px',
        align: 'center',
        render: (row) => getPitamStatusLabel(row.pitamStatus),
      },
      {
        id: 'quantity',
        header: i18n.columns.quantity,
        headerLabel: i18n.columns.quantity,
        sortKey: 'quantity',
        sortAccessor: (row) => row.quantity,
        minWidth: GLOBAL_DATA_TABLE_WIDTHS.numeric,
        align: 'center',
        render: (row) => String(row.quantity),
      },
    ];
  }, [lang, i18n]);

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

    const getFilterDetails = (): string[] => {
      const filters: string[] = [];

      if (seasonId) {
        const seasonLabel = seasonOptions.find((opt) => opt.value === seasonId)?.label || seasonId;
        filters.push(`${i18n.filters.seasonLabel}: ${escapeHtml(seasonLabel)}`);
      }

      if (traderId && traderId !== 'ALL') {
        const traderLabel = traderOptions.find((opt) => opt.value === traderId)?.label || traderId;
        filters.push(`${i18n.filters.traderLabel}: ${escapeHtml(traderLabel)}`);
      }

      if (movementStatus && movementStatus !== 'ALL') {
        const statusLabel = movementStatusOptions.find((opt) => opt.value === movementStatus)?.label || movementStatus;
        filters.push(`${i18n.filters.movementStatusLabel}: ${escapeHtml(statusLabel)}`);
      }

      return filters;
    };

    const tableHeaderHtml = [
      i18n.columns.date,
      i18n.columns.type,
      i18n.columns.trader,
      i18n.columns.category,
      i18n.columns.grade,
      i18n.columns.pitamStatus,
      i18n.columns.quantity,
    ]
      .map((label) => `<th>${escapeHtml(label)}</th>`)
      .join('');

    const tableRowsHtml = movements
      .map(
        (m) => `
        <tr>
          <td>${escapeHtml(formatDate(m.date))}</td>
          <td>${escapeHtml(getMovementTypeLabel(m.type))}</td>
          <td>${escapeHtml(m.isModulo ? 'כללי' : m.traderName || '—')}</td>
          <td>${escapeHtml(m.categoryName)}</td>
          <td>${escapeHtml(m.grade)}</td>
          <td>${escapeHtml(getPitamStatusLabel(m.pitamStatus))}</td>
          <td>${escapeHtml(String(m.quantity))}</td>
        </tr>
      `
      )
      .join('');

    const filterDetailsArray = getFilterDetails();
    const filterDetailsHtml = filterDetailsArray.length > 0 ? `
      <div style="margin-bottom: 20px; padding: 12px; background: #f5f5f5; border-radius: 4px; font-size: 12px; border: 1px solid #ddd;">
        <strong>${escapeHtml(i18n.filters.title || 'סינונים פעילים')}:</strong><br/>
        ${filterDetailsArray.map(f => `<div style="margin-top: 4px;">${f}</div>`).join('')}
      </div>
    ` : '';

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
      title: i18n.printTitle,
      heading: i18n.printTitle,
      html: tableHtml,
      direction: lang === 'he' ? 'rtl' : 'ltr',
      extraStyles: tableStyles,
    });
  }, [lang, movements, i18n, seasonId, traderId, movementStatus, seasonOptions, traderOptions, movementStatusOptions]);

  const handleExport = useCallback(async () => {
    try {
      const getFilterDetails = (): Array<string[]> => {
        const filters: Array<string[]> = [];

        if (seasonId) {
          const seasonLabel = seasonOptions.find((opt) => opt.value === seasonId)?.label || seasonId;
          const filterRow = [
            `${i18n.filters.seasonLabel}: ${seasonLabel}`,
            '',
            '',
            '',
            '',
            '',
            '',
          ];
          filters.push(filterRow);
        }

        if (traderId && traderId !== 'ALL') {
          const traderLabel = traderOptions.find((opt) => opt.value === traderId)?.label || traderId;
          const filterRow = [
            `${i18n.filters.traderLabel}: ${traderLabel}`,
            '',
            '',
            '',
            '',
            '',
            '',
          ];
          filters.push(filterRow);
        }

        if (movementStatus && movementStatus !== 'ALL') {
          const statusLabel = movementStatusOptions.find((opt) => opt.value === movementStatus)?.label || movementStatus;
          const filterRow = [
            `${i18n.filters.movementStatusLabel}: ${statusLabel}`,
            '',
            '',
            '',
            '',
            '',
            '',
          ];
          filters.push(filterRow);
        }

        return filters;
      };

      const header = [
        i18n.columns.date,
        i18n.columns.type,
        i18n.columns.trader,
        i18n.columns.category,
        i18n.columns.grade,
        i18n.columns.pitamStatus,
        i18n.columns.quantity,
      ];

      const filterRows = getFilterDetails();
      const rows = [
        ...filterRows,
        [],
        ...movements.map((m) => [
          formatDate(m.date),
          getMovementTypeLabel(m.type),
          m.isModulo ? 'כללי' : m.traderName || '—',
          m.categoryName,
          m.grade,
          getPitamStatusLabel(m.pitamStatus),
          m.quantity,
        ]),
      ];

      const dateStamp = new Date().toISOString().slice(0, 10);

      await downloadStyledExcel({
        sheetName: lang === 'he' ? 'תנועות' : 'Movements',
        fileName: `trader-movements-${dateStamp}.xlsx`,
        header,
        rows,
        rightToLeft: lang === 'he',
        filterRowCount: filterRows.length + 1,
      });
    } catch (error) {
      console.error('Export failed:', error);
      window.alert(lang === 'he' ? 'לא ניתן לייצא כעת' : 'Could not export right now');
    }
  }, [lang, movements, i18n, seasonId, traderId, movementStatus, seasonOptions, traderOptions, movementStatusOptions]);

  const renderFiltersBar = () => {
    if (filterControls.length === 0) return null;
    
    const actions = movements.length > 0 ? (
      <TraderMovementsPrintExportActions
        onPrint={handlePrint}
        onExport={handleExport}
        printAriaLabel={i18n.printAriaLabel}
        printTitle={i18n.printTitle}
        exportAriaLabel={i18n.exportAriaLabel}
        exportTitle={i18n.exportTitle}
        tableActionsLabel={i18n.tableActionsLabel}
      />
    ) : null;

    return (
      <section className={styles.filtersBarSection}>
        <GlobalFiltersBar 
          controls={filterControls} 
          direction={lang === 'he' ? 'rtl' : 'ltr'} 
          actions={actions}
        />
      </section>
    );
  };

  return (
    <section className={styles.section}>
      {renderFiltersBar()}
      
      {isLoading && <div className={styles.statusBox}>{i18n.loading}</div>}

      {error && (
        <div className={styles.statusBox}>
          <p>{i18n.error}</p>
          <button onClick={onRetry} className={styles.retryButton}>
            {i18n.retry}
          </button>
        </div>
      )}

      {!isLoading && !error && (!movements || movements.length === 0) && (
        <div className={styles.statusBox}>{i18n.empty}</div>
      )}

      {!isLoading && !error && movements && movements.length > 0 && (
        <GlobalDataTable
          columns={columns}
          rows={movements}
          getRowKey={(row) => row.id}
          emptyLabel={i18n.empty}
          defaultSortState={{ key: 'date', direction: 'desc' }}
        />
      )}
    </section>
  );
}
