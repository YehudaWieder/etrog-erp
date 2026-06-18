import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { FaCirclePlus } from 'react-icons/fa6';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppShell } from '../../app/layout/AppShell';
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
import { getCurrentUser, isAuthenticated, logout } from '../../services/authService';
import { getActiveSeason, getSeasons, type Season } from '../../services/seasonsApi';
import { getTraders, type Trader } from '../../services/tradersApi';
import { getTraderCategoriesWithShares, type TraderCategoryWithShares } from '../../services/traderCategoriesApi';
import { getCustomers, type Customer } from '../../services/customersApi';
import { getCustomerCategoriesBySeason, type CustomerCategory } from '../../services/customerCategoriesApi';

const DEFAULT_SIDEBAR_ITEM_ID = 'all';
const DEFAULT_FILTER_VALUES: Record<string, string> = {
  seasonId: '',
  traderId: 'ALL',
  inventoryStatus: 'ALL',
  movementStatus: 'ALL',
  movementCategory: 'ALL',
  movementGrade: 'ALL',
  movementPitamStatus: 'ALL',
};

export function TraderInventoryPage() {
  const navigate = useNavigate();
  const location = useLocation();
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
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerCategories, setCustomerCategories] = useState<CustomerCategory[]>([]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
    }
  }, [navigate]);

  const currentUser = getCurrentUser();

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
    const subRoute = pathParts[1];
    return subRoute || DEFAULT_SIDEBAR_ITEM_ID;
  }, [location.pathname]);

  const t = TRADER_INVENTORY_I18N[lang];
  const isAllInventoryTab = activeSidebarId === 'all';
  const isMovementsTab = activeSidebarId === 'movements';
  const selectedSeasonId = useMemo(() => {
    const parsed = Number.parseInt(filterValues.seasonId, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }, [filterValues.seasonId]);
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
    'ALL' | 'UNSHIPPED' | 'PACKED_SHIPPED' | 'SHIPPED' | 'SELF_PICKUP' | 'PRIVATE_SELECTION' | 'HARVEST_IN' | 'INTERNAL_TRANSFER' | 'OWNERSHIP_TRANSFER' | 'ASSIGNED' | 'WASTE' | 'ADJUSTMENT'
  >(() => {
    const status = filterValues.inventoryStatus || 'ALL';
    if (status === 'ALL' || status === 'UNSHIPPED' || status === 'PACKED_SHIPPED' || status === 'SHIPPED' || status === 'SELF_PICKUP' || status === 'PRIVATE_SELECTION') {
      return status;
    }
    return 'ALL';
  }, [filterValues.inventoryStatus]);

  const summaryFilters = useMemo(
    () => ({
      seasonId: selectedSeasonId,
      traderId: selectedTraderId,
      ownerScope: selectedOwnerScope,
      shipmentScope: selectedShipmentScope,
    }),
    [selectedOwnerScope, selectedSeasonId, selectedTraderId, selectedShipmentScope],
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
      { value: 'PRIVATE_SELECTION', label: t.summary.filters.privateSelectionOption },
    ],
    [t.summary.filters.allInventoryOption, t.summary.filters.unboxedOption, t.summary.filters.boxedOption, t.summary.filters.shippedOption, t.summary.filters.selfPickupOption, t.summary.filters.privateSelectionOption],
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
    ])
      .then(([nextTraderCategories, nextCustomers, nextCustomerCategories]) => {
        if (!isActive) return;
        setTraderCategories(nextTraderCategories);
        setCustomers(nextCustomers);
        setCustomerCategories(nextCustomerCategories);
      })
      .catch(() => {
        if (!isActive) return;
        setTraderCategories([]);
        setCustomers([]);
        setCustomerCategories([]);
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
      },
      {
        key: 'inventoryStatus',
        label: t.summary.filters.inventoryStatusLabel,
        defaultValue: 'ALL',
        options: inventoryStatusOptions,
      },
    ],
    [activeSeasonId, seasonOptions, t.summary.filters.seasonLabel, t.summary.filters.traderLabel, traderOptions, t.summary.filters.inventoryStatusLabel, inventoryStatusOptions],
  );

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

    // Map inventory status to display label
    const statusMap: Record<string, string> = {
      'ALL': t.summary.filters.allInventoryOption,
      'UNSHIPPED': t.summary.filters.unboxedOption,
      'PACKED_SHIPPED': t.summary.filters.boxedOption,
      'SHIPPED': t.summary.filters.shippedOption,
      'SELF_PICKUP': t.summary.filters.selfPickupOption,
      'PRIVATE_SELECTION': t.summary.filters.privateSelectionOption,
    };
    const statusDisplay = statusMap[filterValues.inventoryStatus] || filterValues.inventoryStatus;

    const filterDetailsHtml = `
      <div style="margin-bottom: 20px; padding: 12px; background: #f5f5f5; border-radius: 4px; font-size: 12px; border: 1px solid #ddd;">
        <strong>${lang === 'he' ? 'סינונים פעילים' : 'Active Filters'}:</strong><br/>
        <div style="margin-top: 4px;">${t.summary.filters.seasonLabel}: ${seasonDisplay}</div>
        <div style="margin-top: 4px;">${t.summary.filters.traderLabel}: ${traderDisplay}</div>
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

    const summaryMatrix = buildTraderInventorySummaryMatrix(traderInventorySummary.rows, t.summary.values.none);
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
  }, [lang, seasons, traders, filterValues, t, traderInventorySummary.rows]);

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
      'PRIVATE_SELECTION': t.summary.filters.privateSelectionOption,
    };
    const statusDisplay = statusMap[filterValues.inventoryStatus] || filterValues.inventoryStatus;
    const baseFileName = lang === 'he' ? 'מלאי סוחרים' : 'Trader Inventory';

    const summaryMatrix = buildTraderInventorySummaryMatrix(traderInventorySummary.rows, t.summary.values.none);

    await exportTraderInventoryExcel({
      fileName: `${baseFileName}_${seasonDisplay}_${traderDisplay}_${statusDisplay}`,
      sheetName: lang === 'he' ? 'מלאי סוחרים' : 'Trader Inventory',
      filterRows: [
        [t.summary.filters.seasonLabel, seasonDisplay],
        [t.summary.filters.traderLabel, traderDisplay],
        [t.summary.filters.inventoryStatusLabel, statusDisplay],
      ],
      summaryMatrix,
      labels: t.summary,
      rightToLeft: lang === 'he',
    });
  }, [lang, seasons, traders, filterValues, t, traderInventorySummary.rows]);

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
    const targetPath = item.href || `/traders/${item.id}`;
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
        isMovementsTab || isAllInventoryTab ? (
          <div className="action-buttons">
            <button className="btn btn-primary" type="button" onClick={() => setIsAddMovementModalOpen(true)}>
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
      onBrandClick={() => navigate('/home')}
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
          onClick={() => navigate('/settings')}
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
      {isAllInventoryTab ? (
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
