import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaCirclePlus } from 'react-icons/fa6';
import { AppShell } from '../../../app/layout/AppShell';
import { HARVEST_I18N } from '../../harvest/i18n';
import { ISRAEL_INVENTORY_I18N } from './i18n';
import type { NavItem } from '../../../types/navigation';
import {
  getCurrentUser,
  isAuthenticated,
  logout,
} from '../../../services/authService';
import { useActiveModule } from '../../../hooks/useActiveModule';
import { SettingsIcon } from '../../../components/ui/SettingsIcon';
import {
  GlobalScopedFilters,
  type GlobalScopedFilterConfig,
} from '../../../components/ui/GlobalScopedFilters';
import {
  getActiveSeason,
  getSeasons,
  type Season,
} from '../../../services/seasonsApi';
import {
  getIsraelStockBySeason,
  createIsraelStockMovement,
  type IsraelStockRecord,
  type CreateIsraelStockMovementPayload,
} from '../../../services/israel/israelStockApi';
import {
  getIsraelSortCategories,
  type IsraelSortCategory,
} from '../../../services/israel/israelSortCategoriesApi';
import {
  getIsraelFields,
  type IsraelField,
} from '../../../services/israel/israelFieldsApi';
import { IsraelInventoryAllSection } from './components/all-inventory/IsraelInventoryAllSection';
import { IsraelStockMovementModal } from './components/all-inventory/IsraelStockMovementModal';
import { IsraelMovementsSection } from './components/movements/IsraelMovementsSection';
import type { IsraelInventoryStatusScope } from './utils/buildStockStatusMatrix.util';

const DEFAULT_SIDEBAR_ITEM_ID = 'all-inventory';

export function IsraelInventoryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const activeModule = useActiveModule();
  const [activeTopId, setActiveTopId] = useState('israel-inventory');
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
  const t = ISRAEL_INVENTORY_I18N[lang];

  const activeSidebarId = useMemo(() => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    const subRoute = pathParts[2];
    return subRoute || DEFAULT_SIDEBAR_ITEM_ID;
  }, [location.pathname]);

  const content = useMemo(() => {
    return t.emptyState[activeSidebarId] ?? t.emptyState.default;
  }, [activeSidebarId, t.emptyState]);

  const isAllInventoryTab = activeSidebarId === 'all-inventory';
  const isMovementsTab = activeSidebarId === 'movements';

  const handleTopNavClick = (item: NavItem) => {
    setActiveTopId(item.id);
    navigate(item.href || `/${item.id}`);
  };

  const handleSidebarClick = (item: NavItem) => {
    navigate(`/${activeModule}${item.href || `/inventory/${item.id}`}`);
  };

  const [seasons, setSeasons] = useState<Season[]>([]);
  const [activeSeasonId, setActiveSeasonId] = useState<number | null>(null);
  const [seasonFilterId, setSeasonFilterId] = useState<number | null>(null);
  const [sortCategories, setSortCategories] = useState<IsraelSortCategory[]>(
    [],
  );
  const [stockRows, setStockRows] = useState<IsraelStockRecord[]>([]);
  const [isStockLoading, setIsStockLoading] = useState(false);
  const [stockLoadError, setStockLoadError] = useState('');
  const [fields, setFields] = useState<IsraelField[]>([]);
  const [fieldFilterId, setFieldFilterId] = useState<number | 'all'>('all');
  const [statusFilterId, setStatusFilterId] =
    useState<IsraelInventoryStatusScope>('ALL');
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [isSubmittingMovement, setIsSubmittingMovement] = useState(false);
  const [movementError, setMovementError] = useState('');
  const [movementsFieldFilterId, setMovementsFieldFilterId] = useState<
    number | 'all'
  >('all');
  const [movementsCategoryFilterId, setMovementsCategoryFilterId] = useState<
    number | 'all'
  >('all');
  const [movementsStatusFilter, setMovementsStatusFilter] = useState<
    'ALL' | 'NON_SHIPMENT' | 'SHIPMENT'
  >('ALL');
  const [movementsGradeFilter, setMovementsGradeFilter] = useState('ALL');
  const [movementsPitamStatusFilter, setMovementsPitamStatusFilter] =
    useState('ALL');

  useEffect(() => {
    if (!isAllInventoryTab && !isMovementsTab) {
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
      .catch(() => setSeasons([]));

    getIsraelSortCategories()
      .then(setSortCategories)
      .catch(() => setSortCategories([]));

    getIsraelFields()
      .then(setFields)
      .catch(() => setFields([]));
  }, [isAllInventoryTab, isMovementsTab]);

  const filteredStockRows = useMemo(() => {
    return stockRows.filter((row) => {
      if (fieldFilterId !== 'all' && row.fieldId !== fieldFilterId) {
        return false;
      }
      return true;
    });
  }, [stockRows, fieldFilterId]);

  const loadStock = useCallback(() => {
    if (seasonFilterId === null) {
      return;
    }

    setIsStockLoading(true);
    setStockLoadError('');
    getIsraelStockBySeason(seasonFilterId)
      .then((records) => setStockRows(records))
      .catch(() => setStockLoadError(t.allInventory.loadError))
      .finally(() => setIsStockLoading(false));
  }, [seasonFilterId, t.allInventory.loadError]);

  useEffect(() => {
    if ((!isAllInventoryTab && !isMovementsTab) || seasonFilterId === null) {
      return;
    }

    loadStock();
  }, [isAllInventoryTab, isMovementsTab, seasonFilterId, loadStock]);

  const movementsStockRows = useMemo(() => {
    return stockRows.filter((row) => {
      if (
        movementsFieldFilterId !== 'all' &&
        row.fieldId !== movementsFieldFilterId
      ) {
        return false;
      }
      return true;
    });
  }, [stockRows, movementsFieldFilterId]);

  const allInventoryFilters = useMemo<GlobalScopedFilterConfig[]>(() => {
    const seasonFilter: GlobalScopedFilterConfig = {
      key: 'seasonId',
      label: t.allInventory.seasonFilterLabel,
      defaultValue: activeSeasonId ? String(activeSeasonId) : '',
      queryParam: 'iiSeason',
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

    const fieldFilter: GlobalScopedFilterConfig = {
      key: 'fieldId',
      label: t.allInventory.fieldFilterLabel,
      defaultValue: 'all',
      queryParam: 'iiField',
      options: [
        { value: 'all', label: t.allInventory.allFieldsOption },
        ...fields.map((field) => ({
          value: String(field.id),
          label: field.name,
        })),
      ],
    };

    const statusFilter: GlobalScopedFilterConfig = {
      key: 'status',
      label: t.allInventory.statusFilterLabel,
      defaultValue: 'ALL',
      queryParam: 'iiStatus',
      options: [
        { value: 'ALL', label: t.allInventory.statusOptions.all },
        { value: 'NOT_PACKED', label: t.allInventory.statusOptions.notPacked },
        { value: 'PACKED', label: t.allInventory.statusOptions.packed },
        { value: 'SENT', label: t.allInventory.statusOptions.sent },
        {
          value: 'SELF_PICKUP',
          label: t.allInventory.statusOptions.selfPickup,
        },
        { value: 'WASTE', label: t.allInventory.statusOptions.waste },
      ],
    };

    return [seasonFilter, fieldFilter, statusFilter];
  }, [activeSeasonId, seasons, fields, t.allInventory, lang]);

  const handleAllInventoryFiltersChange = useCallback(
    (values: Record<string, string>) => {
      const parsedSeason = Number(values.seasonId);
      setSeasonFilterId(
        Number.isFinite(parsedSeason) && parsedSeason > 0 ? parsedSeason : null,
      );

      const parsedField = Number(values.fieldId);
      setFieldFilterId(
        values.fieldId &&
          values.fieldId !== 'all' &&
          Number.isFinite(parsedField)
          ? parsedField
          : 'all',
      );

      const status = values.status;
      setStatusFilterId(
        status === 'NOT_PACKED' ||
          status === 'PACKED' ||
          status === 'SENT' ||
          status === 'SELF_PICKUP' ||
          status === 'WASTE'
          ? status
          : 'ALL',
      );
    },
    [],
  );

  const isViewingNonActiveSeason =
    seasonFilterId !== null && seasonFilterId !== activeSeasonId;

  const allInventoryFiltersBar = isAllInventoryTab ? (
    <GlobalScopedFilters
      scope="israel-inventory-all"
      filters={allInventoryFilters}
      direction={lang === 'he' ? 'rtl' : 'ltr'}
      onValuesChange={handleAllInventoryFiltersChange}
    />
  ) : null;

  const movementsSeasonOptions = useMemo(() => {
    if (seasons.length === 0) {
      return [
        {
          value: '',
          label:
            lang === 'he'
              ? 'אין עונה פעילה כרגע'
              : 'No active season right now',
        },
      ];
    }
    return seasons.map((season) => ({
      value: String(season.id),
      label: `${season.yearName}${season.isActive ? ` (${lang === 'he' ? 'פעילה' : 'Active'})` : ''}`,
    }));
  }, [seasons, lang]);

  const movementsFieldOptions = useMemo(
    () =>
      fields.map((field) => ({ value: String(field.id), label: field.name })),
    [fields],
  );

  const movementsCategoryOptions = useMemo(
    () =>
      sortCategories.map((category) => ({
        value: String(category.id),
        label: category.name,
      })),
    [sortCategories],
  );

  const handleCreateMovement = (payload: CreateIsraelStockMovementPayload) => {
    setIsSubmittingMovement(true);
    setMovementError('');
    createIsraelStockMovement(payload)
      .then(() => {
        setIsMovementModalOpen(false);
        loadStock();
      })
      .catch(() => setMovementError(t.addMovement.saveFailedError))
      .finally(() => setIsSubmittingMovement(false));
  };

  return (
    <AppShell
      direction={lang === 'he' ? 'rtl' : 'ltr'}
      brandName="Wieders etrogs"
      pageTitle={t.pageTitle}
      pageHeaderActions={
        isAllInventoryTab || isMovementsTab ? (
          <div className="action-buttons">
            <button
              className="btn btn-primary"
              type="button"
              disabled={isViewingNonActiveSeason}
              title={
                isViewingNonActiveSeason
                  ? t.addMovement.nonActiveSeasonDisabled
                  : undefined
              }
              onClick={() => {
                setMovementError('');
                setIsMovementModalOpen(true);
              }}
            >
              <FaCirclePlus />
              <span>{t.addMovement.buttonLabel}</span>
            </button>
          </div>
        ) : null
      }
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
      {isAllInventoryTab ? (
        <IsraelInventoryAllSection
          lang={lang}
          labels={t.allInventory}
          filtersBar={allInventoryFiltersBar}
          rows={filteredStockRows}
          statusScope={statusFilterId}
          isLoading={isStockLoading}
          loadError={stockLoadError}
          onRetry={loadStock}
          sortCategories={sortCategories}
        />
      ) : isMovementsTab ? (
        <IsraelMovementsSection
          lang={lang}
          labels={t.movements}
          movements={movementsStockRows}
          isLoading={isStockLoading}
          error={stockLoadError}
          onRetry={loadStock}
          seasonId={seasonFilterId ? String(seasonFilterId) : ''}
          fieldId={
            movementsFieldFilterId === 'all'
              ? 'all'
              : String(movementsFieldFilterId)
          }
          categoryId={
            movementsCategoryFilterId === 'all'
              ? 'all'
              : String(movementsCategoryFilterId)
          }
          movementStatus={movementsStatusFilter}
          grade={movementsGradeFilter}
          pitamStatus={movementsPitamStatusFilter}
          seasonOptions={movementsSeasonOptions}
          fieldOptions={movementsFieldOptions}
          categoryOptions={movementsCategoryOptions}
          onSeasonChange={(value) => {
            const parsed = Number(value);
            setSeasonFilterId(
              Number.isFinite(parsed) && parsed > 0 ? parsed : null,
            );
          }}
          onFieldChange={(value) => {
            const parsed = Number(value);
            setMovementsFieldFilterId(
              value && value !== 'all' && Number.isFinite(parsed)
                ? parsed
                : 'all',
            );
          }}
          onCategoryChange={(value) => {
            const parsed = Number(value);
            setMovementsCategoryFilterId(
              value && value !== 'all' && Number.isFinite(parsed)
                ? parsed
                : 'all',
            );
          }}
          onMovementStatusChange={(value) =>
            setMovementsStatusFilter(
              value === 'NON_SHIPMENT' || value === 'SHIPMENT' ? value : 'ALL',
            )
          }
          onGradeChange={setMovementsGradeFilter}
          onPitamStatusChange={setMovementsPitamStatusFilter}
        />
      ) : (
        <section className="shipments-empty-state">
          <h2 className="shipments-empty-title">{content.title}</h2>
          <p className="shipments-empty-desc">{content.description}</p>
        </section>
      )}

      <IsraelStockMovementModal
        isOpen={isMovementModalOpen}
        lang={lang}
        labels={t.addMovement}
        seasonId={seasonFilterId}
        fields={fields}
        sortCategories={sortCategories}
        stockRows={stockRows}
        isLoadingStock={isStockLoading}
        isSubmitting={isSubmittingMovement}
        error={movementError}
        onClose={() => setIsMovementModalOpen(false)}
        onSubmit={handleCreateMovement}
      />
    </AppShell>
  );
}
