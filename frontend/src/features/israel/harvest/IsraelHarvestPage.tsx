import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppShell } from '../../../app/layout/AppShell';
import { HARVEST_I18N } from '../../harvest/i18n';
import { ISRAEL_HARVEST_I18N } from './i18n';
import type { NavItem } from '../../../types/navigation';
import {
  getCurrentUser,
  isAuthenticated,
  logout,
} from '../../../services/authService';
import { useActiveModule } from '../../../hooks/useActiveModule';
import { SettingsIcon } from '../../../components/ui/SettingsIcon';
import { HarvestSummaryHeaderActions } from '../../harvest/components/shared/HarvestSummaryHeaderActions';
import {
  getActiveSeason,
  getSeasons,
  type Season,
} from '../../../services/seasonsApi';
import {
  getIsraelFields,
  type IsraelField,
} from '../../../services/israel/israelFieldsApi';
import {
  getIsraelFieldCategoriesBySeason,
  type IsraelFieldCategory,
} from '../../../services/israel/israelFieldCategoriesApi';
import {
  createIsraelHarvest,
  deleteIsraelHarvest,
  getIsraelHarvestsBySeason,
  updateIsraelHarvest,
  type IsraelHarvestRecord,
} from '../../../services/israel/israelHarvestsApi';
import {
  createIsraelClassification,
  deleteIsraelClassification,
  getIsraelClassificationsByHarvest,
  getIsraelClassificationsBySeason,
  getIsraelFieldCategorySummaryBySeason,
  updateIsraelClassification,
  type IsraelClassificationRecord,
  type IsraelClassificationSeasonRecord,
  type IsraelFieldCategorySummaryField,
} from '../../../services/israel/israelClassificationsApi';
import { ApiError } from '../../../services/apiClient';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import {
  getIsraelSortCategories,
  type IsraelSortCategory,
} from '../../../services/israel/israelSortCategoriesApi';
import type { GlobalScopedFilterConfig } from '../../../components/ui/GlobalScopedFilters';
import { HarvestPageHeaderActions } from '../../harvest/components/shared/HarvestPageHeaderActions';
import { IsraelHarvestFieldReportSection } from './components/field-report/IsraelHarvestFieldReportSection';
import { IsraelHarvestSortingSummarySection } from './components/sorting-summary/IsraelHarvestSortingSummarySection';
import { IsraelHarvestFieldCategorySummarySection } from './components/field-category-summary/IsraelHarvestFieldCategorySummarySection';
import { IsraelHarvestSortingListSection } from './components/sorting-list/IsraelHarvestSortingListSection';
import { IsraelHarvestSortingDailySection } from './components/sorting-daily/IsraelHarvestSortingDailySection';
import { IsraelHarvestDailyDetailsSection } from './components/daily-details/IsraelHarvestDailyDetailsSection';
import {
  IsraelHarvestBulkFormModal,
  type IsraelHarvestBulkFormSubmitPayload,
} from './components/forms/IsraelHarvestBulkFormModal';
import {
  IsraelHarvestEditModal,
  type IsraelHarvestEditSubmitPayload,
} from './components/forms/IsraelHarvestEditModal';
import {
  IsraelSortingFormModal,
  type IsraelSortingFormSubmitPayload,
} from './components/forms/IsraelSortingFormModal';
import { IsraelClassificationEditModal } from './components/forms/IsraelClassificationEditModal';
import { buildIsraelHarvestFieldReportRows } from './utils/israelHarvestFieldReport.util';
import { buildIsraelSortingDailyRows } from './utils/israelHarvestSortingDaily.util';
import type { IsraelHarvestFieldReportRow } from './israelHarvestPage.types';
import { downloadStyledExcel } from '../../../services/exportExcel';
import { HARVEST_PRINT_BASE_STYLE } from '../../harvest/services/harvestPrintStyles';
import { formatHarvestGregorianDate } from '../../harvest/services/harvestDisplayFormatters.service';

const DEFAULT_SIDEBAR_ITEM_ID = 'harvest-summary';

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function IsraelHarvestPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const activeModule = useActiveModule();
  const [activeTopId, setActiveTopId] = useState('workers');
  const currentUser = getCurrentUser();
  const [alertsCount, setAlertsCount] = useState<number>(0);

  useEffect(() => {
    import('../../../services/messagesApi').then(({ fetchUnreadCount }) => {
      fetchUnreadCount()
        .then((res) => setAlertsCount(res.count))
        .catch(() => setAlertsCount(0));
    });
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
    }
  }, [navigate]);

  const lang = useMemo(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('app.language');
      if (stored && (stored === 'en' || stored === 'he')) return stored;
    }
    return 'he';
  }, []);
  const topNavT = HARVEST_I18N[lang];
  const t = ISRAEL_HARVEST_I18N[lang];

  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(lang === 'he' ? 'he-IL' : 'en-GB'),
    [lang],
  );

  const activeSidebarId = useMemo(() => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    const subRoute = pathParts[2];
    return subRoute || DEFAULT_SIDEBAR_ITEM_ID;
  }, [location.pathname]);

  const isHarvestSummaryTab = activeSidebarId === 'harvest-summary';
  const isSortingSummaryTab = activeSidebarId === 'sorting-summary';
  const isFieldCategorySummaryTab =
    activeSidebarId === 'sorting-summary-field-categories';
  const isDailyDetailsTab = activeSidebarId === 'harvest-daily-details';
  const isSortingListTab = activeSidebarId === 'sorting-list';
  const isSortingDailyDetailsTab = activeSidebarId === 'sorting-daily-details';

  const content = useMemo(() => {
    return t.emptyState[activeSidebarId] ?? t.emptyState.default;
  }, [activeSidebarId, t.emptyState]);

  const handleTopNavClick = (item: NavItem) => {
    setActiveTopId(item.id);
    navigate(item.href || `/${item.id}`);
  };

  const handleSidebarClick = (item: NavItem) => {
    navigate(`/${activeModule}${item.href || `/harvest/${item.id}`}`);
  };

  const [seasons, setSeasons] = useState<Season[]>([]);
  const [activeSeasonId, setActiveSeasonId] = useState<number | null>(null);
  const [seasonFilterId, setSeasonFilterId] = useState<number | null>(null);
  const [fields, setFields] = useState<IsraelField[]>([]);
  const [fieldCategories, setFieldCategories] = useState<IsraelFieldCategory[]>(
    [],
  );
  const [harvestRecords, setHarvestRecords] = useState<IsraelHarvestRecord[]>(
    [],
  );
  const [isHarvestLoading, setIsHarvestLoading] = useState(false);
  const [harvestLoadError, setHarvestLoadError] = useState('');
  const [isHarvestFormOpen, setIsHarvestFormOpen] = useState(false);
  const [isSubmittingHarvest, setIsSubmittingHarvest] = useState(false);
  const [isSortingFormOpen, setIsSortingFormOpen] = useState(false);
  const [isSubmittingSorting, setIsSubmittingSorting] = useState(false);
  const [sortCategories, setSortCategories] = useState<IsraelSortCategory[]>(
    [],
  );
  const [classificationRows, setClassificationRows] = useState<
    IsraelClassificationSeasonRecord[]
  >([]);
  const [isClassificationsLoading, setIsClassificationsLoading] =
    useState(false);
  const [classificationsLoadError, setClassificationsLoadError] = useState('');
  const [fieldCategorySummary, setFieldCategorySummary] = useState<
    IsraelFieldCategorySummaryField[]
  >([]);
  const [isFieldCategorySummaryLoading, setIsFieldCategorySummaryLoading] =
    useState(false);
  const [fieldCategorySummaryLoadError, setFieldCategorySummaryLoadError] =
    useState('');
  const [selectedSortingListRow, setSelectedSortingListRow] =
    useState<IsraelClassificationSeasonRecord | null>(null);
  const [isEditSortingOpen, setIsEditSortingOpen] = useState(false);
  const [editSortingQuantity, setEditSortingQuantity] = useState(0);
  const [editSortingNotes, setEditSortingNotes] = useState('');
  const [isSubmittingSortingEdit, setIsSubmittingSortingEdit] =
    useState(false);
  const [editSortingError, setEditSortingError] = useState('');
  const [isDeleteSortingDialogOpen, setIsDeleteSortingDialogOpen] =
    useState(false);
  const [isDeletingSorting, setIsDeletingSorting] = useState(false);

  useEffect(() => {
    const state = location.state as Record<string, unknown> | null;
    if (state?.openHarvestForm) {
      setIsHarvestFormOpen(true);
      navigate(location.pathname, { replace: true, state: null });
    } else if (state?.openSortingForm) {
      setIsSortingFormOpen(true);
      navigate(location.pathname, { replace: true, state: null });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  useEffect(() => {
    if (
      !isHarvestSummaryTab &&
      !isSortingSummaryTab &&
      !isFieldCategorySummaryTab &&
      !isDailyDetailsTab &&
      !isSortingListTab &&
      !isSortingDailyDetailsTab
    ) {
      return;
    }

    Promise.all([getSeasons(), getActiveSeason().catch(() => null)])
      .then(([seasonList, activeSeason]) => {
        setSeasons(seasonList);
        const resolvedActiveId =
          activeSeason?.id ??
          seasonList.find((season) => season.isActive)?.id ??
          null;
        setActiveSeasonId(resolvedActiveId);
        setSeasonFilterId((current) => current ?? resolvedActiveId);
      })
      .catch(() => {
        setSeasons([]);
      });

    getIsraelFields()
      .then(setFields)
      .catch(() => setFields([]));

    getIsraelSortCategories()
      .then(setSortCategories)
      .catch(() => setSortCategories([]));
  }, [
    isHarvestSummaryTab,
    isSortingSummaryTab,
    isFieldCategorySummaryTab,
    isDailyDetailsTab,
    isSortingListTab,
    isSortingDailyDetailsTab,
  ]);

  const loadFieldCategorySummary = useCallback(() => {
    if (seasonFilterId === null) {
      return;
    }

    setIsFieldCategorySummaryLoading(true);
    setFieldCategorySummaryLoadError('');
    getIsraelFieldCategorySummaryBySeason(seasonFilterId)
      .then((records) => setFieldCategorySummary(records))
      .catch(() =>
        setFieldCategorySummaryLoadError(t.fieldCategorySummary.loadError),
      )
      .finally(() => setIsFieldCategorySummaryLoading(false));
  }, [seasonFilterId, t.fieldCategorySummary.loadError]);

  useEffect(() => {
    if (!isFieldCategorySummaryTab) {
      return;
    }

    loadFieldCategorySummary();
  }, [isFieldCategorySummaryTab, loadFieldCategorySummary]);

  const loadClassifications = useCallback(() => {
    if (seasonFilterId === null) {
      return;
    }

    setIsClassificationsLoading(true);
    setClassificationsLoadError('');
    getIsraelClassificationsBySeason(seasonFilterId)
      .then((records) => setClassificationRows(records))
      .catch(() => setClassificationsLoadError(t.sortingSummary.loadError))
      .finally(() => setIsClassificationsLoading(false));
  }, [seasonFilterId, t.sortingSummary.loadError]);

  useEffect(() => {
    if (
      (!isSortingSummaryTab &&
        !isSortingListTab &&
        !isSortingDailyDetailsTab &&
        !isDailyDetailsTab) ||
      seasonFilterId === null
    ) {
      return;
    }

    loadClassifications();
  }, [
    isSortingSummaryTab,
    isSortingListTab,
    isSortingDailyDetailsTab,
    isDailyDetailsTab,
    seasonFilterId,
    loadClassifications,
  ]);

  useEffect(() => {
    if (
      (!isHarvestSummaryTab &&
        !isSortingSummaryTab &&
        !isDailyDetailsTab &&
        !isSortingListTab &&
        !isSortingDailyDetailsTab &&
        !isFieldCategorySummaryTab) ||
      seasonFilterId === null
    ) {
      return;
    }

    getIsraelFieldCategoriesBySeason(seasonFilterId)
      .then(setFieldCategories)
      .catch(() => setFieldCategories([]));
  }, [
    isHarvestSummaryTab,
    isSortingSummaryTab,
    isDailyDetailsTab,
    isSortingListTab,
    isSortingDailyDetailsTab,
    isFieldCategorySummaryTab,
    seasonFilterId,
  ]);

  const loadHarvestRecords = useCallback(() => {
    if (seasonFilterId === null) {
      return;
    }

    setIsHarvestLoading(true);
    setHarvestLoadError('');
    getIsraelHarvestsBySeason(seasonFilterId)
      .then((records) => setHarvestRecords(records))
      .catch(() => setHarvestLoadError(t.fieldReport.loadError))
      .finally(() => setIsHarvestLoading(false));
  }, [seasonFilterId, t.fieldReport.loadError]);

  useEffect(() => {
    if (
      (!isHarvestSummaryTab &&
        !isSortingSummaryTab &&
        !isDailyDetailsTab &&
        !isSortingListTab &&
        !isSortingDailyDetailsTab &&
        !isFieldCategorySummaryTab) ||
      seasonFilterId === null
    ) {
      return;
    }

    loadHarvestRecords();
  }, [
    isHarvestSummaryTab,
    isSortingSummaryTab,
    isDailyDetailsTab,
    isSortingListTab,
    isSortingDailyDetailsTab,
    isFieldCategorySummaryTab,
    seasonFilterId,
    loadHarvestRecords,
  ]);

  const fieldReportRows = useMemo(
    () => buildIsraelHarvestFieldReportRows(harvestRecords),
    [harvestRecords],
  );

  const [selectedFieldReportRow, setSelectedFieldReportRow] =
    useState<IsraelHarvestFieldReportRow | null>(null);
  const fieldReportDetailsPrintRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isHarvestSummaryTab) {
      setSelectedFieldReportRow(null);
    }
  }, [isHarvestSummaryTab]);

  const fieldReportDetailsRows = useMemo(() => {
    if (!selectedFieldReportRow) {
      return [];
    }
    return harvestRecords.filter(
      (record) => record.fieldId === selectedFieldReportRow.id,
    );
  }, [harvestRecords, selectedFieldReportRow]);

  const handlePrintFieldReportDetails = () => {
    if (typeof window === 'undefined' || !fieldReportDetailsPrintRef.current) {
      return;
    }

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html lang="${lang === 'he' ? 'he' : 'en'}" dir="${lang === 'he' ? 'rtl' : 'ltr'}">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${escapeHtml(t.fieldReport.detailsPanel.printWindowTitle)}</title>
          <style>${HARVEST_PRINT_BASE_STYLE}</style>
        </head>
        <body>
          <h1>${escapeHtml(t.fieldReport.detailsPanel.printWindowTitle)}</h1>
          ${fieldReportDetailsPrintRef.current.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  useEffect(() => {
    if (!isSortingListTab) {
      setSelectedSortingListRow(null);
    }
  }, [isSortingListTab]);

  const [selectedSortingDailyHarvestId, setSelectedSortingDailyHarvestId] =
    useState<number | null>(null);
  const [isSortingDailyDetailsPanelOpen, setIsSortingDailyDetailsPanelOpen] =
    useState(false);
  const sortingDailyDetailsPrintRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isSortingDailyDetailsTab) {
      setSelectedSortingDailyHarvestId(null);
      setIsSortingDailyDetailsPanelOpen(false);
    }
  }, [isSortingDailyDetailsTab]);

  const handlePrintSortingDailyDetails = () => {
    if (
      typeof window === 'undefined' ||
      !sortingDailyDetailsPrintRef.current
    ) {
      return;
    }

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html lang="${lang === 'he' ? 'he' : 'en'}" dir="${lang === 'he' ? 'rtl' : 'ltr'}">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${escapeHtml(t.sortingDailyDetails.detailsPanel.printWindowTitle)}</title>
          <style>${HARVEST_PRINT_BASE_STYLE}</style>
        </head>
        <body>
          <h1>${escapeHtml(t.sortingDailyDetails.detailsPanel.printWindowTitle)}</h1>
          ${sortingDailyDetailsPrintRef.current.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const sortingDailyCategoryOrder = useMemo(() => {
    const map = new Map<string, number>();
    for (const category of sortCategories) {
      map.set(category.name, category.orderIndex);
    }
    return map;
  }, [sortCategories]);

  const sortingDailyAllCategoryNames = useMemo(
    () => sortCategories.map((category) => category.name),
    [sortCategories],
  );

  const handlePrintSortingDailyTable = () => {
    if (typeof window === 'undefined') {
      return;
    }

    const { rows: dailyRows, categories } = buildIsraelSortingDailyRows(
      filteredClassificationRows,
      sortingDailyCategoryOrder,
      sortingDailyAllCategoryNames,
    );

    const header = [
      t.sortingDailyDetails.columns.dateGregorian,
      t.sortingDailyDetails.columns.dateHebrew,
      t.sortingDailyDetails.columns.fieldName,
      ...categories,
      t.sortingDailyDetails.columns.total,
    ];

    const rows = dailyRows.map((row) => [
      formatHarvestGregorianDate(row.dateGregorian, lang),
      row.dateHebrew,
      row.fieldName,
      ...categories.map((category) =>
        numberFormatter.format(row.categoryTotals[category] ?? 0),
      ),
      numberFormatter.format(row.totalSorted),
    ]);

    const tableHeaderHtml = header
      .map((label) => `<th>${escapeHtml(String(label))}</th>`)
      .join('');
    const tableRowsHtml = rows
      .map(
        (row) =>
          `<tr>${row.map((value) => `<td>${escapeHtml(String(value))}</td>`).join('')}</tr>`,
      )
      .join('');

    const printWindow = window.open('', '_blank', 'width=1100,height=760');
    if (!printWindow) {
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html lang="${lang === 'he' ? 'he' : 'en'}" dir="${lang === 'he' ? 'rtl' : 'ltr'}">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${escapeHtml(t.sortingDailyDetails.printWindowTitle)}</title>
          <style>${HARVEST_PRINT_BASE_STYLE}</style>
        </head>
        <body>
          <h1>${escapeHtml(t.sortingDailyDetails.printWindowTitle)}</h1>
          <table>
            <thead><tr>${tableHeaderHtml}</tr></thead>
            <tbody>${tableRowsHtml}</tbody>
          </table>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const handleExportSortingDailyTableToExcel = async () => {
    const { rows: dailyRows, categories } = buildIsraelSortingDailyRows(
      filteredClassificationRows,
      sortingDailyCategoryOrder,
      sortingDailyAllCategoryNames,
    );

    const header = [
      t.sortingDailyDetails.columns.dateGregorian,
      t.sortingDailyDetails.columns.dateHebrew,
      t.sortingDailyDetails.columns.fieldName,
      ...categories,
      t.sortingDailyDetails.columns.total,
    ];

    const rows = dailyRows.map((row) => [
      formatHarvestGregorianDate(row.dateGregorian, lang),
      row.dateHebrew,
      row.fieldName,
      ...categories.map((category) => row.categoryTotals[category] ?? 0),
      row.totalSorted,
    ]);
    const dateStamp = new Date().toISOString().slice(0, 10);

    try {
      await downloadStyledExcel({
        sheetName: t.sortingDailyDetails.sheetName,
        fileName: `israel-harvest-sorting-daily-${dateStamp}.xlsx`,
        header,
        rows,
        rightToLeft: lang === 'he',
      });
    } catch {
      window.alert(t.sortingDailyDetails.exportError);
    }
  };

  const handleEditSortingListRow = () => {
    if (!selectedSortingListRow) {
      return;
    }
    setEditSortingQuantity(selectedSortingListRow.quantity);
    setEditSortingNotes(selectedSortingListRow.notes ?? '');
    setEditSortingError('');
    setIsEditSortingOpen(true);
  };

  const handleSubmitEditSortingListRow = async () => {
    if (!selectedSortingListRow) {
      return;
    }
    if (editSortingQuantity < 1) {
      return;
    }

    setIsSubmittingSortingEdit(true);
    setEditSortingError('');
    try {
      await updateIsraelClassification(selectedSortingListRow.id, {
        quantity: editSortingQuantity,
        notes: editSortingNotes || undefined,
      });
      setIsEditSortingOpen(false);
      setSelectedSortingListRow(null);
      loadClassifications();
    } catch {
      setEditSortingError(t.pageControls.editSortingDialog.saveFailedError);
    } finally {
      setIsSubmittingSortingEdit(false);
    }
  };

  const handleDeleteSortingListRow = async () => {
    if (!selectedSortingListRow) {
      return;
    }

    setIsDeletingSorting(true);
    try {
      await deleteIsraelClassification(selectedSortingListRow.id);
      setSelectedSortingListRow(null);
      setIsDeleteSortingDialogOpen(false);
      loadClassifications();
    } catch {
      window.alert(t.pageControls.deleteSortingFailedError);
    } finally {
      setIsDeletingSorting(false);
    }
  };

  const [selectedDailyHarvest, setSelectedDailyHarvest] =
    useState<IsraelHarvestRecord | null>(null);
  const [isDailyDetailsPanelOpen, setIsDailyDetailsPanelOpen] =
    useState(false);
  const [dailyRelatedSortings, setDailyRelatedSortings] = useState<
    IsraelClassificationRecord[]
  >([]);
  const [isDailyRelatedSortingsLoading, setIsDailyRelatedSortingsLoading] =
    useState(false);
  const [dailyRelatedSortingsLoadError, setDailyRelatedSortingsLoadError] =
    useState('');
  const [isDeleteHarvestDialogOpen, setIsDeleteHarvestDialogOpen] =
    useState(false);
  const [isDeletingHarvest, setIsDeletingHarvest] = useState(false);
  const [isEditHarvestFormOpen, setIsEditHarvestFormOpen] = useState(false);
  const [isSubmittingHarvestEdit, setIsSubmittingHarvestEdit] =
    useState(false);
  const detailsPrintRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isDailyDetailsTab) {
      setSelectedDailyHarvest(null);
      setIsDailyDetailsPanelOpen(false);
    }
  }, [isDailyDetailsTab]);

  useEffect(() => {
    if (!selectedDailyHarvest) {
      setDailyRelatedSortings([]);
      setDailyRelatedSortingsLoadError('');
      return;
    }

    setIsDailyRelatedSortingsLoading(true);
    setDailyRelatedSortingsLoadError('');
    getIsraelClassificationsByHarvest(selectedDailyHarvest.id)
      .then(setDailyRelatedSortings)
      .catch(() =>
        setDailyRelatedSortingsLoadError(
          t.dailyDetails.detailsPanel.relatedSortingsLoadError,
        ),
      )
      .finally(() => setIsDailyRelatedSortingsLoading(false));
  }, [selectedDailyHarvest, t.dailyDetails.detailsPanel.relatedSortingsLoadError]);

  const handlePrintDailyDetailsTable = () => {
    if (typeof window === 'undefined') {
      return;
    }

    const header = [
      t.dailyDetails.columns.fieldName,
      t.dailyDetails.columns.dateGregorian,
      t.dailyDetails.columns.dateHebrew,
      t.dailyDetails.columns.quantity,
      t.dailyDetails.columns.totalSorted,
      t.dailyDetails.columns.updatedBy,
      t.dailyDetails.columns.notes,
    ];
    const rows = harvestRecords.map((row) => [
      row.field?.name ?? '',
      formatHarvestGregorianDate(row.dateGregorian, lang),
      row.dateHebrew,
      numberFormatter.format(row.quantity),
      numberFormatter.format(sortedQuantityByHarvestId.get(row.id) ?? 0),
      row.updatedBy?.name ?? '',
      row.notes ?? '',
    ]);

    const tableHeaderHtml = header
      .map((label) => `<th>${escapeHtml(String(label))}</th>`)
      .join('');
    const tableRowsHtml = rows
      .map(
        (row) =>
          `<tr>${row.map((value) => `<td>${escapeHtml(String(value))}</td>`).join('')}</tr>`,
      )
      .join('');

    const printWindow = window.open('', '_blank', 'width=1100,height=760');
    if (!printWindow) {
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html lang="${lang === 'he' ? 'he' : 'en'}" dir="${lang === 'he' ? 'rtl' : 'ltr'}">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${escapeHtml(t.dailyDetails.printWindowTitle)}</title>
          <style>${HARVEST_PRINT_BASE_STYLE}</style>
        </head>
        <body>
          <h1>${escapeHtml(t.dailyDetails.printWindowTitle)}</h1>
          <table>
            <thead><tr>${tableHeaderHtml}</tr></thead>
            <tbody>${tableRowsHtml}</tbody>
          </table>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const handleExportDailyDetailsTableToExcel = async () => {
    const header = [
      t.dailyDetails.columns.fieldName,
      t.dailyDetails.columns.dateGregorian,
      t.dailyDetails.columns.dateHebrew,
      t.dailyDetails.columns.quantity,
      t.dailyDetails.columns.totalSorted,
      t.dailyDetails.columns.updatedBy,
      t.dailyDetails.columns.notes,
    ];
    const rows = harvestRecords.map((row) => [
      row.field?.name ?? '',
      formatHarvestGregorianDate(row.dateGregorian, lang),
      row.dateHebrew,
      row.quantity,
      sortedQuantityByHarvestId.get(row.id) ?? 0,
      row.updatedBy?.name ?? '',
      row.notes ?? '',
    ]);
    const dateStamp = new Date().toISOString().slice(0, 10);

    try {
      await downloadStyledExcel({
        sheetName: t.dailyDetails.sheetName,
        fileName: `israel-harvest-daily-details-${dateStamp}.xlsx`,
        header,
        rows,
        rightToLeft: lang === 'he',
      });
    } catch {
      window.alert(t.dailyDetails.exportError);
    }
  };

  const handlePrintDailyDetails = () => {
    if (typeof window === 'undefined' || !detailsPrintRef.current) {
      return;
    }

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html lang="${lang === 'he' ? 'he' : 'en'}" dir="${lang === 'he' ? 'rtl' : 'ltr'}">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${escapeHtml(t.dailyDetails.detailsPanel.printWindowTitle)}</title>
          <style>${HARVEST_PRINT_BASE_STYLE}</style>
        </head>
        <body>
          <h1>${escapeHtml(t.dailyDetails.detailsPanel.printWindowTitle)}</h1>
          ${detailsPrintRef.current.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const handleEditDailyHarvest = async (
    payload: IsraelHarvestEditSubmitPayload,
  ) => {
    if (!selectedDailyHarvest) {
      return;
    }

    setIsSubmittingHarvestEdit(true);
    try {
      const updated = await updateIsraelHarvest(selectedDailyHarvest.id, {
        fieldId: payload.fieldId,
        dateGregorian: payload.dateGregorian,
        dateHebrew: payload.dateHebrew,
        quantity: payload.quantity,
        notes: payload.notes || undefined,
      });

      const classificationKey = (row: {
        fieldCategoryId: number;
        categoryId: number;
        grade: string;
        pitamStatus: string;
      }) =>
        `${row.fieldCategoryId}:${row.categoryId}:${row.grade}:${row.pitamStatus}`;

      const remainingNewRows = new Map(
        payload.classifications.map((row) => [classificationKey(row), row]),
      );
      let hasClassificationError = false;

      for (const record of dailyRelatedSortings) {
        const key = classificationKey(record);
        const match = remainingNewRows.get(key);

        if (match) {
          remainingNewRows.delete(key);
          const notesChanged = (match.notes || '') !== (record.notes || '');
          if (match.quantity !== record.quantity || notesChanged) {
            try {
              await updateIsraelClassification(record.id, {
                quantity: match.quantity,
                notes: match.notes || undefined,
              });
            } catch {
              hasClassificationError = true;
            }
          }
        } else {
          try {
            await deleteIsraelClassification(record.id);
          } catch {
            hasClassificationError = true;
          }
        }
      }

      for (const newRow of remainingNewRows.values()) {
        try {
          await createIsraelClassification({
            harvestId: selectedDailyHarvest.id,
            fieldCategoryId: newRow.fieldCategoryId,
            categoryId: newRow.categoryId,
            grade: newRow.grade,
            pitamStatus: newRow.pitamStatus,
            quantity: newRow.quantity,
            notes: newRow.notes || undefined,
          });
        } catch {
          hasClassificationError = true;
        }
      }

      setHarvestRecords((rows) =>
        rows.map((row) => (row.id === updated.id ? updated : row)),
      );
      setSelectedDailyHarvest(updated);
      setIsEditHarvestFormOpen(false);

      if (hasClassificationError) {
        window.alert(t.editHarvestForm.classificationsSaveFailedError);
      }
    } catch {
      window.alert(t.editHarvestForm.saveFailedError);
    } finally {
      setIsSubmittingHarvestEdit(false);
    }
  };

  const handleDeleteDailyHarvest = async () => {
    if (!selectedDailyHarvest) {
      return;
    }

    setIsDeletingHarvest(true);
    try {
      await deleteIsraelHarvest(selectedDailyHarvest.id);
      setHarvestRecords((rows) =>
        rows.filter((row) => row.id !== selectedDailyHarvest.id),
      );
      setSelectedDailyHarvest(null);
      setIsDeleteHarvestDialogOpen(false);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        window.alert(t.pageControls.deleteHarvestHasSortingsTitle);
      } else {
        window.alert(t.pageControls.deleteHarvestFailedError);
      }
    } finally {
      setIsDeletingHarvest(false);
    }
  };

  const [sortingDateFilterId, setSortingDateFilterId] = useState<string>('all');
  const [sortingFieldFilterId, setSortingFieldFilterId] = useState<
    number | 'all'
  >('all');
  const [sortingFieldCategoryFilterId, setSortingFieldCategoryFilterId] =
    useState<number | 'all'>('all');

  const sortingHarvestDateOptions = useMemo(() => {
    const uniqueDates = [
      ...new Set(
        classificationRows
          .map((row) => (row.harvest?.dateGregorian ?? '').slice(0, 10))
          .filter((date) => date !== ''),
      ),
    ];
    uniqueDates.sort((a, b) => b.localeCompare(a));
    return [
      { value: 'all', label: t.sortingSummary.filters.allDatesOption },
      ...uniqueDates.map((date) => ({
        value: date,
        label: formatHarvestGregorianDate(date, lang),
      })),
    ];
  }, [classificationRows, t.sortingSummary.filters.allDatesOption, lang]);

  const sortedQuantityByHarvestId = useMemo(() => {
    const totals = new Map<number, number>();
    for (const row of classificationRows) {
      totals.set(row.harvestId, (totals.get(row.harvestId) ?? 0) + row.quantity);
    }
    return totals;
  }, [classificationRows]);

  const filteredClassificationRows = useMemo(() => {
    return classificationRows.filter((row) => {
      if (
        sortingDateFilterId !== 'all' &&
        (row.harvest?.dateGregorian ?? '').slice(0, 10) !== sortingDateFilterId
      ) {
        return false;
      }
      if (
        sortingFieldFilterId !== 'all' &&
        row.harvest?.fieldId !== sortingFieldFilterId
      ) {
        return false;
      }
      if (
        sortingFieldCategoryFilterId !== 'all' &&
        row.fieldCategoryId !== sortingFieldCategoryFilterId
      ) {
        return false;
      }
      return true;
    });
  }, [
    classificationRows,
    sortingDateFilterId,
    sortingFieldFilterId,
    sortingFieldCategoryFilterId,
  ]);

  const sortingSummaryFilters = useMemo<GlobalScopedFilterConfig[]>(() => {
    const seasonFilter: GlobalScopedFilterConfig = {
      key: 'seasonId',
      label: t.sortingSummary.seasonFilterLabel,
      defaultValue: activeSeasonId ? String(activeSeasonId) : '',
      queryParam: 'ihsSeason',
      options:
        seasons.length > 0
          ? seasons.map((season) => ({
              value: String(season.id),
              label: `${season.yearName}${season.isActive ? ` (${lang === 'he' ? 'פעילה' : 'Active'})` : ''}`,
            }))
          : [
              {
                value: '',
                label:
                  lang === 'he'
                    ? 'אין עונה פעילה כרגע'
                    : 'No active season right now',
              },
            ],
    };

    const dateFilter: GlobalScopedFilterConfig = {
      key: 'harvestDate',
      label: t.sortingSummary.filters.dateFilterLabel,
      defaultValue: 'all',
      queryParam: 'ihsDate',
      options: sortingHarvestDateOptions,
      type: 'calendar',
      lang,
    };

    const fieldFilter: GlobalScopedFilterConfig = {
      key: 'fieldId',
      label: t.sortingSummary.filters.fieldFilterLabel,
      defaultValue: 'all',
      queryParam: 'ihsField',
      options: [
        { value: 'all', label: t.sortingSummary.filters.allFieldsOption },
        ...fields.map((field) => ({
          value: String(field.id),
          label: field.name,
        })),
      ],
    };

    const fieldCategoryFilter: GlobalScopedFilterConfig = {
      key: 'fieldCategoryId',
      label: t.sortingSummary.filters.fieldCategoryFilterLabel,
      defaultValue: 'all',
      queryParam: 'ihsFieldCategory',
      options: [
        { value: 'all', label: t.sortingSummary.filters.allFieldCategoriesOption },
        ...fieldCategories.map((fieldCategory) => ({
          value: String(fieldCategory.id),
          label: fieldCategory.name,
        })),
      ],
    };

    return [seasonFilter, dateFilter, fieldFilter, fieldCategoryFilter];
  }, [
    activeSeasonId,
    fields,
    fieldCategories,
    lang,
    seasons,
    sortingHarvestDateOptions,
    t.sortingSummary.seasonFilterLabel,
    t.sortingSummary.filters,
  ]);

  const handleSortingSummaryFiltersChange = useCallback(
    (values: Record<string, string>) => {
      const parsedSeason = Number(values.seasonId);
      setSeasonFilterId(
        Number.isFinite(parsedSeason) && parsedSeason > 0 ? parsedSeason : null,
      );
      setSortingDateFilterId(values.harvestDate || 'all');
      const parsedField = Number(values.fieldId);
      setSortingFieldFilterId(
        values.fieldId &&
          values.fieldId !== 'all' &&
          Number.isFinite(parsedField)
          ? parsedField
          : 'all',
      );
      const parsedFieldCategory = Number(values.fieldCategoryId);
      setSortingFieldCategoryFilterId(
        values.fieldCategoryId &&
          values.fieldCategoryId !== 'all' &&
          Number.isFinite(parsedFieldCategory)
          ? parsedFieldCategory
          : 'all',
      );
    },
    [],
  );

  const fieldCategorySummaryFilters = useMemo<GlobalScopedFilterConfig[]>(() => {
    const seasonFilter: GlobalScopedFilterConfig = {
      key: 'seasonId',
      label: t.fieldCategorySummary.seasonFilterLabel,
      defaultValue: activeSeasonId ? String(activeSeasonId) : '',
      queryParam: 'ihfcsSeason',
      options:
        seasons.length > 0
          ? seasons.map((season) => ({
              value: String(season.id),
              label: `${season.yearName}${season.isActive ? ` (${lang === 'he' ? 'פעילה' : 'Active'})` : ''}`,
            }))
          : [
              {
                value: '',
                label:
                  lang === 'he'
                    ? 'אין עונה פעילה כרגע'
                    : 'No active season right now',
              },
            ],
    };

    return [seasonFilter];
  }, [
    activeSeasonId,
    lang,
    seasons,
    t.fieldCategorySummary.seasonFilterLabel,
  ]);

  const handleFieldCategorySummaryFiltersChange = useCallback(
    (values: Record<string, string>) => {
      const parsedSeason = Number(values.seasonId);
      setSeasonFilterId(
        Number.isFinite(parsedSeason) && parsedSeason > 0 ? parsedSeason : null,
      );
    },
    [],
  );

  const filters = useMemo<GlobalScopedFilterConfig[]>(() => {
    const seasonFilter: GlobalScopedFilterConfig = {
      key: 'seasonId',
      label: t.fieldReport.seasonFilterLabel,
      defaultValue: activeSeasonId ? String(activeSeasonId) : '',
      queryParam: 'ihSeason',
      options:
        seasons.length > 0
          ? seasons.map((season) => ({
              value: String(season.id),
              label: `${season.yearName}${season.isActive ? ` (${lang === 'he' ? 'פעילה' : 'Active'})` : ''}`,
            }))
          : [
              {
                value: '',
                label:
                  lang === 'he'
                    ? 'אין עונה פעילה כרגע'
                    : 'No active season right now',
              },
            ],
    };

    return [seasonFilter];
  }, [activeSeasonId, seasons, t.fieldReport.seasonFilterLabel, lang]);

  const handleFiltersChange = useCallback((values: Record<string, string>) => {
    const parsed = Number(values.seasonId);
    setSeasonFilterId(Number.isFinite(parsed) && parsed > 0 ? parsed : null);
  }, []);

  const handleAddHarvest = async (
    payload: IsraelHarvestBulkFormSubmitPayload,
  ) => {
    if (seasonFilterId === null) {
      return;
    }

    setIsSubmittingHarvest(true);
    try {
      const createdHarvest = await createIsraelHarvest({
        seasonId: seasonFilterId,
        fieldId: payload.fieldId,
        dateGregorian: payload.dateGregorian,
        dateHebrew: payload.dateHebrew,
        quantity: payload.quantity,
        notes: payload.notes || undefined,
      });

      if (payload.classifications.length > 0) {
        try {
          for (const classification of payload.classifications) {
            await createIsraelClassification({
              harvestId: createdHarvest.id,
              fieldCategoryId: classification.fieldCategoryId,
              categoryId: classification.categoryId,
              grade: classification.grade,
              pitamStatus: classification.pitamStatus,
              quantity: classification.quantity,
              notes: classification.notes || undefined,
            });
          }
        } catch {
          window.alert(t.harvestForm.sortingSaveFailedError);
        }
      }

      setIsHarvestFormOpen(false);
      loadHarvestRecords();
      if (isSortingSummaryTab || isSortingListTab || isSortingDailyDetailsTab) {
        loadClassifications();
      }
      if (isFieldCategorySummaryTab) {
        loadFieldCategorySummary();
      }
    } catch {
      window.alert(t.harvestForm.saveFailedError);
    } finally {
      setIsSubmittingHarvest(false);
    }
  };

  const handleAddSorting = async (payload: IsraelSortingFormSubmitPayload) => {
    setIsSubmittingSorting(true);
    try {
      for (const update of payload.existingClassificationUpdates) {
        await updateIsraelClassification(update.id, {
          quantity: update.quantity,
        });
      }
      for (const classification of payload.classifications) {
        await createIsraelClassification({
          harvestId: payload.harvestId,
          fieldCategoryId: classification.fieldCategoryId,
          categoryId: classification.categoryId,
          grade: classification.grade,
          pitamStatus: classification.pitamStatus,
          quantity: classification.quantity,
          notes: classification.notes || undefined,
        });
      }
      setIsSortingFormOpen(false);
      loadHarvestRecords();
      if (isSortingSummaryTab || isSortingListTab || isSortingDailyDetailsTab) {
        loadClassifications();
      }
      if (isFieldCategorySummaryTab) {
        loadFieldCategorySummary();
      }
    } catch {
      window.alert(t.sortingForm.saveFailedError);
    } finally {
      setIsSubmittingSorting(false);
    }
  };

  const handlePrintFieldReportTable = () => {
    if (typeof window === 'undefined') {
      return;
    }

    const header = [
      t.fieldReport.columns.fieldName,
      t.fieldReport.columns.recordCount,
      t.fieldReport.columns.totalQuantity,
      t.fieldReport.columns.avgQuantityPerHarvest,
    ];
    const rows = fieldReportRows.map((row) => [
      row.fieldName,
      numberFormatter.format(row.recordCount),
      numberFormatter.format(row.totalQuantity),
      numberFormatter.format(Math.round(row.avgQuantityPerHarvest)),
    ]);

    const tableHeaderHtml = header
      .map((label) => `<th>${escapeHtml(String(label))}</th>`)
      .join('');
    const tableRowsHtml = rows
      .map(
        (row) =>
          `<tr>${row.map((value) => `<td>${escapeHtml(String(value))}</td>`).join('')}</tr>`,
      )
      .join('');

    const printWindow = window.open('', '_blank', 'width=1100,height=760');
    if (!printWindow) {
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html lang="${lang === 'he' ? 'he' : 'en'}" dir="${lang === 'he' ? 'rtl' : 'ltr'}">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${escapeHtml(t.fieldReport.printWindowTitle)}</title>
          <style>${HARVEST_PRINT_BASE_STYLE}</style>
        </head>
        <body>
          <h1>${escapeHtml(t.fieldReport.printWindowTitle)}</h1>
          <table>
            <thead><tr>${tableHeaderHtml}</tr></thead>
            <tbody>${tableRowsHtml}</tbody>
          </table>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const handleExportFieldReportTableToExcel = async () => {
    const header = [
      t.fieldReport.columns.fieldName,
      t.fieldReport.columns.recordCount,
      t.fieldReport.columns.totalQuantity,
      t.fieldReport.columns.avgQuantityPerHarvest,
    ];
    const rows = fieldReportRows.map((row) => [
      row.fieldName,
      row.recordCount,
      row.totalQuantity,
      Math.round(row.avgQuantityPerHarvest),
    ]);
    const dateStamp = new Date().toISOString().slice(0, 10);

    try {
      await downloadStyledExcel({
        sheetName: t.fieldReport.sheetName,
        fileName: `israel-harvest-field-report-${dateStamp}.xlsx`,
        header,
        rows,
        rightToLeft: lang === 'he',
      });
    } catch {
      window.alert(t.fieldReport.exportError);
    }
  };

  const sortingListPitamLabel = useCallback(
    (status: IsraelClassificationSeasonRecord['pitamStatus'] | undefined) => {
      if (status === 'WITH_PITAM') return t.harvestForm.pitamOptions.withPitam;
      if (status === 'WITHOUT_PITAM')
        return t.harvestForm.pitamOptions.withoutPitam;
      return t.harvestForm.pitamOptions.mixed;
    },
    [t.harvestForm.pitamOptions],
  );

  const handlePrintSortingListTable = () => {
    if (typeof window === 'undefined') {
      return;
    }

    const header = [
      t.sortingList.columns.dateGregorian,
      t.sortingList.columns.dateHebrew,
      t.sortingList.columns.fieldName,
      t.sortingList.columns.fieldCategory,
      t.sortingList.columns.category,
      t.sortingList.columns.grade,
      t.sortingList.columns.pitamStatus,
      t.sortingList.columns.quantity,
      t.sortingList.columns.notes,
    ];
    const rows = filteredClassificationRows.map((row) => [
      formatHarvestGregorianDate(row.harvest?.dateGregorian ?? '', lang),
      row.harvest?.dateHebrew ?? '',
      row.harvest?.field?.name ?? '',
      row.fieldCategory?.name ?? '',
      row.category?.name ?? '',
      row.grade ?? '',
      sortingListPitamLabel(row.pitamStatus),
      numberFormatter.format(row.quantity),
      row.notes ?? '',
    ]);

    const tableHeaderHtml = header
      .map((label) => `<th>${escapeHtml(String(label))}</th>`)
      .join('');
    const tableRowsHtml = rows
      .map(
        (row) =>
          `<tr>${row.map((value) => `<td>${escapeHtml(String(value))}</td>`).join('')}</tr>`,
      )
      .join('');

    const printWindow = window.open('', '_blank', 'width=1100,height=760');
    if (!printWindow) {
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html lang="${lang === 'he' ? 'he' : 'en'}" dir="${lang === 'he' ? 'rtl' : 'ltr'}">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${escapeHtml(t.sortingList.printWindowTitle)}</title>
          <style>${HARVEST_PRINT_BASE_STYLE}</style>
        </head>
        <body>
          <h1>${escapeHtml(t.sortingList.printWindowTitle)}</h1>
          <table>
            <thead><tr>${tableHeaderHtml}</tr></thead>
            <tbody>${tableRowsHtml}</tbody>
          </table>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const handleExportSortingListTableToExcel = async () => {
    const header = [
      t.sortingList.columns.dateGregorian,
      t.sortingList.columns.dateHebrew,
      t.sortingList.columns.fieldName,
      t.sortingList.columns.fieldCategory,
      t.sortingList.columns.category,
      t.sortingList.columns.grade,
      t.sortingList.columns.pitamStatus,
      t.sortingList.columns.quantity,
      t.sortingList.columns.notes,
    ];
    const rows = filteredClassificationRows.map((row) => [
      formatHarvestGregorianDate(row.harvest?.dateGregorian ?? '', lang),
      row.harvest?.dateHebrew ?? '',
      row.harvest?.field?.name ?? '',
      row.fieldCategory?.name ?? '',
      row.category?.name ?? '',
      row.grade ?? '',
      sortingListPitamLabel(row.pitamStatus),
      row.quantity,
      row.notes ?? '',
    ]);
    const dateStamp = new Date().toISOString().slice(0, 10);

    try {
      await downloadStyledExcel({
        sheetName: t.sortingList.sheetName,
        fileName: `israel-harvest-sorting-list-${dateStamp}.xlsx`,
        header,
        rows,
        rightToLeft: lang === 'he',
      });
    } catch {
      window.alert(t.sortingList.exportError);
    }
  };

  const pageHeaderActions =
    isHarvestSummaryTab ||
    isSortingSummaryTab ||
    isSortingDailyDetailsTab ||
    isFieldCategorySummaryTab ? (
      <HarvestSummaryHeaderActions
        addHarvestLabel={t.pageControls.addHarvest}
        addSortingLabel={t.pageControls.addSorting}
        onAddHarvest={() => setIsHarvestFormOpen(true)}
        onAddSorting={() => setIsSortingFormOpen(true)}
        addDisabled={seasonFilterId === null}
      />
    ) : isSortingListTab ? (
      <HarvestPageHeaderActions
        addActionLabel={t.pageControls.addSorting}
        editActionLabel={t.pageControls.editSorting}
        deleteActionLabel={t.pageControls.deleteSorting}
        onAdd={() => setIsSortingFormOpen(true)}
        onEdit={handleEditSortingListRow}
        onDelete={() => setIsDeleteSortingDialogOpen(true)}
        addDisabled={seasonFilterId === null}
        editDisabled={selectedSortingListRow === null}
        deleteDisabled={selectedSortingListRow === null}
      />
    ) : isDailyDetailsTab ? (
      <HarvestPageHeaderActions
        addActionLabel={t.pageControls.addHarvest}
        editActionLabel={t.pageControls.editHarvest}
        deleteActionLabel={t.pageControls.deleteHarvest}
        onAdd={() => setIsHarvestFormOpen(true)}
        onEdit={() => setIsEditHarvestFormOpen(true)}
        onDelete={() => setIsDeleteHarvestDialogOpen(true)}
        addDisabled={seasonFilterId === null}
        editDisabled={
          selectedDailyHarvest === null || isDailyRelatedSortingsLoading
        }
        deleteDisabled={selectedDailyHarvest === null}
      />
    ) : null;

  return (
    <AppShell
      direction={lang === 'he' ? 'rtl' : 'ltr'}
      brandName="Wieders etrogs"
      pageTitle={t.pageTitle}
      pageHeaderActions={pageHeaderActions}
      topNav={topNavT.topNav}
      activeTopNavId={activeTopId}
      sidebarSections={t.sidebar}
      activeSidebarItemId={activeSidebarId}
      onTopNavClick={handleTopNavClick}
      onSidebarClick={handleSidebarClick}
      onBrandClick={() => navigate(`/${activeModule}/home`)}
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
          onClick={() => navigate(`/${activeModule}/settings`)}
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
      {isHarvestSummaryTab ? (
        <>
          <IsraelHarvestFieldReportSection
            lang={lang}
            t={t}
            filters={filters}
            isLoading={isHarvestLoading}
            loadError={harvestLoadError}
            rows={fieldReportRows}
            onPrint={handlePrintFieldReportTable}
            onExport={handleExportFieldReportTableToExcel}
            onFiltersChange={handleFiltersChange}
            numberFormatter={numberFormatter}
            selectedFieldReportRow={selectedFieldReportRow}
            onSelectFieldReportRow={setSelectedFieldReportRow}
            fieldReportDetailsRows={fieldReportDetailsRows}
            onPrintFieldReportDetails={handlePrintFieldReportDetails}
            detailsPrintRef={fieldReportDetailsPrintRef}
          />

          <IsraelHarvestBulkFormModal
            isOpen={isHarvestFormOpen}
            t={t}
            activeSeasonYearName={
              seasons.find((season) => season.id === seasonFilterId)
                ?.yearName ?? null
            }
            fields={fields}
            fieldCategories={fieldCategories}
            categories={sortCategories}
            isSubmitting={isSubmittingHarvest}
            onClose={() => setIsHarvestFormOpen(false)}
            onSubmit={handleAddHarvest}
          />

          <IsraelSortingFormModal
            isOpen={isSortingFormOpen}
            t={t}
            harvests={harvestRecords}
            fieldCategories={fieldCategories}
            categories={sortCategories}
            isSubmitting={isSubmittingSorting}
            onClose={() => setIsSortingFormOpen(false)}
            onSubmit={handleAddSorting}
          />
        </>
      ) : isSortingSummaryTab ? (
        <>
          <IsraelHarvestSortingSummarySection
            lang={lang}
            labels={t.sortingSummary}
            filters={sortingSummaryFilters}
            rows={filteredClassificationRows}
            isLoading={isClassificationsLoading}
            loadError={classificationsLoadError}
            seasonLabel={(() => {
              const yearName = seasons.find(
                (season) => season.id === seasonFilterId,
              )?.yearName;
              return yearName !== undefined ? String(yearName) : null;
            })()}
            sortCategories={sortCategories}
            onFiltersChange={handleSortingSummaryFiltersChange}
          />

          <IsraelHarvestBulkFormModal
            isOpen={isHarvestFormOpen}
            t={t}
            activeSeasonYearName={
              seasons.find((season) => season.id === seasonFilterId)
                ?.yearName ?? null
            }
            fields={fields}
            fieldCategories={fieldCategories}
            categories={sortCategories}
            isSubmitting={isSubmittingHarvest}
            onClose={() => setIsHarvestFormOpen(false)}
            onSubmit={handleAddHarvest}
          />

          <IsraelSortingFormModal
            isOpen={isSortingFormOpen}
            t={t}
            harvests={harvestRecords}
            fieldCategories={fieldCategories}
            categories={sortCategories}
            isSubmitting={isSubmittingSorting}
            onClose={() => setIsSortingFormOpen(false)}
            onSubmit={handleAddSorting}
          />
        </>
      ) : isFieldCategorySummaryTab ? (
        <>
          <IsraelHarvestFieldCategorySummarySection
            lang={lang}
            labels={t.fieldCategorySummary}
            filters={fieldCategorySummaryFilters}
            fields={fieldCategorySummary}
            isLoading={isFieldCategorySummaryLoading}
            loadError={fieldCategorySummaryLoadError}
            seasonLabel={(() => {
              const yearName = seasons.find(
                (season) => season.id === seasonFilterId,
              )?.yearName;
              return yearName !== undefined ? String(yearName) : null;
            })()}
            onFiltersChange={handleFieldCategorySummaryFiltersChange}
          />

          <IsraelHarvestBulkFormModal
            isOpen={isHarvestFormOpen}
            t={t}
            activeSeasonYearName={
              seasons.find((season) => season.id === seasonFilterId)
                ?.yearName ?? null
            }
            fields={fields}
            fieldCategories={fieldCategories}
            categories={sortCategories}
            isSubmitting={isSubmittingHarvest}
            onClose={() => setIsHarvestFormOpen(false)}
            onSubmit={handleAddHarvest}
          />

          <IsraelSortingFormModal
            isOpen={isSortingFormOpen}
            t={t}
            harvests={harvestRecords}
            fieldCategories={fieldCategories}
            categories={sortCategories}
            isSubmitting={isSubmittingSorting}
            onClose={() => setIsSortingFormOpen(false)}
            onSubmit={handleAddSorting}
          />
        </>
      ) : isSortingDailyDetailsTab ? (
        <>
          <IsraelHarvestSortingDailySection
            lang={lang}
            t={t}
            filters={sortingSummaryFilters}
            rows={filteredClassificationRows}
            isLoading={isClassificationsLoading}
            loadError={classificationsLoadError}
            numberFormatter={numberFormatter}
            sortCategories={sortCategories}
            onFiltersChange={handleSortingSummaryFiltersChange}
            onPrint={handlePrintSortingDailyTable}
            onExport={handleExportSortingDailyTableToExcel}
            selectedHarvestId={selectedSortingDailyHarvestId}
            onSelectHarvestId={setSelectedSortingDailyHarvestId}
            isDetailsPanelOpen={isSortingDailyDetailsPanelOpen}
            onOpenDetails={(harvestId) => {
              setSelectedSortingDailyHarvestId(harvestId);
              setIsSortingDailyDetailsPanelOpen(true);
            }}
            onCloseDetailsPanel={() => setIsSortingDailyDetailsPanelOpen(false)}
            detailsPrintRef={sortingDailyDetailsPrintRef}
            onPrintDetails={handlePrintSortingDailyDetails}
          />

          <IsraelHarvestBulkFormModal
            isOpen={isHarvestFormOpen}
            t={t}
            activeSeasonYearName={
              seasons.find((season) => season.id === seasonFilterId)
                ?.yearName ?? null
            }
            fields={fields}
            fieldCategories={fieldCategories}
            categories={sortCategories}
            isSubmitting={isSubmittingHarvest}
            onClose={() => setIsHarvestFormOpen(false)}
            onSubmit={handleAddHarvest}
          />

          <IsraelSortingFormModal
            isOpen={isSortingFormOpen}
            t={t}
            harvests={harvestRecords}
            fieldCategories={fieldCategories}
            categories={sortCategories}
            isSubmitting={isSubmittingSorting}
            onClose={() => setIsSortingFormOpen(false)}
            onSubmit={handleAddSorting}
          />
        </>
      ) : isSortingListTab ? (
        <>
          <IsraelHarvestSortingListSection
            lang={lang}
            t={t}
            filters={sortingSummaryFilters}
            rows={filteredClassificationRows}
            isLoading={isClassificationsLoading}
            loadError={classificationsLoadError}
            numberFormatter={numberFormatter}
            onFiltersChange={handleSortingSummaryFiltersChange}
            onPrint={handlePrintSortingListTable}
            onExport={handleExportSortingListTableToExcel}
            selectedRowId={selectedSortingListRow?.id ?? null}
            onRowClick={(row) =>
              setSelectedSortingListRow((prev) =>
                prev?.id === row.id ? null : row,
              )
            }
          />

          {selectedSortingListRow ? (
            <IsraelClassificationEditModal
              isOpen={isEditSortingOpen}
              lang={lang}
              t={t}
              row={selectedSortingListRow}
              quantity={editSortingQuantity}
              onQuantityChange={setEditSortingQuantity}
              notes={editSortingNotes}
              onNotesChange={setEditSortingNotes}
              isSubmitting={isSubmittingSortingEdit}
              error={editSortingError}
              onClose={() => setIsEditSortingOpen(false)}
              onSubmit={() => {
                void handleSubmitEditSortingListRow();
              }}
            />
          ) : null}

          <ConfirmDialog
            open={isDeleteSortingDialogOpen}
            title={t.pageControls.deleteSortingDialog.title}
            message={t.pageControls.deleteSortingDialog.message}
            confirmLabel={t.pageControls.deleteSortingDialog.confirm}
            cancelLabel={t.pageControls.deleteSortingDialog.cancel}
            isConfirming={isDeletingSorting}
            onConfirm={() => {
              void handleDeleteSortingListRow();
            }}
            onCancel={() => setIsDeleteSortingDialogOpen(false)}
          />

          <IsraelHarvestBulkFormModal
            isOpen={isHarvestFormOpen}
            t={t}
            activeSeasonYearName={
              seasons.find((season) => season.id === seasonFilterId)
                ?.yearName ?? null
            }
            fields={fields}
            fieldCategories={fieldCategories}
            categories={sortCategories}
            isSubmitting={isSubmittingHarvest}
            onClose={() => setIsHarvestFormOpen(false)}
            onSubmit={handleAddHarvest}
          />

          <IsraelSortingFormModal
            isOpen={isSortingFormOpen}
            t={t}
            harvests={harvestRecords}
            fieldCategories={fieldCategories}
            categories={sortCategories}
            isSubmitting={isSubmittingSorting}
            onClose={() => setIsSortingFormOpen(false)}
            onSubmit={handleAddSorting}
          />
        </>
      ) : isDailyDetailsTab ? (
        <>
          <IsraelHarvestDailyDetailsSection
            lang={lang}
            t={t}
            filters={filters}
            isLoading={isHarvestLoading}
            loadError={harvestLoadError}
            rows={harvestRecords}
            onFiltersChange={handleFiltersChange}
            onPrint={handlePrintDailyDetailsTable}
            onExport={handleExportDailyDetailsTableToExcel}
            numberFormatter={numberFormatter}
            sortedQuantityByHarvestId={sortedQuantityByHarvestId}
            sortCategories={sortCategories}
            selectedRow={selectedDailyHarvest}
            onSelectRow={setSelectedDailyHarvest}
            isDetailsPanelOpen={isDailyDetailsPanelOpen}
            onOpenDetails={(row) => {
              setSelectedDailyHarvest(row);
              setIsDailyDetailsPanelOpen(true);
            }}
            onCloseDetailsPanel={() => setIsDailyDetailsPanelOpen(false)}
            relatedSortings={dailyRelatedSortings}
            isRelatedSortingsLoading={isDailyRelatedSortingsLoading}
            relatedSortingsLoadError={dailyRelatedSortingsLoadError}
            onPrintDetails={handlePrintDailyDetails}
            detailsPrintRef={detailsPrintRef}
          />

          <ConfirmDialog
            open={isDeleteHarvestDialogOpen}
            title={t.pageControls.deleteHarvestDialog.title}
            message={t.pageControls.deleteHarvestDialog.message}
            confirmLabel={t.pageControls.deleteHarvestDialog.confirm}
            cancelLabel={t.pageControls.deleteHarvestDialog.cancel}
            isConfirming={isDeletingHarvest}
            onConfirm={() => {
              void handleDeleteDailyHarvest();
            }}
            onCancel={() => setIsDeleteHarvestDialogOpen(false)}
          />

          <IsraelHarvestBulkFormModal
            isOpen={isHarvestFormOpen}
            t={t}
            activeSeasonYearName={
              seasons.find((season) => season.id === seasonFilterId)
                ?.yearName ?? null
            }
            fields={fields}
            fieldCategories={fieldCategories}
            categories={sortCategories}
            isSubmitting={isSubmittingHarvest}
            onClose={() => setIsHarvestFormOpen(false)}
            onSubmit={handleAddHarvest}
          />

          <IsraelHarvestEditModal
            isOpen={isEditHarvestFormOpen}
            t={t}
            harvest={selectedDailyHarvest}
            fields={fields}
            fieldCategories={fieldCategories}
            categories={sortCategories}
            existingClassifications={dailyRelatedSortings}
            isSubmitting={isSubmittingHarvestEdit}
            onClose={() => setIsEditHarvestFormOpen(false)}
            onSubmit={handleEditDailyHarvest}
          />
        </>
      ) : (
        <section className="shipments-empty-state">
          <h2 className="shipments-empty-title">{content.title}</h2>
          <p className="shipments-empty-desc">{content.description}</p>
        </section>
      )}
    </AppShell>
  );
}
