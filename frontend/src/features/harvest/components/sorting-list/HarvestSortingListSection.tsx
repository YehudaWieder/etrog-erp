import { useMemo } from 'react';
import { GlobalDataTable, type GlobalDataTableColumn } from '../../../../components/ui/GlobalDataTable';
import { GlobalScopedFilters, type GlobalScopedFilterConfig } from '../../../../components/ui/GlobalScopedFilters';
import type { ClassificationListRecord } from '../../../../services/classificationsApi';
import type { HarvestI18n } from '../../i18n';
import workspaceStyles from '../../../../components/ui/styles/WorkspaceSection.module.css';
import panelStyles from '../styles/HarvestPanels.module.css';
import styles from './HarvestSortingList.module.css';

type HarvestSortingListSectionProps = {
  lang: 'he' | 'en';
  t: HarvestI18n;
  filters: GlobalScopedFilterConfig[];
  rows: ClassificationListRecord[];
  isLoading: boolean;
  loadError: string;
  formatGregorianDate: (value: string) => string;
  numberFormatter: Intl.NumberFormat;
};

export function HarvestSortingListSection({
  lang,
  t,
  filters,
  rows,
  isLoading,
  loadError,
  formatGregorianDate,
  numberFormatter,
}: HarvestSortingListSectionProps) {
  const sl = t.sortingList;

  const columns = useMemo<GlobalDataTableColumn<ClassificationListRecord>[]>(() => {
    const resolveTarget = (row: ClassificationListRecord): string => {
      if (row.assignmentType === 'TRADER') return row.trader?.name ?? '-';
      if (row.assignmentType === 'CUSTOMER') return row.customer?.customerName ?? '-';
      return sl.assignmentTypes.general;
    };

    const resolveCategory = (row: ClassificationListRecord): string => {
      return row.customerCategory?.name ?? row.traderCategory?.name ?? '-';
    };

    const resolveGrade = (row: ClassificationListRecord): string => {
      return row.grade ?? row.customerCategory?.grade ?? '-';
    };

    const resolveAssignmentLabel = (type: string): string => {
      if (type === 'TRADER') return sl.assignmentTypes.trader;
      if (type === 'CUSTOMER') return sl.assignmentTypes.customer;
      return sl.assignmentTypes.general;
    };

    const resolvePitamLabel = (status?: string | null): string => {
      if (status === 'WITH_PITAM') return sl.pitamLabels.withPitam;
      if (status === 'WITHOUT_PITAM') return sl.pitamLabels.withoutPitam;
      if (status === 'MIXED') return sl.pitamLabels.mixed;
      return '-';
    };

    return [
      {
        id: 'dateGregorian',
        header: sl.columns.dateGregorian,
        sortKey: 'dateGregorian',
        sortAccessor: (row) => row.fieldHarvest?.dateGregorian ?? '',
        minWidth: '120px',
        render: (row) => (
          <span className={styles.highlight}>
            {formatGregorianDate(row.fieldHarvest?.dateGregorian ?? '')}
          </span>
        ),
      },
      {
        id: 'dateHebrew',
        header: sl.columns.dateHebrew,
        sortKey: 'dateHebrew',
        sortAccessor: (row) => row.fieldHarvest?.dateHebrew ?? '',
        minWidth: '110px',
        render: (row) => (
          <span className={styles.highlight}>
            {row.fieldHarvest?.dateHebrew ?? '-'}
          </span>
        ),
      },
      {
        id: 'fieldName',
        header: sl.columns.fieldName,
        sortKey: 'fieldName',
        sortAccessor: (row) => row.fieldHarvest?.field?.name ?? '',
        minWidth: '110px',
        render: (row) => row.fieldHarvest?.field?.name ?? '-',
      },
      {
        id: 'assignmentType',
        header: sl.columns.assignmentType,
        sortKey: 'assignmentType',
        sortAccessor: (row) => row.assignmentType,
        minWidth: '90px',
        render: (row) => resolveAssignmentLabel(row.assignmentType),
      },
      {
        id: 'target',
        header: sl.columns.target,
        sortKey: 'target',
        sortAccessor: resolveTarget,
        minWidth: '120px',
        render: (row) => resolveTarget(row),
      },
      {
        id: 'category',
        header: sl.columns.category,
        sortKey: 'category',
        sortAccessor: (row) => resolveCategory(row),
        minWidth: '110px',
        render: (row) => (
          <span className={styles.highlight}>{resolveCategory(row)}</span>
        ),
      },
      {
        id: 'grade',
        header: sl.columns.grade,
        sortKey: 'grade',
        sortAccessor: resolveGrade,
        minWidth: '80px',
        render: (row) => (
          <span className={styles.highlight}>{resolveGrade(row)}</span>
        ),
      },
      {
        id: 'pitamStatus',
        header: sl.columns.pitamStatus,
        sortKey: 'pitamStatus',
        sortAccessor: (row) => row.pitamStatus ?? '',
        minWidth: '80px',
        render: (row) => resolvePitamLabel(row.pitamStatus),
      },
      {
        id: 'quantity',
        header: sl.columns.quantity,
        sortKey: 'quantity',
        sortAccessor: (row) => row.quantity,
        minWidth: '90px',
        align: 'end',
        render: (row) => numberFormatter.format(row.quantity),
      },
      {
        id: 'notes',
        header: sl.columns.notes,
        minWidth: '140px',
        render: (row) => row.notes ?? '-',
      },
    ];
  }, [sl, formatGregorianDate, numberFormatter]);

  return (
    <section className={`${workspaceStyles.workspace} ${panelStyles.workspace}`}>
      <header className={workspaceStyles.header}>
        <div>
          <p className={workspaceStyles.description}>{sl.description}</p>
        </div>
      </header>

      <GlobalScopedFilters
        scope="harvest-daily-details"
        filters={filters}
        direction={lang === 'he' ? 'rtl' : 'ltr'}
      />

      {loadError ? <p className="seasons-manager__error">{loadError}</p> : null}

      <div className={panelStyles.panelWide}>
        {isLoading ? <p className="seasons-manager__state">{sl.loading}</p> : null}

        {!isLoading ? (
          <GlobalDataTable
            columns={columns}
            rows={rows}
            getRowKey={(row) => row.id}
            emptyLabel={sl.empty}
            defaultSortState={{ key: 'dateGregorian', direction: 'desc' }}
          />
        ) : null}
      </div>
    </section>
  );
}
