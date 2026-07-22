import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FaCirclePlus } from 'react-icons/fa6';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppShell } from '../../app/layout/AppShell';
import {
  GlobalScopedFilters,
  type GlobalScopedFilterConfig,
  type GlobalScopedFiltersApi,
} from '../../components/ui/GlobalScopedFilters';
import { SettingsIcon } from '../../components/ui/SettingsIcon';
import { CUSTOMER_INVENTORY_I18N } from './i18n.inventory';
import { CustomerInventoryAllSection } from './components/CustomerInventoryAllSection';
import { CustomerMovementsSection } from './components/CustomerMovementsSection';
import { useCustomerInventorySummary } from './hooks/useCustomerInventorySummary';
import { useCustomerMovements } from './hooks/useCustomerMovements';
import { openPrintableWindow } from '../../services/printWindow';
import { exportCustomerInventoryExcel } from './services/customerInventoryExport.service';
import { buildCustomerInventorySummaryMatrixByCustomer } from './utils/customerInventorySummaryMatrix.util';
import { TraderPrintExportActions } from '../traders/components/TraderPrintExportActions';
import type { NavItem } from '../../types/navigation';
import { getCurrentUser, isAuthenticated, isWorkerRole, logout } from '../../services/authService';
import { NoPermissionBanner } from '../../components/ui/NoPermissionBanner';
import { getActiveSeason, getSeasons, type Season } from '../../services/seasonsApi';
import { getCustomers, type Customer } from '../../services/customersApi';
import { getTraders, type Trader } from '../../services/tradersApi';
import { getTraderCategoriesWithShares, type TraderCategoryWithShares } from '../../services/traderCategoriesApi';
import { getCustomerCategoriesBySeason, type CustomerCategory } from '../../services/customerCategoriesApi';
import { AddCustomerMovementModal } from './components/AddCustomerMovementModal';

const DEFAULT_SIDEBAR_ITEM_ID = 'all';

export function CustomerInventoryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTopId, setActiveTopId] = useState('customers');
  const [alertsCount, setAlertsCount] = useState<number>(0);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [traders, setTraders] = useState<Trader[]>([]);
  const [traderCategories, setTraderCategories] = useState<TraderCategoryWithShares[]>([]);
  const [customerCategories, setCustomerCategories] = useState<CustomerCategory[]>([]);
  const [activeSeasonId, setActiveSeasonId] = useState<number | null>(null);
  const [isAddMovementModalOpen, setIsAddMovementModalOpen] = useState(false);
  const [filtersLoading, setFiltersLoading] = useState(false);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({
    seasonId: '',
    customerId: 'ALL',
    inventoryStatus: 'ALL',
    movementStatus: 'ALL',
    movementCategory: 'ALL',
    movementGrade: 'ALL',
    movementPitamStatus: 'ALL',
  });
  const filtersApiRef = useRef<GlobalScopedFiltersApi | null>(null);
  const matrixTableRef = useRef<HTMLTableElement>(null);

  useEffect(() => {
    // load unread messages count
    import('../../services/messagesApi').then(({ fetchUnreadCount }) => {
      fetchUnreadCount().then((res) => setAlertsCount(res.count)).catch(() => setAlertsCount(0));
    });
  }, []);

  const currentUser = getCurrentUser();
  const isWorker = isWorkerRole(currentUser?.role);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
    }
  }, [navigate]);

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

  const t = CUSTOMER_INVENTORY_I18N[lang];

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
  }, [activeSidebarId, t.sidebar, t.pageTitle]);

  const content = useMemo(() => {
    const state = t.emptyState as Record<string, { title: string; description: string }>;
    return state[activeSidebarId] || state.default;
  }, [activeSidebarId, t.emptyState]);

  const isInventoryTab = useMemo(
    () => ['all', 'unboxed', 'boxed', 'shipped', 'arrived', 'self-pickup'].includes(activeSidebarId),
    [activeSidebarId],
  );

  const selectedSeasonId = useMemo(() => {
    const parsed = Number.parseInt(filterValues.seasonId, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }, [filterValues.seasonId]);

  const isViewingNonActiveSeason = selectedSeasonId !== null && selectedSeasonId !== activeSeasonId;

  const selectedCustomerId = useMemo(() => {
    if (filterValues.customerId === 'ALL') {
      return null;
    }

    const parsed = Number.parseInt(filterValues.customerId, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }, [filterValues.customerId]);

  const selectedShipmentScope = useMemo<
    'ALL' | 'UNSHIPPED' | 'PACKED_SHIPPED' | 'SHIPPED' | 'SELF_PICKUP'
  >(() => {
    const status = filterValues.inventoryStatus || 'ALL';
    if (
      status === 'ALL' ||
      status === 'UNSHIPPED' ||
      status === 'PACKED_SHIPPED' ||
      status === 'SHIPPED' ||
      status === 'SELF_PICKUP'
    ) {
      return status;
    }
    return 'ALL';
  }, [filterValues.inventoryStatus]);

  const summaryFilters = useMemo(
    () => ({
      seasonId: selectedSeasonId,
      customerId: selectedCustomerId,
      shipmentScope: selectedShipmentScope,
    }),
    [selectedCustomerId, selectedSeasonId, selectedShipmentScope],
  );

  const customerInventorySummary = useCustomerInventorySummary(isInventoryTab, summaryFilters);
  const hasInventoryRows = customerInventorySummary.rows.length > 0;
  const isMovementsTab = activeSidebarId === 'movements';

  const selectedMovementStatus = useMemo(() => {
    const status = filterValues.movementStatus || 'ALL';
    if (status === 'ALL' || status === 'NON_SHIPMENT' || status === 'SHIPMENT') {
      return status;
    }

    return 'ALL';
  }, [filterValues.movementStatus]);

  const customerMovements = useCustomerMovements(
    selectedSeasonId,
    selectedCustomerId,
    selectedMovementStatus,
  );

  useEffect(() => {
    if (!isInventoryTab && !isMovementsTab) {
      return;
    }

    let isActive = true;
    setFiltersLoading(true);

    Promise.all([getSeasons(), getActiveSeason(), getCustomers(), getTraders()])
      .then(([nextSeasons, nextActiveSeason, nextCustomers, nextTraders]) => {
        if (!isActive) {
          return;
        }

        setSeasons(nextSeasons);
        setActiveSeasonId(nextActiveSeason.id);
        setCustomers(nextCustomers);
        setTraders(nextTraders);

        Promise.all([
          getTraderCategoriesWithShares(nextActiveSeason.id),
          getCustomerCategoriesBySeason(nextActiveSeason.id),
        ]).then(([nextTraderCategories, nextCustomerCategories]) => {
          if (!isActive) return;
          setTraderCategories(nextTraderCategories);
          setCustomerCategories(nextCustomerCategories);
        }).catch(() => {
          if (!isActive) return;
          setTraderCategories([]);
          setCustomerCategories([]);
        });
      })
      .catch(() => {
        if (!isActive) {
          return;
        }

        setSeasons([]);
        setActiveSeasonId(null);
        setCustomers([]);
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
  }, [isInventoryTab, isMovementsTab]);

  useEffect(() => {
    if (!isInventoryTab || !activeSeasonId || !filtersApiRef.current) {
      return;
    }

    if (filterValues.seasonId) {
      return;
    }

    filtersApiRef.current.setFilterValue('seasonId', String(activeSeasonId));
  }, [activeSeasonId, filterValues.seasonId, isInventoryTab]);

  useEffect(() => {
    if (!isMovementsTab || !activeSeasonId) {
      return;
    }

    if (filterValues.seasonId) {
      return;
    }

    setFilterValues((previous) => ({
      ...previous,
      seasonId: String(activeSeasonId),
    }));
  }, [activeSeasonId, filterValues.seasonId, isMovementsTab]);

  useEffect(() => {
    if (!isInventoryTab || !filtersApiRef.current) {
      return;
    }

    const statusByTab: Partial<Record<string, string>> = {
      unboxed: 'ALL',
      boxed: 'PACKED_SHIPPED',
      shipped: 'SHIPPED',
      arrived: 'SHIPPED',
      'self-pickup': 'SELF_PICKUP',
    };

    const nextStatus = statusByTab[activeSidebarId];
    if (!nextStatus) {
      return;
    }

    if (filterValues.inventoryStatus === nextStatus) {
      return;
    }

    filtersApiRef.current.setFilterValue('inventoryStatus', nextStatus);
  }, [activeSidebarId, filterValues.inventoryStatus, isInventoryTab]);

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

  const customerOptions = useMemo(
    () => [
      { value: 'ALL', label: t.summary.filters.allCustomersOption },
      ...[...customers]
        .sort((left, right) => left.customerName.localeCompare(right.customerName, undefined, { sensitivity: 'base' }))
        .map((customer) => ({
          value: String(customer.id),
          label: customer.customerName,
        })),
    ],
    [customers, t.summary.filters.allCustomersOption],
  );

  const inventoryStatusOptions = useMemo(
    () => [
      { value: 'ALL', label: t.summary.filters.allInventoryOption },
      { value: 'UNSHIPPED', label: t.summary.filters.unboxedOption },
      { value: 'PACKED_SHIPPED', label: t.summary.filters.boxedOption },
      { value: 'SHIPPED', label: t.summary.filters.shippedOption },
      { value: 'SELF_PICKUP', label: t.summary.filters.selfPickupOption },
    ],
    [
      t.summary.filters.allInventoryOption,
      t.summary.filters.boxedOption,
      t.summary.filters.selfPickupOption,
      t.summary.filters.shippedOption,
      t.summary.filters.unboxedOption,
    ],
  );

  const movementStatusOptions = useMemo(
    () => [
      { value: 'ALL', label: t.movements.filters.allMovementsOption },
      { value: 'NON_SHIPMENT', label: t.movements.filters.nonShipmentMovementsOption },
      { value: 'SHIPMENT', label: t.movements.filters.shipmentMovementsOption },
    ],
    [
      t.movements.filters.allMovementsOption,
      t.movements.filters.nonShipmentMovementsOption,
      t.movements.filters.shipmentMovementsOption,
    ],
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
        key: 'customerId',
        label: t.summary.filters.customerLabel,
        defaultValue: 'ALL',
        options: customerOptions,
      },
      {
        key: 'inventoryStatus',
        label: t.summary.filters.inventoryStatusLabel,
        defaultValue: 'ALL',
        options: inventoryStatusOptions,
      },
    ],
    [
      activeSeasonId,
      customerOptions,
      inventoryStatusOptions,
      seasonOptions,
      t.summary.filters.customerLabel,
      t.summary.filters.inventoryStatusLabel,
      t.summary.filters.seasonLabel,
    ],
  );

  const handlePrintInventoryTable = useCallback(() => {
    if (!matrixTableRef.current) {
      return;
    }

    const seasonDisplay = filterValues.seasonId
      ? seasons.find((s) => String(s.id) === filterValues.seasonId)?.yearName || filterValues.seasonId
      : 'N/A';

    const customerDisplay =
      filterValues.customerId === 'ALL'
        ? t.summary.filters.allCustomersOption
        : filterValues.customerId
        ? customers.find((customer) => String(customer.id) === filterValues.customerId)?.customerName || filterValues.customerId
        : 'N/A';

    const statusMap: Record<string, string> = {
      ALL: t.summary.filters.allInventoryOption,
      UNSHIPPED: t.summary.filters.unboxedOption,
      SHIPPED: t.summary.filters.shippedOption,
      PACKED_SHIPPED: t.summary.filters.boxedOption,
      SELF_PICKUP: t.summary.filters.selfPickupOption,
    };
    const statusDisplay = statusMap[filterValues.inventoryStatus] || filterValues.inventoryStatus;

    const filterDetailsHtml = `
      <div style="margin-bottom: 20px; padding: 12px; background: #f5f5f5; border-radius: 4px; font-size: 12px; border: 1px solid #ddd;">
        <strong>${lang === 'he' ? 'סינונים פעילים' : 'Active Filters'}:</strong><br/>
        <div style="margin-top: 4px;">${t.summary.filters.seasonLabel}: ${seasonDisplay}</div>
        <div style="margin-top: 4px;">${t.summary.filters.customerLabel}: ${customerDisplay}</div>
        <div style="margin-top: 4px;">${t.summary.filters.inventoryStatusLabel}: ${statusDisplay}</div>
      </div>
    `;

    const tableStyles = `
      @page { size: landscape; margin: 10mm; }
      @media print { html, body { width: 297mm; min-height: 210mm; } }
      table { width: 100%; border-collapse: collapse; font-size: 12px; break-inside: avoid; page-break-inside: avoid; }
      tr { break-inside: avoid; page-break-inside: avoid; }
      th, td { border: 1px solid #ccc; padding: 10px; text-align: center; }
      thead th { background-color: #1f5a32; color: white; font-weight: bold; }
      tbody th { background-color: #f0f6f1; font-weight: bold; text-align: start; }
      tbody tr:nth-child(odd) { background-color: #fafcfa; }
      tbody tr:nth-child(even) { background-color: #f3f8f4; }
      td:last-child, tbody th:last-child { background-color: #e4f0e7; font-weight: bold; }
      tfoot th, tfoot td { background-color: #e1f0e5; font-weight: bold; border-top: 2px solid #8cb494; }
      .customer-block { break-inside: avoid; page-break-inside: avoid; margin-top: 28px; }
      .customer-block h3 { font-size: 12px; font-weight: bold; margin: 0 0 8px; color: #1f5a32; border-bottom: 2px solid #8cb494; padding-bottom: 4px; }
      .category-block { break-inside: avoid; page-break-inside: avoid; margin-top: 16px; }
      .category-block h4 { break-after: avoid; page-break-after: avoid; margin: 0 0 6px; font-size: 11px; font-weight: bold; }
    `;

    const locale = lang === 'he' ? 'he-IL' : 'en-US';
    const fmt = (n: number) => new Intl.NumberFormat(locale).format(Math.abs(n));

    const summaryMatrix = buildCustomerInventorySummaryMatrixByCustomer(customerInventorySummary.rows, t.summary.values.none, customerCategories);
    const pitamWith = t.summary.values.pitamStatus.WITH_PITAM;
    const pitamWithout = t.summary.values.pitamStatus.WITHOUT_PITAM;
    const pitamMixed = t.summary.values.pitamStatus.MIXED;
    const totalLabel = t.summary.matrix.total;
    const categoryLabel = t.summary.columns.category;
    const gradeLabel = t.summary.matrix.grade;

    let breakdownHtml = `<h2 style="margin-top:32px;margin-bottom:16px;font-size:13px;font-weight:bold;text-align:center;">${t.summary.breakdown.breakdownTitle}</h2>`;
    for (const customer of summaryMatrix.customers) {
      breakdownHtml += '<div class="customer-block">';
      breakdownHtml += `<h3>${customer.customerName}</h3>`;
      breakdownHtml += `<table><thead><tr><th>${categoryLabel}</th><th>${gradeLabel}</th><th>${pitamWith}</th><th>${pitamWithout}</th><th>${pitamMixed}</th><th>${totalLabel}</th></tr></thead><tbody>`;
      for (const category of customer.categories) {
        breakdownHtml += `<tr><th>${category.label}</th><td>${category.grade}</td><td>${fmt(category.totalsByPitamStatus.WITH_PITAM)}</td><td>${fmt(category.totalsByPitamStatus.WITHOUT_PITAM)}</td><td>${fmt(category.totalsByPitamStatus.MIXED)}</td><td>${fmt(category.total)}</td></tr>`;
      }
      breakdownHtml += `</tbody><tfoot><tr><th colspan="2">${totalLabel}</th><td>${fmt(customer.totalsByPitamStatus.WITH_PITAM)}</td><td>${fmt(customer.totalsByPitamStatus.WITHOUT_PITAM)}</td><td>${fmt(customer.totalsByPitamStatus.MIXED)}</td><td>${fmt(customer.total)}</td></tr></tfoot></table>`;
      breakdownHtml += '</div>';
    }

    openPrintableWindow({
      title: lang === 'he' ? 'מלאי לקוחות' : 'Customer Inventory',
      heading: lang === 'he' ? 'מלאי לקוחות' : 'Customer Inventory',
      html: filterDetailsHtml + matrixTableRef.current.outerHTML + breakdownHtml,
      direction: lang === 'he' ? 'rtl' : 'ltr',
      width: 1280,
      height: 900,
      extraStyles: tableStyles,
    });
  }, [customers, customerCategories, filterValues, lang, seasons, t, customerInventorySummary.rows]);

  const handleExportInventoryTable = useCallback(async () => {
    const seasonDisplay = filterValues.seasonId
      ? seasons.find((s) => String(s.id) === filterValues.seasonId)?.yearName || filterValues.seasonId
      : 'N/A';

    const customerDisplay =
      filterValues.customerId === 'ALL'
        ? t.summary.filters.allCustomersOption
        : filterValues.customerId
        ? customers.find((customer) => String(customer.id) === filterValues.customerId)?.customerName || filterValues.customerId
        : 'N/A';

    const statusMap: Record<string, string> = {
      ALL: t.summary.filters.allInventoryOption,
      UNSHIPPED: t.summary.filters.unboxedOption,
      SHIPPED: t.summary.filters.shippedOption,
      PACKED_SHIPPED: t.summary.filters.boxedOption,
      SELF_PICKUP: t.summary.filters.selfPickupOption,
    };
    const statusDisplay = statusMap[filterValues.inventoryStatus] || filterValues.inventoryStatus;
    const baseFileName = lang === 'he' ? 'מלאי לקוחות' : 'Customer Inventory';

    const summaryMatrix = buildCustomerInventorySummaryMatrixByCustomer(customerInventorySummary.rows, t.summary.values.none, customerCategories);

    await exportCustomerInventoryExcel({
      fileName: `${baseFileName}_${seasonDisplay}_${customerDisplay}_${statusDisplay}`,
      sheetName: lang === 'he' ? 'מלאי לקוחות' : 'Customer Inventory',
      filterRows: [
        [t.summary.filters.seasonLabel, seasonDisplay],
        [t.summary.filters.customerLabel, customerDisplay],
        [t.summary.filters.inventoryStatusLabel, statusDisplay],
      ],
      summaryMatrix,
      labels: t.summary,
      rightToLeft: lang === 'he',
    });
  }, [customers, customerCategories, filterValues, lang, seasons, t, customerInventorySummary.rows]);

  const filtersBar = isInventoryTab ? (
    <GlobalScopedFilters
      scope="customer-inventory-summary"
      filters={scopedFilters}
      direction={lang === 'he' ? 'rtl' : 'ltr'}
      onValuesChange={setFilterValues}
      onApiReady={(api) => {
        filtersApiRef.current = api;
      }}
      actions={
        filtersLoading ? (
          <span>{t.summary.loading}</span>
        ) : hasInventoryRows ? (
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
        ) : null
      }
    />
  ) : null;

  const handleTopNavClick = (item: NavItem) => {
    setActiveTopId(item.id);
    if (item.id === 'customers') {
      if (filtersApiRef.current) {
        filtersApiRef.current.setFilterValue('seasonId', '');
        filtersApiRef.current.setFilterValue('customerId', 'ALL');
        filtersApiRef.current.setFilterValue('inventoryStatus', 'ALL');
        filtersApiRef.current.setFilterValue('movementStatus', 'ALL');
        filtersApiRef.current.setFilterValue('movementCategory', 'ALL');
        filtersApiRef.current.setFilterValue('movementGrade', 'ALL');
        filtersApiRef.current.setFilterValue('movementPitamStatus', 'ALL');
      }
      navigate('/customers', { replace: true });
    } else {
      navigate(item.href || `/${item.id}`);
    }
  };

  const handleSidebarClick = (item: NavItem) => {
    if (item.id === 'all') {
      if (filtersApiRef.current) {
        filtersApiRef.current.setFilterValue('seasonId', '');
        filtersApiRef.current.setFilterValue('customerId', 'ALL');
        filtersApiRef.current.setFilterValue('inventoryStatus', 'ALL');
      }
      navigate('/customers/all');
      return;
    }

    navigate(item.href || `/customers/${item.id}`);
  };

  return (
    <>
    <AppShell
      direction={lang === 'he' ? 'rtl' : 'ltr'}
      brandName="Wieders etrogs"
      pageTitle={pageTitle}
      topNav={t.topNav}
      activeTopNavId={activeTopId}
      pageHeaderActions={
        !isWorker && (isInventoryTab || isMovementsTab) ? (
          <div className="action-buttons">
            <button
              className="btn btn-primary"
              type="button"
              disabled={isViewingNonActiveSeason}
              title={isViewingNonActiveSeason ? t.movements.nonActiveSeasonDisabled : undefined}
              onClick={() => setIsAddMovementModalOpen(true)}
            >
              <FaCirclePlus />
              <span>{t.movements.addMovementButton}</span>
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
              Settings
              <SettingsIcon style={{ marginInlineStart: 8 }} />
            </>
          )}
        </button>
      }
    >
      {isWorker ? (
        <NoPermissionBanner message={lang === 'he' ? 'אין לך הרשאת גישה לאזור זה.' : "You don't have permission to access this area."} />
      ) : isInventoryTab ? (
        <CustomerInventoryAllSection
          lang={lang}
          labels={t.summary}
          filtersBar={filtersBar}
          rows={customerInventorySummary.rows}
          totals={customerInventorySummary.totals}
          isLoading={customerInventorySummary.isLoading}
          error={customerInventorySummary.error}
          onRetry={customerInventorySummary.reload}
          tableRef={matrixTableRef}
          customerCategories={customerCategories}
        />
      ) : isMovementsTab ? (
        <CustomerMovementsSection
          lang={lang}
          labels={t.movements}
          movements={customerMovements.rows}
          isLoading={customerMovements.isLoading}
          error={customerMovements.error}
          onRetry={customerMovements.reload}
          seasonId={filterValues.seasonId}
          customerId={filterValues.customerId}
          movementStatus={filterValues.movementStatus}
          categoryId={filterValues.movementCategory}
          grade={filterValues.movementGrade}
          pitamStatus={filterValues.movementPitamStatus}
          seasonOptions={seasonOptions}
          customerOptions={customerOptions}
          movementStatusOptions={movementStatusOptions}
          onSeasonChange={(value) => setFilterValues((previous) => ({ ...previous, seasonId: value }))}
          onCustomerChange={(value) => setFilterValues((previous) => ({ ...previous, customerId: value }))}
          onMovementStatusChange={(value) =>
            setFilterValues((previous) => ({ ...previous, movementStatus: value }))
          }
          onCategoryChange={(value) => setFilterValues((previous) => ({ ...previous, movementCategory: value }))}
          onGradeChange={(value) => setFilterValues((previous) => ({ ...previous, movementGrade: value }))}
          onPitamStatusChange={(value) =>
            setFilterValues((previous) => ({ ...previous, movementPitamStatus: value }))
          }
        />
      ) : (
        <section className="shipments-empty-state">
          <h2>{content.title}</h2>
          <p>{content.description}</p>
        </section>
      )}
    </AppShell>
    <AddCustomerMovementModal
      lang={lang}
      isOpen={isAddMovementModalOpen}
      seasonId={activeSeasonId}
      customers={customers}
      customerCategories={customerCategories}
      traders={traders}
      traderCategories={traderCategories}
      onClose={() => setIsAddMovementModalOpen(false)}
      onSaved={() => {
        setIsAddMovementModalOpen(false);
        customerMovements.reload();
      }}
    />
    </>
  );
}
