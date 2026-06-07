import React, { useCallback, useMemo, useRef } from 'react';
import type { AppLang } from '../i18n';
import { getTraderMovementsI18n } from '../i18n';
import type { TraderMovement } from '../hooks/useTraderMovements';
import { GlobalDataTable, type GlobalDataTableColumn, GLOBAL_DATA_TABLE_WIDTHS } from '../../../components/ui/GlobalDataTable';
import { GlobalFiltersBar, type GlobalFilterControl } from '../../../components/ui/GlobalFiltersBar';
import { openPrintableWindow } from '../../../services/printWindow';
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
  const tableRef = useRef<HTMLDivElement>(null);
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
    if (!tableRef.current) return;
    
    const printableHTML = `
      <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
        <thead>
          <tr>
            <th style="background: #1f5a32; color: white; padding: 10px; border: 1px solid #ccc; text-align: center;">${i18n.columns.date}</th>
            <th style="background: #1f5a32; color: white; padding: 10px; border: 1px solid #ccc; text-align: center;">${i18n.columns.type}</th>
            <th style="background: #1f5a32; color: white; padding: 10px; border: 1px solid #ccc; text-align: center;">${i18n.columns.trader}</th>
            <th style="background: #1f5a32; color: white; padding: 10px; border: 1px solid #ccc; text-align: center;">${i18n.columns.category}</th>
            <th style="background: #1f5a32; color: white; padding: 10px; border: 1px solid #ccc; text-align: center;">${i18n.columns.grade}</th>
            <th style="background: #1f5a32; color: white; padding: 10px; border: 1px solid #ccc; text-align: center;">${i18n.columns.pitamStatus}</th>
            <th style="background: #1f5a32; color: white; padding: 10px; border: 1px solid #ccc; text-align: center;">${i18n.columns.quantity}</th>
          </tr>
        </thead>
        <tbody>
          ${movements.map((m) => `
            <tr style="background: ${movements.indexOf(m) % 2 === 0 ? '#f8fcf9' : 'white'};">
              <td style="padding: 8px; border: 1px solid #ccc; text-align: center;">${formatDate(m.date)}</td>
              <td style="padding: 8px; border: 1px solid #ccc; text-align: center;">${getMovementTypeLabel(m.type)}</td>
              <td style="padding: 8px; border: 1px solid #ccc; text-align: center;">${m.isModulo ? 'כללי' : m.traderName || '—'}</td>
              <td style="padding: 8px; border: 1px solid #ccc; text-align: center;">${m.categoryName}</td>
              <td style="padding: 8px; border: 1px solid #ccc; text-align: center;">${m.grade}</td>
              <td style="padding: 8px; border: 1px solid #ccc; text-align: center;">${getPitamStatusLabel(m.pitamStatus)}</td>
              <td style="padding: 8px; border: 1px solid #ccc; text-align: center;">${m.quantity}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    openPrintableWindow({
      title: i18n.printTitle,
      heading: i18n.printTitle,
      html: printableHTML,
      direction: lang === 'he' ? 'rtl' : 'ltr',
    });
  }, [lang, movements, i18n]);

  const renderFiltersBar = () => {
    if (filterControls.length === 0) return null;
    return (
      <section className={styles.filtersBarSection}>
        <GlobalFiltersBar controls={filterControls} direction={lang === 'he' ? 'rtl' : 'ltr'} />
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
        <>
          <button
            type="button"
            onClick={handlePrint}
            title={i18n.printAriaLabel}
            aria-label={i18n.printAriaLabel}
            className={styles.printButton}
          >
            {i18n.print}
          </button>
          <div ref={tableRef}>
            <GlobalDataTable
              columns={columns}
              rows={movements}
              getRowKey={(row) => row.id}
              emptyLabel={i18n.empty}
              defaultSortState={{ key: 'date', direction: 'desc' }}
            />
          </div>
        </>
      )}
    </section>
  );
}
