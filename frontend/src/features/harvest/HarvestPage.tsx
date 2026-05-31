import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppShell } from '../../app/layout/AppShell';
import { SettingsIcon } from '../../components/ui/SettingsIcon';
import type { NavItem } from '../../types/navigation';
import { getCurrentUser, isAuthenticated, logout } from '../../services/authService';
import type { Season } from '../../services/seasonsApi';
import type { Field } from '../../services/fieldsApi';
import {
  type HarvestFieldReportDetailsRecord,
  type HarvestRecord,
} from '../../services/harvestsApi';
import {
  type ClassificationDailySummaryCategory,
  type ClassificationDailySummaryRow,
  type ClassificationRecord,
} from '../../services/classificationsApi';
import type { Trader } from '../../services/tradersApi';
import type { Customer } from '../../services/customersApi';
import { setScopeFilter } from '../../store/globalFiltersSlice';
import type { AppDispatch, RootState } from '../../store';
import { HARVEST_I18N } from './i18n';
import { HarvestBulkFormModal } from './components/forms/HarvestBulkFormModal';
import { HarvestDailyDetailsSection } from './components/daily/HarvestDailyDetailsSection';
import { HarvestFieldReportSection } from './components/field-report/HarvestFieldReportSection';
import { HarvestSortingDailySection } from './components/sorting-daily/HarvestSortingDailySection';
import { useHarvestPageLifecycle } from './hooks/page/useHarvestPageLifecycle';
import { useHarvestFiltersAndRows } from './hooks/data/useHarvestFiltersAndRows';
import { useHarvestFormCategories } from './hooks/form/useHarvestFormCategories';
import { useHarvestDetailsSideEffects } from './hooks/details/useHarvestDetailsSideEffects';
import { useHarvestDetailsData } from './hooks/details/useHarvestDetailsData';
import { createHarvestExportActions } from './services/harvestExportActions';
import { useHarvestDetailsPrintActions } from './hooks/details/useHarvestDetailsPrintActions';
import { useHarvestNumericSelection } from './hooks/table/useHarvestNumericSelection';
import { useHarvestPageControls } from './hooks/page/useHarvestPageControls';
import { useHarvestRelatedSortings } from './hooks/details/useHarvestRelatedSortings';
import { useHarvestSortingDailyRows } from './hooks/data/useHarvestSortingDailyRows';
import { useHarvestTableColumns } from './hooks/table/useHarvestTableColumns';
import { useHarvestFormState } from './hooks/form/useHarvestFormState';
import { useHarvestFormSubmission } from './hooks/form/useHarvestFormSubmission';
import {
  buildHarvestFieldReportDetailsLabels,
  formatHarvestGregorianDate,
  formatHarvestRate,
  isHarvestPartialClassification,
} from './services/harvestDisplayFormatters.service';
import { createHarvestExportRowBuilders } from './services/harvestExportRowBuilders.service';
import type {
  HarvestFieldReportRow,
  SortingAssignmentFilter,
} from './harvestPage.types';
import {
  DEFAULT_SIDEBAR_ITEM_ID,
  HARVEST_DAILY_FILTER_SCOPE,
  matchesSortingAssignmentSelection,
  parseFieldFilterId,
  parseSeasonFilterId,
  parseSortingAssignmentFilter,
  resolveSortingCategoryOwnerToken,
  resolveSortingCategoryOwnerType,
} from './utils/harvestPage.utils';

const EMPTY_FILTERS: Record<string, string> = {};

export function HarvestPage() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTopId, setActiveTopId] = useState('harvest');
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [traders, setTraders] = useState<Trader[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [harvestRows, setHarvestRows] = useState<HarvestRecord[]>([]);
  const [fieldReportRows, setFieldReportRows] = useState<HarvestFieldReportRow[]>([]);
  const [fieldReportDetailsPayload, setFieldReportDetailsPayload] = useState<HarvestFieldReportDetailsRecord | null>(null);
  const [detailsRecord, setDetailsRecord] = useState<HarvestRecord | null>(null);
  const [fieldReportDetailsFieldId, setFieldReportDetailsFieldId] = useState<number | null>(null);
  const [relatedSortings, setRelatedSortings] = useState<ClassificationRecord[]>([]);
  const [isRelatedSortingsLoading, setIsRelatedSortingsLoading] = useState(false);
  const [relatedSortingsLoadError, setRelatedSortingsLoadError] = useState<string>('');
  const [sortingDailyRows, setSortingDailyRows] = useState<ClassificationDailySummaryRow[]>([]);
  const [sortingDailyCategories, setSortingDailyCategories] = useState<ClassificationDailySummaryCategory[]>([]);
  const [isSortingDailyLoading, setIsSortingDailyLoading] = useState(false);
  const [sortingDailyLoadError, setSortingDailyLoadError] = useState<string>('');
  const [sortingDailyDetailsRowId, setSortingDailyDetailsRowId] = useState<number | null>(null);
  const [sortingDailyDetailRows, setSortingDailyDetailRows] = useState<ClassificationRecord[]>([]);
  const [isSortingDailyDetailRowsLoading, setIsSortingDailyDetailRowsLoading] = useState(false);
  const [sortingDailyDetailRowsLoadError, setSortingDailyDetailRowsLoadError] = useState<string>('');
  const [isDragSelecting, setIsDragSelecting] = useState(false);
  const detailsPrintRef = useRef<HTMLDivElement | null>(null);
  const fieldReportDetailsPrintRef = useRef<HTMLDivElement | null>(null);
  const sortingDailyDetailsPrintRef = useRef<HTMLDivElement | null>(null);
  const sortingDownloadMenuCloseTimeoutRef = useRef<number | null>(null);
  const visibleHarvestRowsRef = useRef<HarvestRecord[]>([]);
  const visibleFieldReportRowsRef = useRef<HarvestFieldReportRow[]>([]);
  const visibleSortingDailyRowsRef = useRef<ClassificationDailySummaryRow[]>([]);
  const [isHarvestLoading, setIsHarvestLoading] = useState(false);
  const [harvestLoadError, setHarvestLoadError] = useState<string>('');
  const globalFilterValues = useSelector(
    (state: RootState) => state.globalFilters.scopes[HARVEST_DAILY_FILTER_SCOPE] ?? EMPTY_FILTERS,
  );
  const currentUser = getCurrentUser();
  const alertsCount = useHarvestPageLifecycle({ navigate, setIsDragSelecting });

  const lang = useMemo<'he' | 'en'>(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('app.language');
      if (stored === 'he' || stored === 'en') {
        return stored;
      }
    }
    return 'he';
  }, []);

  const t = HARVEST_I18N[lang];

  const activeSidebarId = useMemo(() => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    const subRoute = pathParts[1];
    return subRoute || DEFAULT_SIDEBAR_ITEM_ID;
  }, [location.pathname]);

  const pageTitle = useMemo(() => {
    for (const section of t.sidebar) {
      if (section.id === activeSidebarId) {
        return section.title;
      }

      const activeItem = section.items.find((item) => item.id === activeSidebarId);
      if (activeItem) {
        return activeItem.label;
      }
    }

    return t.pageTitle;
  }, [activeSidebarId, t.pageTitle, t.sidebar]);

  const content = useMemo(() => {
    return t.emptyState[activeSidebarId] ?? t.emptyState.default;
  }, [activeSidebarId, t.emptyState]);

  const handleTopNavClick = (item: NavItem) => {
    setActiveTopId(item.id);
    navigate(`/${item.id}`);
  };

  const handleSidebarClick = (item: NavItem) => {
    navigate(item.href || `/harvest/${item.id}`);
  };

  const isDailyDetailsTab = activeSidebarId === 'harvest-daily-details';
  const isFieldReportTab = activeSidebarId === 'harvest-field-report';
  const isSortingDailyDetailsTab = activeSidebarId === 'sorting-daily-details';
  const requiresFiltersData = isDailyDetailsTab || isFieldReportTab || isSortingDailyDetailsTab;
  const requiresHarvestData = isDailyDetailsTab || isFieldReportTab;

  const activeSeasonId = useMemo(() => {
    return seasons.find((season) => season.isActive)?.id ?? null;
  }, [seasons]);

  const seasonFilterId = useMemo(() => {
    return parseSeasonFilterId(globalFilterValues.seasonId ?? '');
  }, [globalFilterValues.seasonId]);

  const fieldFilterId = useMemo<number | 'all'>(() => {
    return parseFieldFilterId(globalFilterValues.fieldId ?? 'all');
  }, [globalFilterValues.fieldId]);

  const {
    isHarvestFormOpen,
    setIsHarvestFormOpen,
    setIsSubmittingHarvestForm,
    isSubmittingHarvestForm,
    harvestFormError,
    setHarvestFormError,
    harvestFormDateGregorian,
    setHarvestFormDateHebrew,
    harvestFormDateHebrew,
    harvestFormFieldId,
    setHarvestFormFieldId,
    harvestFormTotalHarvested,
    setHarvestFormTotalHarvested,
    harvestFormTotalRejected,
    setHarvestFormTotalRejected,
    harvestFormOwnerHarvested,
    setHarvestFormOwnerHarvested,
    harvestFormOwnerRejected,
    setHarvestFormOwnerRejected,
    harvestFormNotes,
    harvestFormIsPartialClassification,
    setHarvestFormIsPartialClassification,
    harvestFormClassifications,
    harvestFormTraderCategories,
    setHarvestFormTraderCategories,
    harvestFormCustomerCategories,
    setHarvestFormCustomerCategories,
    handleHarvestGregorianDateChange,
    handleHarvestNotesChange,
    openHarvestGlobalForm,
    closeHarvestGlobalForm,
    addHarvestClassificationDraft,
    removeHarvestClassificationDraft,
    updateHarvestClassificationDraft,
  } = useHarvestFormState({
    fieldFilterId,
    fields,
  });

  const sortingAssignmentFilter = useMemo<SortingAssignmentFilter>(() => {
    return parseSortingAssignmentFilter(globalFilterValues.sortingAssignmentType ?? 'all');
  }, [globalFilterValues.sortingAssignmentType]);

  useHarvestFiltersAndRows({
    requiresFiltersData,
    isSortingDailyDetailsTab,
    activeSeasonId,
    seasonFilterId,
    seasons,
    requiresHarvestData,
    isDailyDetailsTab,
    dailyLoadErrorMessage: t.dailyDetails.loadError,
    dispatch,
    setHarvestLoadError,
    setSeasons,
    setFields,
    setTraders,
    setCustomers,
    setIsHarvestLoading,
    setHarvestRows,
    setFieldReportRows,
  });

  useHarvestSortingDailyRows({
    isSortingDailyDetailsTab,
    seasonFilterId,
    lang,
    sortingDailyLoadErrorMessage: t.sortingDailyDetails.loadError,
    setSortingDailyRows,
    setSortingDailyCategories,
    setSortingDailyLoadError,
    setIsSortingDailyLoading,
  });

  useHarvestFormCategories({
    isHarvestFormOpen,
    seasonFilterId,
    setHarvestFormTraderCategories,
    setHarvestFormCustomerCategories,
  });

  const traderNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const trader of traders) {
      map.set(String(trader.id), trader.name);
    }
    return map;
  }, [traders]);

  const customerNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const customer of customers) {
      map.set(String(customer.id), customer.customerName);
    }
    return map;
  }, [customers]);

  const filteredSortingDailyCategories = useMemo(
    () =>
      sortingDailyCategories.filter((category) =>
        matchesSortingAssignmentSelection({
          sortingAssignmentFilter,
          ownerType: resolveSortingCategoryOwnerType(category),
          ownerName: category.ownerName,
          ownerToken: resolveSortingCategoryOwnerToken(category),
          traderNameById,
          customerNameById,
          lang,
        }),
      ),
    [customerNameById, lang, sortingAssignmentFilter, sortingDailyCategories, traderNameById],
  );

  const getCurrentSortingDailyExportRows = () => {
    const visibleRows = visibleSortingDailyRowsRef.current;
    if (visibleRows.length !== filteredSortingDailyRows.length) {
      return filteredSortingDailyRows;
    }

    const filteredIds = new Set(filteredSortingDailyRows.map((row) => row.harvestId));
    const areRowsInSync = visibleRows.every((row) => filteredIds.has(row.harvestId));

    return areRowsInSync ? visibleRows : filteredSortingDailyRows;
  };

  const sortingAssignmentFilterOptions = useMemo(() => {
    const traderPrefix = t.sortingDailyDetails.filters.assignmentOptions.traderPrefix;
    const customerPrefix = t.sortingDailyDetails.filters.assignmentOptions.customerPrefix;

    const locale = lang === 'he' ? 'he' : 'en';
    const collator = new Intl.Collator(locale, { sensitivity: 'base', numeric: true });

    const traderOptions = [...traders]
      .sort((left, right) => collator.compare(left.name, right.name))
      .map((trader) => ({
        value: `trader:${String(trader.id)}`,
        label: `${traderPrefix} ${trader.name}`,
        group: t.sortingDailyDetails.filters.assignmentOptions.trader,
      }));

    const customerOptions = [...customers]
      .sort((left, right) => collator.compare(left.customerName, right.customerName))
      .map((customer) => ({
        value: `customer:${String(customer.id)}`,
        label: `${customerPrefix} ${customer.customerName}`,
        group: t.sortingDailyDetails.filters.assignmentOptions.customer,
      }));

    return [
      { value: 'all', label: t.sortingDailyDetails.filters.assignmentOptions.all },
      { value: 'trader', label: t.sortingDailyDetails.filters.assignmentOptions.trader },
      { value: 'customer', label: t.sortingDailyDetails.filters.assignmentOptions.customer },
      ...traderOptions,
      ...customerOptions,
    ];
  }, [
    customers,
    lang,
    t.sortingDailyDetails.filters.assignmentOptions.all,
    t.sortingDailyDetails.filters.assignmentOptions.customer,
    t.sortingDailyDetails.filters.assignmentOptions.customerPrefix,
    t.sortingDailyDetails.filters.assignmentOptions.trader,
    t.sortingDailyDetails.filters.assignmentOptions.traderPrefix,
    traders,
  ]);

  useEffect(() => {
    if (!isSortingDailyDetailsTab) {
      return;
    }

    const rawValue = (globalFilterValues.sortingAssignmentType ?? 'all').trim().toLowerCase();
    const validValues = new Set(sortingAssignmentFilterOptions.map((option) => option.value));

    if (!validValues.has(rawValue)) {
      dispatch(
        setScopeFilter({
          scope: HARVEST_DAILY_FILTER_SCOPE,
          key: 'sortingAssignmentType',
          value: 'all',
        }),
      );
    }
  }, [dispatch, globalFilterValues.sortingAssignmentType, isSortingDailyDetailsTab, sortingAssignmentFilterOptions]);

  const { handleSubmitHarvestGlobalForm } = useHarvestFormSubmission({
    lang,
    seasonFilterId,
    currentUserId: currentUser?.id,
    form: {
      dateGregorian: harvestFormDateGregorian,
      dateHebrew: harvestFormDateHebrew,
      fieldId: harvestFormFieldId,
      totalHarvested: harvestFormTotalHarvested,
      totalRejected: harvestFormTotalRejected,
      ownerHarvested: harvestFormOwnerHarvested,
      ownerRejected: harvestFormOwnerRejected,
      notes: harvestFormNotes,
      isPartialClassification: harvestFormIsPartialClassification,
      classifications: harvestFormClassifications,
    },
    setIsSubmittingHarvestForm,
    setHarvestFormError,
    setIsHarvestFormOpen,
    setHarvestRows,
    setFieldReportRows,
    setSortingDailyRows,
    setSortingDailyCategories,
    setSortingDailyLoadError,
  });

  const formatGregorianDate = (value: string) => formatHarvestGregorianDate(value, lang);

  const {
    clearSelectedNumericCells,
    formattedSelectedTotal,
    renderFieldReportNumericCell,
    renderNumericCell,
    renderSortingNumericCell,
    selectedCellsCount,
  } = useHarvestNumericSelection({
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
  });

  const filteredHarvestRows = useMemo(() => {
    return harvestRows.filter((row) => (fieldFilterId === 'all' ? true : row.fieldId === fieldFilterId));
  }, [harvestRows, fieldFilterId]);

  useHarvestDetailsSideEffects({
    isFieldReportTab,
    isSortingDailyDetailsTab,
    seasonFilterId,
    fieldReportDetailsFieldId,
    fieldReportRows,
    setFieldReportDetailsFieldId,
    setFieldReportDetailsPayload,
    detailsRecord,
    filteredHarvestRows,
    setDetailsRecord,
    setRelatedSortings,
    setRelatedSortingsLoadError,
    setIsRelatedSortingsLoading,
    sortingDailyDetailsRowId,
    setSortingDailyDetailRows,
    setSortingDailyDetailRowsLoadError,
    setIsSortingDailyDetailRowsLoading,
    lang,
    t,
  });

  const numberFormatter = useMemo(() => {
    const locale = lang === 'he' ? 'he-IL' : 'en-US';
    return new Intl.NumberFormat(locale);
  }, [lang]);

  const percentFormatter = useMemo(() => {
    const locale = lang === 'he' ? 'he-IL' : 'en-US';
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  }, [lang]);

  const formatRate = (value: number | string) => formatHarvestRate(value, percentFormatter);

  const isPartialClassificationFlag = isHarvestPartialClassification;

  const { columns, fieldReportColumns, sortingDailyColumns } = useHarvestTableColumns({
    lang,
    t,
    formatGregorianDate,
    numberFormatter,
    formatRate,
    sortingDailyCategories,
    setDetailsRecord,
    setFieldReportDetailsFieldId,
    setSortingDailyDetailsRowId,
    renderNumericCell,
    renderFieldReportNumericCell,
    renderSortingNumericCell,
    isPartialClassificationFlag,
  });

  const filteredSortingDailyRows = useMemo<ClassificationDailySummaryRow[]>(() => {
    return sortingDailyRows
      .filter((row) => (fieldFilterId === 'all' ? true : row.fieldId === fieldFilterId))
      .map((row) => {
        const categoryTotals: Record<string, number> = {};
        let totalSorted = 0;

        for (const category of filteredSortingDailyCategories) {
          const value = row.categoryTotals[category.key] ?? 0;
          if (value <= 0) {
            continue;
          }

          categoryTotals[category.key] = value;
          totalSorted += value;
        }

        return {
          ...row,
          categoryTotals,
          totalSorted,
        };
      })
      .filter((row) => row.totalSorted > 0);
  }, [
    fieldFilterId,
    filteredSortingDailyCategories,
    sortingDailyRows,
  ]);

  const {
    createHarvestExportRows,
    createFieldReportExportRows,
    createSortingDailyExportRows,
    createSortingDailyExpandedMatrixData,
  } = createHarvestExportRowBuilders({
    lang,
    t,
    seasonFilterId,
    sortingAssignmentFilter,
    traderNameById,
    customerNameById,
    filteredHarvestRows,
    fieldReportRows,
    filteredSortingDailyCategories,
    visibleHarvestRowsRef,
    visibleFieldReportRowsRef,
    getCurrentSortingDailyExportRows,
    formatGregorianDate,
  });

  const {
    handlePrintHarvestTable,
    handleExportHarvestTableToExcel,
    handlePrintFieldReportTable,
    handleExportFieldReportTableToExcel,
    closeSortingActionMenu,
    cancelSortingDownloadMenuClose,
    scheduleSortingDownloadMenuClose,
    handlePrintSortingDailyTable,
    handleExportSortingDailyTableToExcel,
  } = createHarvestExportActions({
    lang,
    numberFormatter,
    sortingDownloadMenuCloseTimeoutRef,
    createHarvestExportRows,
    createFieldReportExportRows,
    createSortingDailyExportRows,
    createSortingDailyExpandedMatrixData,
  });

  const {
    sortingDailyDetailsData,
    sortingDailyCategoryBreakdown,
    fieldReportDetailsData,
    detailsSheetData,
  } = useHarvestDetailsData({
    lang,
    t,
    filteredSortingDailyRows,
    sortingDailyCategories,
    sortingDailyDetailsRowId,
    sortingDailyDetailRows,
    fieldReportDetailsPayload,
    detailsRecord,
    seasons,
    harvestRows,
    formatGregorianDate,
    numberFormatter,
    formatRate,
    isPartialClassificationFlag,
  });

  const relatedSortingsLabels = t.dailyDetails.detailsPanel.relatedSortings;
  const fieldReportDetailsLabels = buildHarvestFieldReportDetailsLabels(lang, t);

  const {
    formatRelatedSortingText,
    getRelatedSortingAssignmentLabel,
    getRelatedSortingCategory,
    getRelatedSortingGrade,
    getRelatedSortingNote,
    getRelatedSortingTarget,
    sortedRelatedSortings,
  } = useHarvestRelatedSortings({
    lang,
    relatedSortings,
    relatedSortingsLabels,
    noneValue: detailsSheetData?.values.none ?? '-',
  });

  const pageTitleWithCount = useMemo(() => {
    if (isDailyDetailsTab) {
      return `${pageTitle} (${filteredHarvestRows.length})`;
    }

    if (isFieldReportTab) {
      return `${pageTitle} (${fieldReportRows.length})`;
    }

    if (isSortingDailyDetailsTab) {
      return `${pageTitle} (${sortingDailyRows.length})`;
    }

    return pageTitle;
  }, [
    fieldReportRows.length,
    filteredHarvestRows.length,
    isDailyDetailsTab,
    isFieldReportTab,
    isSortingDailyDetailsTab,
    pageTitle,
    sortingDailyRows.length,
  ]);

  const { pageHeaderActions, filters } = useHarvestPageControls({
    lang,
    t,
    isDailyDetailsTab,
    isFieldReportTab,
    isSortingDailyDetailsTab,
    detailsRecord,
    sortingDailyDetailsRowId,
    openHarvestGlobalForm,
    activeSeasonId,
    seasons,
    fields,
    sortingAssignmentFilterOptions,
  });

  const {
    handlePrintDetails,
    handlePrintFieldReportDetails,
    handlePrintSortingDailyDetails,
  } = useHarvestDetailsPrintActions({
    lang,
    detailsPanelTitle: t.dailyDetails.detailsPanel.title,
    fieldReportDetailsFieldName: fieldReportDetailsData?.fieldName ?? null,
    detailsPrintRef,
    fieldReportDetailsPrintRef,
    sortingDailyDetailsPrintRef,
  });

  return (
    <AppShell
      direction={lang === 'he' ? 'rtl' : 'ltr'}
      brandName="Wieders etrogs"
      pageTitle={pageTitleWithCount}
      pageHeaderActions={pageHeaderActions}
      topNav={t.topNav}
      activeTopNavId={activeTopId}
      sidebarSections={t.sidebar}
      activeSidebarItemId={activeSidebarId}
      onTopNavClick={handleTopNavClick}
      onSidebarClick={handleSidebarClick}
      onBrandClick={() => navigate('/home')}
      topBarOptions={{
        alertsCount,
        onAlertsClick: () => navigate('/messages'),
        isAuthenticated: isAuthenticated(),
        onLogin: () => navigate('/login'),
        onRegister: () => navigate('/register'),
        onLogout: async () => {
          await logout();
          navigate('/login');
        },
        onProfile: () => navigate('/profile'),
        userName: currentUser?.name || '',
      }}
      sidebarFooterSlot={
        <button
          type="button"
          className="app-shell__sidebar-item app-shell__sidebar-settings"
          onClick={() => navigate('/settings')}
        >
          {lang === 'he' ? (
            <>
              {t.settings}
              <SettingsIcon style={{ marginInlineStart: 8 }} />
            </>
          ) : (
            <>
              <SettingsIcon style={{ marginInlineEnd: 8 }} />
              {t.settings}
            </>
          )}
        </button>
      }
    >
      {isDailyDetailsTab ? (
        <HarvestDailyDetailsSection
          lang={lang}
          description={t.dailyDetails.description}
          filters={filters}
          harvestLoadError={harvestLoadError}
          isHarvestLoading={isHarvestLoading}
          loadingLabel={t.dailyDetails.loading}
          emptyLabel={t.dailyDetails.empty}
          columns={columns}
          filteredHarvestRows={filteredHarvestRows}
          onHarvestSortedRowsChange={(rows) => {
            visibleHarvestRowsRef.current = rows;
          }}
          onPrintHarvestTable={handlePrintHarvestTable}
          onExportHarvestTableToExcel={() => {
            void handleExportHarvestTableToExcel();
          }}
          detailsRecordOpen={detailsRecord !== null}
          detailsPanelTitle={t.dailyDetails.detailsPanel.title}
          detailsPanelCloseLabel={t.dailyDetails.detailsPanel.close}
          detailsPanelPrintLabel={t.dailyDetails.detailsPanel.print}
          onCloseDetailsPanel={() => setDetailsRecord(null)}
          onPrintDetails={handlePrintDetails}
          detailsSheetData={detailsSheetData}
          detailsPrintRef={detailsPrintRef}
          detailsEmptyLabel={t.dailyDetails.detailsPanel.empty}
          relatedSortingsLabels={relatedSortingsLabels}
          isRelatedSortingsLoading={isRelatedSortingsLoading}
          relatedSortingsLoadError={relatedSortingsLoadError}
          relatedSortings={relatedSortings}
          sortedRelatedSortings={sortedRelatedSortings}
          numberFormatter={numberFormatter}
          formatRelatedSortingText={formatRelatedSortingText}
          getRelatedSortingAssignmentLabel={getRelatedSortingAssignmentLabel}
          getRelatedSortingTarget={getRelatedSortingTarget}
          getRelatedSortingCategory={getRelatedSortingCategory}
          getRelatedSortingGrade={getRelatedSortingGrade}
          getRelatedSortingNote={getRelatedSortingNote}
          selectedCellsCount={selectedCellsCount}
          formattedSelectedTotal={formattedSelectedTotal}
          selectionLabels={t.dailyDetails.selection}
          onClearSelectedNumericCells={clearSelectedNumericCells}
        />
      ) : isFieldReportTab ? (
        <HarvestFieldReportSection
          lang={lang}
          description={content.description}
          filters={filters}
          harvestLoadError={harvestLoadError}
          isHarvestLoading={isHarvestLoading}
          loadingLabel={t.dailyDetails.loading}
          emptyLabel={t.dailyDetails.empty}
          fieldReportColumns={fieldReportColumns}
          fieldReportRows={fieldReportRows}
          onFieldReportSortedRowsChange={(rows) => {
            visibleFieldReportRowsRef.current = rows;
          }}
          onPrintFieldReportTable={handlePrintFieldReportTable}
          onExportFieldReportTableToExcel={() => {
            void handleExportFieldReportTableToExcel();
          }}
          fieldReportDetailsData={fieldReportDetailsData}
          onCloseFieldReportDetails={() => setFieldReportDetailsFieldId(null)}
          onPrintFieldReportDetails={handlePrintFieldReportDetails}
          fieldReportDetailsPrintRef={fieldReportDetailsPrintRef}
          fieldReportDetailsLabels={fieldReportDetailsLabels}
          fieldReportDetailsEmptyLabel={t.dailyDetails.detailsPanel.empty}
          selectedCellsCount={selectedCellsCount}
          formattedSelectedTotal={formattedSelectedTotal}
          selectionLabels={t.dailyDetails.selection}
          onClearSelectedNumericCells={clearSelectedNumericCells}
        />
      ) : isSortingDailyDetailsTab ? (
        <HarvestSortingDailySection
          lang={lang}
          description={t.sortingDailyDetails.description}
          filters={filters}
          sortingDailyLoadError={sortingDailyLoadError}
          isSortingDailyLoading={isSortingDailyLoading}
          loadingLabel={t.sortingDailyDetails.loading}
          emptyLabel={t.sortingDailyDetails.empty}
          sortingDailyColumns={sortingDailyColumns}
          filteredSortingDailyRows={filteredSortingDailyRows}
          onSortingDailySortedRowsChange={(rows) => {
            visibleSortingDailyRowsRef.current = rows;
          }}
          onPrintSummary={() => {
            void handlePrintSortingDailyTable('summary');
          }}
          onExportSummary={() => {
            void handleExportSortingDailyTableToExcel('summary');
          }}
          onExportExpanded={() => {
            void handleExportSortingDailyTableToExcel('expanded');
          }}
          onCloseMenuFromTarget={closeSortingActionMenu}
          onCancelMenuClose={cancelSortingDownloadMenuClose}
          onScheduleMenuClose={scheduleSortingDownloadMenuClose}
          sortingDailyDetailsData={sortingDailyDetailsData}
          onCloseSortingDailyDetails={() => setSortingDailyDetailsRowId(null)}
          onPrintSortingDailyDetails={handlePrintSortingDailyDetails}
          sortingDailyDetailsPrintRef={sortingDailyDetailsPrintRef}
          sortingDailyCategoryBreakdown={sortingDailyCategoryBreakdown}
          isSortingDailyDetailRowsLoading={isSortingDailyDetailRowsLoading}
          sortingDailyDetailRowsLoadError={sortingDailyDetailRowsLoadError}
          formatGregorianDate={formatGregorianDate}
          numberFormatter={numberFormatter}
          sortingDailyDetailsLabels={{
            dateGregorian: t.sortingDailyDetails.columns.dateGregorian,
            dateHebrew: t.sortingDailyDetails.columns.dateHebrew,
            fieldName: t.sortingDailyDetails.columns.fieldName,
          }}
          selectedCellsCount={selectedCellsCount}
          formattedSelectedTotal={formattedSelectedTotal}
          selectionLabels={t.dailyDetails.selection}
          onClearSelectedNumericCells={clearSelectedNumericCells}
        />
      ) : (
        <section className="shipments-empty-state">
          <h2 className="shipments-empty-title">{content.title}</h2>
          <p className="shipments-empty-desc">{content.description}</p>
        </section>
      )}

      <HarvestBulkFormModal
        isOpen={isHarvestFormOpen}
        lang={lang}
        fields={fields}
        traders={traders}
        customers={customers}
        isSubmittingHarvestForm={isSubmittingHarvestForm}
        harvestFormError={harvestFormError}
        harvestFormFieldId={harvestFormFieldId}
        harvestFormDateGregorian={harvestFormDateGregorian}
        harvestFormDateHebrew={harvestFormDateHebrew}
        harvestFormTotalHarvested={harvestFormTotalHarvested}
        harvestFormTotalRejected={harvestFormTotalRejected}
        harvestFormOwnerHarvested={harvestFormOwnerHarvested}
        harvestFormOwnerRejected={harvestFormOwnerRejected}
        harvestFormIsPartialClassification={harvestFormIsPartialClassification}
        harvestFormNotes={harvestFormNotes}
        harvestFormClassifications={harvestFormClassifications}
        harvestFormTraderCategories={harvestFormTraderCategories}
        harvestFormCustomerCategories={harvestFormCustomerCategories}
        onClose={closeHarvestGlobalForm}
        onSubmit={() => {
          void handleSubmitHarvestGlobalForm();
        }}
        onFieldIdChange={setHarvestFormFieldId}
        onGregorianDateChange={handleHarvestGregorianDateChange}
        onHebrewDateChange={setHarvestFormDateHebrew}
        onTotalHarvestedChange={setHarvestFormTotalHarvested}
        onTotalRejectedChange={setHarvestFormTotalRejected}
        onOwnerHarvestedChange={setHarvestFormOwnerHarvested}
        onOwnerRejectedChange={setHarvestFormOwnerRejected}
        onPartialClassificationChange={setHarvestFormIsPartialClassification}
        onNotesChange={handleHarvestNotesChange}
        onAddClassificationDraft={addHarvestClassificationDraft}
        onRemoveClassificationDraft={removeHarvestClassificationDraft}
        onUpdateClassificationDraft={updateHarvestClassificationDraft}
      />
    </AppShell>
  );
}

