import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FaCirclePlus, FaFileArrowDown, FaFileInvoice, FaPenToSquare, FaPrint, FaTrashCan } from 'react-icons/fa6';
import type { Row } from 'exceljs';
import { AppShell } from '../../app/layout/AppShell';
import { SettingsIcon } from '../../components/ui/SettingsIcon';
import {
  GLOBAL_DATA_TABLE_WIDTHS,
  GlobalDataTable,
  type GlobalDataTableColumn,
} from '../../components/ui/GlobalDataTable';
import { GlobalLeftDetailsPanel } from '../../components/ui/GlobalLeftDetailsPanel';
import { GlobalScopedFilters, type GlobalScopedFilterConfig } from '../../components/ui/GlobalScopedFilters';
import type { NavItem } from '../../types/navigation';
import { getCurrentUser, isAuthenticated, logout } from '../../services/authService';
import { getSeasons, type Season } from '../../services/seasonsApi';
import { getFields, type Field } from '../../services/fieldsApi';
import {
  createHarvestWithClassifications,
  getHarvestFieldReportDetailsBySeasonAndField,
  getHarvestFieldTotalsBySeason,
  getHarvestsBySeason,
  type CreateHarvestWithClassificationsPayload,
  type HarvestBulkClassificationPayload,
  type HarvestFieldReportDetailsRecord,
  type HarvestRecord,
} from '../../services/harvestsApi';
import {
  getClassificationDailySummaryBySeason,
  getClassificationsByHarvest,
  type ClassificationDailySummaryCategory,
  type ClassificationDailySummaryRow,
  type ClassificationRecord,
} from '../../services/classificationsApi';
import { getTraders, type Trader } from '../../services/tradersApi';
import { getCustomers, type Customer } from '../../services/customersApi';
import { getCustomerCategoriesBySeason, type CustomerCategory } from '../../services/customerCategoriesApi';
import { getDefaultTraderCategories } from '../../services/defaultTraderCategoriesApi';
import { getTraderCategoriesWithShares, type TraderCategoryWithShares } from '../../services/traderCategoriesApi';
import { setScopeFilter } from '../../store/globalFiltersSlice';
import type { AppDispatch, RootState } from '../../store';
import { HARVEST_I18N } from './i18n';
import { HarvestFieldReportDetailsPanel } from './HarvestFieldReportDetailsPanel';
import { openPrintableWindow } from '../../utils/printWindow';

const DEFAULT_SIDEBAR_ITEM_ID = 'harvest-daily-details';
const HARVEST_DAILY_FILTER_SCOPE = 'harvest-daily-details';
const EMPTY_FILTERS: Record<string, string> = {};
type HarvestNumericColumnKey = 'totalHarvested' | 'totalRejected' | 'totalAfterRejected' | 'classifiedTotal';
type FieldReportNumericColumnKey = 'totalHarvested' | 'totalRejected' | 'totalAfterRejected' | 'rejectionRate';
type SortingDailyNumericColumnKey = 'totalSorted' | `category:${string}`;
type SortingAssignmentFilter = 'all' | 'trader' | 'customer' | `trader:${string}` | `customer:${string}`;
type NumericSelectionScope = 'daily' | 'field-report' | 'sorting-daily';
type NumericSelectableColumnKey = HarvestNumericColumnKey | FieldReportNumericColumnKey | SortingDailyNumericColumnKey;

type HarvestFormClassificationDraft = {
  id: string;
  assignmentType: 'GENERAL' | 'TRADER' | 'CUSTOMER';
  traderId: string;
  customerId: string;
  traderCategoryId: string;
  customerCategoryId: string;
  grade: string;
  pitamStatus: 'WITH_PITAM' | 'WITHOUT_PITAM' | 'MIXED';
  quantity: string;
  notes: string;
};

type HarvestFieldReportRow = {
  id: number;
  fieldName: string;
  recordCount: number;
  totalHarvested: number;
  totalRejected: number;
  totalAfterRejected: number;
  classifiedTotal: number;
  rejectionRate: number;
  ownerHarvested: number;
  ownerRejected: number;
  ownerAfterRejected: number;
  ownerRejectionRate: number;
  differenceHarvested: number;
  differenceRejected: number;
  differenceAfterRejected: number;
  differenceRejectionRate: number;
  hasOwnerOverrides: boolean;
  isPartialClassification: boolean;
};

const HARVEST_NUMERIC_COLUMNS: HarvestNumericColumnKey[] = [
  'totalHarvested',
  'totalRejected',
  'totalAfterRejected',
  'classifiedTotal',
];

const FIELD_REPORT_NUMERIC_COLUMNS: FieldReportNumericColumnKey[] = [
  'totalHarvested',
  'totalRejected',
  'totalAfterRejected',
  'rejectionRate',
];

const SORTING_DAILY_NUMERIC_COLUMNS: SortingDailyNumericColumnKey[] = ['totalSorted'];

function parseSeasonFilterId(value: string): number | null {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : null;
}

function parseFieldFilterId(value: string): number | 'all' {
  if (value === 'all') {
    return 'all';
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 'all';
}

function parseSortingAssignmentFilter(value: string): SortingAssignmentFilter {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'all' || normalized === 'trader' || normalized === 'customer') {
    return normalized;
  }

  if (normalized.startsWith('trader:') || normalized.startsWith('customer:')) {
    return normalized as SortingAssignmentFilter;
  }

  if (normalized === 'general') {
    return 'all';
  }

  return 'all';
}

function buildSortingCategoryDisplayLabel(category: ClassificationDailySummaryCategory, lang: 'he' | 'en') {
  if (!category.ownerType && !category.categoryName) {
    return category.label;
  }

  const defaultGeneralLabel = lang === 'he' ? 'כללי' : 'General';
  const ownerName = category.ownerName?.trim();
  const categoryLabel = category.categoryName?.trim() || category.label;

  if (category.ownerType === 'GENERAL') {
    return categoryLabel;
  }

  const ownerLabel = ownerName && ownerName.length > 0 ? ownerName : defaultGeneralLabel;

  return `${ownerLabel} | ${categoryLabel}`;
}

export function HarvestPage() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();
  const [alertsCount, setAlertsCount] = useState<number>(0);
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
  const [selectedNumericCells, setSelectedNumericCells] = useState<Record<string, number>>({});
  const [isDragSelecting, setIsDragSelecting] = useState(false);
  const dragSelectModeRef = useRef<'add' | 'remove'>('add');
  const detailsPrintRef = useRef<HTMLDivElement | null>(null);
  const fieldReportDetailsPrintRef = useRef<HTMLDivElement | null>(null);
  const sortingDailyDetailsPrintRef = useRef<HTMLDivElement | null>(null);
  const sortingDownloadMenuCloseTimeoutRef = useRef<number | null>(null);
  const visibleHarvestRowsRef = useRef<HarvestRecord[]>([]);
  const visibleFieldReportRowsRef = useRef<HarvestFieldReportRow[]>([]);
  const visibleSortingDailyRowsRef = useRef<ClassificationDailySummaryRow[]>([]);
  const [isHarvestLoading, setIsHarvestLoading] = useState(false);
  const [harvestLoadError, setHarvestLoadError] = useState<string>('');
  const [isHarvestFormOpen, setIsHarvestFormOpen] = useState(false);
  const [isSubmittingHarvestForm, setIsSubmittingHarvestForm] = useState(false);
  const [harvestFormError, setHarvestFormError] = useState<string>('');
  const [harvestFormDateGregorian, setHarvestFormDateGregorian] = useState('');
  const [harvestFormDateHebrew, setHarvestFormDateHebrew] = useState('');
  const [harvestFormFieldId, setHarvestFormFieldId] = useState('');
  const [harvestFormTotalHarvested, setHarvestFormTotalHarvested] = useState('');
  const [harvestFormTotalRejected, setHarvestFormTotalRejected] = useState('');
  const [harvestFormOwnerHarvested, setHarvestFormOwnerHarvested] = useState('');
  const [harvestFormOwnerRejected, setHarvestFormOwnerRejected] = useState('');
  const [harvestFormNotes, setHarvestFormNotes] = useState('');
  const [harvestFormIsPartialClassification, setHarvestFormIsPartialClassification] = useState(false);
  const [harvestFormClassifications, setHarvestFormClassifications] = useState<HarvestFormClassificationDraft[]>([]);
  const [harvestFormTraderCategories, setHarvestFormTraderCategories] = useState<TraderCategoryWithShares[]>([]);
  const [harvestFormCustomerCategories, setHarvestFormCustomerCategories] = useState<CustomerCategory[]>([]);
  const classificationDraftCounterRef = useRef(1);
  const globalFilterValues = useSelector(
    (state: RootState) => state.globalFilters.scopes[HARVEST_DAILY_FILTER_SCOPE] ?? EMPTY_FILTERS,
  );
  const currentUser = getCurrentUser();

  useEffect(() => {
    import('../../services/messagesApi').then(({ fetchUnreadCount }) => {
      fetchUnreadCount().then((res) => setAlertsCount(res.count)).catch(() => setAlertsCount(0));
    });
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
    }
  }, [navigate]);

  useEffect(() => {
    const stopSelecting = () => {
      setIsDragSelecting(false);
    };

    window.addEventListener('pointerup', stopSelecting);

    return () => {
      window.removeEventListener('pointerup', stopSelecting);
    };
  }, []);

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

  const sortingAssignmentFilter = useMemo<SortingAssignmentFilter>(() => {
    return parseSortingAssignmentFilter(globalFilterValues.sortingAssignmentType ?? 'all');
  }, [globalFilterValues.sortingAssignmentType]);

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

  const normalizeSortingAssignmentName = (value: string | undefined | null) =>
    (value ?? '').trim().toLocaleLowerCase(lang === 'he' ? 'he' : 'en');

  const matchesSortingAssignmentSelection = (
    ownerType: 'GENERAL' | 'TRADER' | 'CUSTOMER',
    ownerName?: string | null,
    ownerToken?: string | null,
  ) => {
    if (sortingAssignmentFilter === 'all') {
      return true;
    }

    if (sortingAssignmentFilter === 'trader') {
      return ownerType === 'TRADER';
    }

    if (sortingAssignmentFilter === 'customer') {
      return ownerType === 'CUSTOMER';
    }

    if (sortingAssignmentFilter.startsWith('trader:')) {
      if (ownerType !== 'TRADER') {
        return false;
      }

      const selectedId = sortingAssignmentFilter.slice('trader:'.length);
      const normalizedOwnerToken = (ownerToken ?? '').trim().toLowerCase();
      if (normalizedOwnerToken === sortingAssignmentFilter) {
        return true;
      }

      const selectedName = traderNameById.get(selectedId);
      if (!selectedName) {
        return false;
      }

      return normalizeSortingAssignmentName(ownerName) === normalizeSortingAssignmentName(selectedName);
    }

    if (ownerType !== 'CUSTOMER') {
      return false;
    }

    const selectedId = sortingAssignmentFilter.slice('customer:'.length);
    const normalizedOwnerToken = (ownerToken ?? '').trim().toLowerCase();
    if (normalizedOwnerToken === sortingAssignmentFilter) {
      return true;
    }

    const selectedName = customerNameById.get(selectedId);
    if (!selectedName) {
      return false;
    }

    return normalizeSortingAssignmentName(ownerName) === normalizeSortingAssignmentName(selectedName);
  };

  const resolveSortingCategoryOwnerToken = (category: ClassificationDailySummaryCategory) => {
    return (category.key.split('|')[0] ?? 'general').trim().toLowerCase();
  };

  const resolveSortingCategoryOwnerType = (
    category: ClassificationDailySummaryCategory,
  ): 'GENERAL' | 'TRADER' | 'CUSTOMER' => {
    if (category.ownerType === 'GENERAL' || category.ownerType === 'TRADER' || category.ownerType === 'CUSTOMER') {
      return category.ownerType;
    }

    const ownerToken = resolveSortingCategoryOwnerToken(category);
    if (ownerToken.startsWith('trader:')) {
      return 'TRADER';
    }
    if (ownerToken.startsWith('customer:')) {
      return 'CUSTOMER';
    }
    return 'GENERAL';
  };

  const filteredSortingDailyCategories = useMemo(
    () =>
      sortingDailyCategories.filter((category) =>
        matchesSortingAssignmentSelection(
          resolveSortingCategoryOwnerType(category),
          category.ownerName,
          resolveSortingCategoryOwnerToken(category),
        ),
      ),
    [customerNameById, sortingAssignmentFilter, sortingDailyCategories, traderNameById],
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

  useEffect(() => {
    if (!requiresFiltersData) {
      return;
    }

    let isMounted = true;

    const loadFiltersData = async () => {
      setHarvestLoadError('');

      try {
        const [nextSeasons, nextFields, nextTraders, nextCustomers] = await Promise.all([
          getSeasons(),
          getFields(),
          isSortingDailyDetailsTab ? getTraders() : Promise.resolve([] as Trader[]),
          isSortingDailyDetailsTab ? getCustomers() : Promise.resolve([] as Customer[]),
        ]);

        if (!isMounted) {
          return;
        }

        setSeasons(nextSeasons);
        setFields(nextFields);
        setTraders(nextTraders);
        setCustomers(nextCustomers);
      } catch {
        if (!isMounted) {
          return;
        }

        setHarvestLoadError(t.dailyDetails.loadError);
      }
    };

    void loadFiltersData();

    return () => {
      isMounted = false;
    };
  }, [isSortingDailyDetailsTab, requiresFiltersData, t.dailyDetails.loadError]);

  useEffect(() => {
    if (!requiresFiltersData) {
      return;
    }

    if (activeSeasonId && (seasonFilterId === null || !seasons.some((season) => season.id === seasonFilterId))) {
      dispatch(
        setScopeFilter({
          scope: HARVEST_DAILY_FILTER_SCOPE,
          key: 'seasonId',
          value: String(activeSeasonId),
        }),
      );
      return;
    }

    if (!activeSeasonId && seasonFilterId !== null && !seasons.some((season) => season.id === seasonFilterId)) {
      dispatch(
        setScopeFilter({
          scope: HARVEST_DAILY_FILTER_SCOPE,
          key: 'seasonId',
          value: seasons[0] ? String(seasons[0].id) : '',
        }),
      );
    }
  }, [activeSeasonId, dispatch, requiresFiltersData, seasonFilterId, seasons]);

  useEffect(() => {
    if (!requiresHarvestData) {
      return;
    }

    if (!seasonFilterId) {
      setHarvestRows([]);
      setFieldReportRows([]);
      return;
    }

    let isMounted = true;

    const loadHarvestRows = async () => {
      setIsHarvestLoading(true);
      setHarvestLoadError('');

      try {
        const [records, fieldTotals] = await Promise.all([
          isDailyDetailsTab ? getHarvestsBySeason(seasonFilterId) : Promise.resolve([]),
          getHarvestFieldTotalsBySeason(seasonFilterId),
        ]);

        if (!isMounted) {
          return;
        }

        setHarvestRows(records);
        setFieldReportRows(
          fieldTotals.map((row) => ({
            id: row.fieldId,
            fieldName: row.fieldName,
            recordCount: row.recordCount,
            totalHarvested: row.totalHarvested,
            totalRejected: row.totalRejected,
            totalAfterRejected: row.totalAfterRejected,
            classifiedTotal: row.classifiedTotal,
            rejectionRate: row.rejectionRate,
            ownerHarvested: row.ownerHarvested,
            ownerRejected: row.ownerRejected,
            ownerAfterRejected: row.ownerAfterRejected,
            ownerRejectionRate: row.ownerRejectionRate,
            differenceHarvested: row.differenceHarvested,
            differenceRejected: row.differenceRejected,
            differenceAfterRejected: row.differenceAfterRejected,
            differenceRejectionRate: row.differenceRejectionRate,
            hasOwnerOverrides: row.hasOwnerOverrides,
            isPartialClassification: row.isPartialClassification,
          })),
        );
      } catch {
        if (!isMounted) {
          return;
        }

        setHarvestRows([]);
        setFieldReportRows([]);
        setHarvestLoadError(t.dailyDetails.loadError);
      } finally {
        if (isMounted) {
          setIsHarvestLoading(false);
        }
      }
    };

    void loadHarvestRows();

    return () => {
      isMounted = false;
    };
  }, [isDailyDetailsTab, requiresHarvestData, seasonFilterId, t.dailyDetails.loadError]);

  useEffect(() => {
    if (!isSortingDailyDetailsTab) {
      setSortingDailyRows([]);
      setSortingDailyCategories([]);
      setSortingDailyLoadError('');
      setIsSortingDailyLoading(false);
      return;
    }

    if (!seasonFilterId) {
      setSortingDailyRows([]);
      setSortingDailyCategories([]);
      setSortingDailyLoadError('');
      return;
    }

    let isMounted = true;

    const loadSortingDailyRows = async () => {
      setIsSortingDailyLoading(true);
      setSortingDailyLoadError('');

      const buildFallbackFromHarvestRows = async () => {
        const harvests = await getHarvestsBySeason(seasonFilterId);
        const groupedRows = new Map<number, ClassificationDailySummaryRow>();
        const groupedCategories = new Map<string, ClassificationDailySummaryCategory>();

        const classificationBuckets = await Promise.all(
          harvests.map(async (harvest) => {
            const rows = await getClassificationsByHarvest(harvest.id);
            return { harvest, rows };
          }),
        );

        for (const bucket of classificationBuckets) {
          groupedRows.set(bucket.harvest.id, {
            harvestId: bucket.harvest.id,
            fieldId: bucket.harvest.fieldId,
            fieldName: bucket.harvest.field?.name ?? '-',
            dateGregorian: bucket.harvest.dateGregorian,
            dateHebrew: bucket.harvest.dateHebrew,
            totalSorted: 0,
            categoryTotals: {},
          });

          const row = groupedRows.get(bucket.harvest.id)!;

          for (const sorting of bucket.rows) {
            const quantity = Number(sorting.quantity) || 0;
            if (quantity <= 0) {
              continue;
            }

            const traderName = sorting.trader?.name?.trim();
            const customerName = sorting.customer?.customerName?.trim();
            const ownerType: ClassificationDailySummaryCategory['ownerType'] = traderName
              ? 'TRADER'
              : customerName
                ? 'CUSTOMER'
                : 'GENERAL';
            const ownerName = traderName || customerName || null;
            const ownerKey = traderName
              ? `trader:${traderName}`
              : customerName
                ? `customer:${customerName}`
                : 'general';

            const customerCategoryName = sorting.customerCategory?.name?.trim();
            const traderCategoryName = sorting.traderCategory?.name?.trim();
            const categoryLabel = customerCategoryName || traderCategoryName;
            const categoryTypeKey = customerCategoryName
              ? `customer:${customerCategoryName}`
              : traderCategoryName
                ? `trader:${traderCategoryName}`
                : null;

            if (!categoryTypeKey || !categoryLabel) {
              continue;
            }

            const categoryKey = `${ownerKey}|${categoryTypeKey}`;

            row.categoryTotals[categoryKey] = (row.categoryTotals[categoryKey] ?? 0) + quantity;
            row.totalSorted += quantity;

            const existingCategory = groupedCategories.get(categoryKey);
            if (!existingCategory) {
              groupedCategories.set(categoryKey, {
                key: categoryKey,
                label: categoryLabel,
                ownerType,
                ownerName,
                categoryName: categoryLabel,
                total: quantity,
              });
            } else {
              existingCategory.total += quantity;
            }
          }
        }

        const categories = Array.from(groupedCategories.values())
          .filter((category) => category.total > 0)
          .sort((left, right) => {
            if (right.total !== left.total) {
              return right.total - left.total;
            }

            return buildSortingCategoryDisplayLabel(left, lang).localeCompare(buildSortingCategoryDisplayLabel(right, lang), 'he', {
              sensitivity: 'base',
              numeric: true,
            });
          });

        const rows = Array.from(groupedRows.values())
          .filter((row) => row.totalSorted > 0)
          .map((row) => {
            const categoryTotals: Record<string, number> = {};

            for (const category of categories) {
              const value = row.categoryTotals[category.key] ?? 0;
              if (value > 0) {
                categoryTotals[category.key] = value;
              }
            }

            return {
              ...row,
              categoryTotals,
            };
          })
          .sort((left, right) => {
            const leftTime = Date.parse(left.dateGregorian);
            const rightTime = Date.parse(right.dateGregorian);
            if (rightTime !== leftTime) {
              return rightTime - leftTime;
            }

            if (left.fieldName !== right.fieldName) {
              return left.fieldName.localeCompare(right.fieldName, 'he', {
                sensitivity: 'base',
                numeric: true,
              });
            }

            return right.harvestId - left.harvestId;
          });

        return {
          rows,
          categories,
        };
      };

      try {
        const payload = await getClassificationDailySummaryBySeason(seasonFilterId);
        if (!isMounted) {
          return;
        }

        setSortingDailyRows(payload.rows);
        setSortingDailyCategories(payload.categories);
      } catch {
        try {
          const fallbackPayload = await buildFallbackFromHarvestRows();

          if (!isMounted) {
            return;
          }

          setSortingDailyRows(fallbackPayload.rows);
          setSortingDailyCategories(fallbackPayload.categories);
          setSortingDailyLoadError('');
        } catch {
          if (!isMounted) {
            return;
          }

          setSortingDailyRows([]);
          setSortingDailyCategories([]);
          setSortingDailyLoadError(t.sortingDailyDetails.loadError);
        }
      } finally {
        if (isMounted) {
          setIsSortingDailyLoading(false);
        }
      }
    };

    void loadSortingDailyRows();

    return () => {
      isMounted = false;
    };
  }, [isSortingDailyDetailsTab, seasonFilterId, t.sortingDailyDetails.loadError]);

  const createEmptyHarvestClassificationDraft = (): HarvestFormClassificationDraft => {
    const nextId = classificationDraftCounterRef.current;
    classificationDraftCounterRef.current += 1;

    return {
      id: `draft-${nextId}`,
      assignmentType: 'GENERAL',
      traderId: '',
      customerId: '',
      traderCategoryId: '',
      customerCategoryId: '',
      grade: '',
      pitamStatus: 'WITH_PITAM',
      quantity: '',
      notes: '',
    };
  };

  const formatHebrewDateFromGregorianInput = (gregorianInput: string) => {
    if (!gregorianInput) {
      return '';
    }

    const hebrewCalendarFormatter = new Intl.DateTimeFormat('he-IL-u-ca-hebrew', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const formatHebrewNumber = (value: number) => {
      const normalizedValue = value >= 5000 ? value % 1000 : value;

      if (normalizedValue <= 0) {
        return String(value);
      }

      const parts: string[] = [];
      let remaining = normalizedValue;

      while (remaining >= 400) {
        parts.push('ת');
        remaining -= 400;
      }

      const hundreds = [
        { value: 300, symbol: 'ש' },
        { value: 200, symbol: 'ר' },
        { value: 100, symbol: 'ק' },
      ];

      for (const { value: partValue, symbol } of hundreds) {
        if (remaining >= partValue) {
          parts.push(symbol);
          remaining -= partValue;
        }
      }

      if (remaining === 15) {
        parts.push('טו');
        remaining = 0;
      } else if (remaining === 16) {
        parts.push('טז');
        remaining = 0;
      }

      const tens = [
        { value: 90, symbol: 'צ' },
        { value: 80, symbol: 'פ' },
        { value: 70, symbol: 'ע' },
        { value: 60, symbol: 'ס' },
        { value: 50, symbol: 'נ' },
        { value: 40, symbol: 'מ' },
        { value: 30, symbol: 'ל' },
        { value: 20, symbol: 'כ' },
        { value: 10, symbol: 'י' },
      ];

      for (const { value: partValue, symbol } of tens) {
        if (remaining >= partValue) {
          parts.push(symbol);
          remaining -= partValue;
        }
      }

      const ones = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];

      if (remaining > 0) {
        parts.push(ones[remaining - 1]);
      }

      return parts.join('');
    };

    const parsedDate = new Date(`${gregorianInput}T12:00:00`);
    if (Number.isNaN(parsedDate.getTime())) {
      return '';
    }

    const parts = hebrewCalendarFormatter.formatToParts(parsedDate);
    const dayPart = parts.find((part) => part.type === 'day')?.value;
    const monthPart = parts.find((part) => part.type === 'month')?.value;
    const yearPart = parts.find((part) => part.type === 'year')?.value;

    const dayNumber = dayPart ? Number(dayPart.replace(/\D/g, '')) : NaN;
    const yearNumber = yearPart ? Number(yearPart.replace(/\D/g, '')) : NaN;

    if (!monthPart || Number.isNaN(dayNumber) || Number.isNaN(yearNumber)) {
      return hebrewCalendarFormatter.format(parsedDate);
    }

    return `${formatHebrewNumber(dayNumber)} ${monthPart} ${formatHebrewNumber(yearNumber)}`;
  };

  const handleHarvestGregorianDateChange = (nextGregorianDate: string) => {
    setHarvestFormDateGregorian(nextGregorianDate);
    setHarvestFormDateHebrew(formatHebrewDateFromGregorianInput(nextGregorianDate));
  };

  const handleHarvestNotesChange = (nextNotes: string, textareaElement: HTMLTextAreaElement) => {
    setHarvestFormNotes(nextNotes);

    textareaElement.style.height = 'auto';
    textareaElement.style.height = `${Math.min(textareaElement.scrollHeight, 220)}px`;
  };

  const resetHarvestForm = () => {
    setHarvestFormError('');
    const localDate = new Date().toISOString().slice(0, 10);

    setHarvestFormDateGregorian(localDate);
    setHarvestFormDateHebrew(formatHebrewDateFromGregorianInput(localDate));
    setHarvestFormFieldId(
      fieldFilterId !== 'all' && Number(fieldFilterId) > 0
        ? String(fieldFilterId)
        : fields[0]
          ? String(fields[0].id)
          : '',
    );
    setHarvestFormTotalHarvested('');
    setHarvestFormTotalRejected('');
    setHarvestFormOwnerHarvested('');
    setHarvestFormOwnerRejected('');
    setHarvestFormNotes('');
    setHarvestFormIsPartialClassification(false);
    setHarvestFormClassifications([createEmptyHarvestClassificationDraft()]);
  };

  const openHarvestGlobalForm = () => {
    resetHarvestForm();
    setIsHarvestFormOpen(true);
  };

  const closeHarvestGlobalForm = () => {
    if (isSubmittingHarvestForm) {
      return;
    }

    setIsHarvestFormOpen(false);
    setHarvestFormError('');
  };

  const addHarvestClassificationDraft = () => {
    setHarvestFormClassifications((previous) => [...previous, createEmptyHarvestClassificationDraft()]);
  };

  const removeHarvestClassificationDraft = (draftId: string) => {
    setHarvestFormClassifications((previous) => {
      if (previous.length <= 1) {
        return previous;
      }

      return previous.filter((draft) => draft.id !== draftId);
    });
  };

  const updateHarvestClassificationDraft = (
    draftId: string,
    updater: Partial<HarvestFormClassificationDraft>,
  ) => {
    setHarvestFormClassifications((previous) =>
      previous.map((draft) => {
        if (draft.id !== draftId) {
          return draft;
        }

        const nextDraft = {
          ...draft,
          ...updater,
        };

        if (updater.assignmentType === 'GENERAL') {
          nextDraft.traderId = '';
          nextDraft.customerId = '';
          nextDraft.customerCategoryId = '';
        }

        if (updater.assignmentType === 'TRADER') {
          nextDraft.customerId = '';
          nextDraft.customerCategoryId = '';
        }

        if (updater.assignmentType === 'CUSTOMER') {
          nextDraft.traderId = '';
          nextDraft.traderCategoryId = '';
          nextDraft.grade = '';
        }

        if (updater.customerId !== undefined) {
          nextDraft.customerCategoryId = '';
        }

        return nextDraft;
      }),
    );
  };

  useEffect(() => {
    if (!isHarvestFormOpen || !seasonFilterId) {
      return;
    }

    let isMounted = true;

    const loadHarvestFormCategories = async () => {
      try {
        const [traderCategories, customerCategories] = await Promise.all([
          getTraderCategoriesWithShares(seasonFilterId),
          getCustomerCategoriesBySeason(seasonFilterId),
        ]);

        if (!isMounted) {
          return;
        }

        setHarvestFormTraderCategories(traderCategories);
        setHarvestFormCustomerCategories(customerCategories);
      } catch {
        if (!isMounted) {
          return;
        }

        setHarvestFormTraderCategories([]);
        setHarvestFormCustomerCategories([]);
      }
    };

    void loadHarvestFormCategories();

    return () => {
      isMounted = false;
    };
  }, [isHarvestFormOpen, seasonFilterId]);

  const refreshHarvestWorkspaceData = async () => {
    if (!seasonFilterId) {
      return;
    }

    const [records, fieldTotals] = await Promise.all([
      getHarvestsBySeason(seasonFilterId),
      getHarvestFieldTotalsBySeason(seasonFilterId),
    ]);

    setHarvestRows(records);
    setFieldReportRows(
      fieldTotals.map((row) => ({
        id: row.fieldId,
        fieldName: row.fieldName,
        recordCount: row.recordCount,
        totalHarvested: row.totalHarvested,
        totalRejected: row.totalRejected,
        totalAfterRejected: row.totalAfterRejected,
        classifiedTotal: row.classifiedTotal,
        rejectionRate: row.rejectionRate,
        ownerHarvested: row.ownerHarvested,
        ownerRejected: row.ownerRejected,
        ownerAfterRejected: row.ownerAfterRejected,
        ownerRejectionRate: row.ownerRejectionRate,
        differenceHarvested: row.differenceHarvested,
        differenceRejected: row.differenceRejected,
        differenceAfterRejected: row.differenceAfterRejected,
        differenceRejectionRate: row.differenceRejectionRate,
        hasOwnerOverrides: row.hasOwnerOverrides,
        isPartialClassification: row.isPartialClassification,
      })),
    );

    try {
      const sortingSummary = await getClassificationDailySummaryBySeason(seasonFilterId);
      setSortingDailyRows(sortingSummary.rows);
      setSortingDailyCategories(sortingSummary.categories);
      setSortingDailyLoadError('');
    } catch {
      // Keep current sorting summary when refresh fallback endpoint fails.
    }
  };

  const handleSubmitHarvestGlobalForm = async () => {
    const trimmedHebrewDate = harvestFormDateHebrew.trim();
    const parsedFieldId = Number(harvestFormFieldId);
    const parsedGregorianDate = new Date(`${harvestFormDateGregorian}T00:00:00.000Z`);

    if (!seasonFilterId) {
      setHarvestFormError(lang === 'he' ? 'יש לבחור עונה לפני פתיחת טופס הקטיף.' : 'Select a season before creating a harvest.');
      return;
    }

    if (!Number.isFinite(parsedFieldId) || parsedFieldId <= 0) {
      setHarvestFormError(lang === 'he' ? 'יש לבחור שדה.' : 'Please select a field.');
      return;
    }

    if (!harvestFormDateGregorian || Number.isNaN(parsedGregorianDate.getTime())) {
      setHarvestFormError(lang === 'he' ? 'יש להזין תאריך לועזי תקין.' : 'Please provide a valid Gregorian date.');
      return;
    }

    if (!trimmedHebrewDate) {
      setHarvestFormError(lang === 'he' ? 'יש להזין תאריך עברי.' : 'Please provide the Hebrew date.');
      return;
    }

    if (harvestFormClassifications.length < 1) {
      setHarvestFormError(lang === 'he' ? 'יש להוסיף לפחות שורת מיון אחת.' : 'At least one sorting row is required.');
      return;
    }

    const parsedClassifications: HarvestBulkClassificationPayload[] = [];

    for (const [index, draft] of harvestFormClassifications.entries()) {
      const rowNumber = index + 1;
      const quantity = Number(draft.quantity);

      if (!Number.isFinite(quantity) || quantity <= 0) {
        setHarvestFormError(
          lang === 'he'
            ? `בשורת מיון ${rowNumber} חייבת להיות כמות גדולה מאפס.`
            : `Sorting row ${rowNumber} must include a quantity greater than zero.`,
        );
        return;
      }

      const classificationPayload: HarvestBulkClassificationPayload = {
        assignmentType: draft.assignmentType,
        pitamStatus: draft.pitamStatus,
        quantity,
      };

      if (draft.notes.trim()) {
        classificationPayload.notes = draft.notes.trim();
      }

      if (draft.assignmentType === 'GENERAL' || draft.assignmentType === 'TRADER') {
        const traderCategoryId = Number(draft.traderCategoryId);
        if (!Number.isFinite(traderCategoryId) || traderCategoryId <= 0) {
          setHarvestFormError(
            lang === 'he'
              ? `בשורת מיון ${rowNumber} יש לבחור קטגוריית סוחר.`
              : `Sorting row ${rowNumber} must include a trader category.`,
          );
          return;
        }

        classificationPayload.traderCategoryId = traderCategoryId;

        if (draft.grade.trim()) {
          classificationPayload.grade = draft.grade.trim();
        }
      }

      if (draft.assignmentType === 'TRADER') {
        const traderId = Number(draft.traderId);
        if (!Number.isFinite(traderId) || traderId <= 0) {
          setHarvestFormError(
            lang === 'he'
              ? `בשורת מיון ${rowNumber} יש לבחור סוחר.`
              : `Sorting row ${rowNumber} must include a trader.`,
          );
          return;
        }

        classificationPayload.traderId = traderId;
      }

      if (draft.assignmentType === 'CUSTOMER') {
        const customerId = Number(draft.customerId);
        const customerCategoryId = Number(draft.customerCategoryId);

        if (!Number.isFinite(customerId) || customerId <= 0) {
          setHarvestFormError(
            lang === 'he'
              ? `בשורת מיון ${rowNumber} יש לבחור לקוח.`
              : `Sorting row ${rowNumber} must include a customer.`,
          );
          return;
        }

        if (!Number.isFinite(customerCategoryId) || customerCategoryId <= 0) {
          setHarvestFormError(
            lang === 'he'
              ? `בשורת מיון ${rowNumber} יש לבחור קטגוריית לקוח.`
              : `Sorting row ${rowNumber} must include a customer category.`,
          );
          return;
        }

        classificationPayload.customerId = customerId;
        classificationPayload.customerCategoryId = customerCategoryId;
      }

      parsedClassifications.push(classificationPayload);
    }

    const payload: CreateHarvestWithClassificationsPayload = {
      dateGregorian: parsedGregorianDate.toISOString(),
      dateHebrew: trimmedHebrewDate,
      fieldId: parsedFieldId,
      updatedById: currentUser?.id,
      isPartialClassification: harvestFormIsPartialClassification,
      classifications: parsedClassifications,
    };

    const totalHarvested = Number(harvestFormTotalHarvested);
    if (Number.isFinite(totalHarvested) && totalHarvested >= 0) {
      payload.totalHarvested = totalHarvested;
    }

    const totalRejected = Number(harvestFormTotalRejected);
    if (Number.isFinite(totalRejected) && totalRejected >= 0) {
      payload.totalRejected = totalRejected;
    }

    const ownerHarvested = Number(harvestFormOwnerHarvested);
    if (Number.isFinite(ownerHarvested) && ownerHarvested >= 0) {
      payload.ownerHarvested = ownerHarvested;
    }

    const ownerRejected = Number(harvestFormOwnerRejected);
    if (Number.isFinite(ownerRejected) && ownerRejected >= 0) {
      payload.ownerRejected = ownerRejected;
    }

    if (harvestFormNotes.trim()) {
      payload.notes = harvestFormNotes.trim();
    }

    setIsSubmittingHarvestForm(true);
    setHarvestFormError('');

    try {
      await createHarvestWithClassifications(payload);
      await refreshHarvestWorkspaceData();
      setIsHarvestFormOpen(false);
    } catch (error) {
      if (error instanceof Error && error.message.trim()) {
        setHarvestFormError(error.message);
      } else {
        setHarvestFormError(lang === 'he' ? 'שמירת הקטיף נכשלה. נסה שוב.' : 'Failed to save the harvest. Please try again.');
      }
    } finally {
      setIsSubmittingHarvestForm(false);
    }
  };

  const formatGregorianDate = (value: string) => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    const locale = lang === 'he' ? 'he-IL' : 'en-GB';
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  };

  const escapeHtml = (value: string) => {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  const escapeCsv = (value: string | number | boolean | null | undefined) => {
    const normalized = String(value ?? '');
    const escaped = normalized.replace(/\"/g, '""');
    return `"${escaped}"`;
  };

  const downloadStyledExcel = async ({
    sheetName,
    fileName,
    header,
    rows,
  }: {
    sheetName: string;
    fileName: string;
    header: Array<string | number>;
    rows: Array<Array<string | number>>;
  }) => {
    if (typeof window === 'undefined') {
      return;
    }

    const { Workbook } = await import('exceljs');
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    worksheet.addRow(header);
    for (const row of rows) {
      worksheet.addRow(row);
    }

    const headerBg = 'FF1F5A32';
    const headerFont = 'FFFFFFFF';
    const borderColor = 'FFCCD9CF';
    const zebraBg = 'FFF8FCF9';

    for (let rowIndex = 1; rowIndex <= worksheet.rowCount; rowIndex += 1) {
      const row = worksheet.getRow(rowIndex);
      for (let colIndex = 1; colIndex <= worksheet.columnCount; colIndex += 1) {
        const cell = row.getCell(colIndex);
        const isHeader = rowIndex === 1;
        const isZebraDataRow = rowIndex > 1 && rowIndex % 2 === 0;

        cell.alignment = {
          horizontal: 'center',
          vertical: 'middle',
          wrapText: true,
        };

        cell.border = {
          top: { style: 'thin', color: { argb: borderColor } },
          left: { style: 'thin', color: { argb: borderColor } },
          bottom: { style: 'thin', color: { argb: borderColor } },
          right: { style: 'thin', color: { argb: borderColor } },
        };

        if (isHeader) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: headerBg },
          };

          cell.font = {
            bold: true,
            color: { argb: headerFont },
          };
        } else if (isZebraDataRow) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: zebraBg },
          };
        }
      }
    }

    for (let colIndex = 1; colIndex <= worksheet.columnCount; colIndex += 1) {
      let maxLength = 0;

      worksheet.eachRow((row: Row) => {
        const rawValue = row.getCell(colIndex).value;
        const textValue = rawValue === null || rawValue === undefined ? '' : String(rawValue);
        if (textValue.length > maxLength) {
          maxLength = textValue.length;
        }
      });

      worksheet.getColumn(colIndex).width = Math.max(10, Math.min(maxLength + 2, 40));
    }

    worksheet.views = [{ state: 'frozen', ySplit: 1, rightToLeft: lang === 'he' }];

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.append(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const createHarvestExportRows = () => {
    const fields = t.dailyDetails.detailsPanel.fields;
    const values = t.dailyDetails.detailsPanel.values;

    const header = [
      t.dailyDetails.columns.fieldName,
      t.dailyDetails.columns.dateGregorian,
      fields.dateHebrew,
      t.dailyDetails.columns.totalHarvested,
      t.dailyDetails.columns.totalRejected,
      fields.totalAfterRejected,
      fields.ownerHarvested,
      fields.ownerRejected,
      fields.ownerAfterRejected,
      t.dailyDetails.columns.classifiedTotal,
      fields.classificationStatus,
      fields.rejectionRate,
      fields.ownerRejectionRate,
      fields.updatedBy,
      fields.notes,
    ];

    const getClassificationStatus = (isPartialClassification: unknown) => {
      return isPartialClassificationFlag(isPartialClassification) ? values.partial : values.final;
    };

    const rowsSource = visibleHarvestRowsRef.current.length > 0 ? visibleHarvestRowsRef.current : filteredHarvestRows;

    const rows = rowsSource.map((row) => [
      row.field?.name ?? values.none,
      formatGregorianDate(row.dateGregorian),
      row.dateHebrew,
      row.totalHarvested,
      row.totalRejected,
      row.totalAfterRejected,
      row.ownerHarvested,
      row.ownerRejected,
      row.ownerAfterRejected,
      row.classifiedTotal,
      getClassificationStatus(row.isPartialClassification),
      row.rejectionRate,
      row.ownerRejectionRate,
      row.updatedBy?.name ?? values.none,
      row.notes ?? values.none,
    ]);

    return { header, rows };
  };

  const createFieldReportExportRows = () => {
    const fields = t.dailyDetails.detailsPanel.fields;
    const values = t.dailyDetails.detailsPanel.values;

    const header = [
      t.dailyDetails.columns.fieldName,
      lang === 'he' ? 'מספר קטיפים' : 'Harvest count',
      t.dailyDetails.columns.totalHarvested,
      t.dailyDetails.columns.totalRejected,
      t.dailyDetails.columns.netHarvest,
      t.dailyDetails.columns.classifiedTotal,
      fields.rejectionRate,
      fields.ownerHarvested,
      fields.ownerRejected,
      fields.ownerAfterRejected,
      fields.ownerRejectionRate,
      values.differenceRow,
      lang === 'he' ? 'הפרש יורדים' : 'Rejected Difference',
      lang === 'he' ? 'הפרש נטו' : 'Net Difference',
      lang === 'he' ? 'הפרש אחוז פסילה' : 'Rejection Rate Difference',
      fields.classificationStatus,
    ];

    const rowsSource = visibleFieldReportRowsRef.current.length > 0 ? visibleFieldReportRowsRef.current : fieldReportRows;

    const rows = rowsSource.map((row) => [
      row.fieldName,
      row.recordCount,
      row.totalHarvested,
      row.totalRejected,
      row.totalAfterRejected,
      row.classifiedTotal,
      row.rejectionRate,
      row.ownerHarvested,
      row.ownerRejected,
      row.ownerAfterRejected,
      row.ownerRejectionRate,
      row.differenceHarvested,
      row.differenceRejected,
      row.differenceAfterRejected,
      row.differenceRejectionRate,
      row.isPartialClassification ? values.partial : values.final,
    ]);

    return { header, rows };
  };

  const createSortingDailyExportRows = () => {
    const rowsSource = getCurrentSortingDailyExportRows();

    const exportCategories = filteredSortingDailyCategories
      .filter((category) => rowsSource.some((row) => (row.categoryTotals[category.key] ?? 0) > 0))
      .map((category) => ({
        key: category.key,
        label: buildSortingCategoryDisplayLabel(category, lang),
      }));

    const header = [
      t.sortingDailyDetails.columns.dateGregorian,
      t.sortingDailyDetails.columns.dateHebrew,
      t.sortingDailyDetails.columns.fieldName,
      ...exportCategories.map((category) => category.label),
      t.sortingDailyDetails.columns.totalSorted,
    ];

    const rows = rowsSource.map((row) => {
      const categoryValues = exportCategories.map((category) => row.categoryTotals[category.key] ?? 0);

      const rowDailyTotal = filteredSortingDailyCategories.reduce(
        (sum, category) => sum + (row.categoryTotals[category.key] ?? 0),
        0,
      );

      return [
        formatGregorianDate(row.dateGregorian),
        row.dateHebrew,
        row.fieldName,
        ...categoryValues,
        rowDailyTotal,
      ];
    });

    return { header, rows };
  };

  const createSortingDailyExpandedMatrixData = async () => {
    const values = t.dailyDetails.detailsPanel.values;
    const rowsSource = getCurrentSortingDailyExportRows();

    const fixedGrades = ['א', 'ב', 'ג', 'ד', 'ה', 'ו'];
    const pitamGroups = [
      { key: 'WITH_PITAM', label: lang === 'he' ? 'פיטם' : 'With pitam' },
      { key: 'WITHOUT_PITAM', label: lang === 'he' ? 'בל"פ' : 'Without pitam' },
      { key: 'MIXED', label: lang === 'he' ? 'מעורב' : 'Mixed' },
    ] as const;

    const normalizePitamGroup = (pitamStatus?: string | null) => {
      if (!pitamStatus) {
        return 'MIXED';
      }

      const normalized = pitamStatus.replace(/\s+/g, '_').toUpperCase();
      if (normalized === 'WITH_PITAM') {
        return 'WITH_PITAM';
      }

      if (normalized === 'WITHOUT_PITAM') {
        return 'WITHOUT_PITAM';
      }

      return 'MIXED';
    };

    const normalizeOwnerType = (value?: string | null): 'GENERAL' | 'TRADER' | 'CUSTOMER' => {
      const normalized = (value ?? '').toUpperCase();

      if (normalized.includes('TRADER')) {
        return 'TRADER';
      }

      if (normalized.includes('CUSTOMER')) {
        return 'CUSTOMER';
      }

      return 'GENERAL';
    };

    const inferOwnerTypeFromCategoryKey = (key?: string): 'GENERAL' | 'TRADER' | 'CUSTOMER' => {
      const normalized = (key ?? '').toUpperCase();
      if (normalized.startsWith('TRADER:')) {
        return 'TRADER';
      }

      if (normalized.startsWith('CUSTOMER:')) {
        return 'CUSTOMER';
      }

      return 'GENERAL';
    };

    const categoryOwnerTypeMap = new Map<string, ClassificationDailySummaryCategory['ownerType']>();
    for (const category of filteredSortingDailyCategories) {
      categoryOwnerTypeMap.set(
        buildSortingCategoryDisplayLabel(category, lang),
        category.ownerType ?? inferOwnerTypeFromCategoryKey(category.key),
      );
    }

    const allGeneralCategoryLabels = new Set<string>();
    for (const category of filteredSortingDailyCategories) {
      const ownerType = category.ownerType ?? inferOwnerTypeFromCategoryKey(category.key);
      if (ownerType === 'GENERAL') {
        allGeneralCategoryLabels.add(buildSortingCategoryDisplayLabel(category, lang));
      }
    }

    try {
      if (seasonFilterId && sortingAssignmentFilter === 'all') {
        const seasonTraderCategories = await getTraderCategoriesWithShares(seasonFilterId);
        for (const category of seasonTraderCategories) {
          const label = category.name.trim();
          if (!label) {
            continue;
          }

          allGeneralCategoryLabels.add(label);
          categoryOwnerTypeMap.set(label, 'GENERAL');
        }
      }
    } catch {
      // Fallback to default categories below.
    }

    if (allGeneralCategoryLabels.size === 0 && sortingAssignmentFilter === 'all') {
      try {
        const defaultGeneralCategories = await getDefaultTraderCategories();
        for (const category of defaultGeneralCategories) {
          const label = category.name.trim();
          if (!label) {
            continue;
          }

          allGeneralCategoryLabels.add(label);
          categoryOwnerTypeMap.set(label, 'GENERAL');
        }
      } catch {
        // Keep export resilient if categories endpoints are unavailable.
      }
    }

    const getCategoryContextFromDetail = (detail: ClassificationRecord) => {
      const categoryName = detail.customerCategory?.name ?? detail.traderCategory?.name ?? '';
      if (!categoryName) {
        return {
          categoryLabel: '',
          ownerType: 'GENERAL' as const,
          ownerName: '',
        };
      }

      const traderName = detail.trader?.name?.trim();
      const customerName = detail.customer?.customerName?.trim();
      const rawAssignmentType = (detail.assignmentType ?? '').toUpperCase();
      const assignmentType = normalizeOwnerType(detail.assignmentType);

      if (rawAssignmentType === 'GENERAL') {
        return {
          categoryLabel: categoryName,
          ownerType: 'GENERAL' as const,
          ownerName: '',
        };
      }

      if (rawAssignmentType === 'TRADER' || (assignmentType === 'TRADER' && rawAssignmentType !== 'CUSTOMER')) {
        return {
          categoryLabel: traderName ? `${traderName} | ${categoryName}` : `${lang === 'he' ? 'סוחר' : 'Trader'} | ${categoryName}`,
          ownerType: 'TRADER' as const,
          ownerName: traderName ?? '',
        };
      }

      if (rawAssignmentType === 'CUSTOMER' || (assignmentType === 'CUSTOMER' && rawAssignmentType !== 'TRADER')) {
        return {
          categoryLabel: customerName
            ? `${customerName} | ${categoryName}`
            : `${lang === 'he' ? 'לקוח' : 'Customer'} | ${categoryName}`,
          ownerType: 'CUSTOMER' as const,
          ownerName: customerName ?? '',
        };
      }

      if (traderName) {
        return {
          categoryLabel: `${traderName} | ${categoryName}`,
          ownerType: 'TRADER' as const,
          ownerName: traderName,
        };
      }

      if (customerName) {
        return {
          categoryLabel: `${customerName} | ${categoryName}`,
          ownerType: 'CUSTOMER' as const,
          ownerName: customerName,
        };
      }

      return {
        categoryLabel: categoryName,
        ownerType: 'GENERAL' as const,
        ownerName: '',
      };
    };

    const detailsByHarvest = await Promise.all(
      rowsSource.map(async (row) => {
        const details = await getClassificationsByHarvest(row.harvestId);
        return { row, details };
      }),
    );

    const categoryTotals = new Map<string, number>();
    const ownerExistingColumns = new Map<string, Map<string, Set<string>>>();
    const detectedCategoryOwnerType = new Map<string, 'GENERAL' | 'TRADER' | 'CUSTOMER'>();
    const matrixRows: Array<{
      dateGregorian: string;
      dateHebrew: string;
      fieldName: string;
      values: Record<string, number>;
    }> = [];

    for (const { row, details } of detailsByHarvest) {
      const dayValues: Record<string, number> = {};

      for (const detail of details) {
        const { categoryLabel, ownerType: resolvedOwnerType, ownerName } = getCategoryContextFromDetail(detail);
        if (!categoryLabel) {
          continue;
        }

        if (!matchesSortingAssignmentSelection(resolvedOwnerType, ownerName)) {
          continue;
        }

        if (!detectedCategoryOwnerType.has(categoryLabel)) {
          detectedCategoryOwnerType.set(categoryLabel, resolvedOwnerType);
        }

        const grade = (detail.grade || detail.customerCategory?.grade || values.none).trim();

        const pitamGroup = normalizePitamGroup(detail.pitamStatus);

        const quantity = Number(detail.quantity) || 0;
        const valueKey = `${categoryLabel}::${pitamGroup}::${grade}`;

        if (quantity > 0) {
          dayValues[valueKey] = (dayValues[valueKey] ?? 0) + quantity;

          const ownerType = categoryOwnerTypeMap.get(categoryLabel) ?? detectedCategoryOwnerType.get(categoryLabel);
          if (ownerType === 'CUSTOMER' || ownerType === 'TRADER') {
            if (!ownerExistingColumns.has(categoryLabel)) {
              ownerExistingColumns.set(categoryLabel, new Map<string, Set<string>>());
            }

            const pitamToGrades = ownerExistingColumns.get(categoryLabel)!;
            if (!pitamToGrades.has(pitamGroup)) {
              pitamToGrades.set(pitamGroup, new Set<string>());
            }

            pitamToGrades.get(pitamGroup)!.add(grade);
          }
        }

        if (quantity > 0) {
          categoryTotals.set(categoryLabel, (categoryTotals.get(categoryLabel) ?? 0) + quantity);
        }
      }

      matrixRows.push({
        dateGregorian: formatGregorianDate(row.dateGregorian),
        dateHebrew: row.dateHebrew,
        fieldName: row.fieldName,
        values: dayValues,
      });
    }

    const ownerOrder = (ownerType?: string) => {
      if (ownerType === 'GENERAL') {
        return 0;
      }

      if (ownerType === 'TRADER') {
        return 1;
      }

      if (ownerType === 'CUSTOMER') {
        return 2;
      }

      return 3;
    };

    const compareGrades = (left: string, right: string) => {
      const leftFixedIndex = fixedGrades.indexOf(left);
      const rightFixedIndex = fixedGrades.indexOf(right);

      if (leftFixedIndex >= 0 || rightFixedIndex >= 0) {
        if (leftFixedIndex === -1) {
          return 1;
        }

        if (rightFixedIndex === -1) {
          return -1;
        }

        return leftFixedIndex - rightFixedIndex;
      }

      return left.localeCompare(right, lang === 'he' ? 'he' : 'en', {
        sensitivity: 'base',
        numeric: true,
      });
    };

    const preferredCategoryOrder = [...filteredSortingDailyCategories]
      .sort((left, right) => {
        const ownerDiff = ownerOrder(left.ownerType) - ownerOrder(right.ownerType);
        if (ownerDiff !== 0) {
          return ownerDiff;
        }

        const leftLabel = buildSortingCategoryDisplayLabel(left, lang);
        const rightLabel = buildSortingCategoryDisplayLabel(right, lang);

        return leftLabel.localeCompare(rightLabel, lang === 'he' ? 'he' : 'en', {
          sensitivity: 'base',
          numeric: true,
        });
      })
      .map((category) => buildSortingCategoryDisplayLabel(category, lang));

    const missingGeneralCategories = Array.from(allGeneralCategoryLabels)
      .filter((label) => !preferredCategoryOrder.includes(label))
      .sort((left, right) =>
        left.localeCompare(right, lang === 'he' ? 'he' : 'en', {
          sensitivity: 'base',
          numeric: true,
        }),
      );

    preferredCategoryOrder.unshift(...missingGeneralCategories);

    const extraCategories = Array.from(categoryTotals.keys())
      .filter((label) => !preferredCategoryOrder.includes(label))
      .sort((left, right) => {
        const leftOwnerType = categoryOwnerTypeMap.get(left) ?? detectedCategoryOwnerType.get(left);
        const rightOwnerType = categoryOwnerTypeMap.get(right) ?? detectedCategoryOwnerType.get(right);
        const ownerDiff = ownerOrder(leftOwnerType) - ownerOrder(rightOwnerType);
        if (ownerDiff !== 0) {
          return ownerDiff;
        }

        return left.localeCompare(right, lang === 'he' ? 'he' : 'en', {
          sensitivity: 'base',
          numeric: true,
        });
      });

    const preferredOrderIndex = new Map<string, number>();
    preferredCategoryOrder.forEach((label, index) => {
      preferredOrderIndex.set(label, index);
    });

    const orderedCategories = Array.from(new Set([...preferredCategoryOrder, ...extraCategories])).sort((left, right) => {
      const leftOwnerType = categoryOwnerTypeMap.get(left) ?? detectedCategoryOwnerType.get(left);
      const rightOwnerType = categoryOwnerTypeMap.get(right) ?? detectedCategoryOwnerType.get(right);
      const ownerDiff = ownerOrder(leftOwnerType) - ownerOrder(rightOwnerType);
      if (ownerDiff !== 0) {
        return ownerDiff;
      }

      const leftIndex = preferredOrderIndex.get(left) ?? Number.MAX_SAFE_INTEGER;
      const rightIndex = preferredOrderIndex.get(right) ?? Number.MAX_SAFE_INTEGER;
      if (leftIndex !== rightIndex) {
        return leftIndex - rightIndex;
      }

      return left.localeCompare(right, lang === 'he' ? 'he' : 'en', {
        sensitivity: 'base',
        numeric: true,
      });
    });

    const groups = orderedCategories.map((categoryLabel) => {
      const ownerType = categoryOwnerTypeMap.get(categoryLabel) ?? detectedCategoryOwnerType.get(categoryLabel);

      if (ownerType === 'CUSTOMER' || ownerType === 'TRADER') {
        const pitamToGrades = ownerExistingColumns.get(categoryLabel);
        const pitamGroupsForCustomer = pitamGroups
          .map((pitam) => {
            const existingGrades = Array.from(pitamToGrades?.get(pitam.key) ?? []).sort(compareGrades);

            return {
              ...pitam,
              grades: existingGrades,
            };
          })
          .filter((pitam) => pitam.grades.length > 0);

        return {
          categoryLabel,
          total: categoryTotals.get(categoryLabel) ?? 0,
          pitamGroups: pitamGroupsForCustomer,
        };
      }

      return {
        categoryLabel,
        total: categoryTotals.get(categoryLabel) ?? 0,
        pitamGroups: pitamGroups.map((pitam) => ({
          ...pitam,
          grades: [...fixedGrades],
        })),
      };
    });

    return {
      fixedHeaders: [
        t.sortingDailyDetails.columns.dateGregorian,
        t.sortingDailyDetails.columns.dateHebrew,
        t.sortingDailyDetails.columns.fieldName,
      ],
      groups,
      rows: matrixRows,
    };
  };

  const handlePrintHarvestTable = () => {
    if (typeof window === 'undefined') {
      return;
    }

    const { header, rows } = createHarvestExportRows();
    const tableHeaderHtml = header.map((label) => `<th>${escapeHtml(label)}</th>`).join('');
    const tableRowsHtml = rows
      .map((row) => `<tr>${row.map((value) => `<td>${escapeHtml(String(value))}</td>`).join('')}</tr>`)
      .join('');

    const printWindow = window.open('', '_blank', 'width=1100,height=760');
    if (!printWindow) {
      return;
    }

    const printTitle = lang === 'he' ? 'דוח קטיף לפי ימים' : 'Harvest Daily Details';

    printWindow.document.write(`
      <!doctype html>
      <html lang="${lang === 'he' ? 'he' : 'en'}" dir="${lang === 'he' ? 'rtl' : 'ltr'}">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${escapeHtml(printTitle)}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 22px;
              font-family: Assistant, sans-serif;
              color: #1f2a22;
              background: #fff;
            }
            h1 {
              margin: 0 0 14px;
              font-size: 22px;
              color: #1f4f29;
              text-align: center;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: auto;
              font-size: 10px;
            }
            th,
            td {
              border: 1px solid #ccd9cf;
              padding: 5px;
              text-align: center;
              white-space: nowrap;
            }
            th {
              background: #1f5a32;
              color: #fff;
              font-weight: 700;
            }
            tbody tr:nth-child(even) {
              background: #f8fcf9;
            }
            @page {
              size: A4 landscape;
              margin: 8mm;
            }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(printTitle)}</h1>
          <table>
            <thead>
              <tr>${tableHeaderHtml}</tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const handleExportHarvestTableToExcel = async () => {
    if (typeof window === 'undefined') {
      return;
    }

    const { header, rows } = createHarvestExportRows();
    const dateStamp = new Date().toISOString().slice(0, 10);

    try {
      await downloadStyledExcel({
        sheetName: lang === 'he' ? 'קטיף יומי' : 'Harvest Daily',
        fileName: `harvest-daily-${dateStamp}.xlsx`,
        header,
        rows,
      });
    } catch {
      window.alert(lang === 'he' ? 'לא ניתן לייצא כרגע לאקסל.' : 'Could not export to Excel right now.');
    }
  };

  const handlePrintFieldReportTable = () => {
    if (typeof window === 'undefined') {
      return;
    }

    const { header, rows } = createFieldReportExportRows();
    const tableHeaderHtml = header.map((label) => `<th>${escapeHtml(label)}</th>`).join('');
    const tableRowsHtml = rows
      .map((row) => `<tr>${row.map((value) => `<td>${escapeHtml(String(value))}</td>`).join('')}</tr>`)
      .join('');

    const printWindow = window.open('', '_blank', 'width=1200,height=760');
    if (!printWindow) {
      return;
    }

    const printTitle = lang === 'he' ? 'דוח קטיפים לפי שדה' : 'Harvest Field Report';

    printWindow.document.write(`
      <!doctype html>
      <html lang="${lang === 'he' ? 'he' : 'en'}" dir="${lang === 'he' ? 'rtl' : 'ltr'}">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${escapeHtml(printTitle)}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 22px;
              font-family: Assistant, sans-serif;
              color: #1f2a22;
              background: #fff;
            }
            h1 {
              margin: 0 0 14px;
              font-size: 22px;
              color: #1f4f29;
              text-align: center;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: auto;
              font-size: 10px;
            }
            th,
            td {
              border: 1px solid #ccd9cf;
              padding: 5px;
              text-align: center;
              white-space: nowrap;
            }
            th {
              background: #1f5a32;
              color: #fff;
              font-weight: 700;
            }
            tbody tr:nth-child(even) {
              background: #f8fcf9;
            }
            @page {
              size: A4 landscape;
              margin: 8mm;
            }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(printTitle)}</h1>
          <table>
            <thead>
              <tr>${tableHeaderHtml}</tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const handleExportFieldReportTableToCsv = async () => {
    if (typeof window === 'undefined') {
      return;
    }

    const { header, rows } = createFieldReportExportRows();
    const dateStamp = new Date().toISOString().slice(0, 10);

    try {
      await downloadStyledExcel({
        sheetName: lang === 'he' ? 'דוח שדות' : 'Field Report',
        fileName: `harvest-field-report-${dateStamp}.xlsx`,
        header,
        rows,
      });
    } catch {
      window.alert(lang === 'he' ? 'לא ניתן לייצא כרגע לאקסל.' : 'Could not export to Excel right now.');
    }
  };

  const closeSortingActionMenu = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const menu = target.closest('.global-filters-bar__icon-menu');
    if (menu instanceof HTMLDetailsElement) {
      menu.open = false;
    }
  };

  const cancelSortingDownloadMenuClose = () => {
    if (sortingDownloadMenuCloseTimeoutRef.current !== null) {
      window.clearTimeout(sortingDownloadMenuCloseTimeoutRef.current);
      sortingDownloadMenuCloseTimeoutRef.current = null;
    }
  };

  const scheduleSortingDownloadMenuClose = (menu: HTMLDetailsElement) => {
    cancelSortingDownloadMenuClose();
    sortingDownloadMenuCloseTimeoutRef.current = window.setTimeout(() => {
      menu.open = false;
      sortingDownloadMenuCloseTimeoutRef.current = null;
    }, 180);
  };

  const handlePrintSortingDailyTable = async (variant: 'summary' | 'expanded') => {
    if (typeof window === 'undefined') {
      return;
    }

    let tableHeaderHtml = '';
    let tableRowsHtml = '';

    if (variant === 'expanded') {
      try {
        const { Workbook } = await import('exceljs');
        const matrix = await createSortingDailyExpandedMatrixData();
        const groups = matrix.groups.filter(
          (group) => group.pitamGroups.reduce((sum, pitamGroup) => sum + pitamGroup.grades.length, 0) > 0,
        );

        const topHeader = [
          ...matrix.fixedHeaders.map((label) => `<th rowspan="3">${escapeHtml(label)}</th>`),
          ...groups.map(
            (group) => {
              const groupColumnCount = group.pitamGroups.reduce((sum, pitamGroup) => sum + pitamGroup.grades.length, 0);
              return `<th colspan="${groupColumnCount}">${escapeHtml(group.categoryLabel)} (${escapeHtml(numberFormatter.format(group.total))})</th>`;
            },
          ),
        ].join('');

        const pitamHeader = groups
          .flatMap((group) =>
            group.pitamGroups.map(
              (pitamGroup) => `<th colspan="${pitamGroup.grades.length}">${escapeHtml(pitamGroup.label)}</th>`,
            ),
          )
          .join('');

        const gradeHeader = groups
          .flatMap((group) =>
            group.pitamGroups.flatMap((pitamGroup) => pitamGroup.grades.map((grade) => `<th>${escapeHtml(grade)}</th>`)),
          )
          .join('');

        tableHeaderHtml = `<tr>${topHeader}</tr><tr>${pitamHeader}</tr><tr>${gradeHeader}</tr>`;

        tableRowsHtml = matrix.rows
          .map((row) => {
            const fixedCells = [
              `<td>${escapeHtml(row.dateGregorian)}</td>`,
              `<td>${escapeHtml(row.dateHebrew)}</td>`,
              `<td>${escapeHtml(row.fieldName)}</td>`,
            ].join('');

            const valueCells = groups
              .flatMap((group) =>
                group.pitamGroups.flatMap((pitamGroup) =>
                  pitamGroup.grades.map((grade) => {
                    const cellKey = `${group.categoryLabel}::${pitamGroup.key}::${grade}`;
                    return `<td>${escapeHtml(numberFormatter.format(row.values[cellKey] ?? 0))}</td>`;
                  }),
                ),
              )
              .join('');

            return `<tr>${fixedCells}${valueCells}</tr>`;
          })
          .join('');
      } catch {
        window.alert(lang === 'he' ? 'לא ניתן להכין כרגע את גרסת ההדפסה המורחבת.' : 'Could not prepare the expanded print version right now.');
        return;
      }
    } else {
      const { header, rows } = createSortingDailyExportRows();
      tableHeaderHtml = `<tr>${header.map((label) => `<th>${escapeHtml(label)}</th>`).join('')}</tr>`;
      tableRowsHtml = rows
        .map((row) => `<tr>${row.map((value) => `<td>${escapeHtml(String(value))}</td>`).join('')}</tr>`)
        .join('');
    }

    const printWindow = window.open('', '_blank', 'width=1200,height=760');
    if (!printWindow) {
      return;
    }

    const printTitle =
      variant === 'expanded'
        ? lang === 'he'
          ? 'דוח מיון יומי - גרסה מורחבת'
          : 'Daily Sorting Report - Expanded'
        : lang === 'he'
          ? 'דוח מיון יומי'
          : 'Daily Sorting Report';

    printWindow.document.write(`
      <!doctype html>
      <html lang="${lang === 'he' ? 'he' : 'en'}" dir="${lang === 'he' ? 'rtl' : 'ltr'}">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${escapeHtml(printTitle)}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 22px;
              font-family: Assistant, sans-serif;
              color: #1f2a22;
              background: #fff;
            }
            h1 {
              margin: 0 0 14px;
              font-size: 22px;
              color: #1f4f29;
              text-align: center;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: auto;
              font-size: 10px;
            }
            th,
            td {
              border: 1px solid #ccd9cf;
              padding: 5px;
              text-align: center;
              white-space: nowrap;
            }
            th {
              background: #1f5a32;
              color: #fff;
              font-weight: 700;
            }
            tbody tr:nth-child(even) {
              background: #f8fcf9;
            }
            @page {
              size: A4 landscape;
              margin: 8mm;
            }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(printTitle)}</h1>
          <table>
            <thead>
              ${tableHeaderHtml}
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const handleExportSortingDailyTableToCsv = async (variant: 'summary' | 'expanded') => {
    if (typeof window === 'undefined') {
      return;
    }

    if (variant === 'expanded') {
      try {
        const { Workbook } = await import('exceljs');
        const matrix = await createSortingDailyExpandedMatrixData();
        const groups = matrix.groups.filter(
          (group) => group.pitamGroups.reduce((sum, pitamGroup) => sum + pitamGroup.grades.length, 0) > 0,
        );

        const topHeaderRow: Array<string | number> = [
          ...matrix.fixedHeaders,
          ...groups.flatMap((group) =>
            group.pitamGroups.flatMap((pitamGroup, pitamIndex) =>
              pitamGroup.grades.map((_, gradeIndex) =>
                pitamIndex === 0 && gradeIndex === 0 ? `${group.categoryLabel} (${numberFormatter.format(group.total)})` : '',
              ),
            ),
          ),
        ];

        const pitamHeaderRow: Array<string | number> = [
          '',
          '',
          '',
          ...groups.flatMap((group) =>
            group.pitamGroups.flatMap((pitamGroup) =>
              pitamGroup.grades.map((_, gradeIndex) => (gradeIndex === 0 ? pitamGroup.label : '')),
            ),
          ),
        ];

        const gradesHeaderRow: Array<string | number> = [
          '',
          '',
          '',
          ...groups.flatMap((group) => group.pitamGroups.flatMap((pitamGroup) => pitamGroup.grades)),
        ];

        const bodyRows = matrix.rows.map((row) => {
          const valueColumns = groups.flatMap((group) =>
            group.pitamGroups.flatMap((pitamGroup) =>
              pitamGroup.grades.map((grade) => {
                const cellKey = `${group.categoryLabel}::${pitamGroup.key}::${grade}`;
                return row.values[cellKey] ?? 0;
              }),
            ),
          );

          return [row.dateGregorian, row.dateHebrew, row.fieldName, ...valueColumns];
        });

        const numericColumnCount = bodyRows[0]?.length ? Math.max(0, bodyRows[0].length - 3) : 0;
        const summaryValues = Array.from({ length: numericColumnCount }, (_, index) =>
          bodyRows.reduce((sum, row) => sum + (Number(row[index + 3]) || 0), 0),
        );
        const summaryRow: Array<string | number> = [lang === 'he' ? 'סה"כ' : 'Total', '', '', ...summaryValues];

        const workbook = new Workbook();
        const worksheet = workbook.addWorksheet(lang === 'he' ? 'מיון מורחב' : 'Sorting Expanded');
        const excelRows = [topHeaderRow, pitamHeaderRow, gradesHeaderRow, ...bodyRows, summaryRow];

        for (const row of excelRows) {
          worksheet.addRow(row);
        }

        const headerBg = 'FF1F5A32';
        const headerFont = 'FFFFFFFF';
        const borderColor = 'FFCCD9CF';
        const zebraBg = 'FFF8FCF9';
        const summaryBg = 'FFE7F2EB';

        for (let fixedCol = 1; fixedCol <= matrix.fixedHeaders.length; fixedCol += 1) {
          worksheet.mergeCells(1, fixedCol, 3, fixedCol);
        }

        let currentCol = matrix.fixedHeaders.length + 1;

        for (const group of groups) {
          const groupColumns = group.pitamGroups.reduce((sum, pitamGroup) => sum + pitamGroup.grades.length, 0);
          if (groupColumns <= 0) {
            continue;
          }

          worksheet.mergeCells(1, currentCol, 1, currentCol + groupColumns - 1);

          for (const pitamGroup of group.pitamGroups) {
            const pitamColumns = pitamGroup.grades.length;
            if (pitamColumns <= 0) {
              continue;
            }

            worksheet.mergeCells(2, currentCol, 2, currentCol + pitamColumns - 1);
            currentCol += pitamColumns;
          }
        }

        const maxCol = worksheet.columnCount;
        const bodyStartRow = 4;
        const summaryRowIndex = bodyStartRow + bodyRows.length;
        for (let rowIndex = 1; rowIndex <= worksheet.rowCount; rowIndex += 1) {
          const row = worksheet.getRow(rowIndex);
          for (let colIndex = 1; colIndex <= maxCol; colIndex += 1) {
            const cell = row.getCell(colIndex);
            const isHeader = rowIndex <= 3;
            const isSummary = rowIndex === summaryRowIndex;
            const isZebraDataRow = rowIndex >= bodyStartRow && rowIndex < summaryRowIndex && rowIndex % 2 === 0;

            cell.alignment = {
              horizontal: 'center',
              vertical: 'middle',
              wrapText: true,
            };

            cell.border = {
              top: { style: 'thin', color: { argb: borderColor } },
              left: { style: 'thin', color: { argb: borderColor } },
              bottom: { style: 'thin', color: { argb: borderColor } },
              right: { style: 'thin', color: { argb: borderColor } },
            };

            if (isHeader) {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: headerBg },
              };

              cell.font = {
                bold: true,
                color: { argb: headerFont },
              };
            } else if (isSummary) {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: summaryBg },
              };

              cell.font = {
                bold: true,
                color: { argb: 'FF1F4F29' },
              };
            } else if (isZebraDataRow) {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: zebraBg },
              };

              cell.font = {
                color: { argb: 'FF1F2A22' },
              };
            } else {
              cell.font = {
                color: { argb: 'FF1F2A22' },
              };
            }
          }
        }

        const minimumWidths = [14, 14, 20];
        for (let colIndex = 1; colIndex <= worksheet.columnCount; colIndex += 1) {
          let maxLength = 0;

          worksheet.eachRow((row: Row) => {
            const rawValue = row.getCell(colIndex).value;
            const textValue = rawValue === null || rawValue === undefined ? '' : String(rawValue);
            if (textValue.length > maxLength) {
              maxLength = textValue.length;
            }
          });

          const minWidth = minimumWidths[colIndex - 1] ?? 8;
          worksheet.getColumn(colIndex).width = Math.max(minWidth, Math.min(maxLength + 2, 36));
        }

        worksheet.views = [{ state: 'frozen', xSplit: 3, ySplit: 3, rightToLeft: lang === 'he' }];

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');

        const dateStamp = new Date().toISOString().slice(0, 10);
        link.href = url;
        link.download = `sorting-daily-expanded-${dateStamp}.xlsx`;
        document.body.append(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } catch {
        window.alert(lang === 'he' ? 'לא ניתן להכין כרגע את גרסת הייצוא המורחבת.' : 'Could not prepare the expanded export version right now.');
      }

      return;
    }

    try {
      const { header, rows } = createSortingDailyExportRows();
      const dateStamp = new Date().toISOString().slice(0, 10);

      await downloadStyledExcel({
        sheetName: lang === 'he' ? 'מיון יומי' : 'Sorting Daily',
        fileName: `sorting-daily-${dateStamp}.xlsx`,
        header,
        rows,
      });
    } catch {
      window.alert(lang === 'he' ? 'לא ניתן לייצא כרגע לאקסל.' : 'Could not export to Excel right now.');
    }
  };

  const buildNumericCellId = (scope: NumericSelectionScope, rowId: number, column: NumericSelectableColumnKey) =>
    `${scope}:${rowId}:${column}`;

  const applyNumericCellSelection = (cellId: string, value: number) => {
    setSelectedNumericCells((prev) => {
      const next = { ...prev };

      if (dragSelectModeRef.current === 'add') {
        next[cellId] = value;
      } else {
        delete next[cellId];
      }

      return next;
    });
  };

  const handleNumericCellPointerDown =
    (scope: NumericSelectionScope, rowId: number, column: NumericSelectableColumnKey, value: number) =>
    (event: React.PointerEvent) => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    event.preventDefault();

    const cellId = buildNumericCellId(scope, rowId, column);
    dragSelectModeRef.current = selectedNumericCells[cellId] !== undefined ? 'remove' : 'add';
    applyNumericCellSelection(cellId, value);
    setIsDragSelecting(true);
  };

  const handleNumericCellPointerEnter =
    (scope: NumericSelectionScope, rowId: number, column: NumericSelectableColumnKey, value: number) =>
    () => {
    if (!isDragSelecting) {
      return;
    }

    const cellId = buildNumericCellId(scope, rowId, column);
    applyNumericCellSelection(cellId, value);
  };

  const renderNumericCell = (
    row: HarvestRecord,
    column: HarvestNumericColumnKey,
    value: number,
    content?: React.ReactNode,
  ) => {
    const cellId = buildNumericCellId('daily', row.id, column);
    const isSelected = selectedNumericCells[cellId] !== undefined;

    return (
      <button
        type="button"
        className={`harvest-daily-workspace__numeric-cell${isSelected ? ' is-selected' : ''}`}
        onPointerDown={handleNumericCellPointerDown('daily', row.id, column, value)}
        onPointerEnter={handleNumericCellPointerEnter('daily', row.id, column, value)}
        aria-pressed={isSelected}
      >
        {content ?? value}
      </button>
    );
  };

  const renderFieldReportNumericCell = (
    row: HarvestFieldReportRow,
    column: FieldReportNumericColumnKey,
    value: number,
    content?: React.ReactNode,
  ) => {
    const cellId = buildNumericCellId('field-report', row.id, column);
    const isSelected = selectedNumericCells[cellId] !== undefined;

    return (
      <button
        type="button"
        className={`harvest-daily-workspace__numeric-cell${isSelected ? ' is-selected' : ''}`}
        onPointerDown={handleNumericCellPointerDown('field-report', row.id, column, value)}
        onPointerEnter={handleNumericCellPointerEnter('field-report', row.id, column, value)}
        aria-pressed={isSelected}
      >
        {content ?? value}
      </button>
    );
  };

  const renderSortingNumericCell = (
    row: ClassificationDailySummaryRow,
    column: SortingDailyNumericColumnKey,
    value: number,
    content?: React.ReactNode,
    className = 'harvest-daily-workspace__numeric-cell',
  ) => {
    const cellId = buildNumericCellId('sorting-daily', row.harvestId, column);
    const isSelected = selectedNumericCells[cellId] !== undefined;

    return (
      <button
        type="button"
        className={`${className}${isSelected ? ' is-selected' : ''}`}
        onPointerDown={handleNumericCellPointerDown('sorting-daily', row.harvestId, column, value)}
        onPointerEnter={handleNumericCellPointerEnter('sorting-daily', row.harvestId, column, value)}
        aria-pressed={isSelected}
      >
        {content ?? value}
      </button>
    );
  };

  const columns = useMemo<GlobalDataTableColumn<HarvestRecord>[]>(() => {
    return [
      {
        id: 'actions',
        header: lang === 'he' ? 'פרטים' : 'Details',
        headerLabel: lang === 'he' ? 'פרטים' : 'Details',
        minWidth: GLOBAL_DATA_TABLE_WIDTHS.action,
        gridTemplate: GLOBAL_DATA_TABLE_WIDTHS.action,
        align: 'center',
        render: (row) => (
          <button
            type="button"
            className="harvest-daily-workspace__details-trigger"
            aria-label={t.dailyDetails.detailsPanel.openDetails}
            onClick={() => setDetailsRecord(row)}
          >
            <FaFileInvoice />
          </button>
        ),
      },
      {
        id: 'dateGregorian',
        header: t.dailyDetails.columns.dateGregorian,
        headerLabel: t.dailyDetails.columns.dateGregorian,
        sortKey: 'dateGregorian',
        sortLabel: `${t.dailyDetails.columns.dateGregorian} - ${lang === 'he' ? 'מיון' : 'Sort'}`,
        defaultSortDirection: 'desc',
        sortAccessor: (row) => Date.parse(row.dateGregorian),
        minWidth: GLOBAL_DATA_TABLE_WIDTHS.dateShort,
        render: (row) => formatGregorianDate(row.dateGregorian),
      },
      {
        id: 'dateHebrew',
        header: t.dailyDetails.columns.dateHebrew,
        headerLabel: t.dailyDetails.columns.dateHebrew,
        minWidth: GLOBAL_DATA_TABLE_WIDTHS.dateLong,
        render: (row) => row.dateHebrew,
      },
      {
        id: 'fieldName',
        header: t.dailyDetails.columns.fieldName,
        headerLabel: t.dailyDetails.columns.fieldName,
        minWidth: GLOBAL_DATA_TABLE_WIDTHS.fieldName,
        render: (row) => row.field?.name ?? '-',
      },
      {
        id: 'totalHarvested',
        header: t.dailyDetails.columns.totalHarvested,
        headerLabel: t.dailyDetails.columns.totalHarvested,
        sortKey: 'totalHarvested',
        sortLabel: `${t.dailyDetails.columns.totalHarvested} - ${lang === 'he' ? 'מיון' : 'Sort'}`,
        defaultSortDirection: 'desc',
        sortAccessor: (row) => row.totalHarvested,
        minWidth: GLOBAL_DATA_TABLE_WIDTHS.numeric,
        align: 'center',
        render: (row) => renderNumericCell(row, 'totalHarvested', row.totalHarvested),
      },
      {
        id: 'totalRejected',
        header: t.dailyDetails.columns.totalRejected,
        headerLabel: t.dailyDetails.columns.totalRejected,
        sortKey: 'totalRejected',
        sortLabel: `${t.dailyDetails.columns.totalRejected} - ${lang === 'he' ? 'מיון' : 'Sort'}`,
        defaultSortDirection: 'desc',
        sortAccessor: (row) => row.totalRejected,
        minWidth: GLOBAL_DATA_TABLE_WIDTHS.numeric,
        align: 'center',
        render: (row) => renderNumericCell(row, 'totalRejected', row.totalRejected),
      },
      {
        id: 'totalAfterRejected',
        header: t.dailyDetails.columns.netHarvest,
        headerLabel: t.dailyDetails.columns.netHarvest,
        sortKey: 'totalAfterRejected',
        sortLabel: `${t.dailyDetails.columns.netHarvest} - ${lang === 'he' ? 'מיון' : 'Sort'}`,
        defaultSortDirection: 'desc',
        sortAccessor: (row) => row.totalAfterRejected,
        minWidth: GLOBAL_DATA_TABLE_WIDTHS.numericWide,
        align: 'center',
        render: (row) => renderNumericCell(row, 'totalAfterRejected', row.totalAfterRejected),
      },
      {
        id: 'classifiedTotal',
        header: t.dailyDetails.columns.classifiedTotal,
        headerLabel: t.dailyDetails.columns.classifiedTotal,
        sortKey: 'classifiedTotal',
        sortLabel: `${t.dailyDetails.columns.classifiedTotal} - ${lang === 'he' ? 'מיון' : 'Sort'}`,
        defaultSortDirection: 'desc',
        sortAccessor: (row) => row.classifiedTotal,
        minWidth: GLOBAL_DATA_TABLE_WIDTHS.numericWide,
        align: 'center',
        render: (row) => (
          renderNumericCell(
            row,
            'classifiedTotal',
            row.classifiedTotal,
            <span
              className={`harvest-daily-workspace__classified-total${isPartialClassificationFlag(row.isPartialClassification as unknown) ? ' harvest-daily-workspace__classified-total--partial' : ''}`}
            >
              {row.classifiedTotal}
            </span>,
          )
        ),
      },
    ];
  }, [t, lang, isDragSelecting, selectedNumericCells]);

  const filteredHarvestRows = useMemo(() => {
    return harvestRows.filter((row) => (fieldFilterId === 'all' ? true : row.fieldId === fieldFilterId));
  }, [harvestRows, fieldFilterId]);

  useEffect(() => {
    if (fieldReportDetailsFieldId === null) {
      setFieldReportDetailsPayload(null);
      return;
    }

    if (!fieldReportRows.some((row) => row.id === fieldReportDetailsFieldId)) {
      setFieldReportDetailsFieldId(null);
      setFieldReportDetailsPayload(null);
    }
  }, [fieldReportDetailsFieldId, fieldReportRows]);

  useEffect(() => {
    if (!isFieldReportTab || fieldReportDetailsFieldId === null || !seasonFilterId) {
      setFieldReportDetailsPayload(null);
      return;
    }

    let isMounted = true;

    const loadFieldReportDetails = async () => {
      try {
        const data = await getHarvestFieldReportDetailsBySeasonAndField(seasonFilterId, fieldReportDetailsFieldId);
        if (!isMounted) {
          return;
        }
        setFieldReportDetailsPayload(data);
      } catch {
        if (!isMounted) {
          return;
        }
        setFieldReportDetailsPayload(null);
      }
    };

    void loadFieldReportDetails();

    return () => {
      isMounted = false;
    };
  }, [fieldReportDetailsFieldId, isFieldReportTab, seasonFilterId]);

  useEffect(() => {
    if (!detailsRecord) {
      return;
    }

    if (!filteredHarvestRows.some((row) => row.id === detailsRecord.id)) {
      setDetailsRecord(null);
    }
  }, [detailsRecord, filteredHarvestRows]);

  useEffect(() => {
    if (!detailsRecord) {
      setRelatedSortings([]);
      setRelatedSortingsLoadError('');
      setIsRelatedSortingsLoading(false);
      return;
    }

    let isMounted = true;

    const loadRelatedSortings = async () => {
      setIsRelatedSortingsLoading(true);
      setRelatedSortingsLoadError('');

      try {
        const rows = await getClassificationsByHarvest(detailsRecord.id);

        if (!isMounted) {
          return;
        }

        setRelatedSortings(rows);
      } catch {
        if (!isMounted) {
          return;
        }

        setRelatedSortings([]);
        setRelatedSortingsLoadError(t.dailyDetails.detailsPanel.relatedSortings.loadError);
      } finally {
        if (isMounted) {
          setIsRelatedSortingsLoading(false);
        }
      }
    };

    void loadRelatedSortings();

    return () => {
      isMounted = false;
    };
  }, [detailsRecord, t.dailyDetails.detailsPanel.relatedSortings.loadError]);

  useEffect(() => {
    if (!isSortingDailyDetailsTab || sortingDailyDetailsRowId === null) {
      setSortingDailyDetailRows([]);
      setSortingDailyDetailRowsLoadError('');
      setIsSortingDailyDetailRowsLoading(false);
      return;
    }

    let isMounted = true;

    const loadSortingDailyDetailRows = async () => {
      setIsSortingDailyDetailRowsLoading(true);
      setSortingDailyDetailRowsLoadError('');

      try {
        const rows = await getClassificationsByHarvest(sortingDailyDetailsRowId);

        if (!isMounted) {
          return;
        }

        setSortingDailyDetailRows(rows);
      } catch {
        if (!isMounted) {
          return;
        }

        setSortingDailyDetailRows([]);
        setSortingDailyDetailRowsLoadError(
          lang === 'he' ? 'לא ניתן לטעון את פירוט המיונים כרגע.' : 'Failed to load sorting details right now.',
        );
      } finally {
        if (isMounted) {
          setIsSortingDailyDetailRowsLoading(false);
        }
      }
    };

    void loadSortingDailyDetailRows();

    return () => {
      isMounted = false;
    };
  }, [isSortingDailyDetailsTab, lang, sortingDailyDetailsRowId]);

  useEffect(() => {
    const activeScope: NumericSelectionScope | null = isDailyDetailsTab
      ? 'daily'
      : isFieldReportTab
        ? 'field-report'
        : isSortingDailyDetailsTab
          ? 'sorting-daily'
        : null;
    const activeRows = isDailyDetailsTab
      ? filteredHarvestRows
      : isFieldReportTab
        ? fieldReportRows
        : isSortingDailyDetailsTab
          ? sortingDailyRows
          : [];
    const activeColumns: NumericSelectableColumnKey[] = isDailyDetailsTab
      ? HARVEST_NUMERIC_COLUMNS
      : isFieldReportTab
        ? FIELD_REPORT_NUMERIC_COLUMNS
        : isSortingDailyDetailsTab
          ? [
              ...SORTING_DAILY_NUMERIC_COLUMNS,
              ...sortingDailyCategories.map(
                (category) => `category:${category.key}` as SortingDailyNumericColumnKey,
              ),
            ]
        : [];

    if (!activeScope || activeRows.length === 0) {
      if (Object.keys(selectedNumericCells).length > 0) {
        setSelectedNumericCells({});
      }
      return;
    }

    const validIds = new Set(
      activeRows.map((row) => String('harvestId' in row ? row.harvestId : row.id)),
    );

    setSelectedNumericCells((prev) => {
      let changed = false;
      const next: Record<string, number> = {};

      for (const [cellId, value] of Object.entries(prev)) {
        const [scope, rowId, ...columnParts] = cellId.split(':');
        const column = columnParts.join(':');
        if (scope === activeScope && validIds.has(rowId) && activeColumns.includes(column as NumericSelectableColumnKey)) {
          next[cellId] = value;
        } else {
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [
    fieldReportRows,
    filteredHarvestRows,
    isDailyDetailsTab,
    isFieldReportTab,
    isSortingDailyDetailsTab,
    selectedNumericCells,
    sortingDailyCategories,
    sortingDailyRows,
  ]);

  const selectedCellsCount = useMemo(() => Object.keys(selectedNumericCells).length, [selectedNumericCells]);

  const selectedCellsTotal = useMemo(
    () => Object.values(selectedNumericCells).reduce((sum, value) => sum + value, 0),
    [selectedNumericCells],
  );

  const formattedSelectedTotal = useMemo(() => {
    const locale = lang === 'he' ? 'he-IL' : 'en-US';
    return new Intl.NumberFormat(locale).format(selectedCellsTotal);
  }, [lang, selectedCellsTotal]);

  const numberFormatter = useMemo(() => {
    const locale = lang === 'he' ? 'he-IL' : 'en-US';
    return new Intl.NumberFormat(locale);
  }, [lang]);

  const percentFormatter = useMemo(() => {
    const locale = lang === 'he' ? 'he-IL' : 'en-US';
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  }, [lang]);

  const formatRate = (value: number | string) => {
    const numeric = typeof value === 'string' ? Number(value) : value;
    if (!Number.isFinite(numeric)) {
      return String(value);
    }
    return `${percentFormatter.format(numeric)}%`;
  };

  const toNumericValue = (value: number | string) => {
    const numeric = typeof value === 'string' ? Number(value) : value;
    return Number.isFinite(numeric) ? numeric : 0;
  };

  const isPartialClassificationFlag = (value: unknown) => {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'number') {
      return value === 1;
    }
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      return normalized === '1' || normalized === 'true' || normalized === 'yes';
    }
    return false;
  };

  const fieldReportColumns = useMemo<GlobalDataTableColumn<HarvestFieldReportRow>[]>(() => {
    return [
      {
        id: 'details',
        header: lang === 'he' ? 'פרטים' : 'Details',
        headerLabel: lang === 'he' ? 'פרטים' : 'Details',
        minWidth: GLOBAL_DATA_TABLE_WIDTHS.action,
        gridTemplate: GLOBAL_DATA_TABLE_WIDTHS.action,
        align: 'center',
        render: (row) => (
          <button
            type="button"
            className="harvest-daily-workspace__details-trigger"
            onClick={() => setFieldReportDetailsFieldId(row.id)}
            aria-label={lang === 'he' ? `הצגת כל פרטי השדה ${row.fieldName}` : `View all details for ${row.fieldName}`}
          >
            <FaFileInvoice />
          </button>
        ),
      },
      {
        id: 'fieldName',
        header: t.dailyDetails.columns.fieldName,
        headerLabel: t.dailyDetails.columns.fieldName,
        sortKey: 'fieldName',
        sortLabel: `${t.dailyDetails.columns.fieldName} - ${lang === 'he' ? 'מיון' : 'Sort'}`,
        defaultSortDirection: 'asc',
        sortAccessor: (row) => row.fieldName,
        minWidth: GLOBAL_DATA_TABLE_WIDTHS.fieldName,
        render: (row) => row.fieldName,
      },
      {
        id: 'totalHarvested',
        header: t.dailyDetails.columns.totalHarvested,
        headerLabel: t.dailyDetails.columns.totalHarvested,
        sortKey: 'totalHarvested',
        sortLabel: `${t.dailyDetails.columns.totalHarvested} - ${lang === 'he' ? 'מיון' : 'Sort'}`,
        defaultSortDirection: 'desc',
        sortAccessor: (row) => row.totalHarvested,
        minWidth: GLOBAL_DATA_TABLE_WIDTHS.numeric,
        align: 'center',
        render: (row) => renderFieldReportNumericCell(row, 'totalHarvested', row.totalHarvested, numberFormatter.format(row.totalHarvested)),
      },
      {
        id: 'totalRejected',
        header: t.dailyDetails.columns.totalRejected,
        headerLabel: t.dailyDetails.columns.totalRejected,
        sortKey: 'totalRejected',
        sortLabel: `${t.dailyDetails.columns.totalRejected} - ${lang === 'he' ? 'מיון' : 'Sort'}`,
        defaultSortDirection: 'desc',
        sortAccessor: (row) => row.totalRejected,
        minWidth: GLOBAL_DATA_TABLE_WIDTHS.numeric,
        align: 'center',
        render: (row) => renderFieldReportNumericCell(row, 'totalRejected', row.totalRejected, numberFormatter.format(row.totalRejected)),
      },
      {
        id: 'totalAfterRejected',
        header: t.dailyDetails.columns.netHarvest,
        headerLabel: t.dailyDetails.columns.netHarvest,
        sortKey: 'totalAfterRejected',
        sortLabel: `${t.dailyDetails.columns.netHarvest} - ${lang === 'he' ? 'מיון' : 'Sort'}`,
        defaultSortDirection: 'desc',
        sortAccessor: (row) => row.totalAfterRejected,
        minWidth: GLOBAL_DATA_TABLE_WIDTHS.numericWide,
        align: 'center',
        render: (row) =>
          renderFieldReportNumericCell(
            row,
            'totalAfterRejected',
            row.totalAfterRejected,
            numberFormatter.format(row.totalAfterRejected),
          ),
      },
      {
        id: 'rejectionRate',
        header: t.dailyDetails.detailsPanel.fields.rejectionRate,
        headerLabel: t.dailyDetails.detailsPanel.fields.rejectionRate,
        sortKey: 'rejectionRate',
        sortLabel: `${t.dailyDetails.detailsPanel.fields.rejectionRate} - ${lang === 'he' ? 'מיון' : 'Sort'}`,
        defaultSortDirection: 'desc',
        sortAccessor: (row) => row.rejectionRate,
        minWidth: GLOBAL_DATA_TABLE_WIDTHS.numericPercent,
        align: 'center',
        render: (row) => renderFieldReportNumericCell(row, 'rejectionRate', row.rejectionRate, formatRate(row.rejectionRate)),
      },
    ];
  }, [
    formatRate,
    isDragSelecting,
    lang,
    numberFormatter,
    selectedNumericCells,
    t.dailyDetails.columns,
    t.dailyDetails.detailsPanel.fields,
  ]);

  const sortingDailyColumns = useMemo<GlobalDataTableColumn<ClassificationDailySummaryRow>[]>(() => {
    return [
      {
        id: 'details',
        header: lang === 'he' ? 'פרטים' : 'Details',
        headerLabel: lang === 'he' ? 'פרטים' : 'Details',
        minWidth: '72px',
        gridTemplate: '72px',
        align: 'center',
        render: (row) => (
          <button
            type="button"
            className="harvest-daily-workspace__details-trigger"
            onClick={() => setSortingDailyDetailsRowId(row.harvestId)}
            aria-label={lang === 'he' ? 'הצגת פרטי שורת מיון' : 'Show sorting row details'}
          >
            <FaFileInvoice />
          </button>
        ),
      },
      {
        id: 'dateGregorian',
        header: t.sortingDailyDetails.columns.dateGregorian,
        headerLabel: t.sortingDailyDetails.columns.dateGregorian,
        sortKey: 'dateGregorian',
        sortLabel: `${t.sortingDailyDetails.columns.dateGregorian} - ${lang === 'he' ? 'מיון' : 'Sort'}`,
        defaultSortDirection: 'desc',
        sortAccessor: (row) => Date.parse(row.dateGregorian),
        minWidth: GLOBAL_DATA_TABLE_WIDTHS.dateShort,
        gridTemplate: GLOBAL_DATA_TABLE_WIDTHS.dateShort,
        render: (row) => formatGregorianDate(row.dateGregorian),
      },
      {
        id: 'dateHebrew',
        header: t.sortingDailyDetails.columns.dateHebrew,
        headerLabel: t.sortingDailyDetails.columns.dateHebrew,
        sortKey: 'dateHebrew',
        sortLabel: `${t.sortingDailyDetails.columns.dateHebrew} - ${lang === 'he' ? 'מיון' : 'Sort'}`,
        defaultSortDirection: 'desc',
        sortAccessor: (row) => row.dateHebrew,
        minWidth: GLOBAL_DATA_TABLE_WIDTHS.dateLong,
        gridTemplate: GLOBAL_DATA_TABLE_WIDTHS.dateLong,
        render: (row) => row.dateHebrew,
      },
      {
        id: 'fieldName',
        header: t.sortingDailyDetails.columns.fieldName,
        headerLabel: t.sortingDailyDetails.columns.fieldName,
        sortKey: 'fieldName',
        sortLabel: `${t.sortingDailyDetails.columns.fieldName} - ${lang === 'he' ? 'מיון' : 'Sort'}`,
        defaultSortDirection: 'asc',
        sortAccessor: (row) => row.fieldName,
        minWidth: GLOBAL_DATA_TABLE_WIDTHS.fieldName,
        gridTemplate: GLOBAL_DATA_TABLE_WIDTHS.fieldName,
        render: (row) => row.fieldName,
      },
      {
        id: 'categories',
        header: t.sortingDailyDetails.columns.categoriesGroup,
        headerLabel: t.sortingDailyDetails.columns.categoriesGroup,
        minWidth: '560px',
        gridTemplate: 'minmax(560px, 1fr)',
        align: 'center',
        render: (row) => {
          const rowCategories = sortingDailyCategories
            .map((category) => ({
              key: category.key,
              label: buildSortingCategoryDisplayLabel(category, lang),
              value: row.categoryTotals[category.key] ?? 0,
            }))
            .filter((category) => category.value > 0);

          return (
            <div className="harvest-sorting-daily-table__categories-cell">
              {rowCategories.length === 0 ? (
                <span className="harvest-sorting-daily-table__category-chip is-empty">-</span>
              ) : (
                rowCategories.map((category) => (
                  <span
                    key={`sorting-row-${row.harvestId}-${category.key}`}
                    className="harvest-sorting-daily-table__category-chip"
                  >
                    <span className="harvest-sorting-daily-table__category-chip-label">{category.label}</span>
                    {renderSortingNumericCell(
                      row,
                      `category:${category.key}`,
                      category.value,
                      <span className="harvest-sorting-daily-table__category-chip-value-text">
                        {numberFormatter.format(category.value)}
                      </span>,
                      'harvest-sorting-daily-table__category-chip-value',
                    )}
                  </span>
                ))
              )}
            </div>
          );
        },
      },
      {
        id: 'totalSorted',
        header: t.sortingDailyDetails.columns.totalSorted,
        headerLabel: t.sortingDailyDetails.columns.totalSorted,
        sortKey: 'totalSorted',
        sortLabel: `${t.sortingDailyDetails.columns.totalSorted} - ${lang === 'he' ? 'מיון' : 'Sort'}`,
        defaultSortDirection: 'desc',
        sortAccessor: (row) =>
          sortingDailyCategories.reduce((sum, category) => sum + (row.categoryTotals[category.key] ?? 0), 0),
        minWidth: GLOBAL_DATA_TABLE_WIDTHS.numeric,
        gridTemplate: GLOBAL_DATA_TABLE_WIDTHS.numeric,
        align: 'center',
        render: (row) => {
          const rowDailyTotal = sortingDailyCategories.reduce(
            (sum, category) => sum + (row.categoryTotals[category.key] ?? 0),
            0,
          );

          return renderSortingNumericCell(
            row,
            'totalSorted',
            rowDailyTotal,
            <strong>{numberFormatter.format(rowDailyTotal)}</strong>,
          );
        },
      },
    ];
  }, [
    formatGregorianDate,
    isDragSelecting,
    lang,
    numberFormatter,
    selectedNumericCells,
    sortingDailyCategories,
    t.sortingDailyDetails.columns,
  ]);

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

  const sortingDailyDetailsData = useMemo(() => {
    if (sortingDailyDetailsRowId === null) {
      return null;
    }

    const row = filteredSortingDailyRows.find((item) => item.harvestId === sortingDailyDetailsRowId);
    if (!row) {
      return null;
    }

    const rowCategories = sortingDailyCategories
      .map((category) => ({
        key: category.key,
        label: buildSortingCategoryDisplayLabel(category, lang),
        value: row.categoryTotals[category.key] ?? 0,
      }))
      .filter((category) => category.value > 0);

    const rowDailyTotal = rowCategories.reduce((sum, category) => sum + category.value, 0);

    return {
      row,
      rowCategories,
      rowDailyTotal,
    };
  }, [filteredSortingDailyRows, lang, sortingDailyCategories, sortingDailyDetailsRowId]);

  const sortingDailyCategoryBreakdown = useMemo(() => {
    if (!sortingDailyDetailsData) {
      return [] as Array<{
        label: string;
        total: number;
        pitamHeaders: Array<{ key: string; label: string; total: number }>;
        gradeRows: Array<{ grade: string; values: Record<string, number>; total: number }>;
      }>;
    }

    const pitamLabelMap: Record<string, string> = {
      WITH_PITAM: lang === 'he' ? 'פיטם' : 'With pitam',
      WITHOUT_PITAM: lang === 'he' ? 'בל"פ' : 'Without pitam',
      MIXED: lang === 'he' ? 'מעורב' : 'Mixed',
      UNKNOWN: lang === 'he' ? 'לא ידוע' : 'Unknown',
    };

    const getPitamKey = (value?: string | null) => {
      if (!value) {
        return 'UNKNOWN';
      }

      const normalized = value.replace(/\s+/g, '_').toUpperCase();
      if (normalized === 'WITH_PITAM' || normalized === 'WITHOUT_PITAM') {
        return normalized;
      }

      return 'MIXED';
    };

    const getCategoryDisplayLabel = (row: ClassificationRecord) => {
      const categoryName = row.customerCategory?.name ?? row.traderCategory?.name ?? '';
      if (!categoryName) {
        return '';
      }

      if (row.assignmentType === 'TRADER') {
        const ownerName = row.trader?.name?.trim();
        return ownerName ? `${ownerName} | ${categoryName}` : categoryName;
      }

      if (row.assignmentType === 'CUSTOMER') {
        const ownerName = row.customer?.customerName?.trim();
        return ownerName ? `${ownerName} | ${categoryName}` : categoryName;
      }

      return categoryName;
    };

    const categoryOrder = sortingDailyDetailsData.rowCategories.map((category) => category.label);
    const allowedCategories = new Set(categoryOrder);

    const grouped = new Map<
      string,
      {
        total: number;
        pitamTotals: Record<string, number>;
        grades: Map<string, Record<string, number>>;
      }
    >();

    for (const row of sortingDailyDetailRows) {
      const quantity = Number(row.quantity) || 0;
      if (quantity <= 0) {
        continue;
      }

      const categoryLabel = getCategoryDisplayLabel(row);
      if (!categoryLabel || !allowedCategories.has(categoryLabel)) {
        continue;
      }

      const grade = row.grade || row.customerCategory?.grade || '-';
      const pitamKey = getPitamKey(row.pitamStatus);

      if (!grouped.has(categoryLabel)) {
        grouped.set(categoryLabel, {
          total: 0,
          pitamTotals: {},
          grades: new Map<string, Record<string, number>>(),
        });
      }

      const categoryGroup = grouped.get(categoryLabel)!;
      categoryGroup.total += quantity;
      categoryGroup.pitamTotals[pitamKey] = (categoryGroup.pitamTotals[pitamKey] ?? 0) + quantity;

      if (!categoryGroup.grades.has(grade)) {
        categoryGroup.grades.set(grade, {});
      }

      const gradeValues = categoryGroup.grades.get(grade)!;
      gradeValues[pitamKey] = (gradeValues[pitamKey] ?? 0) + quantity;
    }

    return categoryOrder
      .filter((label) => grouped.has(label))
      .map((label) => {
        const group = grouped.get(label)!;
        const pitamKeys = Object.keys(group.pitamTotals).sort((left, right) => {
          const order = ['WITHOUT_PITAM', 'WITH_PITAM', 'MIXED', 'UNKNOWN'];
          return order.indexOf(left) - order.indexOf(right);
        });

        const pitamHeaders = pitamKeys.map((key) => ({
          key,
          label: pitamLabelMap[key] ?? key,
          total: group.pitamTotals[key] ?? 0,
        }));

        const gradeRows = Array.from(group.grades.entries())
          .map(([grade, values]) => ({
            grade,
            values,
            total: pitamKeys.reduce((sum, key) => sum + (values[key] ?? 0), 0),
          }))
          .sort((a, b) => a.grade.localeCompare(b.grade, lang === 'he' ? 'he' : 'en', { sensitivity: 'base', numeric: true }));

        return {
          label,
          total: group.total,
          pitamHeaders,
          gradeRows,
        };
      });
  }, [lang, sortingDailyDetailRows, sortingDailyDetailsData]);

  const fieldReportDetailsData = useMemo(() => {
    if (!fieldReportDetailsPayload) {
      return null;
    }

    const summaryStatus = !fieldReportDetailsPayload.isPartialClassification
      ? lang === 'he'
        ? 'מיון סופי'
        : 'Final sorting'
      : lang === 'he'
        ? 'מיון חלקי'
        : 'Partial sorting';

    const summaryRows: Array<{
      key: string;
      kind: 'regular' | 'summary';
      label: string;
      totalHarvested: string;
      totalRejected: string;
      totalAfterRejected: string;
      classifiedTotal: string;
      rejectionRate: string;
    }> = [
      {
        key: 'general',
        kind: 'regular' as const,
        label: lang === 'he' ? 'לשיטתנו' : 'Our method',
        totalHarvested: numberFormatter.format(fieldReportDetailsPayload.totalHarvested),
        totalRejected: numberFormatter.format(fieldReportDetailsPayload.totalRejected),
        totalAfterRejected: numberFormatter.format(fieldReportDetailsPayload.totalAfterRejected),
        classifiedTotal: numberFormatter.format(fieldReportDetailsPayload.classifiedTotal),
        rejectionRate: formatRate(fieldReportDetailsPayload.rejectionRate),
      },
    ];

    if (fieldReportDetailsPayload.hasOwnerOverrides) {
      summaryRows.push({
        key: 'owner',
        kind: 'regular' as const,
        label: lang === 'he' ? 'לשיטת פרנקו' : 'Owner method',
        totalHarvested: numberFormatter.format(fieldReportDetailsPayload.ownerHarvested),
        totalRejected: numberFormatter.format(fieldReportDetailsPayload.ownerRejected),
        totalAfterRejected: numberFormatter.format(fieldReportDetailsPayload.ownerAfterRejected),
        classifiedTotal: t.dailyDetails.detailsPanel.values.none,
        rejectionRate: formatRate(fieldReportDetailsPayload.ownerRejectionRate),
      });

      summaryRows.push({
        key: 'difference',
        kind: 'summary' as const,
        label: lang === 'he' ? 'סה"כ הפרש' : 'Total difference',
        totalHarvested: numberFormatter.format(fieldReportDetailsPayload.differenceHarvested),
        totalRejected: numberFormatter.format(fieldReportDetailsPayload.differenceRejected),
        totalAfterRejected: numberFormatter.format(fieldReportDetailsPayload.differenceAfterRejected),
        classifiedTotal: t.dailyDetails.detailsPanel.values.none,
        rejectionRate: formatRate(fieldReportDetailsPayload.differenceRejectionRate),
      });
    }

    return {
      fieldName: fieldReportDetailsPayload.fieldName,
      seasonName: fieldReportDetailsPayload.seasonName || t.dailyDetails.detailsPanel.values.none,
      recordCount: fieldReportDetailsPayload.recordCount,
      summaryStatus,
      summaryRows,
      rows: fieldReportDetailsPayload.rows,
    };
  }, [fieldReportDetailsPayload, formatRate, lang, numberFormatter, t.dailyDetails.detailsPanel.values.none]);

  const detailsSheetData = useMemo(() => {
    if (!detailsRecord) {
      return null;
    }

    const labels = t.dailyDetails.detailsPanel.fields;
    const values = t.dailyDetails.detailsPanel.values;
    const isPartialClassification = isPartialClassificationFlag(detailsRecord.isPartialClassification as unknown);
    const seasonName = seasons.find((season) => season.id === detailsRecord.seasonId)?.yearName ?? values.none;
    const seasonRows = harvestRows
      .filter((row) => row.seasonId === detailsRecord.seasonId)
      .sort((a, b) => {
        const aTime = Date.parse(a.dateGregorian);
        const bTime = Date.parse(b.dateGregorian);

        if (!Number.isNaN(aTime) && !Number.isNaN(bTime) && aTime !== bTime) {
          return aTime - bTime;
        }

        return a.id - b.id;
      });
    const harvestIndexInSeason = seasonRows.findIndex((row) => row.id === detailsRecord.id);
    const harvestNumberDisplay =
      harvestIndexInSeason >= 0
        ? numberFormatter.format(harvestIndexInSeason + 1)
        : values.none;
    const hasOwnerRowData =
      detailsRecord.ownerHarvested > 0 ||
      detailsRecord.ownerRejected > 0 ||
      detailsRecord.ownerAfterRejected > 0 ||
      Number(detailsRecord.ownerRejectionRate) > 0;

    const summaryRows = [
      {
        key: 'general',
        kind: 'regular',
        label: values.generalRow,
        totalHarvested: numberFormatter.format(detailsRecord.totalHarvested),
        totalRejected: numberFormatter.format(detailsRecord.totalRejected),
        totalAfterRejected: numberFormatter.format(detailsRecord.totalAfterRejected),
        classifiedTotal: numberFormatter.format(detailsRecord.classifiedTotal),
        rejectionRate: formatRate(detailsRecord.rejectionRate),
      },
    ];

    if (hasOwnerRowData) {
      summaryRows.push({
        key: 'owner',
        kind: 'regular',
        label: values.ownerRow,
        totalHarvested: numberFormatter.format(detailsRecord.ownerHarvested),
        totalRejected: numberFormatter.format(detailsRecord.ownerRejected),
        totalAfterRejected: numberFormatter.format(detailsRecord.ownerAfterRejected),
        classifiedTotal: values.none,
        rejectionRate: formatRate(detailsRecord.ownerRejectionRate),
      });

      summaryRows.push({
        key: 'difference',
        kind: 'summary',
        label: values.differenceRow,
        totalHarvested: numberFormatter.format(detailsRecord.totalHarvested - detailsRecord.ownerHarvested),
        totalRejected: numberFormatter.format(detailsRecord.totalRejected - detailsRecord.ownerRejected),
        totalAfterRejected: numberFormatter.format(detailsRecord.totalAfterRejected - detailsRecord.ownerAfterRejected),
        classifiedTotal: values.none,
        rejectionRate: formatRate(toNumericValue(detailsRecord.rejectionRate) - toNumericValue(detailsRecord.ownerRejectionRate)),
      });
    }

    const summaryStatus = hasOwnerRowData
      ? lang === 'he'
        ? 'מיון חלקי'
        : 'Partial sorting'
      : lang === 'he'
        ? 'מיון סופי'
        : 'Final sorting';

    return {
      dateGregorian: formatGregorianDate(detailsRecord.dateGregorian),
      dateHebrew: detailsRecord.dateHebrew || values.none,
      seasonName,
      harvestNumber: harvestNumberDisplay,
      fieldName: detailsRecord.field?.name ?? values.none,
      updatedByName: detailsRecord.updatedBy?.name ?? values.none,
      statusLabel: `${values.statusPrefix} ${isPartialClassification ? values.partial : values.final}`,
      notes: detailsRecord.notes?.trim() || '',
      rows: summaryRows,
      labels,
      values,
    };
  }, [
    detailsRecord,
    formatGregorianDate,
    isPartialClassificationFlag,
    harvestRows,
    numberFormatter,
    seasons,
    t.dailyDetails.detailsPanel.fields,
    t.dailyDetails.detailsPanel.values,
  ]);

  const relatedSortingsLabels = t.dailyDetails.detailsPanel.relatedSortings;

  const getRelatedSortingAssignmentLabel = (assignmentType: string) => {
    if (assignmentType === 'TRADER') {
      return relatedSortingsLabels.assignmentTypes.trader;
    }

    if (assignmentType === 'CUSTOMER') {
      return relatedSortingsLabels.assignmentTypes.customer;
    }

    return relatedSortingsLabels.assignmentTypes.general;
  };

  const getRelatedSortingTarget = (row: ClassificationRecord) => {
    if (row.assignmentType === 'TRADER') {
      return row.trader?.name ?? detailsSheetData?.values.none ?? '-';
    }

    if (row.assignmentType === 'CUSTOMER') {
      return row.customer?.customerName ?? detailsSheetData?.values.none ?? '-';
    }

    return relatedSortingsLabels.assignmentTypes.general;
  };

  const getRelatedSortingCategory = (row: ClassificationRecord) => {
    if (row.customerCategory?.name) {
      return row.customerCategory.name;
    }

    if (row.traderCategory?.name) {
      return row.traderCategory.name;
    }

    return detailsSheetData?.values.none ?? '-';
  };

  const getRelatedSortingGrade = (row: ClassificationRecord) => {
    if (row.grade) {
      return row.grade;
    }

    if (row.customerCategory?.grade) {
      return row.customerCategory.grade;
    }

    return detailsSheetData?.values.none ?? '-';
  };

  const formatRelatedSortingText = (value?: string | null) => {
    if (!value) {
      return detailsSheetData?.values.none ?? '-';
    }

    const normalizedValue = value.replace(/\s+/g, '_').toUpperCase();

    if (normalizedValue === 'WITH_PITAM') {
      return relatedSortingsLabels.pitamValues.withPitam;
    }

    if (normalizedValue === 'WITHOUT_PITAM') {
      return relatedSortingsLabels.pitamValues.withoutPitam;
    }

    return value.replace(/_/g, ' ');
  };

  const getRelatedSortingNote = (row: ClassificationRecord) => row.notes?.trim() ?? '';

  const sortedRelatedSortings = useMemo(() => {
    const locale = lang === 'he' ? 'he' : 'en';

    const getAssignmentOrder = (assignmentType: string) => {
      if (assignmentType === 'GENERAL') {
        return 0;
      }

      if (assignmentType === 'TRADER') {
        return 1;
      }

      if (assignmentType === 'CUSTOMER') {
        return 2;
      }

      return 3;
    };

    const getCategoryNameForSort = (row: ClassificationRecord) => row.customerCategory?.name ?? row.traderCategory?.name ?? '';

    const getGradeForSort = (row: ClassificationRecord) => row.grade ?? row.customerCategory?.grade ?? '';

    return [...relatedSortings].sort((a, b) => {
      const assignmentDiff = getAssignmentOrder(a.assignmentType) - getAssignmentOrder(b.assignmentType);
      if (assignmentDiff !== 0) {
        return assignmentDiff;
      }

      const categoryDiff = getCategoryNameForSort(a).localeCompare(getCategoryNameForSort(b), locale, {
        sensitivity: 'base',
        numeric: true,
      });
      if (categoryDiff !== 0) {
        return categoryDiff;
      }

      return getGradeForSort(a).localeCompare(getGradeForSort(b), locale, {
        sensitivity: 'base',
        numeric: true,
      });
    });
  }, [lang, relatedSortings]);

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

  const addActionLabel = lang === 'he' ? 'הוסף קטיף' : 'Add Harvest';
  const addSortingActionLabel = lang === 'he' ? 'הוספת מיון' : 'Add Sorting';
  const editActionLabel = lang === 'he' ? 'עריכה' : 'Edit';
  const deleteActionLabel = lang === 'he' ? 'מחיקה' : 'Delete';

  const pageHeaderActions = isDailyDetailsTab ? (
    <div className="settings-seasons-header-buttons">
      <button
        type="button"
        className="settings-seasons-header-btn settings-seasons-header-btn--success"
        onClick={openHarvestGlobalForm}
        aria-label={addActionLabel}
      >
        <FaCirclePlus />
        <span>{addActionLabel}</span>
      </button>
      <button
        type="button"
        className="settings-seasons-header-btn settings-seasons-header-btn--success"
        onClick={() => void 0}
        disabled={!detailsRecord}
        aria-label={editActionLabel}
      >
        <FaPenToSquare />
        <span>{editActionLabel}</span>
      </button>
      <button
        type="button"
        className="settings-seasons-header-btn settings-seasons-header-btn--danger"
        onClick={() => void 0}
        disabled={!detailsRecord}
        aria-label={deleteActionLabel}
      >
        <FaTrashCan />
        <span>{deleteActionLabel}</span>
      </button>
    </div>
  ) : isFieldReportTab ? (
    <div className="settings-seasons-header-buttons">
      <button
        type="button"
        className="settings-seasons-header-btn settings-seasons-header-btn--success"
        onClick={openHarvestGlobalForm}
        aria-label={addActionLabel}
      >
        <FaCirclePlus />
        <span>{addActionLabel}</span>
      </button>
    </div>
  ) : isSortingDailyDetailsTab ? (
    <div className="settings-seasons-header-buttons">
      <button
        type="button"
        className="settings-seasons-header-btn settings-seasons-header-btn--success"
        onClick={openHarvestGlobalForm}
        aria-label={addSortingActionLabel}
      >
        <FaCirclePlus />
        <span>{addSortingActionLabel}</span>
      </button>
      <button
        type="button"
        className="settings-seasons-header-btn settings-seasons-header-btn--success"
        onClick={() => void 0}
        disabled={sortingDailyDetailsRowId === null}
        aria-label={editActionLabel}
      >
        <FaPenToSquare />
        <span>{editActionLabel}</span>
      </button>
      <button
        type="button"
        className="settings-seasons-header-btn settings-seasons-header-btn--danger"
        onClick={() => void 0}
        disabled={sortingDailyDetailsRowId === null}
        aria-label={deleteActionLabel}
      >
        <FaTrashCan />
        <span>{deleteActionLabel}</span>
      </button>
    </div>
  ) : null;

  const filters = useMemo<GlobalScopedFilterConfig[]>(() => {
    const seasonFilter: GlobalScopedFilterConfig = {
      key: 'seasonId',
      label: t.dailyDetails.filters.seasonFilterLabel,
      defaultValue: activeSeasonId ? String(activeSeasonId) : '',
      queryParam: 'hdSeason',
      options:
        seasons.length > 0
          ? seasons.map((season) => ({
              value: String(season.id),
              label: `${season.yearName}${season.isActive ? ` (${t.dailyDetails.filters.activeSeasonBadge})` : ''}`,
            }))
          : [{ value: '', label: t.dailyDetails.filters.noActiveSeason }],
    };

    const fieldFilter: GlobalScopedFilterConfig = {
      key: 'fieldId',
      label: isSortingDailyDetailsTab
        ? t.sortingDailyDetails.filters.fieldFilterLabel
        : t.dailyDetails.filters.fieldFilterLabel,
      defaultValue: 'all',
      queryParam: 'hdField',
      options: [
        {
          value: 'all',
          label: isSortingDailyDetailsTab
            ? t.sortingDailyDetails.filters.allFieldsOption
            : t.dailyDetails.filters.allFieldsOption,
        },
        ...fields.map((field) => ({
          value: String(field.id),
          label: field.name,
        })),
      ],
    };

    if (isFieldReportTab) {
      return [seasonFilter];
    }

    if (isSortingDailyDetailsTab) {
      return [
        seasonFilter,
        fieldFilter,
        {
          key: 'sortingAssignmentType',
          label: t.sortingDailyDetails.filters.assignmentFilterLabel,
          defaultValue: 'all',
          queryParam: 'sdAssign',
          options: sortingAssignmentFilterOptions,
        },
      ];
    }

    return [
      seasonFilter,
      fieldFilter,
    ];
  }, [
    activeSeasonId,
    fields,
    isFieldReportTab,
    isSortingDailyDetailsTab,
    seasons,
    sortingAssignmentFilterOptions,
    t.dailyDetails.filters,
    t.sortingDailyDetails.filters,
  ]);

  const handlePrintDetails = () => {
    const printableNode = detailsPrintRef.current;
    if (!printableNode) {
      return;
    }
    openPrintableWindow({
      title: t.dailyDetails.detailsPanel.title,
      heading: lang === 'he' ? 'פרטי קטיף' : 'Harvest Details',
      direction: lang === 'he' ? 'rtl' : 'ltr',
      html: printableNode.outerHTML,
      width: 900,
      height: 700,
      extraStyles: `
        .harvest-daily-workspace__print-content {
          max-width: 1180px;
          margin: 0 auto;
          display: grid;
          gap: 14px;
        }
        .harvest-daily-workspace__sheet-card {
          border: 1px solid #cfdcd2;
          border-radius: 12px;
          background: #fff;
          padding: 12px;
          display: grid;
          gap: 12px;
        }
        .harvest-daily-workspace__sheet-head {
          display: flex;
          flex-direction: column;
          gap: 6px;
          align-items: stretch;
          direction: ltr;
          text-align: left;
          color: #243f2b;
          font-weight: 600;
        }
        .harvest-daily-workspace__sheet-head p {
          margin: 0;
          width: 100%;
          max-width: 100%;
          direction: inherit;
          unicode-bidi: plaintext;
        }
        html[dir='rtl'] .harvest-daily-workspace__sheet-head {
          direction: rtl;
          text-align: right;
        }
        .harvest-daily-workspace__sheet-status {
          justify-self: center;
          border: 1px solid #b7cdbf;
          background: #f1f8f3;
          color: #1f4f29;
          font-weight: 800;
          padding: 4px 12px;
          border-radius: 999px;
        }
        .harvest-daily-workspace__sheet-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: 12px;
        }
        .harvest-daily-workspace__sheet-table th,
        .harvest-daily-workspace__sheet-table td {
          border: 1px solid #ccd9cf;
          padding: 6px;
          text-align: center;
          vertical-align: middle;
        }
        .harvest-daily-workspace__sheet-table th {
          background: #f1f7f3;
          color: #284f31;
          font-weight: 700;
          white-space: nowrap;
        }
        .harvest-daily-workspace__sheet-row--summary {
          background: #e7f2eb !important;
        }
        .harvest-daily-workspace__sheet-row--summary td {
          font-weight: 800;
          color: #1f4f29;
        }
        .harvest-daily-workspace__sheet-note {
          margin: 0;
          color: #2f4536;
          line-height: 1.45;
          border-top: 1px dashed #d0dcd3;
          padding-top: 8px;
        }
        .harvest-daily-workspace__related-sortings-card {
          border-radius: 12px;
          background: #fff;
          padding: 12px;
          display: grid;
          gap: 10px;
        }
        .harvest-daily-workspace__related-sortings-title {
          margin: 0;
          color: #214f2a;
          font-size: 16px;
        }
        .harvest-daily-workspace__related-sortings-table-wrap {
          overflow: visible;
        }
        .harvest-daily-workspace__related-sortings-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: 12px;
        }
        .harvest-daily-workspace__related-sortings-table th,
        .harvest-daily-workspace__related-sortings-table td {
          border: 1px solid #ccd9cf;
          padding: 6px;
          text-align: center;
          vertical-align: middle;
        }
        .harvest-daily-workspace__related-sortings-table th {
          background: #f1f7f3;
          color: #284f31;
          font-weight: 700;
        }
        .harvest-daily-workspace__related-sortings-table tbody tr:nth-child(even) {
          background: #f8fcf9;
        }
        .harvest-daily-workspace__related-sorting-note {
          display: inline;
        }
        .harvest-daily-workspace__related-sorting-note-bubble,
        .harvest-daily-workspace__related-sorting-note-tooltip {
          display: none !important;
        }
        .harvest-daily-workspace__related-sorting-note::after {
          content: attr(aria-label);
          color: #2f4536;
          white-space: pre-wrap;
        }
      `,
    });
  };

  const handlePrintFieldReportDetails = () => {
    const printableNode = fieldReportDetailsPrintRef.current;
    if (!printableNode) {
      return;
    }

    openPrintableWindow({
      title: fieldReportDetailsData ? `${lang === 'he' ? 'פרטי שדה' : 'Field Details'} - ${fieldReportDetailsData.fieldName}` : t.dailyDetails.detailsPanel.title,
      heading: lang === 'he' ? 'פרטי שדה' : 'Field Details',
      direction: lang === 'he' ? 'rtl' : 'ltr',
      html: printableNode.outerHTML,
      extraStyles: `
        .harvest-daily-workspace__sheet-card {
          border: 1px solid #cfdcd2;
          border-radius: 12px;
          background: #fff;
          padding: 12px;
          display: grid;
          gap: 12px;
        }
        .harvest-daily-workspace__sheet-head {
          display: flex;
          flex-direction: column;
          gap: 6px;
          align-items: stretch;
          direction: ltr;
          text-align: left;
          color: #243f2b;
          font-weight: 600;
        }
        .harvest-daily-workspace__sheet-head p {
          margin: 0;
          width: 100%;
          max-width: 100%;
          direction: inherit;
          unicode-bidi: plaintext;
        }
        html[dir='rtl'] .harvest-daily-workspace__sheet-head {
          direction: rtl;
          text-align: right;
        }
        .harvest-daily-workspace__sheet-status {
          justify-self: center;
          border: 1px solid #b7cdbf;
          background: #f1f8f3;
          color: #1f4f29;
          font-weight: 800;
          padding: 4px 12px;
          border-radius: 999px;
        }
        .harvest-daily-workspace__sheet-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: 12px;
        }
        .harvest-daily-workspace__sheet-table th,
        .harvest-daily-workspace__sheet-table td {
          border: 1px solid #ccd9cf;
          padding: 6px;
          text-align: center;
          vertical-align: middle;
        }
        .harvest-daily-workspace__sheet-table th {
          background: #f1f7f3;
          color: #284f31;
          font-weight: 700;
          white-space: nowrap;
        }
        .harvest-daily-workspace__sheet-table th:first-child,
        .harvest-daily-workspace__sheet-table td:first-child {
          font-weight: 700;
          background: #f6fbf8;
          min-width: 88px;
        }
        .harvest-daily-workspace__sheet-table tbody tr:nth-child(even) {
          background: #f8fcf9;
        }
        .harvest-daily-workspace__related-sortings-card {
          border-radius: 12px;
          background: #fff;
          padding: 12px;
          display: grid;
          gap: 10px;
        }
        .harvest-daily-workspace__related-sortings-title {
          margin: 0;
          color: #214f2a;
          font-size: 16px;
        }
        .harvest-daily-workspace__related-sortings-table-wrap {
          overflow: visible;
        }
        .harvest-daily-workspace__related-sortings-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: 12px;
        }
        .harvest-daily-workspace__related-sortings-table th,
        .harvest-daily-workspace__related-sortings-table td {
          border: 1px solid #ccd9cf;
          padding: 6px;
          text-align: center;
          vertical-align: middle;
        }
        .harvest-daily-workspace__related-sortings-table th {
          background: #f1f7f3;
          color: #284f31;
          font-weight: 700;
        }
        .harvest-daily-workspace__related-sortings-table tbody tr:nth-child(even) {
          background: #f8fcf9;
        }
        .harvest-daily-workspace__related-sorting-note {
          display: inline;
        }
        .harvest-daily-workspace__related-sorting-note-bubble,
        .harvest-daily-workspace__related-sorting-note-tooltip {
          display: none !important;
        }
        .harvest-daily-workspace__related-sorting-note::after {
          content: attr(aria-label);
          color: #2f4536;
          white-space: pre-wrap;
        }
        .global-left-details-panel {
          position: static !important;
          transform: none !important;
          width: 100% !important;
          min-width: 0 !important;
          height: auto !important;
          box-shadow: none !important;
          border: 1px solid #d2ded6;
        }
        .global-left-details-panel__header-actions,
        .global-left-details-panel__close {
          display: none !important;
        }
        .global-left-details-panel__body {
          overflow: visible !important;
        }
        .global-data-table__viewport {
          overflow: visible !important;
        }
        .global-data-table__header,
        .global-data-table__body,
        .global-data-table__row {
          width: 100% !important;
          min-width: 0 !important;
        }
      `,
    });
  };

  const handlePrintSortingDailyDetails = () => {
    const printableNode = sortingDailyDetailsPrintRef.current;
    if (!printableNode) {
      return;
    }

    openPrintableWindow({
      title: lang === 'he' ? 'פרטי מיון יומי' : 'Daily Sorting Details',
      heading: lang === 'he' ? 'פרטי מיון יומי' : 'Daily Sorting Details',
      direction: lang === 'he' ? 'rtl' : 'ltr',
      html: printableNode.outerHTML,
      extraStyles: `
        .harvest-daily-workspace__print-content {
          max-width: 1180px;
          margin: 0 auto;
          display: grid;
          gap: 14px;
        }
        .harvest-daily-workspace__sheet-card {
          border: 1px solid #cfdcd2;
          border-radius: 12px;
          background: #fff;
          padding: 12px;
          display: grid;
          gap: 12px;
        }
        .harvest-daily-workspace__sheet-card--borderless {
          border: 0;
          border-radius: 0;
          background: transparent;
          padding: 0;
        }
        .harvest-daily-workspace__sheet-card--category-breakdown::before {
          content: '';
          display: block;
          width: 100%;
          border-top: 1px solid #d4dfd7;
          margin-bottom: 12px;
        }
        .harvest-daily-workspace__sheet-head {
          display: flex;
          flex-direction: column;
          gap: 6px;
          align-items: stretch;
          direction: ltr;
          text-align: left;
          color: #243f2b;
          font-weight: 600;
        }
        .harvest-daily-workspace__sheet-head p {
          margin: 0;
          width: 100%;
          max-width: 100%;
          direction: inherit;
          unicode-bidi: plaintext;
        }
        html[dir='rtl'] .harvest-daily-workspace__sheet-head {
          direction: rtl;
          text-align: right;
        }
        .harvest-daily-workspace__sheet-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: 12px;
        }
        .harvest-daily-workspace__sheet-table th,
        .harvest-daily-workspace__sheet-table td {
          border: 1px solid #ccd9cf;
          padding: 6px;
          text-align: center;
          vertical-align: middle;
        }
        .harvest-daily-workspace__sheet-table th {
          background: #f1f7f3;
          color: #284f31;
          font-weight: 700;
          white-space: nowrap;
        }
        .harvest-daily-workspace__sheet-row--summary {
          background: #e7f2eb !important;
        }
        .harvest-daily-workspace__sheet-row--summary td {
          font-weight: 800;
          color: #1f4f29;
        }
        .harvest-daily-workspace__related-sortings-title {
          margin: 0;
          color: #214f2a;
          font-size: 16px;
        }
      `,
    });
  };

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
        <section className="settings-workspace harvest-daily-workspace">
          <header className="settings-workspace__header">
            <div>
              <p className="settings-workspace__description">{t.dailyDetails.description}</p>
            </div>
          </header>

          <GlobalScopedFilters
            scope={HARVEST_DAILY_FILTER_SCOPE}
            filters={filters}
            direction={lang === 'he' ? 'rtl' : 'ltr'}
            actions={
              <div className="global-filters-bar__icon-actions" aria-label={lang === 'he' ? 'פעולות טבלה' : 'Table actions'}>
                <button
                  type="button"
                  className="global-filters-bar__icon-btn"
                  onClick={handlePrintHarvestTable}
                  aria-label={lang === 'he' ? 'הדפסת טבלת הקטיפים' : 'Print harvest table'}
                  title={lang === 'he' ? 'הדפסה' : 'Print'}
                >
                  <FaPrint />
                </button>
                <button
                  type="button"
                  className="global-filters-bar__icon-btn"
                  onClick={() => {
                    void handleExportHarvestTableToExcel();
                  }}
                  aria-label={lang === 'he' ? 'יצוא טבלת הקטיפים לאקסל' : 'Export harvest table to Excel'}
                  title={lang === 'he' ? 'יצוא לאקסל' : 'Export to Excel'}
                >
                  <FaFileArrowDown />
                </button>
              </div>
            }
          />

          {harvestLoadError ? <p className="seasons-manager__error">{harvestLoadError}</p> : null}

          <div className="settings-panel-wide harvest-daily-workspace__panel">
            {isHarvestLoading ? <p className="seasons-manager__state">{t.dailyDetails.loading}</p> : null}

            {!isHarvestLoading ? (
              <>
                <GlobalDataTable
                  columns={columns}
                  rows={filteredHarvestRows}
                  getRowKey={(row) => row.id}
                  emptyLabel={t.dailyDetails.empty}
                  defaultSortState={{ key: 'dateGregorian', direction: 'desc' }}
                  onSortedRowsChange={(rows) => {
                    visibleHarvestRowsRef.current = rows;
                  }}
                />

                <GlobalLeftDetailsPanel
                  isOpen={detailsRecord !== null}
                  title={t.dailyDetails.detailsPanel.title}
                  closeLabel={t.dailyDetails.detailsPanel.close}
                  onClose={() => setDetailsRecord(null)}
                  headerActions={
                    <button
                      type="button"
                      className="global-left-details-panel__print"
                      onClick={handlePrintDetails}
                    >
                      <FaPrint aria-hidden="true" />
                      <span>{t.dailyDetails.detailsPanel.print}</span>
                    </button>
                  }
                >
                  {detailsSheetData ? (
                    <>
                      <div className="harvest-daily-workspace__print-content" ref={detailsPrintRef}>
                        <div className="harvest-daily-workspace__sheet-card">
                          <div className="harvest-daily-workspace__sheet-head">
                            <p>{detailsSheetData.dateGregorian}</p>
                            <p>{detailsSheetData.dateHebrew}</p>
                            <p>
                              <strong>{detailsSheetData.labels.season}:</strong> {detailsSheetData.seasonName}
                            </p>
                            <p>
                              <strong>{detailsSheetData.labels.harvestNumber}:</strong> {detailsSheetData.harvestNumber}
                            </p>
                            <p>
                              <strong>{detailsSheetData.labels.updatedBy}:</strong> {detailsSheetData.updatedByName}
                            </p>
                            <p>
                              <strong>{detailsSheetData.labels.field}:</strong> {detailsSheetData.fieldName}
                            </p>
                          </div>

                          <div className="harvest-daily-workspace__sheet-status">{detailsSheetData.statusLabel}</div>

                          <table className="harvest-daily-workspace__sheet-table">
                            <thead>
                              <tr>
                                <th aria-label={detailsSheetData.values.rowType} />
                                <th>{detailsSheetData.labels.totalHarvested}</th>
                                <th>{detailsSheetData.labels.totalRejected}</th>
                                <th>{detailsSheetData.labels.totalAfterRejected}</th>
                                <th>{detailsSheetData.labels.classifiedTotal}</th>
                                <th>{detailsSheetData.labels.rejectionRate}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {detailsSheetData.rows.map((row) => (
                                <tr key={row.key} className={row.kind === 'summary' ? 'harvest-daily-workspace__sheet-row--summary' : undefined}>
                                  <td>{row.label}</td>
                                  <td>{row.totalHarvested}</td>
                                  <td>{row.totalRejected}</td>
                                  <td>{row.totalAfterRejected}</td>
                                  <td>{row.classifiedTotal}</td>
                                  <td>{row.rejectionRate}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>

                          {detailsSheetData.notes ? (
                            <p className="harvest-daily-workspace__sheet-note">
                              <strong>{detailsSheetData.labels.notes}:</strong> {detailsSheetData.notes}
                            </p>
                          ) : null}
                        </div>

                        <div className="harvest-daily-workspace__related-sortings-card">
                        <h4 className="harvest-daily-workspace__related-sortings-title">{relatedSortingsLabels.title}</h4>

                        {isRelatedSortingsLoading ? (
                          <p className="harvest-daily-workspace__related-sortings-state">{relatedSortingsLabels.loading}</p>
                        ) : relatedSortingsLoadError ? (
                          <p className="harvest-daily-workspace__related-sortings-state is-error">{relatedSortingsLoadError}</p>
                        ) : relatedSortings.length === 0 ? (
                          <p className="harvest-daily-workspace__related-sortings-state">{relatedSortingsLabels.empty}</p>
                        ) : (
                          <div className="harvest-daily-workspace__related-sortings-table-wrap">
                            <table className="harvest-daily-workspace__related-sortings-table">
                              <colgroup>
                                <col className="harvest-daily-workspace__related-sortings-col--assignment-type" />
                                <col className="harvest-daily-workspace__related-sortings-col--target" />
                                <col className="harvest-daily-workspace__related-sortings-col--category" />
                                <col className="harvest-daily-workspace__related-sortings-col--grade" />
                                <col className="harvest-daily-workspace__related-sortings-col--pitam" />
                                <col className="harvest-daily-workspace__related-sortings-col--quantity" />
                                <col className="harvest-daily-workspace__related-sortings-col--updated-by" />
                                <col className="harvest-daily-workspace__related-sortings-col--notes" />
                              </colgroup>
                              <thead>
                                <tr>
                                  <th>{relatedSortingsLabels.columns.assignmentType}</th>
                                  <th>{relatedSortingsLabels.columns.target}</th>
                                  <th>{relatedSortingsLabels.columns.category}</th>
                                  <th>{relatedSortingsLabels.columns.grade}</th>
                                  <th>{relatedSortingsLabels.columns.pitamStatus}</th>
                                  <th>{relatedSortingsLabels.columns.quantity}</th>
                                  <th>{relatedSortingsLabels.columns.updatedBy}</th>
                                  <th>{relatedSortingsLabels.columns.notes}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {sortedRelatedSortings.map((row, rowIndex) => {
                                  const note = getRelatedSortingNote(row);

                                  return (
                                    <tr key={row.id}>
                                      <td>{getRelatedSortingAssignmentLabel(row.assignmentType)}</td>
                                      <td>{getRelatedSortingTarget(row)}</td>
                                      <td>{getRelatedSortingCategory(row)}</td>
                                      <td>{getRelatedSortingGrade(row)}</td>
                                      <td>{formatRelatedSortingText(row.pitamStatus)}</td>
                                      <td>{numberFormatter.format(row.quantity)}</td>
                                      <td>{row.updatedBy?.name ?? detailsSheetData.values.none}</td>
                                      <td>
                                        {note ? (
                                          <span
                                            className={`harvest-daily-workspace__related-sorting-note${rowIndex === 0 ? ' is-first-row' : ''}`}
                                            tabIndex={0}
                                            aria-label={note}
                                          >
                                            <span className="harvest-daily-workspace__related-sorting-note-bubble" aria-hidden="true" />
                                            <span className="harvest-daily-workspace__related-sorting-note-tooltip">{note}</span>
                                          </span>
                                        ) : null}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="harvest-daily-workspace__details-empty">{t.dailyDetails.detailsPanel.empty}</p>
                  )}
                </GlobalLeftDetailsPanel>

                {selectedCellsCount > 0 ? (
                  <div className="harvest-daily-workspace__selection-summary" role="status" aria-live="polite">
                    <span>{t.dailyDetails.selection.selectedCells(selectedCellsCount)}</span>
                    <span>{t.dailyDetails.selection.total(formattedSelectedTotal)}</span>
                    <button
                      type="button"
                      className="harvest-daily-workspace__selection-clear"
                      onClick={() => setSelectedNumericCells({})}
                    >
                      {t.dailyDetails.selection.clear}
                    </button>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        </section>
      ) : isFieldReportTab ? (
        <section className="settings-workspace harvest-daily-workspace">
          <header className="settings-workspace__header">
            <div>
              <p className="settings-workspace__description">{content.description}</p>
            </div>
          </header>

          <GlobalScopedFilters
            scope={HARVEST_DAILY_FILTER_SCOPE}
            filters={filters}
            direction={lang === 'he' ? 'rtl' : 'ltr'}
            actions={
              <div className="global-filters-bar__icon-actions" aria-label={lang === 'he' ? 'פעולות טבלה' : 'Table actions'}>
                <button
                  type="button"
                  className="global-filters-bar__icon-btn"
                  onClick={handlePrintFieldReportTable}
                  aria-label={lang === 'he' ? 'הדפסת דוח השדות' : 'Print field report table'}
                  title={lang === 'he' ? 'הדפסה' : 'Print'}
                >
                  <FaPrint />
                </button>
                <button
                  type="button"
                  className="global-filters-bar__icon-btn"
                  onClick={() => {
                    void handleExportFieldReportTableToCsv();
                  }}
                  aria-label={lang === 'he' ? 'יצוא דוח השדות לאקסל' : 'Export field report to Excel'}
                  title={lang === 'he' ? 'יצוא לאקסל' : 'Export to Excel'}
                >
                  <FaFileArrowDown />
                </button>
              </div>
            }
          />

          {harvestLoadError ? <p className="seasons-manager__error">{harvestLoadError}</p> : null}

          <div className="settings-panel-wide harvest-daily-workspace__panel">
            {isHarvestLoading ? <p className="seasons-manager__state">{t.dailyDetails.loading}</p> : null}

            {!isHarvestLoading ? (
              <>
                <GlobalDataTable
                  columns={fieldReportColumns}
                  rows={fieldReportRows}
                  getRowKey={(row) => row.id}
                  emptyLabel={t.dailyDetails.empty}
                  defaultSortState={{ key: 'fieldName', direction: 'asc' }}
                  onSortedRowsChange={(rows) => {
                    visibleFieldReportRowsRef.current = rows;
                  }}
                />

                <GlobalLeftDetailsPanel
                  isOpen={fieldReportDetailsData !== null}
                  title={
                    fieldReportDetailsData
                      ? `${lang === 'he' ? 'פרטי שדה' : 'Field Details'} - ${fieldReportDetailsData.fieldName}`
                      : lang === 'he'
                        ? 'פרטי שדה'
                        : 'Field Details'
                  }
                  closeLabel={lang === 'he' ? 'סגירת פרטי שדה' : 'Close field details'}
                  onClose={() => setFieldReportDetailsFieldId(null)}
                  headerActions={
                    <button
                      type="button"
                      className="global-left-details-panel__print"
                      onClick={handlePrintFieldReportDetails}
                    >
                      <FaPrint aria-hidden="true" />
                      <span>{lang === 'he' ? 'הדפסה' : 'Print'}</span>
                    </button>
                  }
                >
                  {fieldReportDetailsData ? (
                    <div ref={fieldReportDetailsPrintRef} className="harvest-daily-workspace__print-content">
                      <HarvestFieldReportDetailsPanel
                        data={fieldReportDetailsData}
                        locale={lang === 'he' ? 'he-IL' : 'en-GB'}
                        labels={{
                          rowType: lang === 'he' ? 'שורה' : 'Row',
                          rowsTitle: lang === 'he' ? 'רשומות' : 'Records',
                          season: t.dailyDetails.detailsPanel.fields.season,
                          field: t.dailyDetails.detailsPanel.fields.field,
                          recordCount: lang === 'he' ? 'מספר קטיפים' : 'Harvest count',
                          dateGregorian: t.dailyDetails.columns.dateGregorian,
                          dateHebrew: t.dailyDetails.columns.dateHebrew,
                          totalHarvested: t.dailyDetails.columns.totalHarvested,
                          totalRejected: t.dailyDetails.columns.totalRejected,
                          netHarvest: t.dailyDetails.columns.netHarvest,
                          classifiedTotal: t.dailyDetails.columns.classifiedTotal,
                          rejectionRate: t.dailyDetails.detailsPanel.fields.rejectionRate,
                          updatedBy: t.dailyDetails.detailsPanel.fields.updatedBy,
                          notes: t.dailyDetails.detailsPanel.fields.notes,
                          none: t.dailyDetails.detailsPanel.values.none,
                          emptyRows: t.dailyDetails.empty,
                        }}
                      />
                    </div>
                  ) : (
                    <p className="harvest-daily-workspace__details-empty">{t.dailyDetails.detailsPanel.empty}</p>
                  )}
                </GlobalLeftDetailsPanel>

                {selectedCellsCount > 0 ? (
                  <div className="harvest-daily-workspace__selection-summary" role="status" aria-live="polite">
                    <span>{t.dailyDetails.selection.selectedCells(selectedCellsCount)}</span>
                    <span>{t.dailyDetails.selection.total(formattedSelectedTotal)}</span>
                    <button
                      type="button"
                      className="harvest-daily-workspace__selection-clear"
                      onClick={() => setSelectedNumericCells({})}
                    >
                      {t.dailyDetails.selection.clear}
                    </button>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        </section>
      ) : isSortingDailyDetailsTab ? (
        <section className="settings-workspace harvest-daily-workspace">
          <header className="settings-workspace__header">
            <div>
              <p className="settings-workspace__description">{t.sortingDailyDetails.description}</p>
            </div>
          </header>

          <GlobalScopedFilters
            scope={HARVEST_DAILY_FILTER_SCOPE}
            filters={filters}
            direction={lang === 'he' ? 'rtl' : 'ltr'}
            actions={
              <div className="global-filters-bar__icon-actions" aria-label={lang === 'he' ? 'פעולות טבלה' : 'Table actions'}>
                <button
                  type="button"
                  className="global-filters-bar__icon-btn"
                  onClick={() => {
                    void handlePrintSortingDailyTable('summary');
                  }}
                  aria-label={lang === 'he' ? 'הדפסת טבלת המיון היומי' : 'Print daily sorting table'}
                  title={lang === 'he' ? 'הדפסה' : 'Print'}
                >
                  <FaPrint />
                </button>

                <details
                  className="global-filters-bar__icon-menu"
                  onMouseEnter={cancelSortingDownloadMenuClose}
                  onMouseLeave={(event) => {
                    scheduleSortingDownloadMenuClose(event.currentTarget);
                  }}
                >
                  <summary
                    className="global-filters-bar__icon-btn"
                    aria-label={lang === 'he' ? 'יצוא טבלת המיון היומי לאקסל' : 'Export daily sorting table to Excel'}
                    title={lang === 'he' ? 'יצוא לאקסל' : 'Export to Excel'}
                  >
                    <FaFileArrowDown />
                  </summary>
                  <div className="global-filters-bar__menu-list" role="menu">
                    <button
                      type="button"
                      className="global-filters-bar__menu-item"
                      onClick={(event) => {
                        closeSortingActionMenu(event.currentTarget);
                        void handleExportSortingDailyTableToCsv('summary');
                      }}
                    >
                      {lang === 'he' ? 'הורדה רגילה' : 'Standard download'}
                    </button>
                    <button
                      type="button"
                      className="global-filters-bar__menu-item"
                      onClick={(event) => {
                        closeSortingActionMenu(event.currentTarget);
                        void handleExportSortingDailyTableToCsv('expanded');
                      }}
                    >
                      {lang === 'he' ? 'הורדה מורחבת' : 'Expanded download'}
                    </button>
                  </div>
                </details>
              </div>
            }
          />

          {sortingDailyLoadError ? <p className="seasons-manager__error">{sortingDailyLoadError}</p> : null}

          <div className="settings-panel-wide harvest-daily-workspace__panel">
            {isSortingDailyLoading ? <p className="seasons-manager__state">{t.sortingDailyDetails.loading}</p> : null}

            {!isSortingDailyLoading ? (
              <>
                <GlobalDataTable
                  columns={sortingDailyColumns}
                  rows={filteredSortingDailyRows}
                  getRowKey={(row) => row.harvestId}
                  emptyLabel={t.sortingDailyDetails.empty}
                  defaultSortState={{ key: 'dateGregorian', direction: 'desc' }}
                  onSortedRowsChange={(rows) => {
                    visibleSortingDailyRowsRef.current = rows;
                  }}
                />

                <GlobalLeftDetailsPanel
                  isOpen={sortingDailyDetailsData !== null}
                  title={lang === 'he' ? 'פרטי מיון יומי' : 'Daily Sorting Details'}
                  closeLabel={lang === 'he' ? 'סגירת פרטי מיון יומי' : 'Close daily sorting details'}
                  onClose={() => setSortingDailyDetailsRowId(null)}
                  headerActions={
                    <button
                      type="button"
                      className="global-left-details-panel__print"
                      onClick={handlePrintSortingDailyDetails}
                    >
                      <FaPrint aria-hidden="true" />
                      <span>{lang === 'he' ? 'הדפסה' : 'Print'}</span>
                    </button>
                  }
                >
                  {sortingDailyDetailsData ? (
                    <div className="harvest-daily-workspace__print-content" ref={sortingDailyDetailsPrintRef}>
                      <div className="harvest-daily-workspace__sheet-card">
                        <div className="harvest-daily-workspace__sheet-head">
                          <p>
                            <strong>{t.sortingDailyDetails.columns.dateGregorian}:</strong>{' '}
                            {formatGregorianDate(sortingDailyDetailsData.row.dateGregorian)}
                          </p>
                          <p>
                            <strong>{t.sortingDailyDetails.columns.dateHebrew}:</strong>{' '}
                            {sortingDailyDetailsData.row.dateHebrew}
                          </p>
                          <p>
                            <strong>{t.sortingDailyDetails.columns.fieldName}:</strong> {sortingDailyDetailsData.row.fieldName}
                          </p>
                        </div>

                        <table className="harvest-daily-workspace__sheet-table" style={{ marginTop: 18 }}>
                          <thead>
                            <tr>
                              <th>{lang === 'he' ? 'קטגוריה' : 'Category'}</th>
                              <th>{lang === 'he' ? 'כמות' : 'Quantity'}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sortingDailyDetailsData.rowCategories.length === 0 ? (
                              <tr>
                                <td colSpan={2}>{t.sortingDailyDetails.empty}</td>
                              </tr>
                            ) : (
                              sortingDailyDetailsData.rowCategories.map((category) => (
                                <tr key={`sorting-details-${sortingDailyDetailsData.row.harvestId}-${category.key}`}>
                                  <td>{category.label}</td>
                                  <td>{numberFormatter.format(category.value)}</td>
                                </tr>
                              ))
                            )}

                            <tr className="harvest-daily-workspace__sheet-row--summary">
                              <td>{lang === 'he' ? 'סה"כ יומי' : 'Daily Total'}</td>
                              <td>{numberFormatter.format(sortingDailyDetailsData.rowDailyTotal)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {isSortingDailyDetailRowsLoading ? (
                        <p className="harvest-daily-workspace__details-empty" style={{ marginTop: 14 }}>
                          {lang === 'he' ? 'טוען פירוט קטגוריות...' : 'Loading category breakdown...'}
                        </p>
                      ) : null}

                      {sortingDailyDetailRowsLoadError ? (
                        <p className="harvest-daily-workspace__details-error" style={{ marginTop: 14 }}>
                          {sortingDailyDetailRowsLoadError}
                        </p>
                      ) : null}

                      {!isSortingDailyDetailRowsLoading && !sortingDailyDetailRowsLoadError ? (
                        sortingDailyCategoryBreakdown.length > 0 ? (
                          sortingDailyCategoryBreakdown.map((category) => (
                            <div
                              key={`sorting-details-breakdown-${sortingDailyDetailsData.row.harvestId}-${category.label}`}
                              className="harvest-daily-workspace__sheet-card harvest-daily-workspace__sheet-card--borderless harvest-daily-workspace__sheet-card--category-breakdown"
                              style={{ marginTop: 14 }}
                            >
                              <h4 className="harvest-daily-workspace__related-sortings-title" style={{ marginTop: 0 }}>
                                {category.label}
                                <span style={{ marginInlineStart: 8 }}>
                                  ({numberFormatter.format(category.total)})
                                </span>
                              </h4>

                              <table className="harvest-daily-workspace__sheet-table" style={{ marginTop: 12 }}>
                                <thead>
                                  <tr>
                                    <th>{lang === 'he' ? 'דרגה' : 'Grade'}</th>
                                    {category.pitamHeaders.map((header) => (
                                      <th key={`sorting-details-pitam-header-${category.label}-${header.key}`}>
                                        {header.label} ({numberFormatter.format(header.total)})
                                      </th>
                                    ))}
                                    <th>{lang === 'he' ? 'סה"כ' : 'Total'}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {category.gradeRows.length === 0 ? (
                                    <tr>
                                      <td colSpan={category.pitamHeaders.length + 2}>{t.sortingDailyDetails.empty}</td>
                                    </tr>
                                  ) : (
                                    category.gradeRows.map((gradeRow) => (
                                      <tr key={`sorting-details-grade-row-${category.label}-${gradeRow.grade}`}>
                                        <td>{gradeRow.grade}</td>
                                        {category.pitamHeaders.map((header) => (
                                          <td key={`sorting-details-grade-cell-${category.label}-${gradeRow.grade}-${header.key}`}>
                                            {numberFormatter.format(gradeRow.values[header.key] ?? 0)}
                                          </td>
                                        ))}
                                        <td>{numberFormatter.format(gradeRow.total)}</td>
                                      </tr>
                                    ))
                                  )}

                                  <tr className="harvest-daily-workspace__sheet-row--summary">
                                    <td>{lang === 'he' ? 'סה"כ' : 'Total'}</td>
                                    {category.pitamHeaders.map((header) => (
                                      <td key={`sorting-details-summary-${category.label}-${header.key}`}>
                                        {numberFormatter.format(header.total)}
                                      </td>
                                    ))}
                                    <td>{numberFormatter.format(category.total)}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          ))
                        ) : (
                          <p className="harvest-daily-workspace__details-empty" style={{ marginTop: 14 }}>
                            {lang === 'he' ? 'אין פירוט קטגוריות להצגה.' : 'No category breakdown available.'}
                          </p>
                        )
                      ) : null}
                    </div>
                  ) : (
                    <p className="harvest-daily-workspace__details-empty">{t.sortingDailyDetails.empty}</p>
                  )}
                </GlobalLeftDetailsPanel>

                {selectedCellsCount > 0 ? (
                  <div className="harvest-daily-workspace__selection-summary" role="status" aria-live="polite">
                    <span>{t.dailyDetails.selection.selectedCells(selectedCellsCount)}</span>
                    <span>{t.dailyDetails.selection.total(formattedSelectedTotal)}</span>
                    <button
                      type="button"
                      className="harvest-daily-workspace__selection-clear"
                      onClick={() => setSelectedNumericCells({})}
                    >
                      {t.dailyDetails.selection.clear}
                    </button>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        </section>
      ) : (
        <section className="shipments-empty-state">
          <h2 className="shipments-empty-title">{content.title}</h2>
          <p className="shipments-empty-desc">{content.description}</p>
        </section>
      )}

      {isHarvestFormOpen ? (
        <div className="modal-overlay" onClick={closeHarvestGlobalForm}>
          <div
            className="modal-dialog modal-dialog--form harvest-bulk-form-modal"
            role="dialog"
            aria-modal="true"
            aria-label={lang === 'he' ? 'טופס קטיף גלובאלי' : 'Global harvest form'}
            onClick={(event) => event.stopPropagation()}
          >
            <button className="modal-close" type="button" aria-label={lang === 'he' ? 'סגירה' : 'Close'} onClick={closeHarvestGlobalForm}>
              X
            </button>

            <h3 className="modal-title">{lang === 'he' ? 'הוספת קטיף ומיון' : 'Add Harvest and Sorting'}</h3>
            <p className="modal-message">
              {lang === 'he'
                ? 'בטופס זה מזינים נתוני קטיף ומיון, ונדרשת לפחות שורת מיון אחת.'
                : 'Use this form to enter harvest and sorting data. At least one sorting row is required.'}
            </p>

            <div className="management-form-grid harvest-bulk-form-grid harvest-bulk-form-grid--primary">
              <select
                className="seasons-manager__year-input"
                value={harvestFormFieldId}
                onChange={(event) => setHarvestFormFieldId(event.target.value)}
                aria-label={lang === 'he' ? 'שדה' : 'Field'}
              >
                <option value="">{lang === 'he' ? 'בחר שדה' : 'Select field'}</option>
                {fields.map((field) => (
                  <option key={`harvest-form-field-${field.id}`} value={String(field.id)}>
                    {field.name}
                  </option>
                ))}
              </select>

              <input
                className="seasons-manager__year-input"
                type="date"
                value={harvestFormDateGregorian}
                onChange={(event) => handleHarvestGregorianDateChange(event.target.value)}
                aria-label={lang === 'he' ? 'תאריך לועזי' : 'Gregorian date'}
              />

              <input
                className="seasons-manager__year-input"
                type="text"
                value={harvestFormDateHebrew}
                onChange={(event) => setHarvestFormDateHebrew(event.target.value)}
                placeholder={lang === 'he' ? 'תאריך עברי' : 'Hebrew date'}
                aria-label={lang === 'he' ? 'תאריך עברי' : 'Hebrew date'}
              />

              <input
                className="seasons-manager__year-input harvest-bulk-form-number-input harvest-bulk-form-number-input--first"
                type="number"
                min="0"
                value={harvestFormTotalHarvested}
                onChange={(event) => setHarvestFormTotalHarvested(event.target.value)}
                placeholder={lang === 'he' ? 'סה"כ קטיף' : 'Total harvested'}
                aria-label={lang === 'he' ? 'סה"כ קטיף' : 'Total harvested'}
              />

              <input
                className="seasons-manager__year-input harvest-bulk-form-number-input"
                type="number"
                min="0"
                value={harvestFormTotalRejected}
                onChange={(event) => setHarvestFormTotalRejected(event.target.value)}
                placeholder={lang === 'he' ? 'סה"כ פסולים' : 'Total rejected'}
                aria-label={lang === 'he' ? 'סה"כ פסולים' : 'Total rejected'}
              />

              <input
                className="seasons-manager__year-input harvest-bulk-form-number-input"
                type="number"
                min="0"
                value={harvestFormOwnerHarvested}
                onChange={(event) => setHarvestFormOwnerHarvested(event.target.value)}
                placeholder={lang === 'he' ? 'קטיף פרנקו' : 'Franco harvested'}
                aria-label={lang === 'he' ? 'קטיף בעלים' : 'Owner harvested'}
              />

              <input
                className="seasons-manager__year-input harvest-bulk-form-number-input"
                type="number"
                min="0"
                value={harvestFormOwnerRejected}
                onChange={(event) => setHarvestFormOwnerRejected(event.target.value)}
                placeholder={lang === 'he' ? 'פסולים פרנקו' : 'Franco rejected'}
                aria-label={lang === 'he' ? 'פסולים בעלים' : 'Owner rejected'}
              />

              <fieldset className="harvest-bulk-form-classification-mode" aria-label={lang === 'he' ? 'סוג מיון' : 'Classification mode'}>
                <legend>{lang === 'he' ? 'סוג מיון' : 'Classification mode'}</legend>
                <p className="harvest-bulk-form-classification-mode__hint">
                  {lang === 'he'
                    ? 'בחר סוג מיון לדוח: מיון מלא אם כל האתרוגים מהקטיף מוינו ומעודכנים בטופס הזה, או מיון חלקי לפי נתונים זמינים.'
                    : 'Choose the sorting mode for this record: full for the whole harvest or partial for available data.'}
                </p>
                <label>
                  <input
                    type="radio"
                    name="harvest-classification-mode"
                    checked={!harvestFormIsPartialClassification}
                    onChange={() => setHarvestFormIsPartialClassification(false)}
                  />
                  <span>{lang === 'he' ? 'מיון מלא' : 'Full sorting'}</span>
                </label>
                <label>
                  <input
                    type="radio"
                    name="harvest-classification-mode"
                    checked={harvestFormIsPartialClassification}
                    onChange={() => setHarvestFormIsPartialClassification(true)}
                  />
                  <span>{lang === 'he' ? 'מיון חלקי' : 'Partial sorting'}</span>
                </label>
              </fieldset>

              <textarea
                className="seasons-manager__year-input harvest-bulk-form-notes harvest-bulk-form-notes--with-mode"
                rows={1}
                value={harvestFormNotes}
                onChange={(event) => handleHarvestNotesChange(event.target.value, event.currentTarget)}
                placeholder={lang === 'he' ? 'הערות קטיף' : 'Harvest notes'}
                aria-label={lang === 'he' ? 'הערות קטיף' : 'Harvest notes'}
              />
            </div>

            <div className="harvest-bulk-form-classifications">
              <div className="harvest-bulk-form-classifications__header">
                <h4>{lang === 'he' ? 'שורות מיון' : 'Sorting rows'}</h4>
                <button type="button" className="btn btn-success" onClick={addHarvestClassificationDraft}>
                  {lang === 'he' ? 'הוספת שורת מיון' : 'Add sorting row'}
                </button>
              </div>

              {harvestFormClassifications.map((draft, index) => {
                const availableCustomerCategories = harvestFormCustomerCategories.filter(
                  (category) => String(category.customerId) === draft.customerId,
                );

                return (
                  <div key={draft.id} className="harvest-bulk-form-classification-row">
                    <div className="harvest-bulk-form-classification-row__head">
                      <strong>
                        {lang === 'he' ? `מיון ${index + 1}` : `Sorting ${index + 1}`}
                      </strong>
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => removeHarvestClassificationDraft(draft.id)}
                        disabled={harvestFormClassifications.length <= 1}
                      >
                        {lang === 'he' ? 'מחיקה' : 'Remove'}
                      </button>
                    </div>

                    <div className="management-form-grid harvest-bulk-form-grid">
                      <select
                        className="seasons-manager__year-input"
                        value={draft.assignmentType}
                        onChange={(event) =>
                          updateHarvestClassificationDraft(draft.id, {
                            assignmentType: event.target.value as HarvestFormClassificationDraft['assignmentType'],
                          })
                        }
                      >
                        <option value="GENERAL">{lang === 'he' ? 'כללי' : 'General'}</option>
                        <option value="TRADER">{lang === 'he' ? 'סוחר' : 'Trader'}</option>
                        <option value="CUSTOMER">{lang === 'he' ? 'לקוח' : 'Customer'}</option>
                      </select>

                      {(draft.assignmentType === 'GENERAL' || draft.assignmentType === 'TRADER') ? (
                        <select
                          className="seasons-manager__year-input"
                          value={draft.traderCategoryId}
                          onChange={(event) => updateHarvestClassificationDraft(draft.id, { traderCategoryId: event.target.value })}
                        >
                          <option value="">{lang === 'he' ? 'בחר קטגוריית סוחר' : 'Select trader category'}</option>
                          {harvestFormTraderCategories.map((category) => (
                            <option key={`harvest-form-trader-category-${category.id}`} value={String(category.id)}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      ) : null}

                      {draft.assignmentType === 'TRADER' ? (
                        <select
                          className="seasons-manager__year-input"
                          value={draft.traderId}
                          onChange={(event) => updateHarvestClassificationDraft(draft.id, { traderId: event.target.value })}
                        >
                          <option value="">{lang === 'he' ? 'בחר סוחר' : 'Select trader'}</option>
                          {traders.map((trader) => (
                            <option key={`harvest-form-trader-${trader.id}`} value={String(trader.id)}>
                              {trader.name}
                            </option>
                          ))}
                        </select>
                      ) : null}

                      {draft.assignmentType === 'CUSTOMER' ? (
                        <>
                          <select
                            className="seasons-manager__year-input"
                            value={draft.customerId}
                            onChange={(event) => updateHarvestClassificationDraft(draft.id, { customerId: event.target.value })}
                          >
                            <option value="">{lang === 'he' ? 'בחר לקוח' : 'Select customer'}</option>
                            {customers.map((customer) => (
                              <option key={`harvest-form-customer-${customer.id}`} value={String(customer.id)}>
                                {customer.customerName}
                              </option>
                            ))}
                          </select>

                          <select
                            className="seasons-manager__year-input"
                            value={draft.customerCategoryId}
                            onChange={(event) => updateHarvestClassificationDraft(draft.id, { customerCategoryId: event.target.value })}
                            disabled={!draft.customerId}
                          >
                            <option value="">{lang === 'he' ? 'בחר קטגוריית לקוח' : 'Select customer category'}</option>
                            {availableCustomerCategories.map((category) => (
                              <option key={`harvest-form-customer-category-${category.id}`} value={String(category.id)}>
                                {`${category.name} (${category.grade})`}
                              </option>
                            ))}
                          </select>
                        </>
                      ) : (
                        <input
                          className="seasons-manager__year-input"
                          type="text"
                          value={draft.grade}
                          onChange={(event) => updateHarvestClassificationDraft(draft.id, { grade: event.target.value })}
                          placeholder={lang === 'he' ? 'דרגה (אופציונלי)' : 'Grade (optional)'}
                        />
                      )}

                      <select
                        className="seasons-manager__year-input"
                        value={draft.pitamStatus}
                        onChange={(event) =>
                          updateHarvestClassificationDraft(draft.id, {
                            pitamStatus: event.target.value as HarvestFormClassificationDraft['pitamStatus'],
                          })
                        }
                      >
                        <option value="WITH_PITAM">{lang === 'he' ? 'פיטם' : 'With pitam'}</option>
                        <option value="WITHOUT_PITAM">{lang === 'he' ? 'בל"פ' : 'Without pitam'}</option>
                        <option value="MIXED">{lang === 'he' ? 'מעורב' : 'Mixed'}</option>
                      </select>

                      <input
                        className="seasons-manager__year-input"
                        type="number"
                        min="1"
                        value={draft.quantity}
                        onChange={(event) => updateHarvestClassificationDraft(draft.id, { quantity: event.target.value })}
                        placeholder={lang === 'he' ? 'כמות' : 'Quantity'}
                      />

                      <input
                        className="seasons-manager__year-input"
                        type="text"
                        value={draft.notes}
                        onChange={(event) => updateHarvestClassificationDraft(draft.id, { notes: event.target.value })}
                        placeholder={lang === 'he' ? 'הערות מיון' : 'Sorting notes'}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {harvestFormError ? <p className="seasons-manager__error">{harvestFormError}</p> : null}

            <div className="modal-actions">
              <button className="btn btn-danger" onClick={closeHarvestGlobalForm} type="button" disabled={isSubmittingHarvestForm}>
                {lang === 'he' ? 'ביטול' : 'Cancel'}
              </button>
              <button
                className="btn btn-success"
                onClick={() => {
                  void handleSubmitHarvestGlobalForm();
                }}
                type="button"
                disabled={isSubmittingHarvestForm}
              >
                {isSubmittingHarvestForm
                  ? lang === 'he'
                    ? 'שומר...'
                    : 'Saving...'
                  : lang === 'he'
                    ? 'שמירת קטיף'
                    : 'Save harvest'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
