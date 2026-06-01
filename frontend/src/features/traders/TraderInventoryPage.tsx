import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppShell } from '../../app/layout/AppShell';
import { GlobalScopedFilters, type GlobalScopedFilterConfig, type GlobalScopedFiltersApi } from '../../components/ui/GlobalScopedFilters';
import { SettingsIcon } from '../../components/ui/SettingsIcon';
import { TraderInventoryAllSection } from './components/TraderInventoryAllSection';
import { useTraderInventorySummary } from './hooks/useTraderInventorySummary';
import { TRADER_INVENTORY_I18N } from './i18n';
import type { NavItem } from '../../types/navigation';
import { getCurrentUser, isAuthenticated, logout } from '../../services/authService';
import { getActiveSeason, getSeasons, type Season } from '../../services/seasonsApi';
import { getTraders, type Trader } from '../../services/tradersApi';

const DEFAULT_SIDEBAR_ITEM_ID = 'unboxed';

export function TraderInventoryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTopId, setActiveTopId] = useState('traders');
  const [alertsCount, setAlertsCount] = useState<number>(0);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [traders, setTraders] = useState<Trader[]>([]);
  const [activeSeasonId, setActiveSeasonId] = useState<number | null>(null);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({
    seasonId: '',
    traderId: 'ALL',
  });
  const [filtersLoading, setFiltersLoading] = useState(false);
  const filtersApiRef = useRef<GlobalScopedFiltersApi | null>(null);

  useEffect(() => {
    // load unread messages count
    import('../../services/messagesApi').then(({ fetchUnreadCount }) => {
      fetchUnreadCount().then((res) => setAlertsCount(res.count)).catch(() => setAlertsCount(0));
    });
  }, []);

  const currentUser = getCurrentUser();

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

  const activeSidebarId = useMemo(() => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    const subRoute = pathParts[1];
    return subRoute || DEFAULT_SIDEBAR_ITEM_ID;
  }, [location.pathname]);

  const t = TRADER_INVENTORY_I18N[lang];
  const isAllInventoryTab = activeSidebarId === 'all';
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

  const summaryFilters = useMemo(
    () => ({
      seasonId: selectedSeasonId,
      traderId: selectedTraderId,
      ownerScope: selectedOwnerScope,
    }),
    [selectedOwnerScope, selectedSeasonId, selectedTraderId],
  );

  const traderInventorySummary = useTraderInventorySummary(isAllInventoryTab, summaryFilters);

  useEffect(() => {
    if (!isAllInventoryTab) {
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
  }, [isAllInventoryTab]);

  useEffect(() => {
    if (!isAllInventoryTab || !activeSeasonId || !filtersApiRef.current) {
      return;
    }

    if (filterValues.seasonId) {
      return;
    }

    filtersApiRef.current.setFilterValue('seasonId', String(activeSeasonId));
  }, [activeSeasonId, filterValues.seasonId, isAllInventoryTab]);

  const seasonOptions = useMemo(
    () =>
      [...seasons]
        .sort((left, right) => right.yearName - left.yearName)
        .map((season) => ({
          value: String(season.id),
          label: String(season.yearName),
        })),
    [seasons],
  );

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
    ],
    [activeSeasonId, seasonOptions, t.summary.filters.seasonLabel, t.summary.filters.traderLabel, traderOptions],
  );

  const filtersBar = isAllInventoryTab ? (
    <GlobalScopedFilters
      scope="trader-inventory-summary"
      filters={scopedFilters}
      direction={lang === 'he' ? 'rtl' : 'ltr'}
      onValuesChange={setFilterValues}
      onApiReady={(api) => {
        filtersApiRef.current = api;
      }}
      actions={filtersLoading ? <span>{t.summary.loading}</span> : null}
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
    navigate(`/${item.id}`);
  };

  const handleSidebarClick = (item: NavItem) => {
    navigate(item.href || `/traders/${item.id}`);
  };

  return (
    <AppShell
      direction={lang === 'he' ? 'rtl' : 'ltr'}
      brandName="Wieders etrogs"
      pageTitle={pageTitle}
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
        />
      ) : (
        <section className="shipments-empty-state">
          <h2 className="shipments-empty-title">{content.title}</h2>
          <p className="shipments-empty-desc">{content.description}</p>
        </section>
      )}
    </AppShell>
  );
}
