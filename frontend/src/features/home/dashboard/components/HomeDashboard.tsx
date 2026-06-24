import { useState, useCallback, useMemo } from 'react';
import { FaPrint, FaLeaf, FaArrowDown, FaScaleBalanced, FaArrowsUpDown, FaBox, FaTruck } from 'react-icons/fa6';
import styles from '../styles/HomeDashboard.module.css';
import { ChartPanel } from './ChartPanel';
import { SvgLineChart } from './SvgLineChart';
import { SvgBarChart } from './SvgBarChart';
import { GaugeCard } from './GaugeCard';
import { useDashboardData } from '../hooks/useDashboardData';
import { useDashboardSeasons } from '../hooks/useDashboardSeasons';
import { GlobalScopedFilters } from '../../../../components/ui/GlobalScopedFilters';
import filterStyles from '../../../../components/ui/styles/GlobalFiltersBar.module.css';
import { HOME_I18N } from '../../i18n';

type HomeDashboardProps = {
  lang: 'he' | 'en';
};

export function HomeDashboard({ lang }: HomeDashboardProps): JSX.Element {
  const t = HOME_I18N[lang].dashboard;
  const { seasons, activeSeasonId } = useDashboardSeasons();
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | undefined>(undefined);

  const resolvedSeasonId = selectedSeasonId ?? activeSeasonId ?? undefined;

  const { data, loading, error } = useDashboardData(resolvedSeasonId);

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

  const printAction = (
    <div className={filterStyles.iconActions}>
      <button
        type="button"
        className={filterStyles.iconBtn}
        onClick={() => window.print()}
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

  const { production, traderDistribution, customerDistribution, metrics } = data;

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

  const gaugeCards = [
    { title: t.gauges.grossHarvest, ...metrics.grossHarvest, variant: 'default' as const, icon: <FaLeaf />, maxValue: calcMax(metrics.grossHarvest.value, metrics.grossHarvest.percent) },
    { title: t.gauges.rejects, ...metrics.rejects, variant: 'default' as const, icon: <FaArrowDown />, maxValue: metrics.grossHarvest.value },
    { title: t.gauges.netHarvest, ...metrics.netHarvest, variant: 'default' as const, icon: <FaScaleBalanced />, maxValue: metrics.grossHarvest.value },
    { title: t.gauges.sorted, ...metrics.sorted, variant: 'default' as const, icon: <FaArrowsUpDown />, maxValue: metrics.netHarvest.value },
    { title: t.gauges.packaged, ...metrics.packaged, variant: 'default' as const, icon: <FaBox />, maxValue: metrics.netHarvest.value },
    { title: t.gauges.shipped, ...metrics.shipped, variant: 'default' as const, icon: <FaTruck />, maxValue: metrics.netHarvest.value },
  ];

  const selectedSeasonLabel = seasonOptions.find((s) => s.value === String(resolvedSeasonId))?.label ?? '';

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
          {gaugeCards.map((card) => (
            <GaugeCard
              key={card.title}
              title={card.title}
              valueLabel={`${card.value.toLocaleString()} ${t.unit}`}
              percent={card.percent}
              variant={card.variant}
              icon={card.icon}
              maxValue={card.maxValue}
            />
          ))}
        </div>
      </div>
    </>
  );
}
