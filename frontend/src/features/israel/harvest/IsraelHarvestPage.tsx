import { useCallback, useEffect, useMemo, useState } from 'react';
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
} from '../../../services/israelFieldsApi';
import {
  getIsraelFieldCategoriesBySeason,
  type IsraelFieldCategory,
} from '../../../services/israelFieldCategoriesApi';
import {
  createIsraelHarvest,
  getIsraelHarvestsBySeason,
  type IsraelHarvestRecord,
} from '../../../services/israelHarvestsApi';
import { createIsraelClassification } from '../../../services/israelClassificationsApi';
import {
  getIsraelSortCategories,
  type IsraelSortCategory,
} from '../../../services/israelSortCategoriesApi';
import type { GlobalScopedFilterConfig } from '../../../components/ui/GlobalScopedFilters';
import { IsraelHarvestFieldReportSection } from './components/field-report/IsraelHarvestFieldReportSection';
import {
  IsraelHarvestBulkFormModal,
  type IsraelHarvestBulkFormSubmitPayload,
} from './components/forms/IsraelHarvestBulkFormModal';
import {
  IsraelSortingFormModal,
  type IsraelSortingFormSubmitPayload,
} from './components/forms/IsraelSortingFormModal';
import { buildIsraelHarvestFieldReportRows } from './utils/israelHarvestFieldReport.util';
import { downloadStyledExcel } from '../../../services/exportExcel';
import { HARVEST_PRINT_BASE_STYLE } from '../../harvest/services/harvestPrintStyles';

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

  useEffect(() => {
    if (!isHarvestSummaryTab) {
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
  }, [isHarvestSummaryTab]);

  useEffect(() => {
    if (!isHarvestSummaryTab || seasonFilterId === null) {
      return;
    }

    getIsraelFieldCategoriesBySeason(seasonFilterId)
      .then(setFieldCategories)
      .catch(() => setFieldCategories([]));
  }, [isHarvestSummaryTab, seasonFilterId]);

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
    if (!isHarvestSummaryTab || seasonFilterId === null) {
      return;
    }

    loadHarvestRecords();
  }, [isHarvestSummaryTab, seasonFilterId, loadHarvestRecords]);

  const fieldReportRows = useMemo(
    () => buildIsraelHarvestFieldReportRows(harvestRecords),
    [harvestRecords],
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
    } catch {
      window.alert(t.harvestForm.saveFailedError);
    } finally {
      setIsSubmittingHarvest(false);
    }
  };

  const handleAddSorting = async (payload: IsraelSortingFormSubmitPayload) => {
    setIsSubmittingSorting(true);
    try {
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

  const pageHeaderActions = isHarvestSummaryTab ? (
    <HarvestSummaryHeaderActions
      addHarvestLabel={t.pageControls.addHarvest}
      addSortingLabel={t.pageControls.addSorting}
      onAddHarvest={() => setIsHarvestFormOpen(true)}
      onAddSorting={() => setIsSortingFormOpen(true)}
      addDisabled={seasonFilterId === null}
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
      ) : (
        <section className="shipments-empty-state">
          <h2 className="shipments-empty-title">{content.title}</h2>
          <p className="shipments-empty-desc">{content.description}</p>
        </section>
      )}
    </AppShell>
  );
}
