import { useMemo } from 'react';
import {
  GlobalDataTable,
  type GlobalDataTableColumn,
} from '../../../../../components/ui/GlobalDataTable';
import {
  GlobalScopedFilters,
  type GlobalScopedFilterConfig,
} from '../../../../../components/ui/GlobalScopedFilters';
import { HarvestPrintExportActions } from '../../../../harvest/components/shared/HarvestPrintExportActions';
import { formatHarvestGregorianDate } from '../../../../harvest/services/harvestDisplayFormatters.service';
import type { IsraelClassificationSeasonRecord } from '../../../../../services/israelClassificationsApi';
import type { IsraelHarvestI18n } from '../../i18n';
import workspaceStyles from '../../../../../components/ui/styles/WorkspaceSection.module.css';
import panelStyles from '../../../../harvest/components/styles/HarvestPanels.module.css';

function pitamStatusLabel(
  status: IsraelClassificationSeasonRecord['pitamStatus'] | undefined,
  labels: IsraelHarvestI18n['harvestForm']['pitamOptions'],
): string {
  if (status === 'WITH_PITAM') return labels.withPitam;
  if (status === 'WITHOUT_PITAM') return labels.withoutPitam;
  return labels.mixed;
}

type IsraelHarvestSortingListSectionProps = {
  lang: 'he' | 'en';
  t: IsraelHarvestI18n;
  filters: GlobalScopedFilterConfig[];
  rows: IsraelClassificationSeasonRecord[];
  isLoading: boolean;
  loadError: string;
  numberFormatter: Intl.NumberFormat;
  onFiltersChange: (values: Record<string, string>) => void;
  onPrint: () => void;
  onExport: () => void;
  selectedRowId?: number | null;
  onRowClick?: (row: IsraelClassificationSeasonRecord) => void;
};

export function IsraelHarvestSortingListSection({
  lang,
  t,
  filters,
  rows,
  isLoading,
  loadError,
  numberFormatter,
  onFiltersChange,
  onPrint,
  onExport,
  selectedRowId,
  onRowClick,
}: IsraelHarvestSortingListSectionProps) {
  const sl = t.sortingList;
  const hasRows = rows.length > 0;

  const columns = useMemo<
    GlobalDataTableColumn<IsraelClassificationSeasonRecord>[]
  >(
    () => [
      {
        id: 'dateGregorian',
        header: sl.columns.dateGregorian,
        sortKey: 'dateGregorian',
        sortAccessor: (row) => row.harvest?.dateGregorian ?? '',
        defaultSortDirection: 'desc',
        render: (row) =>
          formatHarvestGregorianDate(row.harvest?.dateGregorian ?? '', lang),
      },
      {
        id: 'dateHebrew',
        header: sl.columns.dateHebrew,
        sortKey: 'dateHebrew',
        sortAccessor: (row) => row.harvest?.dateHebrew ?? '',
        render: (row) => row.harvest?.dateHebrew ?? '-',
      },
      {
        id: 'fieldName',
        header: sl.columns.fieldName,
        sortKey: 'fieldName',
        sortAccessor: (row) => row.harvest?.field?.name ?? '',
        render: (row) => row.harvest?.field?.name ?? '-',
      },
      {
        id: 'fieldCategory',
        header: sl.columns.fieldCategory,
        sortKey: 'fieldCategory',
        sortAccessor: (row) => row.fieldCategory?.name ?? '',
        render: (row) => row.fieldCategory?.name ?? '-',
      },
      {
        id: 'category',
        header: sl.columns.category,
        sortKey: 'category',
        sortAccessor: (row) => row.category?.name ?? '',
        render: (row) => row.category?.name ?? '-',
      },
      {
        id: 'grade',
        header: sl.columns.grade,
        sortKey: 'grade',
        sortAccessor: (row) => row.grade ?? '',
        render: (row) => row.grade ?? '-',
      },
      {
        id: 'pitamStatus',
        header: sl.columns.pitamStatus,
        sortKey: 'pitamStatus',
        sortAccessor: (row) => row.pitamStatus ?? '',
        render: (row) =>
          pitamStatusLabel(row.pitamStatus, t.harvestForm.pitamOptions),
      },
      {
        id: 'quantity',
        header: sl.columns.quantity,
        sortKey: 'quantity',
        align: 'end',
        sortAccessor: (row) => row.quantity,
        render: (row) => numberFormatter.format(row.quantity),
      },
      {
        id: 'notes',
        header: sl.columns.notes,
        render: (row) => row.notes ?? '-',
      },
    ],
    [sl, lang, numberFormatter, t.harvestForm.pitamOptions],
  );

  return (
    <section className={`${workspaceStyles.workspace} ${panelStyles.workspace}`}>
      <header className={workspaceStyles.header}>
        <div>
          <p className={workspaceStyles.description}>{sl.description}</p>
        </div>
      </header>

      <GlobalScopedFilters
        scope="israel-harvest-sorting-list"
        filters={filters}
        direction={lang === 'he' ? 'rtl' : 'ltr'}
        onValuesChange={onFiltersChange}
        actions={
          hasRows ? (
            <HarvestPrintExportActions
              lang={lang}
              tableActionsLabel={sl.tableActionsLabel}
              onPrint={onPrint}
              onExport={onExport}
              printAriaLabel={sl.printAriaLabel}
              printTitle={sl.printTitle}
              exportAriaLabel={sl.exportAriaLabel}
              exportTitle={sl.exportTitle}
            />
          ) : undefined
        }
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
            selectedRowKey={selectedRowId}
            onRowClick={onRowClick}
          />
        ) : null}
      </div>
    </section>
  );
}
