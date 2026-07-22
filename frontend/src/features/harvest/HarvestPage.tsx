import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppShell } from '../../app/layout/AppShell';
import { SettingsIcon } from '../../components/ui/SettingsIcon';
import type { NavItem } from '../../types/navigation';
import { ApiError } from '../../services/apiClient';
import { getCurrentUser, isAuthenticated, isWorkerRole, logout } from '../../services/authService';
import { NoPermissionBanner } from '../../components/ui/NoPermissionBanner';
import type { Season } from '../../services/seasonsApi';
import type { Field } from '../../services/fieldsApi';
import {
  type HarvestFieldReportDetailsRecord,
  type HarvestRecord,
  deleteHarvest,
  updateHarvest,
} from '../../services/harvestsApi';
import {
  type ClassificationListRecord,
  deleteHarvestClassification,
  getClassificationsByHarvest,
  getClassificationsBySeason,
  getDeletedClassificationsBySeason,
  updateHarvestClassificationQuantity,
  permanentDeleteHarvestClassification,
} from '../../services/classificationsApi';
import { getHarvestById } from '../../services/harvestsApi';
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
import { validateHarvestSortingEditQuantity } from './utils/harvestSortingFormSubmission.util';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { HarvestBulkFormModal } from './components/forms/HarvestBulkFormModal';
import { HarvestEditModal } from './components/forms/HarvestEditModal';
import { HarvestSortingEditModal } from './components/forms/HarvestSortingEditModal';
import { HarvestSortingFormModal } from './components/forms/HarvestSortingFormModal';
import { HarvestDailyDetailsSection } from './components/daily/HarvestDailyDetailsSection';
import { HarvestFieldReportSection } from './components/field-report/HarvestFieldReportSection';
import { HarvestSortingDailySection } from './components/sorting-daily/HarvestSortingDailySection';
import { HarvestSortingSummarySection } from './components/sorting-summary/HarvestSortingSummarySection';
import { HarvestSortingListSection } from './components/sorting-list/HarvestSortingListSection';
import { HarvestDeletedSortingListSection } from './components/sorting-list/HarvestDeletedSortingListSection';
import { useHarvestPageLifecycle } from './hooks/page/useHarvestPageLifecycle';
import { useHarvestFiltersAndRows } from './hooks/data/useHarvestFiltersAndRows';
import { useHarvestFormCategories } from './hooks/form/useHarvestFormCategories';
import { useHarvestDetailsSideEffects } from './hooks/details/useHarvestDetailsSideEffects';
import { useHarvestDetailsData } from './hooks/details/useHarvestDetailsData';
import { createHarvestExportActions } from './services/harvestExportActions';
import { useHarvestDetailsPrintActions } from './hooks/details/useHarvestDetailsPrintActions';
import { useHarvestPageControls } from './hooks/page/useHarvestPageControls';
import { useHarvestRelatedSortings } from './hooks/details/useHarvestRelatedSortings';
import { useHarvestSortingDailyRows } from './hooks/data/useHarvestSortingDailyRows';
import { useHarvestTableColumns } from './hooks/table/useHarvestTableColumns';
import { useHarvestFormState } from './hooks/form/useHarvestFormState';
import { useHarvestSortingFormState } from './hooks/form/useHarvestSortingFormState';
import { useHarvestFormSubmission } from './hooks/form/useHarvestFormSubmission';
import { useHarvestSortingFormSubmission } from './hooks/form/useHarvestSortingFormSubmission';
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
  parseHarvestDateFilter,
  parseSeasonFilterId,
  parseSortingAssignmentFilter,
  resolveSortingCategoryOwnerToken,
  resolveSortingCategoryOwnerType,
  canAttachSortingToHarvest,
  formatHebrewDateFromGregorianInput,
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
  const [selectedHarvestRow, setSelectedHarvestRow] = useState<HarvestRecord | null>(null);
  const [fieldReportDetailsFieldId, setFieldReportDetailsFieldId] = useState<number | null>(null);
  const [relatedSortings, setRelatedSortings] = useState<ClassificationRecord[]>([]);
  const [isRelatedSortingsLoading, setIsRelatedSortingsLoading] = useState(false);
  const [relatedSortingsLoadError, setRelatedSortingsLoadError] = useState<string>('');
  const [sortingDailyRows, setSortingDailyRows] = useState<ClassificationDailySummaryRow[]>([]);
  const [sortingDailyCategories, setSortingDailyCategories] = useState<ClassificationDailySummaryCategory[]>([]);
  const [isSortingDailyLoading, setIsSortingDailyLoading] = useState(false);
  const [sortingDailyLoadError, setSortingDailyLoadError] = useState<string>('');
  const [sortingDailyDetailsRowId, setSortingDailyDetailsRowId] = useState<number | null>(null);
  const [selectedSortingDailyRowId, setSelectedSortingDailyRowId] = useState<number | null>(null);
  const [sortingDailyDetailRows, setSortingDailyDetailRows] = useState<ClassificationRecord[]>([]);
  const [isSortingDailyDetailRowsLoading, setIsSortingDailyDetailRowsLoading] = useState(false);
  const [sortingDailyDetailRowsLoadError, setSortingDailyDetailRowsLoadError] = useState<string>('');
  const [sortingListRows, setSortingListRows] = useState<ClassificationListRecord[]>([]);
  const [isSortingListLoading, setIsSortingListLoading] = useState(false);
  const [sortingListLoadError, setSortingListLoadError] = useState<string>('');
  const [selectedSortingListRow, setSelectedSortingListRow] = useState<ClassificationListRecord | null>(null);
  const [deletedSortingListRows, setDeletedSortingListRows] = useState<ClassificationListRecord[]>([]);
  const [isDeletedSortingListLoading, setIsDeletedSortingListLoading] = useState(false);
  const [deletedSortingListLoadError, setDeletedSortingListLoadError] = useState<string>('');
  const [selectedDeletedSortingListRow, setSelectedDeletedSortingListRow] = useState<ClassificationListRecord | null>(null);
  const [isRestoreSortingMode, setIsRestoreSortingMode] = useState(false);
  const [restoreHarvestSummary, setRestoreHarvestSummary] = useState<{
    totalHarvestedValue: number;
    totalRejectedValue: number;
    classifiedTotalValue: number;
    dateGregorian: string;
    totalHarvested: string;
    totalRejected: string;
    classifiedTotal: string;
  } | null>(null);
  const [isPermanentDeleteSortingDialogOpen, setIsPermanentDeleteSortingDialogOpen] = useState(false);
  const [isPermanentDeletingSortingRow, setIsPermanentDeletingSortingRow] = useState(false);
  const [permanentDeleteSortingError, setPermanentDeleteSortingError] = useState('');
  const [isEditSortingListDialogOpen, setIsEditSortingListDialogOpen] = useState(false);
  const [editQuantityValue, setEditQuantityValue] = useState<number>(0);
  const [editIsPartialValue, setEditIsPartialValue] = useState<boolean>(false);
  const [isEditingSortingListRow, setIsEditingSortingListRow] = useState(false);
  const [editSortingListError, setEditSortingListError] = useState<string>('');
  const [isDeleteSortingListDialogOpen, setIsDeleteSortingListDialogOpen] = useState(false);
  const [isDeletingSortingListRow, setIsDeletingSortingListRow] = useState(false);
  const [deleteSortingListError, setDeleteSortingListError] = useState<string>('');
  const detailsPrintRef = useRef<HTMLDivElement | null>(null);
  const fieldReportDetailsPrintRef = useRef<HTMLDivElement | null>(null);
  const sortingDailyDetailsPrintRef = useRef<HTMLDivElement | null>(null);
  const sortingDownloadMenuCloseTimeoutRef = useRef<number | null>(null);
  const visibleHarvestRowsRef = useRef<HarvestRecord[]>([]);
  const visibleFieldReportRowsRef = useRef<HarvestFieldReportRow[]>([]);
  const visibleSortingDailyRowsRef = useRef<ClassificationDailySummaryRow[]>([]);
  const [isHarvestLoading, setIsHarvestLoading] = useState(false);
  const [harvestLoadError, setHarvestLoadError] = useState<string>('');
  const [isDeleteHarvestDialogOpen, setIsDeleteHarvestDialogOpen] = useState(false);
  const [isDeletingHarvest, setIsDeletingHarvest] = useState(false);
  const [isEditHarvestDialogOpen, setIsEditHarvestDialogOpen] = useState(false);
  const [isEditingHarvest, setIsEditingHarvest] = useState(false);
  const [editHarvestError, setEditHarvestError] = useState('');
  const [editHarvestDateGregorian, setEditHarvestDateGregorian] = useState('');
  const [editHarvestDateHebrew, setEditHarvestDateHebrew] = useState('');
  const [editHarvestFieldId, setEditHarvestFieldId] = useState(0);
  const [editHarvestTotalHarvested, setEditHarvestTotalHarvested] = useState(0);
  const [editHarvestTotalRejected, setEditHarvestTotalRejected] = useState(0);
  const [editHarvestOwnerHarvested, setEditHarvestOwnerHarvested] = useState(0);
  const [editHarvestOwnerRejected, setEditHarvestOwnerRejected] = useState(0);
  const [editHarvestNotes, setEditHarvestNotes] = useState('');
  const [editHarvestMarkFullClassification, setEditHarvestMarkFullClassification] = useState(false);
  const [editHarvestIsBadPick, setEditHarvestIsBadPick] = useState(false);
  const globalFilterValues = useSelector(
    (state: RootState) => state.globalFilters.scopes[HARVEST_DAILY_FILTER_SCOPE] ?? EMPTY_FILTERS,
  );
  const currentUser = getCurrentUser();
  const isWorker = isWorkerRole(currentUser?.role);
  const alertsCount = useHarvestPageLifecycle({ navigate });

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
    navigate(item.href || `/${item.id}`);
  };

  const handleSidebarClick = (item: NavItem) => {
    navigate(item.href || `/harvest/${item.id}`);
  };

  const isHarvestSummaryTab = activeSidebarId === 'harvest-summary';
  const isDailyDetailsTab = activeSidebarId === 'harvest-daily-details';
  const isFieldReportTab = activeSidebarId === 'harvest-field-report';
  const isSortingDailyDetailsTab = activeSidebarId === 'sorting-daily-details';
  const isSortingSummaryTab = activeSidebarId === 'sorting-summary';
  const isSortingListTab = activeSidebarId === 'sorting-list';
  const isSortingListTrashTab = activeSidebarId === 'sorting-list-trash';
  const requiresFiltersData = isDailyDetailsTab || isFieldReportTab || isSortingDailyDetailsTab || isHarvestSummaryTab || isSortingListTab || isSortingSummaryTab || isSortingListTrashTab;
  const requiresHarvestData = isDailyDetailsTab || isFieldReportTab || isSortingDailyDetailsTab || isHarvestSummaryTab || isSortingSummaryTab || isSortingListTab;
  const needsHarvestRecords = isDailyDetailsTab || isSortingDailyDetailsTab || isHarvestSummaryTab || isSortingSummaryTab || isSortingListTab;

  const activeSeasonId = useMemo(() => {
    return seasons.find((season) => season.isActive)?.id ?? null;
  }, [seasons]);

  const activeSeasonYearName = useMemo(() => {
    return seasons.find((season) => season.isActive)?.yearName ?? null;
  }, [seasons]);

  const seasonFilterId = useMemo(() => {
    return parseSeasonFilterId(globalFilterValues.seasonId ?? '');
  }, [globalFilterValues.seasonId]);

  const isViewingNonActiveSeason = seasonFilterId !== null && seasonFilterId !== activeSeasonId;

  const fieldFilterId = useMemo<number | 'all'>(() => {
    return parseFieldFilterId(globalFilterValues.fieldId ?? 'all');
  }, [globalFilterValues.fieldId]);

  const harvestDateFilterId = useMemo<string | 'all'>(() => {
    return parseHarvestDateFilter(globalFilterValues.harvestDate ?? 'all');
  }, [globalFilterValues.harvestDate]);

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
    harvestFormTotalRejected,
    harvestFormOwnerHarvested,
    harvestFormOwnerRejected,
    harvestFormNotes,
    harvestFormIsPartialClassification,
    setHarvestFormIsPartialClassification,
    harvestFormIsBadPick,
    setHarvestFormIsBadPick,
    harvestFormRemainsInItalyGradeH,
    setHarvestFormRemainsInItalyGradeH,
    harvestFormRemainsInItalyGradeV,
    setHarvestFormRemainsInItalyGradeV,
    harvestFormClassifications,
    setHarvestFormClassifications,
    harvestFormTraderCategories,
    setHarvestFormTraderCategories,
    harvestFormCustomerCategories,
    setHarvestFormCustomerCategories,
    handleHarvestGregorianDateChange,
    handleHarvestTotalHarvestedChange,
    handleHarvestTotalRejectedChange,
    handleHarvestOwnerHarvestedChange,
    handleHarvestOwnerRejectedChange,
    handleHarvestNotesChange,
    openHarvestGlobalForm,
    closeHarvestGlobalForm,
    addHarvestClassificationDraft,
    removeHarvestClassificationDraft,
    updateHarvestClassificationDraft,
    updateHarvestClassificationDraftQuantity,
  } = useHarvestFormState({
    fieldFilterId,
    fields,
  });

  const {
    isHarvestSortingFormOpen,
    setIsHarvestSortingFormOpen,
    isSubmittingHarvestSortingForm,
    setIsSubmittingHarvestSortingForm,
    harvestSortingFormError,
    setHarvestSortingFormError,
    harvestSortingFormHarvestId,
    setHarvestSortingFormHarvestId,
    harvestSortingFormAssignmentType,
    handleHarvestSortingAssignmentTypeChange,
    harvestSortingFormTraderId,
    setHarvestSortingFormTraderId,
    harvestSortingFormCustomerId,
    handleHarvestSortingCustomerIdChange,
    harvestSortingFormTraderCategoryId,
    setHarvestSortingFormTraderCategoryId,
    harvestSortingFormCustomerCategoryId,
    setHarvestSortingFormCustomerCategoryId,
    harvestSortingFormGrade,
    setHarvestSortingFormGrade,
    harvestSortingFormPitamStatus,
    setHarvestSortingFormPitamStatus,
    harvestSortingFormQuantity,
    setHarvestSortingFormQuantity,
    harvestSortingFormNotes,
    handleHarvestSortingNotesChange,
    harvestSortingFormIsPartialClassification,
    setHarvestSortingFormIsPartialClassification,
    isAddingRejectedQuantity,
    harvestSortingFormAdditionalRejected,
    setHarvestSortingFormAdditionalRejected,
    openAddRejectedQuantity,
    removeAddedRejectedQuantity,
    isAddingOwnerRejectedQuantity,
    harvestSortingFormAdditionalOwnerRejected,
    setHarvestSortingFormAdditionalOwnerRejected,
    openAddOwnerRejectedQuantity,
    removeAddedOwnerRejectedQuantity,
    harvestSortingFormTotalHarvested,
    setHarvestSortingFormTotalHarvested,
    harvestSortingFormOwnerHarvested,
    setHarvestSortingFormOwnerHarvested,
    harvestSortingFormIsBadPick,
    setHarvestSortingFormIsBadPick,
    harvestSortingFormRemainsInItalyGradeH,
    setHarvestSortingFormRemainsInItalyGradeH,
    harvestSortingFormRemainsInItalyGradeV,
    setHarvestSortingFormRemainsInItalyGradeV,
    openHarvestSortingGlobalForm,
    closeHarvestSortingGlobalForm,
    prefillSortingFormForRestore,
  } = useHarvestSortingFormState();

  const [harvestSortingFormExistingClassifications, setHarvestSortingFormExistingClassifications] = useState<ClassificationRecord[]>([]);
  const [pendingExistingClassificationEdits, setPendingExistingClassificationEdits] = useState<Record<number, string>>({});

  useEffect(() => {
    const selectedHarvestId = Number(harvestSortingFormHarvestId);

    setPendingExistingClassificationEdits({});

    if (!isHarvestSortingFormOpen || isRestoreSortingMode || !Number.isFinite(selectedHarvestId) || selectedHarvestId <= 0) {
      setHarvestSortingFormExistingClassifications([]);
      return;
    }

    let isMounted = true;

    getClassificationsByHarvest(selectedHarvestId)
      .then((rows) => {
        if (isMounted) {
          setHarvestSortingFormExistingClassifications(rows);
        }
      })
      .catch(() => {
        if (isMounted) {
          setHarvestSortingFormExistingClassifications([]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [harvestSortingFormHarvestId, isHarvestSortingFormOpen, isRestoreSortingMode]);

  const handleStageExistingClassificationQuantity = (classificationId: number, value: string | null) => {
    setPendingExistingClassificationEdits((prev) => {
      if (value === null) {
        if (!(classificationId in prev)) {
          return prev;
        }
        const next = { ...prev };
        delete next[classificationId];
        return next;
      }
      return { ...prev, [classificationId]: value };
    });
  };

  const sortingAssignmentFilter = useMemo<SortingAssignmentFilter>(() => {
    return parseSortingAssignmentFilter(globalFilterValues.sortingAssignmentType ?? 'all');
  }, [globalFilterValues.sortingAssignmentType]);

  const fieldReportMethod = useMemo<'our' | 'franco'>(() => {
    return globalFilterValues.fieldReportMethod === 'franco' ? 'franco' : 'our';
  }, [globalFilterValues.fieldReportMethod]);

  const formatGregorianDate = useCallback(
    (value: string) => formatHarvestGregorianDate(value, lang),
    [lang],
  );

  const harvestDateOptions = useMemo(() => {
    let sourceRows: { dateGregorian: string }[];
    let allDatesLabel: string;
    if (isSortingListTab || isSortingListTrashTab || isSortingSummaryTab) {
      const sourceList = isSortingListTab || isSortingSummaryTab ? sortingListRows : deletedSortingListRows;
      sourceRows = sourceList.map((row) => ({ dateGregorian: (row.fieldHarvest?.dateGregorian ?? '').slice(0, 10) })).filter((r) => r.dateGregorian !== '');
      allDatesLabel = t.sortingList.filters.allDatesOption;
    } else {
      sourceRows = harvestRows;
      allDatesLabel = t.dailyDetails.filters.allDatesOption;
    }
    const uniqueDates = [...new Set(sourceRows.map((row) => row.dateGregorian))];
    uniqueDates.sort((a, b) => b.localeCompare(a));
    return [
      { value: 'all', label: allDatesLabel },
      ...uniqueDates.map((date) => ({ value: date, label: formatGregorianDate(date) })),
    ];
  }, [isSortingListTab, isSortingListTrashTab, isSortingSummaryTab, sortingListRows, deletedSortingListRows, harvestRows, formatGregorianDate, t.dailyDetails.filters.allDatesOption, t.sortingList.filters.allDatesOption]);

  useEffect(() => {
    if (harvestDateFilterId === 'all') return;
    if (harvestDateOptions.length <= 1) return; // data not loaded yet
    const validValues = new Set(harvestDateOptions.map((o) => o.value));
    if (!validValues.has(harvestDateFilterId)) {
      dispatch(setScopeFilter({ scope: HARVEST_DAILY_FILTER_SCOPE, key: 'harvestDate', value: 'all' }));
    }
  }, [harvestDateOptions, harvestDateFilterId, dispatch]);

  useHarvestFiltersAndRows({
    requiresFiltersData,
    isSortingDailyDetailsTab,
    isSortingListTab,
    seasonFilterId,
    requiresHarvestData,
    needsHarvestRecords,
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
    traderCategories: harvestFormTraderCategories,
  });

  useEffect(() => {
    if ((!isSortingListTab && !isSortingSummaryTab) || seasonFilterId === null) {
      return;
    }

    setIsSortingListLoading(true);
    setSortingListLoadError('');

    getClassificationsBySeason(seasonFilterId)
      .then((data) => {
        setSortingListRows(data);
      })
      .catch(() => {
        setSortingListLoadError(isSortingSummaryTab ? t.sortingSummary.loadError : t.sortingList.loadError);
      })
      .finally(() => {
        setIsSortingListLoading(false);
      });
  }, [isSortingListTab, isSortingSummaryTab, seasonFilterId, t.sortingList.loadError, t.sortingSummary.loadError]);

  useEffect(() => {
    if (!isSortingListTrashTab || seasonFilterId === null) {
      return;
    }

    setIsDeletedSortingListLoading(true);
    setDeletedSortingListLoadError('');

    getDeletedClassificationsBySeason(seasonFilterId)
      .then((data) => {
        setDeletedSortingListRows(data);
      })
      .catch(() => {
        setDeletedSortingListLoadError(t.sortingListTrash.loadError);
      })
      .finally(() => {
        setIsDeletedSortingListLoading(false);
      });
  }, [isSortingListTrashTab, seasonFilterId, t.sortingListTrash.loadError]);

  useHarvestFormCategories({
    isOpen: isHarvestFormOpen || isHarvestSortingFormOpen || isSortingSummaryTab || isDailyDetailsTab || isSortingDailyDetailsTab,
    seasonFilterId,
    setHarvestFormTraderCategories,
    setHarvestFormCustomerCategories,
  });

  useEffect(() => {
    const state = location.state as Record<string, unknown> | null;
    if (state?.openHarvestForm) {
      openHarvestGlobalForm();
      navigate(location.pathname, { replace: true, state: null });
    } else if (state?.openSortingForm) {
      setIsRestoreSortingMode(false);
      setRestoreHarvestSummary(null);
      setHarvestFormClassifications([]);
      addHarvestClassificationDraft();
      openHarvestSortingGlobalForm(null);
      navigate(location.pathname, { replace: true, state: null });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

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
      { value: 'general', label: t.sortingDailyDetails.filters.assignmentOptions.general },
      { value: 'trader', label: t.sortingDailyDetails.filters.assignmentOptions.trader },
      { value: 'customer', label: t.sortingDailyDetails.filters.assignmentOptions.customer },
      ...traderOptions,
      ...customerOptions,
    ];
  }, [
    customers,
    lang,
    t.sortingDailyDetails.filters.assignmentOptions.all,
    t.sortingDailyDetails.filters.assignmentOptions.general,
    t.sortingDailyDetails.filters.assignmentOptions.customer,
    t.sortingDailyDetails.filters.assignmentOptions.customerPrefix,
    t.sortingDailyDetails.filters.assignmentOptions.trader,
    t.sortingDailyDetails.filters.assignmentOptions.traderPrefix,
    traders,
  ]);

  useEffect(() => {
    if (!isSortingDailyDetailsTab && !isSortingListTab && !isSortingListTrashTab) {
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
  }, [dispatch, globalFilterValues.sortingAssignmentType, isSortingDailyDetailsTab, isSortingListTab, sortingAssignmentFilterOptions]);

  const harvestSortingFormAdditionalRejectedAmount = useMemo(() => {
    const parsed = Number(harvestSortingFormAdditionalRejected);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }, [harvestSortingFormAdditionalRejected]);

  // By default, an added rejected ("יורדים") quantity mirrors automatically into owner-rejected
  // ("יורדים פרנקו") too. Only once the user explicitly opens the owner-rejected addition field does
  // it decouple and use the explicitly entered value instead.
  const harvestSortingFormAdditionalOwnerRejectedAmount = useMemo(() => {
    if (isAddingOwnerRejectedQuantity) {
      const parsed = Number(harvestSortingFormAdditionalOwnerRejected);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    }
    return harvestSortingFormAdditionalRejectedAmount;
  }, [isAddingOwnerRejectedQuantity, harvestSortingFormAdditionalOwnerRejected, harvestSortingFormAdditionalRejectedAmount]);

  const selectedSortingHarvest = useMemo(() => {
    const selectedHarvestId = Number(harvestSortingFormHarvestId);
    if (!Number.isFinite(selectedHarvestId) || selectedHarvestId <= 0) {
      return null;
    }
    return harvestRows.find((row) => row.id === selectedHarvestId) ?? null;
  }, [harvestRows, harvestSortingFormHarvestId]);

  // Prefill the directly-editable totalHarvested/ownerHarvested inputs with the selected harvest's
  // current values, so the user edits from a real starting point rather than an empty field.
  useEffect(() => {
    if (isRestoreSortingMode || !selectedSortingHarvest) {
      return;
    }
    setHarvestSortingFormTotalHarvested(String(selectedSortingHarvest.totalHarvested));
    setHarvestSortingFormOwnerHarvested(String(selectedSortingHarvest.ownerHarvested));
    setHarvestSortingFormIsBadPick(selectedSortingHarvest.isBadPick);
    setHarvestSortingFormRemainsInItalyGradeH(selectedSortingHarvest.remainsInItalyGradeH);
    setHarvestSortingFormRemainsInItalyGradeV(selectedSortingHarvest.remainsInItalyGradeV);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRestoreSortingMode, selectedSortingHarvest?.id]);

  const editedTotalHarvestedAmount = useMemo(() => {
    const parsed = Number(harvestSortingFormTotalHarvested);
    return selectedSortingHarvest && Number.isFinite(parsed) && parsed >= 0 ? parsed : selectedSortingHarvest?.totalHarvested ?? 0;
  }, [harvestSortingFormTotalHarvested, selectedSortingHarvest]);

  const editedOwnerHarvestedAmount = useMemo(() => {
    const parsed = Number(harvestSortingFormOwnerHarvested);
    return selectedSortingHarvest && Number.isFinite(parsed) && parsed >= 0 ? parsed : selectedSortingHarvest?.ownerHarvested ?? 0;
  }, [harvestSortingFormOwnerHarvested, selectedSortingHarvest]);

  const hasTotalHarvestedEdit = Boolean(selectedSortingHarvest) && editedTotalHarvestedAmount !== selectedSortingHarvest?.totalHarvested;
  const hasOwnerHarvestedEdit = Boolean(selectedSortingHarvest) && editedOwnerHarvestedAmount !== selectedSortingHarvest?.ownerHarvested;
  const hasIsBadPickEdit = Boolean(selectedSortingHarvest) && harvestSortingFormIsBadPick !== selectedSortingHarvest?.isBadPick;
  const hasRemainsInItalyGradeHEdit = Boolean(selectedSortingHarvest) && harvestSortingFormRemainsInItalyGradeH !== selectedSortingHarvest?.remainsInItalyGradeH;
  const hasRemainsInItalyGradeVEdit = Boolean(selectedSortingHarvest) && harvestSortingFormRemainsInItalyGradeV !== selectedSortingHarvest?.remainsInItalyGradeV;

  const selectedHarvestSummaryTotals = useMemo(() => {
    if (isRestoreSortingMode && restoreHarvestSummary) {
      return {
        totalHarvested: restoreHarvestSummary.totalHarvestedValue,
        totalRejected: restoreHarvestSummary.totalRejectedValue,
        classifiedTotal: restoreHarvestSummary.classifiedTotalValue,
      };
    }

    if (!selectedSortingHarvest) {
      return null;
    }

    return {
      totalHarvested: editedTotalHarvestedAmount,
      totalRejected: selectedSortingHarvest.totalRejected + harvestSortingFormAdditionalRejectedAmount,
      classifiedTotal: selectedSortingHarvest.classifiedTotal,
      ownerHarvested: editedOwnerHarvestedAmount,
      ownerRejected: selectedSortingHarvest.ownerRejected + harvestSortingFormAdditionalOwnerRejectedAmount,
    };
  }, [
    isRestoreSortingMode,
    restoreHarvestSummary,
    selectedSortingHarvest,
    editedTotalHarvestedAmount,
    editedOwnerHarvestedAmount,
    harvestSortingFormAdditionalRejectedAmount,
    harvestSortingFormAdditionalOwnerRejectedAmount,
  ]);

  const { handleSubmitHarvestGlobalForm } = useHarvestFormSubmission({
    lang,
    t,
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
      isBadPick: harvestFormIsBadPick,
      remainsInItalyGradeH: harvestFormRemainsInItalyGradeH,
      remainsInItalyGradeV: harvestFormRemainsInItalyGradeV,
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
    traderCategories: harvestFormTraderCategories,
  });

  const { handleSubmitHarvestSortingGlobalForm } = useHarvestSortingFormSubmission({
    lang,
    t,
    seasonFilterId,
    selectedHarvestSummary: selectedHarvestSummaryTotals,
    form: {
      harvestId: harvestSortingFormHarvestId,
      assignmentType: harvestSortingFormAssignmentType,
      traderId: harvestSortingFormTraderId,
      customerId: harvestSortingFormCustomerId,
      traderCategoryId: harvestSortingFormTraderCategoryId,
      customerCategoryId: harvestSortingFormCustomerCategoryId,
      grade: harvestSortingFormGrade,
      pitamStatus: harvestSortingFormPitamStatus,
      quantity: harvestSortingFormQuantity,
      notes: harvestSortingFormNotes,
      isPartialClassification: harvestSortingFormIsPartialClassification,
      isBadPick: harvestSortingFormIsBadPick,
      remainsInItalyGradeH: harvestSortingFormRemainsInItalyGradeH,
      remainsInItalyGradeV: harvestSortingFormRemainsInItalyGradeV,
    },
    harvestFormClassifications,
    existingHarvestClassifications: harvestSortingFormExistingClassifications,
    pendingExistingClassificationEdits,
    setPendingExistingClassificationEdits,
    additionalRejectedQuantity: harvestSortingFormAdditionalRejectedAmount,
    additionalOwnerRejectedQuantity: harvestSortingFormAdditionalOwnerRejectedAmount,
    hasTotalHarvestedEdit,
    hasOwnerHarvestedEdit,
    hasIsBadPickEdit,
    hasRemainsInItalyGradeHEdit,
    hasRemainsInItalyGradeVEdit,
    setIsSubmittingHarvestSortingForm,
    setHarvestSortingFormError,
    setIsHarvestSortingFormOpen,
    setHarvestRows,
    setFieldReportRows,
    setSortingDailyRows,
    setSortingDailyCategories,
    setSortingDailyLoadError,
    setSortingListRows,
    traderCategories: harvestFormTraderCategories,
    deletedClassificationId: isRestoreSortingMode ? (selectedDeletedSortingListRow?.id ?? undefined) : undefined,
    onRestoreSuccess: (restoredId) => {
      setDeletedSortingListRows((rows) => rows.filter((r) => r.id !== restoredId));
      setSelectedDeletedSortingListRow(null);
      setIsRestoreSortingMode(false);
      setRestoreHarvestSummary(null);
      if (seasonFilterId !== null) {
        getClassificationsBySeason(seasonFilterId)
          .then((data) => setSortingListRows(data))
          .catch(() => undefined);
      }
    },
  });

  const harvestSortingOptions = useMemo(() => {
    const locale = lang === 'he' ? 'he-IL' : 'en-US';
    const collator = new Intl.Collator(locale, { sensitivity: 'base', numeric: true });

    return harvestRows
      .filter((row) => {
        if (!canAttachSortingToHarvest(row)) {
          return false;
        }
        if (activeSeasonYearName !== null) {
          const harvestYear = new Date(row.dateGregorian).getFullYear();
          if (harvestYear !== activeSeasonYearName) {
            return false;
          }
        }
        return true;
      })
      .sort((left, right) => collator.compare(right.dateGregorian, left.dateGregorian) || right.id - left.id)
      .map((row) => ({
        value: String(row.id),
        label: `${formatGregorianDate(row.dateGregorian)} • ${row.field?.name ?? `${t.dailyDetails.columns.fieldName} ${row.fieldId}`}`,
      }));
  }, [activeSeasonYearName, formatGregorianDate, harvestRows, lang, t.dailyDetails.columns.fieldName]);

  const restoreHarvestOptions = useMemo(() => {
    if (!selectedDeletedSortingListRow?.fieldHarvest) return [];
    const fh = selectedDeletedSortingListRow.fieldHarvest;
    return [{
      value: String(fh.id),
      label: `${formatGregorianDate(fh.dateGregorian.slice(0, 10))} • ${fh.field?.name ?? `${t.dailyDetails.columns.fieldName} ${fh.fieldId}`}`,
    }];
  }, [selectedDeletedSortingListRow, formatGregorianDate, t.dailyDetails.columns.fieldName]);

  const handleOpenSortingForm = () => {
    setIsRestoreSortingMode(false);
    setRestoreHarvestSummary(null);
    setHarvestFormClassifications([]);
    addHarvestClassificationDraft();
    openHarvestSortingGlobalForm(null);
  };

  const filteredHarvestRows = useMemo(() => {
    return harvestRows.filter((row) => {
      if (fieldFilterId !== 'all' && row.fieldId !== fieldFilterId) {
        return false;
      }
      return true;
    });
  }, [harvestRows, fieldFilterId]);

  useEffect(() => {
    if (!detailsRecord) {
      return;
    }

    const isSelectedRowVisible = filteredHarvestRows.some((row) => row.id === detailsRecord.id);
    if (!isSelectedRowVisible) {
      setDetailsRecord(null);
    }
  }, [detailsRecord, filteredHarvestRows]);

  useEffect(() => {
    if (!selectedHarvestRow) {
      return;
    }

    const isSelectedRowVisible = filteredHarvestRows.some((row) => row.id === selectedHarvestRow.id);
    if (!isSelectedRowVisible) {
      setSelectedHarvestRow(null);
    }
  }, [filteredHarvestRows, selectedHarvestRow]);

  useHarvestDetailsSideEffects({
    isHarvestSummaryTab,
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

  const selectedHarvestSummary = useMemo(() => {
    const selectedHarvestId = Number(harvestSortingFormHarvestId);
    if (!Number.isFinite(selectedHarvestId) || selectedHarvestId <= 0) {
      return null;
    }

    const selectedHarvest = harvestRows.find((row) => row.id === selectedHarvestId);
    if (!selectedHarvest) {
      return null;
    }

    const effectiveTotalHarvested = editedTotalHarvestedAmount;
    const effectiveTotalRejected = selectedHarvest.totalRejected + harvestSortingFormAdditionalRejectedAmount;

    return {
      totalHarvestedValue: effectiveTotalHarvested,
      totalRejectedValue: effectiveTotalRejected,
      classifiedTotalValue: selectedHarvest.classifiedTotal,
      dateGregorian: formatGregorianDate(selectedHarvest.dateGregorian),
      totalHarvested: numberFormatter.format(effectiveTotalHarvested),
      totalRejected: numberFormatter.format(effectiveTotalRejected),
      classifiedTotal: numberFormatter.format(selectedHarvest.classifiedTotal),
    };
  }, [
    formatGregorianDate,
    harvestRows,
    harvestSortingFormHarvestId,
    numberFormatter,
    harvestSortingFormAdditionalRejectedAmount,
    editedTotalHarvestedAmount,
  ]);

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
    fieldReportMethod,
    setDetailsRecord,
    setFieldReportDetailsFieldId,
    setSortingDailyDetailsRowId,
    isPartialClassificationFlag,
  });

  const filteredSortingDailyRows = useMemo<ClassificationDailySummaryRow[]>(() => {
    return sortingDailyRows
      .filter((row) => {
        if (fieldFilterId !== 'all' && row.fieldId !== fieldFilterId) return false;
        return true;
      })
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

  const filteredDeletedSortingListRows = useMemo<ClassificationListRecord[]>(() => {
    return deletedSortingListRows.filter((row) => {
      if (harvestDateFilterId !== 'all' && (row.fieldHarvest?.dateGregorian ?? '').slice(0, 10) !== harvestDateFilterId) return false;
      if (sortingAssignmentFilter !== 'all') {
        const ownerType: 'GENERAL' | 'TRADER' | 'CUSTOMER' =
          row.assignmentType === 'TRADER' ? 'TRADER' :
          row.assignmentType === 'CUSTOMER' ? 'CUSTOMER' : 'GENERAL';
        const ownerName =
          row.assignmentType === 'TRADER' ? row.trader?.name :
          row.assignmentType === 'CUSTOMER' ? row.customer?.customerName : undefined;
        if (!matchesSortingAssignmentSelection({ sortingAssignmentFilter, ownerType, ownerName, traderNameById, customerNameById, lang })) {
          return false;
        }
      }
      return true;
    });
  }, [deletedSortingListRows, harvestDateFilterId, sortingAssignmentFilter, traderNameById, customerNameById, lang]);

  const filteredSortingListRows = useMemo<ClassificationListRecord[]>(() => {
    return sortingListRows.filter((row) => {
      if (harvestDateFilterId !== 'all' && (row.fieldHarvest?.dateGregorian ?? '').slice(0, 10) !== harvestDateFilterId) return false;
      if (sortingAssignmentFilter !== 'all') {
        const ownerType: 'GENERAL' | 'TRADER' | 'CUSTOMER' =
          row.assignmentType === 'TRADER' ? 'TRADER' :
          row.assignmentType === 'CUSTOMER' ? 'CUSTOMER' : 'GENERAL';
        const ownerName =
          row.assignmentType === 'TRADER' ? row.trader?.name :
          row.assignmentType === 'CUSTOMER' ? row.customer?.customerName : undefined;
        if (!matchesSortingAssignmentSelection({ sortingAssignmentFilter, ownerType, ownerName, traderNameById, customerNameById, lang })) {
          return false;
        }
      }
      return true;
    });
  }, [sortingListRows, harvestDateFilterId, sortingAssignmentFilter, traderNameById, customerNameById, lang]);

  const filteredSortingSummaryRows = useMemo<ClassificationListRecord[]>(() => {
    return sortingListRows.filter((row) => {
      if (harvestDateFilterId !== 'all' && (row.fieldHarvest?.dateGregorian ?? '').slice(0, 10) !== harvestDateFilterId) return false;
      if (fieldFilterId !== 'all' && row.fieldHarvest?.fieldId !== fieldFilterId) return false;
      return true;
    });
  }, [sortingListRows, harvestDateFilterId, fieldFilterId]);

  useEffect(() => {
    if (selectedSortingDailyRowId === null) {
      return;
    }

    const isSelectedRowVisible = filteredSortingDailyRows.some((row) => row.harvestId === selectedSortingDailyRowId);
    if (!isSelectedRowVisible) {
      setSelectedSortingDailyRowId(null);
    }
  }, [filteredSortingDailyRows, selectedSortingDailyRowId]);

  const {
    createHarvestExportRows,
    createFieldReportExportRows,
    createSortingDailyExportRows,
    createSortingDailyExpandedMatrixData,
    createSortingListExportRows,
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
    filteredSortingListRows,
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
    handlePrintSortingListTable,
    handleExportSortingListTableToExcel,
  } = createHarvestExportActions({
    lang,
    t,
    numberFormatter,
    sortingDownloadMenuCloseTimeoutRef,
    createHarvestExportRows,
    createFieldReportExportRows,
    createSortingDailyExportRows,
    createSortingDailyExpandedMatrixData,
    createSortingListExportRows,
    filterValues: globalFilterValues,
    seasons,
    fields,
  });

  const {
    sortingDailyDetailsData,
    sortingDailySummaryData,
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
    traderCategories: harvestFormTraderCategories,
  });

  const sortingSummarySeasonLabel = useMemo(() => {
    const s = seasons.find((season) => season.id === seasonFilterId);
    return s ? String(s.yearName) : null;
  }, [seasons, seasonFilterId]);

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

  const handleDeleteHarvest = async () => {
    if (!selectedHarvestRow) {
      return;
    }

    setIsDeletingHarvest(true);
    try {
      await deleteHarvest(selectedHarvestRow.id);
      setHarvestRows((rows) => rows.filter((row) => row.id !== selectedHarvestRow.id));
      setSelectedHarvestRow(null);
      setDetailsRecord(null);
      setIsDeleteHarvestDialogOpen(false);
    } catch {
      setIsDeleteHarvestDialogOpen(false);
    } finally {
      setIsDeletingHarvest(false);
    }
  };

  const handleEditHarvestGregorianDateChange = (nextGregorianDate: string) => {
    setEditHarvestDateGregorian(nextGregorianDate);
    setEditHarvestDateHebrew(formatHebrewDateFromGregorianInput(nextGregorianDate));
  };

  const handleOpenEditHarvestDialog = () => {
    if (!selectedHarvestRow) return;
    const initialDateGregorian = selectedHarvestRow.dateGregorian.slice(0, 10);
    setEditHarvestDateGregorian(initialDateGregorian);
    setEditHarvestDateHebrew(formatHebrewDateFromGregorianInput(initialDateGregorian));
    setEditHarvestFieldId(selectedHarvestRow.fieldId);
    setEditHarvestTotalHarvested(selectedHarvestRow.totalHarvested);
    setEditHarvestTotalRejected(selectedHarvestRow.totalRejected);
    setEditHarvestOwnerHarvested(selectedHarvestRow.ownerHarvested);
    setEditHarvestOwnerRejected(selectedHarvestRow.ownerRejected);
    setEditHarvestNotes(selectedHarvestRow.notes ?? '');
    setEditHarvestMarkFullClassification(false);
    setEditHarvestIsBadPick(selectedHarvestRow.isBadPick);
    setEditHarvestError('');
    setIsEditHarvestDialogOpen(true);
  };

  const handleEditHarvest = async () => {
    if (!selectedHarvestRow) return;
    setIsEditingHarvest(true);
    setEditHarvestError('');
    try {
      const updated = await updateHarvest({
        id: selectedHarvestRow.id,
        dateGregorian: editHarvestDateGregorian,
        dateHebrew: editHarvestDateHebrew,
        fieldId: editHarvestFieldId,
        totalHarvested: editHarvestTotalHarvested,
        totalRejected: editHarvestTotalRejected,
        ownerHarvested: editHarvestOwnerHarvested,
        ownerRejected: editHarvestOwnerRejected,
        notes: editHarvestNotes || undefined,
        isPartialClassification: editHarvestMarkFullClassification ? false : undefined,
        isBadPick: editHarvestIsBadPick,
      });
      setHarvestRows((rows) => rows.map((row) => (row.id === updated.id ? { ...row, ...updated } : row)));
      setSelectedHarvestRow((prev) => (prev ? { ...prev, ...updated } : prev));
      setDetailsRecord((prev) => (prev?.id === updated.id ? { ...prev, ...updated } : prev));
      setIsEditHarvestDialogOpen(false);
    } catch {
      setEditHarvestError(t.formSubmission.saveFailed);
    } finally {
      setIsEditingHarvest(false);
    }
  };

  const handleOpenEditSortingListDialog = () => {
    if (!selectedSortingListRow) return;
    setEditQuantityValue(selectedSortingListRow.quantity);
    setEditIsPartialValue(selectedSortingListRow.fieldHarvest?.isPartialClassification ?? false);
    setEditSortingListError('');
    setIsEditSortingListDialogOpen(true);
  };

  const handleEditSortingListRow = async () => {
    if (!selectedSortingListRow) return;
    const harvestId = selectedSortingListRow.fieldHarvest?.id;
    if (!harvestId) return;

    setEditSortingListError('');

    const totalAfterRejected = selectedSortingListRow.fieldHarvest?.totalAfterRejected;
    const classifiedTotal = selectedSortingListRow.fieldHarvest?.classifiedTotal;
    if (totalAfterRejected !== undefined && classifiedTotal !== undefined) {
      const validationError = validateHarvestSortingEditQuantity({
        quantity: editQuantityValue,
        isPartialClassification: editIsPartialValue,
        currentRowQuantity: selectedSortingListRow.quantity,
        fieldHarvest: { totalAfterRejected, classifiedTotal },
        t: t.formSubmission,
      });
      if (validationError) {
        setEditSortingListError(validationError);
        return;
      }
    }

    setIsEditingSortingListRow(true);
    try {
      await updateHarvestClassificationQuantity({
        harvestId,
        classificationId: selectedSortingListRow.id,
        isPartialClassification: editIsPartialValue,
        quantity: editQuantityValue,
      });
      setSortingListRows((rows) =>
        rows.map((row) =>
          row.id === selectedSortingListRow.id ? { ...row, quantity: editQuantityValue } : row,
        ),
      );
      setSelectedSortingListRow((prev) => (prev ? { ...prev, quantity: editQuantityValue } : prev));
      setIsEditSortingListDialogOpen(false);
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) {
        setEditSortingListError(error.message);
      } else {
        setIsEditSortingListDialogOpen(false);
      }
    } finally {
      setIsEditingSortingListRow(false);
    }
  };

  const handleDeleteSortingListRow = async () => {
    if (!selectedSortingListRow) {
      return;
    }

    const harvestId = selectedSortingListRow.fieldHarvest?.id;

    if (!harvestId) {
      return;
    }

    setIsDeletingSortingListRow(true);
    setDeleteSortingListError('');
    try {
      await deleteHarvestClassification({
        harvestId,
        classificationId: selectedSortingListRow.id,
        isPartialClassification: true,
      });
      setSortingListRows((rows) => rows.filter((row) => row.id !== selectedSortingListRow.id));
      setSelectedSortingListRow(null);
      setIsDeleteSortingListDialogOpen(false);
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) {
        setDeleteSortingListError(error.message);
      } else {
        setIsDeleteSortingListDialogOpen(false);
      }
    } finally {
      setIsDeletingSortingListRow(false);
    }
  };

  const handleOpenRestoreDeletedSortingRow = async () => {
    if (!selectedDeletedSortingListRow?.fieldHarvest) return;
    const harvestId = selectedDeletedSortingListRow.fieldHarvest.id;
    try {
      const harvest = await getHarvestById(harvestId);
      setRestoreHarvestSummary({
        totalHarvestedValue: harvest.totalHarvested,
        totalRejectedValue: harvest.totalRejected,
        classifiedTotalValue: harvest.classifiedTotal,
        dateGregorian: formatGregorianDate(harvest.dateGregorian),
        totalHarvested: numberFormatter.format(harvest.totalHarvested),
        totalRejected: numberFormatter.format(harvest.totalRejected),
        classifiedTotal: numberFormatter.format(harvest.classifiedTotal),
      });
      setIsRestoreSortingMode(true);
      prefillSortingFormForRestore(selectedDeletedSortingListRow);
    } catch {
      // silently ignore — user can retry
    }
  };

  const closeRestoreSortingForm = () => {
    closeHarvestSortingGlobalForm();
    setIsRestoreSortingMode(false);
    setRestoreHarvestSummary(null);
  };

  const handlePermanentDeleteSortingListRow = async () => {
    if (!selectedDeletedSortingListRow) return;
    setIsPermanentDeletingSortingRow(true);
    setPermanentDeleteSortingError('');
    try {
      await permanentDeleteHarvestClassification(selectedDeletedSortingListRow.id);
      setDeletedSortingListRows((rows) => rows.filter((r) => r.id !== selectedDeletedSortingListRow.id));
      setSelectedDeletedSortingListRow(null);
      setIsPermanentDeleteSortingDialogOpen(false);
    } catch {
      setIsPermanentDeleteSortingDialogOpen(false);
    } finally {
      setIsPermanentDeletingSortingRow(false);
    }
  };

  const { pageHeaderActions, filters } = useHarvestPageControls({
    lang,
    t,
    isDailyDetailsTab,
    isSortingDailyDetailsTab,
    isSortingSummaryTab,
    isHarvestSummaryTab,
    isSortingListTab,
    isSortingListTrashTab,
    detailsRecord,
    selectedHarvestRow,
    selectedSortingDailyRowId,
    openHarvestGlobalForm,
    openHarvestSortingGlobalForm: handleOpenSortingForm,
    onEditHarvestRow: handleOpenEditHarvestDialog,
    onDeleteHarvest: () => setIsDeleteHarvestDialogOpen(true),
    selectedSortingListRow,
    onEditSortingListRow: handleOpenEditSortingListDialog,
    onDeleteSortingListRow: () => setIsDeleteSortingListDialogOpen(true),
    selectedDeletedSortingListRow,
    onRestoreDeletedSortingListRow: () => { void handleOpenRestoreDeletedSortingRow(); },
    onPermanentDeleteSortingListRow: () => setIsPermanentDeleteSortingDialogOpen(true),
    activeSeasonId,
    seasonFilterId,
    seasons,
    fields,
    sortingAssignmentFilterOptions,
    harvestDateOptions,
  });

  const {
    handlePrintDetails,
    handlePrintFieldReportDetails,
    handlePrintSortingDailyDetails,
  } = useHarvestDetailsPrintActions({
    lang,
    t,
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
      pageHeaderActions={isWorker ? null : pageHeaderActions}
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
      {isWorker ? (
        <NoPermissionBanner message={lang === 'he' ? 'אין לך הרשאת גישה לאזור זה.' : "You don't have permission to access this area."} />
      ) : isHarvestSummaryTab ? (
        <HarvestFieldReportSection
          lang={lang}
          t={t}
          description={t.emptyState['harvest-summary']?.description ?? ''}
          fieldReportMethod={fieldReportMethod}
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
          summaryLabels={t.fieldReport.summary}
          numberFormatter={numberFormatter}
          formatRate={formatRate}
        />
      ) : isDailyDetailsTab ? (
        <HarvestDailyDetailsSection
          lang={lang}
          tableActionsLabel={t.tableActionsLabel}
          printAriaLabel={t.dailyDetails.printActions.printAriaLabel}
          printTitle={t.dailyDetails.printActions.printTitle}
          exportAriaLabel={t.dailyDetails.printActions.exportAriaLabel}
          exportTitle={t.dailyDetails.printActions.exportTitle}
          description={t.dailyDetails.description}
          filters={filters}
          harvestLoadError={harvestLoadError}
          isHarvestLoading={isHarvestLoading}
          loadingLabel={t.dailyDetails.loading}
          emptyLabel={t.dailyDetails.empty}
          columns={columns}
          filteredHarvestRows={filteredHarvestRows}
          selectedHarvestRowId={selectedHarvestRow?.id ?? null}
          onSelectHarvestRow={setSelectedHarvestRow}
          isSelectionDisabled={isViewingNonActiveSeason}
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
          summaryLabels={t.dailyDetails.summary}
        />
      ) : isFieldReportTab ? (
        <HarvestFieldReportSection
          lang={lang}
          t={t}
          description={content.description}
          fieldReportMethod={fieldReportMethod}
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
          summaryLabels={t.fieldReport.summary}
          numberFormatter={numberFormatter}
          formatRate={formatRate}
        />
      ) : isSortingDailyDetailsTab ? (
        <HarvestSortingDailySection
          lang={lang}
          t={t}
          description={t.sortingDailyDetails.description}
          filters={filters}
          sortingDailyLoadError={sortingDailyLoadError}
          isSortingDailyLoading={isSortingDailyLoading}
          loadingLabel={t.sortingDailyDetails.loading}
          emptyLabel={t.sortingDailyDetails.empty}
          sortingDailyColumns={sortingDailyColumns}
          filteredSortingDailyRows={filteredSortingDailyRows}
          filteredSortingDailyCategories={filteredSortingDailyCategories}
          onSortingDailySortedRowsChange={(rows) => {
            visibleSortingDailyRowsRef.current = rows;
          }}
          selectedSortingDailyRowId={selectedSortingDailyRowId}
          onSelectSortingDailyRow={setSelectedSortingDailyRowId}
          isSelectionDisabled={isViewingNonActiveSeason}
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
          sortingDailySummaryData={sortingDailySummaryData}
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
          summaryLabels={t.sortingDailyDetails.summary}
        />
      ) : isSortingListTab ? (
        <HarvestSortingListSection
          lang={lang}
          t={t}
          filters={filters}
          rows={filteredSortingListRows}
          isLoading={isSortingListLoading}
          loadError={sortingListLoadError}
          formatGregorianDate={formatGregorianDate}
          numberFormatter={numberFormatter}
          selectedRowId={selectedSortingListRow?.id ?? null}
          onRowClick={isViewingNonActiveSeason ? undefined : (row) => setSelectedSortingListRow((prev) => (prev?.id === row.id ? null : row))}
          onPrint={handlePrintSortingListTable}
          onExport={() => { void handleExportSortingListTableToExcel(); }}
        />
      ) : isSortingListTrashTab ? (
        <HarvestDeletedSortingListSection
          lang={lang}
          t={t}
          filters={filters}
          rows={filteredDeletedSortingListRows}
          isLoading={isDeletedSortingListLoading}
          loadError={deletedSortingListLoadError}
          formatGregorianDate={formatGregorianDate}
          numberFormatter={numberFormatter}
          selectedRowId={selectedDeletedSortingListRow?.id ?? null}
          onRowClick={isViewingNonActiveSeason ? undefined : (row) => setSelectedDeletedSortingListRow((prev) => (prev?.id === row.id ? null : row))}
        />
      ) : isSortingSummaryTab ? (
        <HarvestSortingSummarySection
          lang={lang}
          labels={t.sortingSummary}
          filters={filters}
          rows={filteredSortingSummaryRows}
          isLoading={isSortingListLoading}
          loadError={sortingListLoadError}
          seasonLabel={sortingSummarySeasonLabel}
          traderCategories={harvestFormTraderCategories}
        />
      ) : (
        <section className="shipments-empty-state">
          <h2 className="shipments-empty-title">{content.title}</h2>
          <p className="shipments-empty-desc">{content.description}</p>
        </section>
      )}

      <ConfirmDialog
        open={isDeleteHarvestDialogOpen}
        title={t.pageControls.deleteHarvestDialog.title}
        message={t.pageControls.deleteHarvestDialog.message}
        confirmLabel={isDeletingHarvest ? '...' : t.pageControls.deleteHarvestDialog.confirm}
        cancelLabel={t.pageControls.deleteHarvestDialog.cancel}
        onConfirm={() => { void handleDeleteHarvest(); }}
        onCancel={() => setIsDeleteHarvestDialogOpen(false)}
      />

      {selectedHarvestRow ? (
        <HarvestEditModal
          isOpen={isEditHarvestDialogOpen}
          t={t}
          lang={lang}
          fields={fields}
          dateGregorian={editHarvestDateGregorian}
          dateHebrew={editHarvestDateHebrew}
          activeSeasonYearName={activeSeasonYearName}
          fieldId={editHarvestFieldId}
          totalHarvested={editHarvestTotalHarvested}
          totalRejected={editHarvestTotalRejected}
          ownerHarvested={editHarvestOwnerHarvested}
          ownerRejected={editHarvestOwnerRejected}
          notes={editHarvestNotes}
          classifiedTotal={selectedHarvestRow.classifiedTotal}
          isPartialClassification={selectedHarvestRow.isPartialClassification}
          markAsFullClassification={editHarvestMarkFullClassification}
          onMarkAsFullClassificationChange={setEditHarvestMarkFullClassification}
          isBadPick={editHarvestIsBadPick}
          onIsBadPickChange={setEditHarvestIsBadPick}
          isSubmitting={isEditingHarvest}
          error={editHarvestError}
          onDateGregorianChange={handleEditHarvestGregorianDateChange}
          onFieldIdChange={setEditHarvestFieldId}
          onTotalHarvestedChange={setEditHarvestTotalHarvested}
          onTotalRejectedChange={setEditHarvestTotalRejected}
          onOwnerHarvestedChange={setEditHarvestOwnerHarvested}
          onOwnerRejectedChange={setEditHarvestOwnerRejected}
          onNotesChange={setEditHarvestNotes}
          onClose={() => { setIsEditHarvestDialogOpen(false); setEditHarvestError(''); setEditHarvestMarkFullClassification(false); }}
          onSubmit={() => { void handleEditHarvest(); }}
        />
      ) : null}

      {selectedSortingListRow ? (
        <HarvestSortingEditModal
          isOpen={isEditSortingListDialogOpen}
          t={t}
          row={selectedSortingListRow}
          formatGregorianDate={formatGregorianDate}
          quantity={editQuantityValue}
          onQuantityChange={setEditQuantityValue}
          isPartial={editIsPartialValue}
          onIsPartialChange={setEditIsPartialValue}
          isSubmitting={isEditingSortingListRow}
          error={editSortingListError}
          onClose={() => { setIsEditSortingListDialogOpen(false); setEditSortingListError(''); }}
          onSubmit={() => { void handleEditSortingListRow(); }}
        />
      ) : null}

      <ConfirmDialog
        open={isDeleteSortingListDialogOpen}
        title={t.pageControls.deleteSortingDialog.title}
        message={t.pageControls.deleteSortingDialog.message}
        confirmLabel={isDeletingSortingListRow ? '...' : t.pageControls.deleteSortingDialog.confirm}
        cancelLabel={t.pageControls.deleteSortingDialog.cancel}
        onConfirm={() => { void handleDeleteSortingListRow(); }}
        onCancel={() => {
          setIsDeleteSortingListDialogOpen(false);
          setDeleteSortingListError('');
        }}
      >
        {deleteSortingListError ? (
          <p className="modal-error">{deleteSortingListError}</p>
        ) : null}
      </ConfirmDialog>

      <ConfirmDialog
        open={isPermanentDeleteSortingDialogOpen}
        title={t.pageControls.permanentDeleteSortingDialog.title}
        message={t.pageControls.permanentDeleteSortingDialog.message}
        confirmLabel={isPermanentDeletingSortingRow ? '...' : t.pageControls.permanentDeleteSortingDialog.confirm}
        cancelLabel={t.pageControls.permanentDeleteSortingDialog.cancel}
        onConfirm={() => { void handlePermanentDeleteSortingListRow(); }}
        onCancel={() => {
          setIsPermanentDeleteSortingDialogOpen(false);
          setPermanentDeleteSortingError('');
        }}
      >
        {permanentDeleteSortingError ? (
          <p className="modal-error">{permanentDeleteSortingError}</p>
        ) : null}
      </ConfirmDialog>

      <HarvestBulkFormModal
        isOpen={isHarvestFormOpen}
        lang={lang}
        t={t}
        activeSeasonYearName={activeSeasonYearName}
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
        harvestFormIsBadPick={harvestFormIsBadPick}
        harvestFormRemainsInItalyGradeH={harvestFormRemainsInItalyGradeH}
        harvestFormRemainsInItalyGradeV={harvestFormRemainsInItalyGradeV}
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
        onTotalHarvestedChange={handleHarvestTotalHarvestedChange}
        onTotalRejectedChange={handleHarvestTotalRejectedChange}
        onOwnerHarvestedChange={handleHarvestOwnerHarvestedChange}
        onOwnerRejectedChange={handleHarvestOwnerRejectedChange}
        onPartialClassificationChange={setHarvestFormIsPartialClassification}
        onIsBadPickChange={setHarvestFormIsBadPick}
        onRemainsInItalyGradeHChange={setHarvestFormRemainsInItalyGradeH}
        onRemainsInItalyGradeVChange={setHarvestFormRemainsInItalyGradeV}
        onNotesChange={handleHarvestNotesChange}
        onAddClassificationDraft={addHarvestClassificationDraft}
        onRemoveClassificationDraft={removeHarvestClassificationDraft}
        onUpdateClassificationDraft={updateHarvestClassificationDraft}
        onUpdateClassificationDraftQuantity={updateHarvestClassificationDraftQuantity}
      />

      <HarvestSortingFormModal
        isOpen={isHarvestSortingFormOpen}
        restoreMode={isRestoreSortingMode}
        t={t}
        harvestOptions={isRestoreSortingMode ? restoreHarvestOptions : harvestSortingOptions}
        isLoadingHarvestOptions={!isRestoreSortingMode && isHarvestLoading}
        selectedHarvestSummary={isRestoreSortingMode ? restoreHarvestSummary : selectedHarvestSummary}
        rawTotals={
          selectedHarvestSummaryTotals
            ? {
                totalHarvested: selectedHarvestSummaryTotals.totalHarvested,
                totalRejected: selectedHarvestSummaryTotals.totalRejected,
                ownerRejected: selectedHarvestSummaryTotals.ownerRejected ?? 0,
              }
            : null
        }
        traders={traders}
        customers={customers}
        isSubmittingHarvestSortingForm={isSubmittingHarvestSortingForm}
        harvestSortingFormError={harvestSortingFormError}
        harvestSortingFormHarvestId={harvestSortingFormHarvestId}
        harvestSortingFormAssignmentType={harvestSortingFormAssignmentType}
        harvestSortingFormTraderId={harvestSortingFormTraderId}
        harvestSortingFormCustomerId={harvestSortingFormCustomerId}
        harvestSortingFormTraderCategoryId={harvestSortingFormTraderCategoryId}
        harvestSortingFormCustomerCategoryId={harvestSortingFormCustomerCategoryId}
        harvestSortingFormGrade={harvestSortingFormGrade}
        harvestSortingFormPitamStatus={harvestSortingFormPitamStatus}
        harvestSortingFormQuantity={harvestSortingFormQuantity}
        harvestSortingFormNotes={harvestSortingFormNotes}
        harvestSortingFormIsPartialClassification={harvestSortingFormIsPartialClassification}
        harvestSortingFormTotalHarvested={harvestSortingFormTotalHarvested}
        harvestSortingFormOwnerHarvested={harvestSortingFormOwnerHarvested}
        harvestSortingFormIsBadPick={harvestSortingFormIsBadPick}
        harvestSortingFormRemainsInItalyGradeH={harvestSortingFormRemainsInItalyGradeH}
        harvestSortingFormRemainsInItalyGradeV={harvestSortingFormRemainsInItalyGradeV}
        isAddingRejectedQuantity={isAddingRejectedQuantity}
        harvestSortingFormAdditionalRejected={harvestSortingFormAdditionalRejected}
        isAddingOwnerRejectedQuantity={isAddingOwnerRejectedQuantity}
        harvestSortingFormAdditionalOwnerRejected={harvestSortingFormAdditionalOwnerRejected}
        harvestFormTraderCategories={harvestFormTraderCategories}
        harvestFormCustomerCategories={harvestFormCustomerCategories}
        harvestFormClassifications={harvestFormClassifications}
        existingHarvestClassifications={harvestSortingFormExistingClassifications}
        pendingExistingClassificationEdits={pendingExistingClassificationEdits}
        onClose={isRestoreSortingMode ? closeRestoreSortingForm : closeHarvestSortingGlobalForm}
        onSubmit={() => void handleSubmitHarvestSortingGlobalForm()}
        onHarvestIdChange={setHarvestSortingFormHarvestId}
        onAssignmentTypeChange={handleHarvestSortingAssignmentTypeChange}
        onTraderIdChange={setHarvestSortingFormTraderId}
        onCustomerIdChange={handleHarvestSortingCustomerIdChange}
        onTraderCategoryIdChange={setHarvestSortingFormTraderCategoryId}
        onCustomerCategoryIdChange={setHarvestSortingFormCustomerCategoryId}
        onGradeChange={setHarvestSortingFormGrade}
        onPitamStatusChange={setHarvestSortingFormPitamStatus}
        onQuantityChange={setHarvestSortingFormQuantity}
        onNotesChange={handleHarvestSortingNotesChange}
        onPartialClassificationChange={setHarvestSortingFormIsPartialClassification}
        onTotalHarvestedChange={setHarvestSortingFormTotalHarvested}
        onOwnerHarvestedChange={setHarvestSortingFormOwnerHarvested}
        onIsBadPickChange={setHarvestSortingFormIsBadPick}
        onRemainsInItalyGradeHChange={setHarvestSortingFormRemainsInItalyGradeH}
        onRemainsInItalyGradeVChange={setHarvestSortingFormRemainsInItalyGradeV}
        onOpenAddRejectedQuantity={openAddRejectedQuantity}
        onAdditionalRejectedQuantityChange={setHarvestSortingFormAdditionalRejected}
        onRemoveAddedRejectedQuantity={removeAddedRejectedQuantity}
        onOpenAddOwnerRejectedQuantity={openAddOwnerRejectedQuantity}
        onAdditionalOwnerRejectedQuantityChange={setHarvestSortingFormAdditionalOwnerRejected}
        onRemoveAddedOwnerRejectedQuantity={removeAddedOwnerRejectedQuantity}
        onAddClassificationDraft={addHarvestClassificationDraft}
        onRemoveClassificationDraft={removeHarvestClassificationDraft}
        onUpdateClassificationDraft={updateHarvestClassificationDraft}
        onUpdateClassificationDraftQuantity={updateHarvestClassificationDraftQuantity}
        onStageExistingClassificationQuantity={handleStageExistingClassificationQuantity}
      />
    </AppShell>
  );
}

