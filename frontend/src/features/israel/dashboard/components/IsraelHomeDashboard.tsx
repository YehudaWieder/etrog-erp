import { useState, useEffect, useMemo, type ReactNode } from 'react';
import { FaPrint, FaLeaf, FaArrowsUpDown, FaBox, FaTruck, FaCircleCheck, FaHandHolding } from 'react-icons/fa6';
import styles from '../../../home/dashboard/styles/HomeDashboard.module.css';
import { ChartPanel } from '../../../home/dashboard/components/ChartPanel';
import { SummarySection } from '../../../home/dashboard/components/SummarySection';
import {
  IsraelHarvestSortingSummary,
  ISRAEL_SORTING_GENERAL_KEY,
  ISRAEL_SORTING_FIELD_CATEGORY_GENERAL_KEY,
} from './IsraelHarvestSortingSummary';
import { IsraelShipmentsSummary, ISRAEL_SHIPMENTS_GENERAL_KEY, type IsraelShipmentStatusKey } from './IsraelShipmentsSummary';
import { IsraelInventorySummary, ISRAEL_GENERAL_KEY } from './IsraelInventorySummary';
import { SvgLineChart } from '../../../home/dashboard/components/SvgLineChart';
import { SvgBarChart } from '../../../home/dashboard/components/SvgBarChart';
import { GaugeCard } from '../../../home/dashboard/components/GaugeCard';
import { useIsraelDashboardData } from '../hooks/useIsraelDashboardData';
import { useDashboardSeasons } from '../../../home/dashboard/hooks/useDashboardSeasons';
import { GlobalScopedFilters } from '../../../../components/ui/GlobalScopedFilters';
import filterStyles from '../../../../components/ui/styles/GlobalFiltersBar.module.css';
import { ISRAEL_DASHBOARD_I18N } from '../i18n';
import {
  printDashboardSummary,
  buildDashboardSummaryHtml,
  DASHBOARD_SUMMARY_PRINT_STYLES,
  type DashboardSummaryPrintTable,
} from '../../../home/dashboard/services/dashboardSummaryPrint.service';
import { buildCategoryGradeGroupSplits, type CategoryGradeGroupSplit } from '../../../harvest/utils/gradeGroupBreakdown.util';
import { GradeGroupSplitCards } from '../../../harvest/components/shared/GradeGroupSplitCards';
import { getIsraelClassificationsBySeason, type IsraelClassificationSeasonRecord } from '../../../../services/israel/israelClassificationsApi';
import type { GradeGroup } from '../../../../services/traderCategoriesApi';

type IsraelHomeDashboardProps = {
  lang: 'he' | 'en';
};

export function IsraelHomeDashboard({ lang }: IsraelHomeDashboardProps): JSX.Element {
  const t = ISRAEL_DASHBOARD_I18N[lang];
  const { seasons, activeSeasonId } = useDashboardSeasons();
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | undefined>(undefined);

  const resolvedSeasonId = selectedSeasonId ?? activeSeasonId ?? undefined;

  const { data, loading, error } = useIsraelDashboardData(resolvedSeasonId);

  const [sortingKey, setSortingKeyState] = useState<string>(ISRAEL_SORTING_GENERAL_KEY);
  const [sortingFieldCategoryKey, setSortingFieldCategoryKey] = useState<string>(ISRAEL_SORTING_FIELD_CATEGORY_GENERAL_KEY);
  const setSortingKey = (key: string) => {
    setSortingKeyState(key);
    setSortingFieldCategoryKey(ISRAEL_SORTING_FIELD_CATEGORY_GENERAL_KEY);
  };
  const [shipmentsStatus, setShipmentsStatus] = useState<IsraelShipmentStatusKey>('packaged');
  const [shipmentsFieldKey, setShipmentsFieldKey] = useState<string>(ISRAEL_SHIPMENTS_GENERAL_KEY);
  const [inventoryKey, setInventoryKey] = useState<string>(ISRAEL_GENERAL_KEY);
  const [classificationRows, setClassificationRows] = useState<IsraelClassificationSeasonRecord[]>([]);

  useEffect(() => {
    const seasonId = resolvedSeasonId ? Number(resolvedSeasonId) : undefined;
    if (!seasonId) {
      setClassificationRows([]);
      return;
    }

    let cancelled = false;
    getIsraelClassificationsBySeason(seasonId)
      .then((rows) => {
        if (!cancelled) setClassificationRows(rows);
      })
      .catch(() => {
        if (!cancelled) setClassificationRows([]);
      });

    return () => {
      cancelled = true;
    };
  }, [resolvedSeasonId]);

  const handleValuesChange = (vals: Record<string, string>) => {
    if (vals.seasonId !== undefined) setSelectedSeasonId(vals.seasonId);
  };

  const seasonOptions = useMemo(() => {
    if (!seasons.length) return [{ value: '', label: t.noSeason }];
    return seasons.map((s) => ({
      value: String(s.id),
      label: `${s.yearName}${s.isActive ? ` (${t.activeBadge})` : ''}`,
    }));
  }, [seasons, t.activeBadge, t.noSeason]);

  const filterConfig = useMemo(
    () => [
      {
        key: 'seasonId',
        label: t.seasonLabel,
        defaultValue: activeSeasonId,
        queryParam: 'ilDbSeason',
        options: seasonOptions,
      },
    ],
    [t.seasonLabel, activeSeasonId, seasonOptions],
  );

  const handlePrintDashboard = () => {
    const styleEl = document.createElement('style');
    styleEl.textContent = '@page { size: A4 landscape; margin: 1cm; }';
    document.head.appendChild(styleEl);

    const cleanup = () => {
      styleEl.remove();
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);

    window.print();
  };

  const printAction = (
    <div className={filterStyles.iconActions}>
      <button
        type="button"
        className={filterStyles.iconBtn}
        onClick={handlePrintDashboard}
        aria-label={t.printTitle}
        title={t.printTitle}
      >
        <FaPrint />
      </button>
    </div>
  );

  if (loading) {
    return (
      <>
        <GlobalScopedFilters
          scope="israelDashboard"
          filters={filterConfig}
          direction={lang === 'he' ? 'rtl' : 'ltr'}
          actions={printAction}
          onValuesChange={handleValuesChange}
          className={styles.filtersBar}
        />
        <div className={styles.stateBox}>
          <span className={styles.loadingText}>{t.loading}</span>
        </div>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <GlobalScopedFilters
          scope="israelDashboard"
          filters={filterConfig}
          direction={lang === 'he' ? 'rtl' : 'ltr'}
          actions={printAction}
          onValuesChange={handleValuesChange}
          className={styles.filtersBar}
        />
        <div className={styles.stateBox}>
          <span className={styles.errorText}>{error ?? t.error}</span>
        </div>
      </>
    );
  }

  const { production, fieldDistribution, categoryDistribution, sortingSummary, shipmentsSummary, inventorySummary, metrics } = data;

  // Grade-group percentage split per sort category, mirroring Italy's dashboard - sourced from
  // IsraelSortCategory.gradeGroups (embedded on each classification row's `category`), not from
  // the /israel/dashboard payload, since it's independent of the pitam matrices built there.
  const gradeGroupsByCategory = new Map<string, GradeGroup[]>();
  const categoryOrderMap = new Map<string, number>();
  const categoryGradeTotals = new Map<string, Map<string, number>>();

  for (const record of classificationRows) {
    if (!record.category) continue;
    const catName = record.category.name;
    if (record.category.gradeGroups?.length && !gradeGroupsByCategory.has(catName)) {
      gradeGroupsByCategory.set(catName, record.category.gradeGroups);
    }
    if (!categoryOrderMap.has(catName)) categoryOrderMap.set(catName, record.category.orderIndex);

    const qty = record.quantity || 0;
    if (qty <= 0) continue;
    const grade = (record.grade || '').trim() || t.gradeGroups.grade;
    if (!categoryGradeTotals.has(catName)) categoryGradeTotals.set(catName, new Map());
    const gradeMap = categoryGradeTotals.get(catName)!;
    gradeMap.set(grade, (gradeMap.get(grade) ?? 0) + qty);
  }

  const gradeGroupSplits: CategoryGradeGroupSplit[] = buildCategoryGradeGroupSplits(
    categoryGradeTotals,
    gradeGroupsByCategory,
    categoryOrderMap,
    t.gradeGroups.ungrouped,
  );

  const productionTabs = [
    {
      label: t.netHarvest,
      content: (
        <SvgLineChart
          data={production.netHarvest}
          backgroundSeries={production.netHarvestHistory.map((s) => ({ label: String(s.yearName), data: s.data }))}
          currentSeasonLabel={t.currentSeason}
        />
      ),
    },
    {
      label: t.sorted,
      content: (
        <SvgLineChart
          data={production.sorted}
          backgroundSeries={production.sortedHistory.map((s) => ({ label: String(s.yearName), data: s.data }))}
          currentSeasonLabel={t.currentSeason}
        />
      ),
    },
    {
      label: t.packaged,
      content: (
        <SvgLineChart
          data={production.packaged}
          backgroundSeries={production.packagedHistory.map((s) => ({ label: String(s.yearName), data: s.data }))}
          currentSeasonLabel={t.currentSeason}
        />
      ),
    },
  ];

  const fieldTabs = [
    { label: t.general, content: <SvgBarChart data={fieldDistribution.general} /> },
    ...fieldDistribution.fieldNames.map((name) => ({
      label: name,
      content: <SvgBarChart data={fieldDistribution.byField[name] ?? []} />,
    })),
  ];

  const categoryTabs = [
    { label: t.general, content: <SvgBarChart data={categoryDistribution.general} /> },
    ...categoryDistribution.categoryNames.map((name) => ({
      label: name,
      content: <SvgBarChart data={categoryDistribution.byCategory[name] ?? []} />,
    })),
  ];

  const calcMax = (value: number, percent: number) => (percent > 0 ? Math.round((value * 100) / percent) : undefined);

  const shippableBase = metrics.harvest.value - metrics.selfPickup.value;

  const gaugeCards = [
    { title: t.gauges.harvest, ...metrics.harvest, icon: <FaLeaf />, maxValue: metrics.harvest.value },
    { title: t.gauges.sorted, ...metrics.sorted, icon: <FaArrowsUpDown />, maxValue: metrics.harvest.value },
    { title: t.gauges.selfPickup, ...metrics.selfPickup, icon: <FaHandHolding />, maxValue: metrics.harvest.value },
    { title: t.gauges.packaged, ...metrics.packaged, icon: <FaBox />, maxValue: calcMax(metrics.packaged.value, metrics.packaged.percent) ?? shippableBase },
    { title: t.gauges.shipped, ...metrics.shipped, icon: <FaTruck />, maxValue: calcMax(metrics.shipped.value, metrics.shipped.percent) ?? shippableBase },
    { title: t.gauges.delivered, ...metrics.delivered, icon: <FaCircleCheck />, maxValue: calcMax(metrics.delivered.value, metrics.delivered.percent) ?? shippableBase },
  ];

  const selectedSeasonLabel = seasonOptions.find((s) => s.value === String(resolvedSeasonId))?.label ?? '';

  const summaryTabs = [
    {
      key: 'harvestSorting',
      label: t.summary.harvestSortingTab,
      content: (
        <IsraelHarvestSortingSummary
          lang={lang}
          data={sortingSummary}
          unit={t.unit}
          activeKey={sortingKey}
          onActiveKeyChange={setSortingKey}
          activeFieldCategoryKey={sortingFieldCategoryKey}
          onActiveFieldCategoryKeyChange={setSortingFieldCategoryKey}
          labels={t.summary.harvestSorting}
        />
      ),
    },
    {
      key: 'shipments',
      label: t.summary.shipmentsTab,
      content: (
        <IsraelShipmentsSummary
          lang={lang}
          data={shipmentsSummary}
          unit={t.unit}
          activeStatus={shipmentsStatus}
          onActiveStatusChange={setShipmentsStatus}
          activeFieldKey={shipmentsFieldKey}
          onActiveFieldKeyChange={setShipmentsFieldKey}
          labels={t.summary.shipments}
        />
      ),
    },
    {
      key: 'inventory',
      label: t.summary.inventoryTab,
      content: (
        <IsraelInventorySummary
          lang={lang}
          data={inventorySummary}
          unit={t.unit}
          activeKey={inventoryKey}
          onActiveKeyChange={setInventoryKey}
          labels={t.summary.inventory}
        />
      ),
    },
  ];

  const SHIPMENT_STATUS_KEYS: IsraelShipmentStatusKey[] = ['packaged', 'shipped', 'delivered'];

  const buildSummaryPrintTables = (): DashboardSummaryPrintTable[] => {
    const locale = lang === 'he' ? 'he-IL' : 'en-US';
    const fmt = (n: number) => `${n.toLocaleString(locale)} ${t.unit}`;

    const shipmentsTables = SHIPMENT_STATUS_KEYS.flatMap((statusKey) => {
      const statusGroup = shipmentsSummary[statusKey];
      const generalTable = {
        title: `${t.summary.shipmentsTab} – ${t.summary.shipments.statusTabs[statusKey]} – ${t.summary.shipments.generalTab}`,
        metaLines: [`${t.summary.shipments.totalLabels[statusKey]}: ${fmt(statusGroup.general.total)}`],
        categories: statusGroup.general.categories,
        grades: statusGroup.general.grades,
        matrix: statusGroup.general.matrix,
        categoryColumnLabel: t.summary.shipments.categoryColumn,
        totalColumnLabel: t.summary.shipments.totalColumn,
        emptyLabel: t.summary.shipments.empty,
        columnLabels: t.summary.shipments.columns,
        footerLines: [`${t.summary.shipments.selfPickupNote}: ${fmt(shipmentsSummary.selfPickupTotal)}`],
      };
      const fieldTables = statusGroup.fieldNames.map((name) => {
        const fieldData = statusGroup.byField[name];
        return {
          title: `${t.summary.shipmentsTab} – ${t.summary.shipments.statusTabs[statusKey]} – ${name}`,
          metaLines: [`${t.summary.shipments.totalLabels[statusKey]}: ${fmt(fieldData.total)}`],
          categories: fieldData.categories,
          grades: fieldData.grades,
          matrix: fieldData.matrix,
          categoryColumnLabel: t.summary.shipments.categoryColumn,
          totalColumnLabel: t.summary.shipments.totalColumn,
          emptyLabel: t.summary.shipments.empty,
          columnLabels: t.summary.shipments.columns,
          footerLines: [],
        };
      });
      return [generalTable, ...fieldTables];
    });

    const inventoryGeneralTable = {
      title: `${t.summary.inventoryTab} – ${t.summary.inventory.generalTab}`,
      metaLines: [`${t.summary.inventory.totalLabel}: ${fmt(inventorySummary.general.total)}`],
      categories: inventorySummary.general.categories,
      grades: inventorySummary.general.grades,
      matrix: inventorySummary.general.matrix,
      categoryColumnLabel: t.summary.inventory.categoryColumn,
      totalColumnLabel: t.summary.inventory.totalColumn,
      emptyLabel: t.summary.inventory.empty,
      columnLabels: t.summary.inventory.columns,
      footerLines: [],
    };

    const inventoryFieldTables = inventorySummary.fieldNames.map((name) => {
      const fieldData = inventorySummary.byField[name];
      return {
        title: `${t.summary.inventoryTab} – ${name}`,
        metaLines: [`${t.summary.inventory.totalLabel}: ${fmt(fieldData.total)}`],
        categories: fieldData.categories,
        grades: fieldData.grades,
        matrix: fieldData.matrix,
        categoryColumnLabel: t.summary.inventory.categoryColumn,
        totalColumnLabel: t.summary.inventory.totalColumn,
        emptyLabel: t.summary.inventory.empty,
        columnLabels: t.summary.inventory.columns,
        footerLines: [],
      };
    });

    const sortingGeneralTable = {
      title: `${t.summary.harvestSortingTab} – ${t.summary.harvestSorting.generalTab}`,
      metaLines: [`${t.summary.harvestSorting.netHarvest}: ${fmt(sortingSummary.netHarvest)}`],
      categories: sortingSummary.general.categories,
      grades: sortingSummary.general.grades,
      matrix: sortingSummary.general.matrix,
      categoryColumnLabel: t.summary.harvestSorting.categoryColumn,
      totalColumnLabel: t.summary.harvestSorting.totalColumn,
      emptyLabel: t.summary.harvestSorting.empty,
      columnLabels: t.summary.harvestSorting.columns,
      footerLines: [],
    };

    const sortingFieldTables = sortingSummary.fieldNames.map((name) => {
      const fieldData = sortingSummary.byField[name];
      return {
        title: `${t.summary.harvestSortingTab} – ${name}`,
        metaLines: [`${t.summary.harvestSorting.totalLabel}: ${fmt(fieldData.total)}`],
        categories: fieldData.categories,
        grades: fieldData.grades,
        matrix: fieldData.matrix,
        categoryColumnLabel: t.summary.harvestSorting.categoryColumn,
        totalColumnLabel: t.summary.harvestSorting.totalColumn,
        emptyLabel: t.summary.harvestSorting.empty,
        columnLabels: t.summary.harvestSorting.columns,
        footerLines: [],
      };
    });

    return [
      sortingGeneralTable,
      ...sortingFieldTables,
      ...shipmentsTables,
      inventoryGeneralTable,
      ...inventoryFieldTables,
    ];
  };

  const handlePrintSummary = () => {
    printDashboardSummary({
      lang,
      heading: t.summary.title,
      tables: buildSummaryPrintTables(),
    });
  };

  const summaryPrintHtml = buildDashboardSummaryHtml(lang, buildSummaryPrintTables());

  const withGaugeCell = (card: (typeof gaugeCards)[number]): ReactNode => (
    <div key={card.title} className={styles.metricCell}>
      <GaugeCard
        title={card.title}
        valueLabel={`${card.value.toLocaleString()} ${t.unit}`}
        percent={card.percent}
        icon={card.icon}
        maxValue={card.maxValue}
      />
    </div>
  );

  return (
    <>
      <GlobalScopedFilters
        scope="israelDashboard"
        filters={filterConfig}
        direction={lang === 'he' ? 'rtl' : 'ltr'}
        actions={printAction}
        onValuesChange={handleValuesChange}
        className={styles.filtersBar}
      />

      <div className={styles.dashboard}>
        <div className={styles.printHeader}>
          <span className={styles.printFilterLabel}>{lang === 'he' ? 'סינון פעיל' : 'Active filter'}</span>
          <span className={styles.printSeason}>{selectedSeasonLabel}</span>
        </div>
        <div className={styles.topRow}>
          <div className={styles.halfCell}>
            <ChartPanel title={t.productionRate} tabs={productionTabs} expandLabel={t.expandChart} closeLabel={t.closeChart} />
          </div>
          <div className={styles.quarterCell}>
            <ChartPanel title={t.fieldsDistribution} tabs={fieldTabs} expandLabel={t.expandChart} closeLabel={t.closeChart} />
          </div>
          <div className={styles.quarterCell}>
            <ChartPanel title={t.categoriesDistribution} tabs={categoryTabs} expandLabel={t.expandChart} closeLabel={t.closeChart} />
          </div>
        </div>

        <div className={styles.metricsRow}>{gaugeCards.map(withGaugeCell)}</div>

        <div className={styles.gradeGroupSplitPrintOnly}>
          <GradeGroupSplitCards
            title={t.gradeGroups.title}
            splits={gradeGroupSplits}
            groupColumnLabel={t.gradeGroups.groupColumn}
            percentColumnLabel={t.gradeGroups.percentColumn}
            locale={lang === 'he' ? 'he-IL' : 'en-US'}
          />
        </div>

        <div className={styles.summaryScreenOnly}>
          <SummarySection title={t.summary.title} tabs={summaryTabs} onPrint={handlePrintSummary} printTitle={t.summary.printTitle} />
        </div>

        <div className={styles.summaryPrintOnly}>
          <style dangerouslySetInnerHTML={{ __html: `@media print { ${DASHBOARD_SUMMARY_PRINT_STYLES} }` }} />
          <div dangerouslySetInnerHTML={{ __html: summaryPrintHtml }} />
        </div>

        <div className={styles.gradeGroupSplitScreenOnly}>
          <GradeGroupSplitCards
            title={t.gradeGroups.title}
            splits={gradeGroupSplits}
            groupColumnLabel={t.gradeGroups.groupColumn}
            percentColumnLabel={t.gradeGroups.percentColumn}
            locale={lang === 'he' ? 'he-IL' : 'en-US'}
            compact
          />
        </div>
      </div>
    </>
  );
}
