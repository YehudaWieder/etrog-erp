import { useState, useCallback, useMemo, useEffect, type ReactNode } from 'react';
import { FaPrint, FaLeaf, FaArrowDown, FaScaleBalanced, FaArrowsUpDown, FaBox, FaTruck, FaCircleCheck, FaMapPin, FaHandHolding } from 'react-icons/fa6';
import styles from '../styles/HomeDashboard.module.css';
import { ChartPanel } from './ChartPanel';
import { SummarySection } from './SummarySection';
import { HarvestSortingSummary } from './HarvestSortingSummary';
import { ShipmentsSummary, type StatusKey } from './ShipmentsSummary';
import { InventorySummary, GENERAL_KEY as INVENTORY_GENERAL_KEY } from './InventorySummary';
import { SvgLineChart } from './SvgLineChart';
import { SvgBarChart } from './SvgBarChart';
import { GaugeCard } from './GaugeCard';
import { useDashboardData } from '../hooks/useDashboardData';
import { useDashboardSeasons } from '../hooks/useDashboardSeasons';
import { fetchReclassificationSummary } from '../../../../services/inventoryMovementsApi';
import { getClassificationsBySeason, type ClassificationListRecord } from '../../../../services/classificationsApi';
import { getTraderCategoriesWithShares, type TraderCategoryWithShares } from '../../../../services/traderCategoriesApi';
import { GlobalScopedFilters } from '../../../../components/ui/GlobalScopedFilters';
import filterStyles from '../../../../components/ui/styles/GlobalFiltersBar.module.css';
import { HOME_I18N } from '../../i18n';
import {
  printDashboardSummary,
  buildDashboardSummaryHtml,
  DASHBOARD_SUMMARY_PRINT_STYLES,
  type DashboardSummaryPrintTable,
} from '../services/dashboardSummaryPrint.service';
import {
  buildCategoryGradeTotals,
  buildGradeGroupsByCategory,
  buildCategoryGradeGroupSplits,
} from '../../../harvest/utils/gradeGroupBreakdown.util';
import { GradeGroupSplitCards } from '../../../harvest/components/shared/GradeGroupSplitCards';

type HomeDashboardProps = {
  lang: 'he' | 'en';
};

export function HomeDashboard({ lang }: HomeDashboardProps): JSX.Element {
  const t = HOME_I18N[lang].dashboard;
  const { seasons, activeSeasonId } = useDashboardSeasons();
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | undefined>(undefined);

  const resolvedSeasonId = selectedSeasonId ?? activeSeasonId ?? undefined;

  const { data, loading, error } = useDashboardData(resolvedSeasonId);

  const [reclassifiedTotal, setReclassifiedTotal] = useState(0);
  const [shipmentsStatus, setShipmentsStatus] = useState<StatusKey>('packaged');
  const [inventoryKey, setInventoryKey] = useState<string>(INVENTORY_GENERAL_KEY);
  const [classificationRows, setClassificationRows] = useState<ClassificationListRecord[]>([]);
  const [traderCategories, setTraderCategories] = useState<TraderCategoryWithShares[]>([]);

  useEffect(() => {
    const seasonId = resolvedSeasonId ? Number(resolvedSeasonId) : undefined;
    if (!seasonId) {
      setReclassifiedTotal(0);
      return;
    }

    let cancelled = false;
    fetchReclassificationSummary(seasonId)
      .then((entries) => {
        if (cancelled) return;
        setReclassifiedTotal(entries.reduce((sum, entry) => sum + entry.quantity, 0));
      })
      .catch(() => {
        if (!cancelled) setReclassifiedTotal(0);
      });

    return () => {
      cancelled = true;
    };
  }, [resolvedSeasonId]);

  useEffect(() => {
    const seasonId = resolvedSeasonId ? Number(resolvedSeasonId) : undefined;
    if (!seasonId) {
      setClassificationRows([]);
      setTraderCategories([]);
      return;
    }

    let cancelled = false;
    Promise.all([getClassificationsBySeason(seasonId), getTraderCategoriesWithShares(seasonId)])
      .then(([rows, categories]) => {
        if (cancelled) return;
        setClassificationRows(rows);
        setTraderCategories(categories);
      })
      .catch(() => {
        if (!cancelled) {
          setClassificationRows([]);
          setTraderCategories([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [resolvedSeasonId]);

  const handleValuesChange = useCallback((vals: Record<string, string>) => {
    if (vals.seasonId !== undefined) setSelectedSeasonId(vals.seasonId);
  }, []);

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
        queryParam: 'dbSeason',
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
          scope="dashboard"
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
          scope="dashboard"
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

  const { production, traderDistribution, customerDistribution, sortingSummary, shipmentsSummary, inventorySummary, metrics } = data;

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

  const traderTabs = [
    { label: t.general, content: <SvgBarChart data={traderDistribution.general} /> },
    ...traderDistribution.traderNames.map((name) => ({
      label: name,
      content: <SvgBarChart data={traderDistribution.byTrader[name] ?? []} highlightLabels={['מיון פרטי']} />,
    })),
  ];

  const customerTabs = [
    { label: t.customerTab, content: <SvgBarChart data={customerDistribution.general} /> },
    ...customerDistribution.customerNames.map((name) => ({
      label: name,
      content: <SvgBarChart data={customerDistribution.byCustomer[name] ?? []} />,
    })),
  ];

  const calcMax = (value: number, percent: number) =>
    percent > 0 ? Math.round((value * 100) / percent) : undefined;

  const withX = (icon: ReactNode) => <span className={styles.iconWithX}>{icon}</span>;

  // Packaged/shipped/delivered track what's left the country via the normal packaging/shipment
  // pipeline, so remains-in-Italy stock and self-pickup stock (which bypasses that pipeline
  // entirely) must both come out of their base, not just netHarvest.
  const netBeforeSelfPickup = metrics.netHarvest.value - metrics.remainingInItaly.value;
  const netAvailableForShipping = netBeforeSelfPickup - metrics.selfPickup.value;

  const allGaugeCards = [
    { title: t.gauges.grossHarvest, ...metrics.grossHarvest, variant: 'default' as const, icon: <FaLeaf />, maxValue: calcMax(metrics.grossHarvest.value, metrics.grossHarvest.percent) },
    { title: t.gauges.rejects, ...metrics.rejects, variant: 'default' as const, icon: <FaArrowDown />, maxValue: metrics.grossHarvest.value },
    { title: t.gauges.grossHarvestExcludingBadPicks, ...metrics.grossHarvestExcludingBadPicks, variant: 'default' as const, icon: <FaLeaf />, maxValue: metrics.grossHarvestExcludingBadPicks.value },
    { title: t.gauges.rejectsExcludingBadPicks, ...metrics.rejectsExcludingBadPicks, variant: 'default' as const, icon: <FaArrowDown />, maxValue: metrics.grossHarvestExcludingBadPicks.value },
    { title: t.gauges.netHarvest, ...metrics.netHarvest, variant: 'default' as const, icon: <FaScaleBalanced />, maxValue: metrics.grossHarvest.value },
    { title: t.gauges.sorted, ...metrics.sorted, variant: 'default' as const, icon: <FaArrowsUpDown />, maxValue: metrics.netHarvest.value },
    { title: t.gauges.notSorted, value: metrics.netHarvest.value - metrics.sorted.value, percent: 100 - metrics.sorted.percent, variant: 'default' as const, icon: withX(<FaArrowsUpDown />), maxValue: metrics.netHarvest.value },
    { title: t.gauges.remainingInItaly, ...metrics.remainingInItaly, variant: 'default' as const, icon: <FaMapPin />, maxValue: metrics.netHarvest.value },
    { title: t.gauges.selfPickup, ...metrics.selfPickup, variant: 'default' as const, icon: <FaHandHolding />, maxValue: netBeforeSelfPickup },
    { title: t.gauges.packaged, ...metrics.packaged, variant: 'default' as const, icon: <FaBox />, maxValue: netAvailableForShipping },
    { title: t.gauges.notPackaged, value: netAvailableForShipping - metrics.packaged.value, percent: 100 - metrics.packaged.percent, variant: 'default' as const, icon: withX(<FaBox />), maxValue: netAvailableForShipping },
    { title: t.gauges.shipped, ...metrics.shipped, variant: 'default' as const, icon: <FaTruck />, maxValue: netAvailableForShipping },
    { title: t.gauges.notShipped, value: netAvailableForShipping - metrics.shipped.value, percent: 100 - metrics.shipped.percent, variant: 'default' as const, icon: withX(<FaTruck />), maxValue: netAvailableForShipping },
    { title: t.gauges.delivered, ...metrics.delivered, variant: 'default' as const, icon: <FaCircleCheck />, maxValue: netAvailableForShipping },
  ];

  const mainGaugeCards = allGaugeCards.slice(0, 7);
  const extraGaugeCards = allGaugeCards.slice(7);

  const selectedSeasonLabel = seasonOptions.find((s) => s.value === String(resolvedSeasonId))?.label ?? '';

  const gradeGroupsByCategory = buildGradeGroupsByCategory(traderCategories);
  const traderCategoryOrderForGroups = new Map<string, number>();
  for (const category of traderCategories) traderCategoryOrderForGroups.set(category.name, category.orderIndex);
  const categoryGradeTotals = buildCategoryGradeTotals(classificationRows, t.gradeGroups.grade);
  const gradeGroupSplits = buildCategoryGradeGroupSplits(
    categoryGradeTotals,
    gradeGroupsByCategory,
    traderCategoryOrderForGroups,
    t.gradeGroups.ungrouped,
  );

  const summaryTabs = [
    {
      key: 'harvestSorting',
      label: t.summary.harvestSortingTab,
      content: (
        <HarvestSortingSummary
          lang={lang}
          data={sortingSummary}
          unit={t.unit}
          reclassifiedTotal={reclassifiedTotal}
          labels={t.summary.harvestSorting}
        />
      ),
    },
    {
      key: 'shipments',
      label: t.summary.shipmentsTab,
      content: (
        <ShipmentsSummary
          lang={lang}
          data={shipmentsSummary}
          unit={t.unit}
          activeStatus={shipmentsStatus}
          onActiveStatusChange={setShipmentsStatus}
          labels={t.summary.shipments}
        />
      ),
    },
    {
      key: 'inventory',
      label: t.summary.inventoryTab,
      content: (
        <InventorySummary
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

  const SHIPMENT_STATUS_KEYS: StatusKey[] = ['packaged', 'shipped', 'delivered'];

  const buildSummaryPrintTables = (): DashboardSummaryPrintTable[] => {
    const locale = lang === 'he' ? 'he-IL' : 'en-US';
    const fmt = (n: number) => `${n.toLocaleString(locale)} ${t.unit}`;

    const shipmentsTables = SHIPMENT_STATUS_KEYS.map((statusKey) => {
      const statusData = shipmentsSummary[statusKey];
      return {
        title: `${t.summary.shipmentsTab} – ${t.summary.shipments.statusTabs[statusKey]}`,
        metaLines: [`${t.summary.shipments.totalLabels[statusKey]}: ${fmt(statusData.total)}`],
        categories: statusData.categories,
        grades: statusData.grades,
        matrix: statusData.matrix,
        categoryColumnLabel: t.summary.shipments.categoryColumn,
        totalColumnLabel: t.summary.shipments.totalColumn,
        emptyLabel: t.summary.shipments.empty,
        columnLabels: t.summary.shipments.columns,
        footerLines: [
          `${t.summary.shipments.customerNote}: ${fmt(statusData.customerTotal)}`,
          `${t.summary.shipments.selfPickupNote}: ${fmt(shipmentsSummary.selfPickupTotal)}`,
        ],
      };
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
      footerLines: [
        `${t.summary.inventory.customerNote}: ${fmt(inventorySummary.general.customerTotal)}`,
        `${t.summary.inventory.remainsInItalyFooterNote}: ${fmt(inventorySummary.general.remainsInItalyTotal)}`,
        `${t.summary.inventory.privateNote}: ${fmt(inventorySummary.general.privateTotal)}`,
        `${t.summary.inventory.moduloNote}: ${fmt(inventorySummary.modulo.total)}`,
      ],
    };

    const inventoryTraderTables = inventorySummary.traderNames.map((name) => {
      const traderData = inventorySummary.byTrader[name];
      return {
        title: `${t.summary.inventoryTab} – ${name}`,
        metaLines: [`${t.summary.inventory.totalLabel}: ${fmt(traderData.total)}`],
        categories: traderData.categories,
        grades: traderData.grades,
        matrix: traderData.matrix,
        categoryColumnLabel: t.summary.inventory.categoryColumn,
        totalColumnLabel: t.summary.inventory.totalColumn,
        emptyLabel: t.summary.inventory.empty,
        columnLabels: t.summary.inventory.columns,
        footerLines: [`${t.summary.inventory.privateNote}: ${fmt(traderData.privateTotal)}`],
      };
    });

    const inventoryModuloTable = {
      title: `${t.summary.inventoryTab} – ${t.summary.inventory.moduloTab}`,
      metaLines: [`${t.summary.inventory.totalLabel}: ${fmt(inventorySummary.modulo.total)}`],
      categories: inventorySummary.modulo.categories,
      grades: inventorySummary.modulo.grades,
      matrix: inventorySummary.modulo.matrix,
      categoryColumnLabel: t.summary.inventory.categoryColumn,
      totalColumnLabel: t.summary.inventory.totalColumn,
      emptyLabel: t.summary.inventory.empty,
      columnLabels: t.summary.inventory.columns,
      footerLines: [],
    };

    return [
      {
        title: t.summary.harvestSortingTab,
        metaLines: [`${t.summary.harvestSorting.netHarvest}: ${fmt(sortingSummary.netHarvest)}`],
        categories: sortingSummary.categories,
        grades: sortingSummary.grades,
        matrix: sortingSummary.matrix,
        categoryColumnLabel: t.summary.harvestSorting.categoryColumn,
        totalColumnLabel: t.summary.harvestSorting.totalColumn,
        emptyLabel: t.summary.harvestSorting.empty,
        columnLabels: t.summary.harvestSorting.columns,
        footerLines: [
          `${t.summary.harvestSorting.privateSort}: ${fmt(sortingSummary.privateSortTotal)}`,
          `${t.summary.harvestSorting.customerSort}: ${fmt(sortingSummary.customerSortTotal)}`,
          `${t.summary.harvestSorting.reclassified}: ${fmt(reclassifiedTotal)}`,
        ],
      },
      ...shipmentsTables,
      inventoryGeneralTable,
      ...inventoryTraderTables,
      inventoryModuloTable,
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

  return (
    <>
      <GlobalScopedFilters
        scope="dashboard"
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
            <ChartPanel
              title={t.productionRate}
              tabs={productionTabs}
              expandLabel={t.expandChart}
              closeLabel={t.closeChart}
            />
          </div>
          <div className={styles.quarterCell}>
            <ChartPanel
              title={t.tradersDistribution}
              tabs={traderTabs}
              expandLabel={t.expandChart}
              closeLabel={t.closeChart}
            />
          </div>
          <div className={styles.quarterCell}>
            <ChartPanel
              title={t.customers}
              tabs={customerTabs}
              expandLabel={t.expandChart}
              closeLabel={t.closeChart}
            />
          </div>
        </div>

        <div className={styles.metricsRow}>
          {mainGaugeCards.map((card) => (
            <div key={card.title} className={styles.metricCell}>
              <GaugeCard
                title={card.title}
                valueLabel={`${card.value.toLocaleString()} ${t.unit}`}
                percent={card.percent}
                variant={card.variant}
                icon={card.icon}
                maxValue={card.maxValue}
              />
            </div>
          ))}
        </div>

        <div className={styles.metricsRowExtra}>
          {extraGaugeCards.map((card) => (
            <div key={card.title} className={styles.metricCell}>
              <GaugeCard
                title={card.title}
                valueLabel={`${card.value.toLocaleString()} ${t.unit}`}
                percent={card.percent}
                variant={card.variant}
                icon={card.icon}
                maxValue={card.maxValue}
              />
            </div>
          ))}
        </div>

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
          <SummarySection
            title={t.summary.title}
            tabs={summaryTabs}
            onPrint={handlePrintSummary}
            printTitle={t.summary.printTitle}
          />
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
