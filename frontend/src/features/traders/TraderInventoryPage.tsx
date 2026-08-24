import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { FaCirclePlus } from 'react-icons/fa6';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppShell } from '../../app/layout/AppShell';
import { useActiveModule } from '../../hooks/useActiveModule';
import { GlobalScopedFilters, type GlobalScopedFilterConfig, type GlobalScopedFiltersApi } from '../../components/ui/GlobalScopedFilters';
import { SettingsIcon } from '../../components/ui/SettingsIcon';
import { openPrintableWindow } from '../../services/printWindow';
import { exportTraderInventoryExcel } from './services/traderInventoryExport.service';
import { TraderInventoryAllSection } from './components/TraderInventoryAllSection';
import { TraderMovementsSection } from './components/TraderMovementsSection';
import { TraderPrintExportActions } from './components/TraderPrintExportActions';
import { AddTraderMovementModal } from './components/AddTraderMovementModal';
import { useTraderInventorySummary } from './hooks/useTraderInventorySummary';
import { useTraderMovements } from './hooks/useTraderMovements';
import { TRADER_INVENTORY_I18N, getTraderMovementsI18n } from './i18n';
import { buildTraderInventorySummaryMatrix } from './utils/traderInventorySummaryMatrix.util';
import { getTraderInventoryPitamStatusLabel } from './utils/traderInventorySummary.util';
import type { NavItem } from '../../types/navigation';
import { getCurrentUser, isAuthenticated, isWorkerRole, logout } from '../../services/authService';
import { NoPermissionBanner } from '../../components/ui/NoPermissionBanner';
import { getActiveSeason, getSeasons, type Season } from '../../services/seasonsApi';
import { getTraders, type Trader } from '../../services/tradersApi';
import {
  getTraderCategoriesWithShares,
  getTraderCategoryShareConditions,
  type TraderCategoryWithShares,
  type TraderCategoryShareConditionSummary,
} from '../../services/traderCategoriesApi';
import { getCustomers, type Customer } from '../../services/customersApi';
import { getCustomerCategoriesBySeason, type CustomerCategory } from '../../services/customerCategoriesApi';

const DEFAULT_SIDEBAR_ITEM_ID = 'all';
const DEFAULT_FILTER_VALUES: Record<string, string> = {
  seasonId: '',
  traderId: 'ALL',
  inventoryStatus: 'ALL',
  inventorySource: 'ALL',
  shareConditionScope: 'ALL',
  movementStatus: 'ALL',
  movementCategory: 'ALL',
  movementGrade: 'ALL',
  movementPitamStatus: 'ALL',
};

export function TraderInventoryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const activeModule = useActiveModule();
  const [activeTopId, setActiveTopId] = useState('traders');
  const [alertsCount, setAlertsCount] = useState<number>(0);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [traders, setTraders] = useState<Trader[]>([]);
  const [activeSeasonId, setActiveSeasonId] = useState<number | null>(null);
  const [filterValues, setFilterValues] = useState<Record<string, string>>(DEFAULT_FILTER_VALUES);
  const [filtersLoading, setFiltersLoading] = useState(false);
  const filtersApiRef = useRef<GlobalScopedFiltersApi | null>(null);
  const matrixTableRef = useRef<HTMLTableElement>(null);
  const [isAddMovementModalOpen, setIsAddMovementModalOpen] = useState(false);
  const [traderCategories, setTraderCategories] = useState<TraderCategoryWithShares[]>([]);
  const [shareConditions, setShareConditions] = useState<TraderCategoryShareConditionSummary[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerCategories, setCustomerCategories] = useState<CustomerCategory[]>([]);
  const traderCategoryOrder = useMemo(() => {
    const map = new Map<string, number>();
    for (const category of traderCategories) {
      map.set(category.name, category.orderIndex);
    }
    return map;
  }, [traderCategories]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
    }
  }, [navigate]);

  const currentUser = getCurrentUser();
  const isWorker = isWorkerRole(currentUser?.role);

  useEffect(() => {
    // load unread messages count - only if authenticated
    if (!isAuthenticated()) {
      return;
    }
    import('../../services/messagesApi').then(({ fetchUnreadCount }) => {
      fetchUnreadCount().then((res) => setAlertsCount(res.count)).catch(() => setAlertsCount(0));
    });
  }, []);

  const handleLogin = () => navigate('/login');
  const handleRegister = () => navigate('/register');
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };
  const handleProfile = () => navigate('/profile');

  // Detect language from localStorage or default to 'he'
  const lang = useMemo(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('app.language');
      if (stored && (stored === 'en' || stored === 'he')) return stored;
    }
    return 'he';
  }, []);

  const activeSidebarId = useMemo(() => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    const subRoute = pathParts[2];
    return subRoute || DEFAULT_SIDEBAR_ITEM_ID;
  }, [location.pathname]);

  const t = TRADER_INVENTORY_I18N[lang];
  const isAllInventoryTab = activeSidebarId === 'all';
  const isMovementsTab = activeSidebarId === 'movements';
  const selectedSeasonId = useMemo(() => {
    const parsed = Number.parseInt(filterValues.seasonId, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }, [filterValues.seasonId]);
  const isViewingNonActiveSeason = selectedSeasonId !== null && selectedSeasonId !== activeSeasonId;
  const selectedTraderId = useMemo(() => {
    if (filterValues.traderId === 'ALL') {
      return null;
    }

    if (filterValues.traderId === 'UNASSIGNED') {
      return null;
    }

    const parsed = Number.parseInt(filterValues.traderId, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }, [filterValues.traderId]);

  const selectedOwnerScope = useMemo<'ALL' | 'TRADER' | 'MODULO'>(() => {
    if (filterValues.traderId === 'UNASSIGNED') {
      return 'MODULO';
    }

    if (filterValues.traderId === 'ALL') {
      return 'ALL';
    }

    return selectedTraderId ? 'TRADER' : 'ALL';
  }, [filterValues.traderId, selectedTraderId]);

  const selectedShipmentScope = useMemo<
    'ALL' | 'UNSHIPPED' | 'PACKED_SHIPPED' | 'SHIPPED' | 'SELF_PICKUP' | 'HARVEST_IN' | 'INTERNAL_TRANSFER' | 'TRANSFERRED_TO_CUSTOMER' | 'OWNERSHIP_TRANSFER' | 'ASSIGNED' | 'WASTE' | 'ADJUSTMENT' | 'REMAINS_IN_ITALY'
  >(() => {
    const status = filterValues.inventoryStatus || 'ALL';
    if (status === 'ALL' || status === 'UNSHIPPED' || status === 'PACKED_SHIPPED' || status === 'SHIPPED' || status === 'SELF_PICKUP' || status === 'TRANSFERRED_TO_CUSTOMER' || status === 'REMAINS_IN_ITALY') {
      return status;
    }
    return 'ALL';
  }, [filterValues.inventoryStatus]);

  const selectedSourceScope = useMemo<'ALL' | 'GENERAL' | 'PRIVATE_SELECTION'>(() => {
    const source = filterValues.inventorySource || 'ALL';
    if (source === 'ALL' || source === 'GENERAL' || source === 'PRIVATE_SELECTION') {
      return source;
    }
    return 'ALL';
  }, [filterValues.inventorySource]);

  // The filter's raw value is 'ALL', 'DEFAULT', 'UNASSIGNED', or `cond-<id>` for a specific
  // distribution condition — encoded as one string so it fits the existing single-value
  // scoped-filter model.
  const selectedShareCondition = useMemo<{ scope: 'ALL' | 'DEFAULT_ONLY' | 'UNASSIGNED_ONLY'; id?: number }>(() => {
    const raw = filterValues.shareConditionScope || 'ALL';
    if (raw === 'DEFAULT') {
      return { scope: 'DEFAULT_ONLY' };
    }
    if (raw === 'UNASSIGNED') {
      return { scope: 'UNASSIGNED_ONLY' };
    }
    if (raw.startsWith('cond-')) {
      const id = Number.parseInt(raw.slice(5), 10);
      if (Number.isFinite(id)) {
        return { scope: 'ALL', id };
      }
    }
    return { scope: 'ALL' };
  }, [filterValues.shareConditionScope]);

  const summaryFilters = useMemo(
    () => ({
      seasonId: selectedSeasonId,
      traderId: selectedTraderId,
      ownerScope: selectedOwnerScope,
      shipmentScope: selectedShipmentScope,
      sourceScope: selectedSourceScope,
      shareConditionScope: selectedShareCondition.scope,
      shareConditionId: selectedShareCondition.id,
    }),
    [selectedOwnerScope, selectedSeasonId, selectedTraderId, selectedShipmentScope, selectedSourceScope, selectedShareCondition],
  );

  const traderInventorySummary = useTraderInventorySummary(isAllInventoryTab, summaryFilters);

  const selectedMovementStatus = useMemo(() => {
    const status = filterValues.movementStatus || 'ALL';
    if (status === 'ALL' || status === 'NON_SHIPMENT' || status === 'SHIPMENT') {
      return status;
    }
    return 'ALL';
  }, [filterValues.movementStatus]);

  const traderMovements = useTraderMovements(
    selectedSeasonId,
    selectedTraderId,
    selectedMovementStatus,
    selectedOwnerScope,
  );

  useEffect(() => {
    if (!isAllInventoryTab && !isMovementsTab) {
      return;
    }

    let isActive = true;
    setFiltersLoading(true);

    Promise.all([getSeasons(), getActiveSeason(), getTraders()])
      .then(([nextSeasons, nextActiveSeason, nextTraders]) => {
        if (!isActive) {
          return;
        }

        setSeasons(nextSeasons);
        setActiveSeasonId(nextActiveSeason.id);
        setTraders(nextTraders);
      })
      .catch(() => {
        if (!isActive) {
          return;
        }

        setSeasons([]);
        setActiveSeasonId(null);
        setTraders([]);
      })
      .finally(() => {
        if (!isActive) {
          return;
        }

        setFiltersLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [isAllInventoryTab, isMovementsTab]);

  useEffect(() => {
    if (!isAllInventoryTab || !activeSeasonId || !filtersApiRef.current) {
      return;
    }

    if (filterValues.seasonId) {
      return;
    }

    filtersApiRef.current.setFilterValue('seasonId', String(activeSeasonId));
  }, [activeSeasonId, filterValues.seasonId, isAllInventoryTab]);

  // For movements tab, set seasonId from activeSeasonId
  useEffect(() => {
    if (!isMovementsTab || !activeSeasonId) {
      return;
    }

    if (filterValues.seasonId) {
      return;
    }

    setFilterValues((prev) => ({
      ...prev,
      seasonId: String(activeSeasonId),
    }));
  }, [activeSeasonId, filterValues.seasonId, isMovementsTab]);

  const seasonOptions = useMemo(() => {
    const options = [...seasons]
      .sort((left, right) => right.yearName - left.yearName)
      .map((season) => ({
        value: String(season.id),
        label: `${season.yearName}${season.id === activeSeasonId ? ` (${lang === 'he' ? 'פעילה' : 'Active'})` : ''}`,
      }));
    if (options.length === 0) {
      return [{ value: '', label: lang === 'he' ? 'לא זמין' : 'Not available' }];
    }
    return options;
  }, [activeSeasonId, lang, seasons]);

  const traderOptions = useMemo(
    () => [
      { value: 'ALL', label: t.summary.filters.allTradersOption },
      ...[...traders]
        .sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }))
        .map((trader) => ({
          value: String(trader.id),
          label: trader.name,
        })),
      { value: 'UNASSIGNED', label: t.summary.filters.unassignedOption },
    ],
    [t.summary.filters.allTradersOption, t.summary.filters.unassignedOption, traders],
  );

  const inventoryStatusOptions = useMemo(
    () => [
      { value: 'ALL', label: t.summary.filters.allInventoryOption },
      { value: 'UNSHIPPED', label: t.summary.filters.unboxedOption },
      { value: 'PACKED_SHIPPED', label: t.summary.filters.boxedOption },
      { value: 'SHIPPED', label: t.summary.filters.shippedOption },
      { value: 'SELF_PICKUP', label: t.summary.filters.selfPickupOption },
      { value: 'TRANSFERRED_TO_CUSTOMER', label: t.summary.filters.transferredToCustomerOption },
      { value: 'REMAINS_IN_ITALY', label: t.summary.filters.remainsInItalyOption },
    ],
    [t.summary.filters.allInventoryOption, t.summary.filters.unboxedOption, t.summary.filters.boxedOption, t.summary.filters.shippedOption, t.summary.filters.selfPickupOption, t.summary.filters.transferredToCustomerOption, t.summary.filters.remainsInItalyOption],
  );

  const inventorySourceOptions = useMemo(
    () => [
      { value: 'ALL', label: t.summary.filters.inventorySourceAllOption },
      { value: 'GENERAL', label: t.summary.filters.inventorySourceGeneralOption },
      { value: 'PRIVATE_SELECTION', label: t.summary.filters.privateSelectionOption },
    ],
    [t.summary.filters.inventorySourceAllOption, t.summary.filters.inventorySourceGeneralOption, t.summary.filters.privateSelectionOption],
  );

  const shareConditionOptions = useMemo(
    () => [
      { value: 'ALL', label: t.summary.filters.shareConditionAllOption },
      { value: 'DEFAULT', label: t.summary.filters.shareConditionDefaultOption },
      { value: 'UNASSIGNED', label: t.summary.filters.shareConditionUnassignedOption },
      ...[...shareConditions]
        .sort((left, right) => left.traderCategoryName.localeCompare(right.traderCategoryName, undefined, { sensitivity: 'base' }))
        .map((condition) => ({
          value: `cond-${condition.id}`,
          label: `${condition.name} (${condition.traderCategoryName})`,
        })),
    ],
    [t.summary.filters.shareConditionAllOption, t.summary.filters.shareConditionDefaultOption, t.summary.filters.shareConditionUnassignedOption, shareConditions],
  );

  useEffect(() => {
    if ((!isMovementsTab && !isAllInventoryTab) || !activeSeasonId) {
      return;
    }

    let isActive = true;

    Promise.all([
      getTraderCategoriesWithShares(activeSeasonId),
      getCustomers(),
      getCustomerCategoriesBySeason(activeSeasonId),
      getTraderCategoryShareConditions(activeSeasonId),
    ])
      .then(([nextTraderCategories, nextCustomers, nextCustomerCategories, nextShareConditions]) => {
        if (!isActive) return;
        setTraderCategories(nextTraderCategories);
        setCustomers(nextCustomers);
        setCustomerCategories(nextCustomerCategories);
        setShareConditions(nextShareConditions);
      })
      .catch(() => {
        if (!isActive) return;
        setTraderCategories([]);
        setCustomers([]);
        setCustomerCategories([]);
        setShareConditions([]);
      });

    return () => {
      isActive = false;
    };
  }, [isMovementsTab, isAllInventoryTab, activeSeasonId]);

  const movementStatusI18n = useMemo(() => getTraderMovementsI18n(), []);

  const movementStatusOptions = useMemo(
    () => [
      { value: 'ALL', label: movementStatusI18n.filters.allMovementsOption },
      { value: 'NON_SHIPMENT', label: movementStatusI18n.filters.nonShipmentMovementsOption },
      { value: 'SHIPMENT', label: movementStatusI18n.filters.shipmentMovementsOption },
    ],
    [movementStatusI18n.filters.allMovementsOption, movementStatusI18n.filters.nonShipmentMovementsOption, movementStatusI18n.filters.shipmentMovementsOption],
  );

  const isRemainsInItalyFilter = filterValues.inventoryStatus === 'REMAINS_IN_ITALY';

  const scopedFilters = useMemo<GlobalScopedFilterConfig[]>(
    () => [
      {
        key: 'seasonId',
        label: t.summary.filters.seasonLabel,
        defaultValue: activeSeasonId ? String(activeSeasonId) : '',
        options: seasonOptions,
      },
      {
        key: 'traderId',
        label: t.summary.filters.traderLabel,
        defaultValue: 'ALL',
        options: traderOptions,
        disabled: isRemainsInItalyFilter,
      },
      {
        key: 'inventorySource',
        label: t.summary.filters.inventorySourceLabel,
        defaultValue: 'ALL',
        options: inventorySourceOptions,
        disabled: isRemainsInItalyFilter,
      },
      {
        key: 'shareConditionScope',
        label: t.summary.filters.shareConditionLabel,
        defaultValue: 'ALL',
        options: shareConditionOptions,
        disabled: isRemainsInItalyFilter,
      },
      {
        key: 'inventoryStatus',
        label: t.summary.filters.inventoryStatusLabel,
        defaultValue: 'ALL',
        options: inventoryStatusOptions,
      },
    ],
    [activeSeasonId, seasonOptions, t.summary.filters.seasonLabel, t.summary.filters.traderLabel, traderOptions, t.summary.filters.inventoryStatusLabel, inventoryStatusOptions, t.summary.filters.inventorySourceLabel, inventorySourceOptions, t.summary.filters.shareConditionLabel, shareConditionOptions, isRemainsInItalyFilter],
  );

  // "נשאר באיטליה" is never trader-owned or private-selection-scoped - the trader and source
  // filters are disabled above, and their values are reset to ALL so a stale selection doesn't
  // linger while disabled.
  useEffect(() => {
    if (!isRemainsInItalyFilter || !filtersApiRef.current) {
      return;
    }

    if (filterValues.traderId !== 'ALL') {
      filtersApiRef.current.setFilterValue('traderId', 'ALL');
    }

    if (filterValues.inventorySource !== 'ALL') {
      filtersApiRef.current.setFilterValue('inventorySource', 'ALL');
    }

    if (filterValues.shareConditionScope !== 'ALL') {
      filtersApiRef.current.setFilterValue('shareConditionScope', 'ALL');
    }
  }, [isRemainsInItalyFilter, filterValues.traderId, filterValues.inventorySource, filterValues.shareConditionScope]);

  const handlePrintInventoryTable = useCallback(() => {
    if (!matrixTableRef.current) {
      return;
    }

    // Build filter display information
    const seasonDisplay = filterValues.seasonId
      ? seasons.find(s => String(s.id) === filterValues.seasonId)?.yearName || filterValues.seasonId
      : 'N/A';
    const traderDisplay = filterValues.traderId === 'ALL' 
      ? t.summary.filters.allTradersOption 
      : filterValues.traderId === 'UNASSIGNED'
      ? t.summary.filters.unassignedOption
      : filterValues.traderId
      ? traders.find(tr => String(tr.id) === filterValues.traderId)?.name || filterValues.traderId
      : 'N/A';

    // Map inventory status/source to display label
    const statusMap: Record<string, string> = {
      'ALL': t.summary.filters.allInventoryOption,
      'UNSHIPPED': t.summary.filters.unboxedOption,
      'PACKED_SHIPPED': t.summary.filters.boxedOption,
      'SHIPPED': t.summary.filters.shippedOption,
      'SELF_PICKUP': t.summary.filters.selfPickupOption,
      'TRANSFERRED_TO_CUSTOMER': t.summary.filters.transferredToCustomerOption,
      'REMAINS_IN_ITALY': t.summary.filters.remainsInItalyOption,
    };
    const statusDisplay = statusMap[filterValues.inventoryStatus] || filterValues.inventoryStatus;

    const sourceMap: Record<string, string> = {
      'ALL': t.summary.filters.inventorySourceAllOption,
      'GENERAL': t.summary.filters.inventorySourceGeneralOption,
      'PRIVATE_SELECTION': t.summary.filters.privateSelectionOption,
    };
    const sourceDisplay = sourceMap[filterValues.inventorySource] || filterValues.inventorySource;

    const filterDetailsHtml = `
      <div style="margin-bottom: 20px; padding: 12px; background: #f5f5f5; border-radius: 4px; font-size: 12px; border: 1px solid #ddd;">
        <strong>${lang === 'he' ? 'סינונים פעילים' : 'Active Filters'}:</strong><br/>
        <div style="margin-top: 4px;">${t.summary.filters.seasonLabel}: ${seasonDisplay}</div>
        <div style="margin-top: 4px;">${t.summary.filters.traderLabel}: ${traderDisplay}</div>
        <div style="margin-top: 4px;">${t.summary.filters.inventorySourceLabel}: ${sourceDisplay}</div>
        <div style="margin-top: 4px;">${t.summary.filters.inventoryStatusLabel}: ${statusDisplay}</div>
      </div>
    `;

    const tableStyles = `
      @page {
        size: landscape;
        margin: 10mm;
      }
      @media print {
        html, body {
          width: 297mm;
          min-height: 210mm;
        }
      }
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 12px;
        break-inside: avoid;
        page-break-inside: avoid;
      }
      tr {
        break-inside: avoid;
        page-break-inside: avoid;
      }
      th, td {
        border: 1px solid #ccc;
        padding: 10px;
        text-align: center;
      }
      thead th {
        background-color: #1f5a32;
        color: white;
        font-weight: bold;
      }
      tbody th {
        background-color: #f0f6f1;
        font-weight: bold;
        text-align: start;
      }
      tbody tr:nth-child(odd) {
        background-color: #fafcfa;
      }
      tbody tr:nth-child(even) {
        background-color: #f3f8f4;
      }
      td:last-child, tbody th:last-child {
        background-color: #e4f0e7;
        font-weight: bold;
      }
      tfoot th, tfoot td {
        background-color: #e1f0e5;
        font-weight: bold;
        border-top: 2px solid #8cb494;
      }
      .category-block {
        break-inside: avoid;
        page-break-inside: avoid;
        margin-top: 20px;
      }
      .category-block h3 {
        break-after: avoid;
        page-break-after: avoid;
        margin: 0 0 6px;
        font-size: 11px;
        font-weight: bold;
      }
    `;
    const locale = lang === 'he' ? 'he-IL' : 'en-US';
    const fmt = (n: number) => new Intl.NumberFormat(locale).format(Math.abs(n));

    const summaryMatrix = buildTraderInventorySummaryMatrix(traderInventorySummary.rows, t.summary.values.none, traderCategoryOrder);
    const pitamWith = getTraderInventoryPitamStatusLabel('WITH_PITAM', t.summary);
    const pitamWithout = getTraderInventoryPitamStatusLabel('WITHOUT_PITAM', t.summary);
    const pitamMixed = getTraderInventoryPitamStatusLabel('MIXED', t.summary);
    const totalLabel = t.summary.matrix.total;
    const gradeLabel = t.summary.matrix.grade;

    let breakdownHtml = `<h2 style="margin-top:32px;margin-bottom:16px;font-size:13px;font-weight:bold;text-align:center;">${t.summary.breakdown.breakdownTitle}</h2>`;
    for (const category of summaryMatrix.categories) {
      breakdownHtml += '<div class="category-block">';
      breakdownHtml += `<h3>${category.label}</h3>`;
      breakdownHtml += '<table><thead><tr>';
      breakdownHtml += `<th>${gradeLabel}</th><th>${pitamWith}</th><th>${pitamWithout}</th><th>${pitamMixed}</th><th>${totalLabel}</th>`;
      breakdownHtml += '</tr></thead><tbody>';
      for (const grade of summaryMatrix.grades) {
        const cell = summaryMatrix.gradeValues[grade]?.[category.key] ?? { WITH_PITAM: 0, WITHOUT_PITAM: 0, MIXED: 0 };
        const gradeTotal = cell.WITH_PITAM + cell.WITHOUT_PITAM + cell.MIXED;
        breakdownHtml += `<tr><th>${grade}</th><td>${fmt(cell.WITH_PITAM)}</td><td>${fmt(cell.WITHOUT_PITAM)}</td><td>${fmt(cell.MIXED)}</td><td>${fmt(gradeTotal)}</td></tr>`;
      }
      breakdownHtml += `</tbody><tfoot><tr><th>${totalLabel}</th><td>${fmt(category.totalsByPitamStatus.WITH_PITAM)}</td><td>${fmt(category.totalsByPitamStatus.WITHOUT_PITAM)}</td><td>${fmt(category.totalsByPitamStatus.MIXED)}</td><td>${fmt(category.total)}</td></tr></tfoot></table>`;
      breakdownHtml += '</div>';
    }

    openPrintableWindow({
      title: lang === 'he' ? 'מלאי סוחרים' : 'Trader Inventory',
      heading: lang === 'he' ? 'מלאי סוחרים' : 'Trader Inventory',
      html: filterDetailsHtml + matrixTableRef.current.outerHTML + breakdownHtml,
      direction: lang === 'he' ? 'rtl' : 'ltr',
      width: 1280,
      height: 900,
      extraStyles: tableStyles,
    });
  }, [lang, seasons, traders, filterValues, t, traderInventorySummary.rows, traderCategoryOrder]);

  const handleExportInventoryTable = useCallback(async () => {
    const seasonDisplay = filterValues.seasonId
      ? seasons.find(s => String(s.id) === filterValues.seasonId)?.yearName || filterValues.seasonId
      : 'N/A';
    const traderDisplay = filterValues.traderId === 'ALL'
      ? t.summary.filters.allTradersOption
      : filterValues.traderId === 'UNASSIGNED'
      ? t.summary.filters.unassignedOption
      : filterValues.traderId
      ? traders.find(tr => String(tr.id) === filterValues.traderId)?.name || filterValues.traderId
      : 'N/A';
    const statusMap: Record<string, string> = {
      'ALL': t.summary.filters.allInventoryOption,
      'UNSHIPPED': t.summary.filters.unboxedOption,
      'PACKED_SHIPPED': t.summary.filters.boxedOption,
      'SHIPPED': t.summary.filters.shippedOption,
      'SELF_PICKUP': t.summary.filters.selfPickupOption,
      'TRANSFERRED_TO_CUSTOMER': t.summary.filters.transferredToCustomerOption,
      'REMAINS_IN_ITALY': t.summary.filters.remainsInItalyOption,
    };
    const statusDisplay = statusMap[filterValues.inventoryStatus] || filterValues.inventoryStatus;
    const sourceMap: Record<string, string> = {
      'ALL': t.summary.filters.inventorySourceAllOption,
      'GENERAL': t.summary.filters.inventorySourceGeneralOption,
      'PRIVATE_SELECTION': t.summary.filters.privateSelectionOption,
    };
    const sourceDisplay = sourceMap[filterValues.inventorySource] || filterValues.inventorySource;
    const baseFileName = lang === 'he' ? 'מלאי סוחרים' : 'Trader Inventory';

    const summaryMatrix = buildTraderInventorySummaryMatrix(traderInventorySummary.rows, t.summary.values.none, traderCategoryOrder);

    await exportTraderInventoryExcel({
      fileName: `${baseFileName}_${seasonDisplay}_${traderDisplay}_${sourceDisplay}_${statusDisplay}`,
      sheetName: lang === 'he' ? 'מלאי סוחרים' : 'Trader Inventory',
      filterRows: [
        [t.summary.filters.seasonLabel, seasonDisplay],
        [t.summary.filters.traderLabel, traderDisplay],
        [t.summary.filters.inventorySourceLabel, sourceDisplay],
        [t.summary.filters.inventoryStatusLabel, statusDisplay],
      ],
      summaryMatrix,
      labels: t.summary,
      rightToLeft: lang === 'he',
    });
  }, [lang, seasons, traders, filterValues, t, traderInventorySummary.rows, traderCategoryOrder]);

  const filtersBar = isAllInventoryTab ? (
    <GlobalScopedFilters
      scope="trader-inventory-summary"
      filters={scopedFilters}
      direction={lang === 'he' ? 'rtl' : 'ltr'}
      onValuesChange={setFilterValues}
      onApiReady={(api) => {
        filtersApiRef.current = api;
      }}
      actions={
        filtersLoading ? (
          <span>{t.summary.loading}</span>
        ) : (
          <TraderPrintExportActions
            lang={lang}
            tableActionsLabel={lang === 'he' ? 'פעולות טבלה' : 'Table Actions'}
            onPrint={handlePrintInventoryTable}
            onExport={handleExportInventoryTable}
            printAriaLabel={lang === 'he' ? 'הדפס טבלה' : 'Print table'}
            printTitle={lang === 'he' ? 'הדפסה' : 'Print'}
            exportAriaLabel={lang === 'he' ? 'ייצא טבלה ל-Excel' : 'Export table to Excel'}
            exportTitle={lang === 'he' ? 'ייצוא ל-Excel' : 'Export to Excel'}
          />
        )
      }
    />
  ) : null;

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
  }, [activeSidebarId, t.sidebar, t.pageTitle]);

  const content = useMemo(() => {
    const state = t.emptyState as Record<string, { title: string; description: string }>;
    return state[activeSidebarId] || state.default;
  }, [activeSidebarId, t.emptyState]);

  const handleTopNavClick = (item: NavItem) => {
    setActiveTopId(item.id);
    navigate(item.href || `/${item.id}`);
  };

  const handleSidebarClick = (item: NavItem) => {
    const targetPath = `/${activeModule}${item.href || `/traders/${item.id}`}`;
    navigate(targetPath);
  };

  return (
    <AppShell
      direction={lang === 'he' ? 'rtl' : 'ltr'}
      brandName="Wieders etrogs"
      pageTitle={pageTitle}
      topNav={t.topNav}
      activeTopNavId={activeTopId}
      pageHeaderActions={
        !isWorker && (isMovementsTab || isAllInventoryTab) ? (
          <div className="action-buttons">
            <button
              className="btn btn-primary"
              type="button"
              disabled={isViewingNonActiveSeason}
              title={isViewingNonActiveSeason ? movementStatusI18n.nonActiveSeasonDisabled : undefined}
              onClick={() => setIsAddMovementModalOpen(true)}
            >
              <FaCirclePlus />
              <span>{movementStatusI18n.addMovementButton}</span>
            </button>
          </div>
        ) : null
      }
      sidebarSections={t.sidebar}
      activeSidebarItemId={activeSidebarId}
      onTopNavClick={handleTopNavClick}
      onSidebarClick={handleSidebarClick}
      onBrandClick={() => navigate(`/${activeModule}/home`)}
      topBarOptions={{
        alertsCount,
        onAlertsClick: () => navigate('/messages'),
        isAuthenticated: isAuthenticated(),
        onLogin: handleLogin,
        onRegister: handleRegister,
        onLogout: handleLogout,
        onProfile: handleProfile,
        userName: currentUser?.name || t.userNameFallback,
      }}
      sidebarFooterSlot={
        <button
          type="button"
          className="app-shell__sidebar-item app-shell__sidebar-settings"
          onClick={() => navigate(`/${activeModule}/settings`)}
        >
          {lang === 'he' ? (
            <>
              הגדרות
              <SettingsIcon style={{ marginInlineStart: 8 }} />
            </>
          ) : (
            <>
              <SettingsIcon style={{ marginInlineEnd: 8 }} />
              Settings
            </>
          )}
        </button>
      }
    >
      {isWorker ? (
        <NoPermissionBanner message={lang === 'he' ? 'אין לך הרשאת גישה לאזור זה.' : "You don't have permission to access this area."} />
      ) : isAllInventoryTab ? (
        <TraderInventoryAllSection
          lang={lang}
          labels={t.summary}
          filtersBar={filtersBar}
          rows={traderInventorySummary.rows}
          totals={traderInventorySummary.totals}
          isLoading={traderInventorySummary.isLoading}
          error={traderInventorySummary.error}
          onRetry={traderInventorySummary.reload}
          tableRef={matrixTableRef}
          traderCategoryOrder={traderCategoryOrder}
          hideTraderModuloBreakdown={traderInventorySummary.loadedShipmentScope === 'TRANSFERRED_TO_CUSTOMER'}
        />
      ) : isMovementsTab ? (
        <TraderMovementsSection
          lang={lang}
          movements={traderMovements.rows}
          isLoading={traderMovements.isLoading}
          error={traderMovements.error}
          onRetry={traderMovements.reload}
          seasonId={filterValues.seasonId}
          traderId={filterValues.traderId}
          movementStatus={filterValues.movementStatus}
          categoryId={filterValues.movementCategory}
          grade={filterValues.movementGrade}
          pitamStatus={filterValues.movementPitamStatus}
          seasonOptions={seasonOptions}
          traderOptions={traderOptions}
          movementStatusOptions={movementStatusOptions}
          onCategoryChange={(value) => setFilterValues((prev) => ({ ...prev, movementCategory: value }))}
          onGradeChange={(value) => setFilterValues((prev) => ({ ...prev, movementGrade: value }))}
          onPitamStatusChange={(value) => setFilterValues((prev) => ({ ...prev, movementPitamStatus: value }))}
          onSeasonChange={(value) => setFilterValues((prev) => ({ ...prev, seasonId: value }))}
          onTraderChange={(value) => setFilterValues((prev) => ({ ...prev, traderId: value }))}
          onMovementStatusChange={(value) => setFilterValues((prev) => ({ ...prev, movementStatus: value }))}
          traderCategoryOrder={traderCategoryOrder}
        />
      ) : (
        <section className="shipments-empty-state">
          <h2 className="shipments-empty-title">{content.title}</h2>
          <p className="shipments-empty-desc">{content.description}</p>
        </section>
      )}

      <AddTraderMovementModal
        lang={lang}
        isOpen={isAddMovementModalOpen}
        seasonId={activeSeasonId}
        traders={traders}
        customers={customers}
        traderCategories={traderCategories}
        customerCategories={customerCategories}
        onClose={() => setIsAddMovementModalOpen(false)}
        onSaved={() => {
          setIsAddMovementModalOpen(false);
          traderMovements.reload();
          traderInventorySummary.reload();
        }}
      />
    </AppShell>
  );
}
