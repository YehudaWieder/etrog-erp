import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppShell } from '../../app/layout/AppShell';
import { useActiveModule } from '../../hooks/useActiveModule';
import { filterSidebarByModule } from '../../components/navigation/navModules';
import type { NavItem, SidebarSection } from '../../types/navigation';
import {
  getCurrentUser,
  isAuthenticated,
  logout,
} from '../../services/authService';
import { SettingsSeasonsHeaderActions } from './components/SettingsSeasonsHeaderActions';
import { SettingsSitePreferencesPanel } from './components/SettingsSitePreferencesPanel';
import {
  getSettingsHeaderActionText,
  getSettingsI18n,
  isManagerRole,
} from './i18n';
import { useSettingsHeaderState } from './hooks/useSettingsHeaderState';
import { useSettingsPreferences } from './hooks/useSettingsPreferences';
import { normalizeSettingsChildId } from './utils/normalizeSettingsChildId.util';
import { renderSettingsActiveChild } from './utils/settingsChildRenderers.util';
import { IsraelHarvestSettingsSection } from '../israel/settings/harvestSettings/IsraelHarvestSettingsSection';
import { IsraelHarvestSettingsHeaderActions } from '../israel/settings/harvestSettings/IsraelHarvestSettingsHeaderActions';
import {
  getIsraelHarvestSettingsChildId,
  getIsraelHarvestSettingsDescription,
  getIsraelHarvestSettingsTitle,
  ISRAEL_HARVEST_SETTINGS_PATH_SEGMENTS,
} from '../israel/settings/harvestSettings/israelHarvestSettings.i18n';
import type { IsraelFieldsHeaderState } from '../israel/settings/fields/components/IsraelFieldsManagement';
import type { IsraelFieldCategoriesHeaderState } from '../israel/settings/fieldCategories/components/IsraelFieldCategoriesManagement';
import type { IsraelSortCategoriesHeaderState } from '../israel/settings/sortCategories/components/IsraelSortCategoriesManagement';
import { fetchSeasons } from '../../store/seasonsSlice';
import type { AppDispatch, RootState } from '../../store';
import feedbackStyles from './styles/SettingsWorkspaceFeedback.module.css';
import workspaceStyles from '../../components/ui/styles/WorkspaceSection.module.css';

export default function SettingsPage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const activeModule = useActiveModule();
  const dispatch = useDispatch<AppDispatch>();
  const currentUser = getCurrentUser();
  const [alertsCount, setAlertsCount] = useState<number>(0);
  const [israelFieldsHeaderState, setIsraelFieldsHeaderState] =
    useState<IsraelFieldsHeaderState | null>(null);
  const [
    israelFieldCategoriesHeaderState,
    setIsraelFieldCategoriesHeaderState,
  ] = useState<IsraelFieldCategoriesHeaderState | null>(null);
  const [israelSortCategoriesHeaderState, setIsraelSortCategoriesHeaderState] =
    useState<IsraelSortCategoriesHeaderState | null>(null);

  const seasons = useSelector((state: RootState) => state.seasons.items);
  const activeSeasonYearName = useMemo(
    () => seasons.find((season) => season.isActive)?.yearName ?? null,
    [seasons],
  );

  useEffect(() => {
    void dispatch(fetchSeasons());
  }, [dispatch]);

  const {
    lang,
    selectedLanguage,
    setSelectedLanguage,
    selectedPrimaryColor,
    setSelectedPrimaryColor,
    selectedAccentColor,
    setSelectedAccentColor,
    selectedTextColor,
    setSelectedTextColor,
    selectedDarkMode,
    setSelectedDarkMode,
    saveFeedback,
    handleUpdateSettings,
    handleReset,
  } = useSettingsPreferences();

  useEffect(() => {
    import('../../services/messagesApi').then(({ fetchUnreadCount }) => {
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

  const t = getSettingsI18n(lang);
  const isIsraelHarvestSettings = ISRAEL_HARVEST_SETTINGS_PATH_SEGMENTS.some(
    (segment) => location.pathname.toLowerCase().includes(segment),
  );
  const israelHarvestChildId = getIsraelHarvestSettingsChildId(
    location.pathname,
  );
  const israelHarvestTitle = getIsraelHarvestSettingsTitle(
    lang,
    israelHarvestChildId,
  );
  const israelHarvestDescription = getIsraelHarvestSettingsDescription(
    lang,
    israelHarvestChildId,
  );
  const israelHarvestHeaderCount =
    israelHarvestChildId === 'harvestSellersFields'
      ? israelFieldsHeaderState?.count
      : israelHarvestChildId === 'harvestSellerCategories'
        ? israelFieldCategoriesHeaderState?.count
        : israelHarvestChildId === 'harvestSortingCategories'
          ? israelSortCategoriesHeaderState?.count
          : undefined;
  const israelHarvestPageTitle =
    israelHarvestHeaderCount !== undefined
      ? `${israelHarvestTitle} (${israelHarvestHeaderCount})`
      : israelHarvestTitle;
  const isManager = isManagerRole(currentUser?.role);
  const baseSidebarSections = filterSidebarByModule(
    isManager ? t.sidebarManager : t.sidebarWorker,
    activeModule,
  );
  const sidebarSections = useMemo<SidebarSection[]>(() => {
    if (activeSeasonYearName == null) {
      return baseSidebarSections;
    }

    return baseSidebarSections.map((section) => ({
      ...section,
      items: section.items.map((item) =>
        item.id === 'traderCategories' ||
        item.id === 'traderPricing' ||
        item.id === 'customerCategories' ||
        item.id === 'harvestSellerCategories'
          ? { ...item, label: `${item.label} (${activeSeasonYearName})` }
          : item,
      ),
    }));
  }, [baseSidebarSections, activeSeasonYearName]);
  const activeChildId = normalizeSettingsChildId(location.pathname, isManager);
  const content = t.content[activeChildId];

  const setupStep = (location.state as { setupStep?: number } | null)
    ?.setupStep;
  const setupNotice =
    setupStep != null ? (t.setupNotices[setupStep as 1 | 2 | 3] ?? null) : null;

  const {
    pageTitle,
    seasonsHeaderState,
    setSeasonsHeaderState,
    fieldsHeaderState,
    setFieldsHeaderState,
    cartonsHeaderState,
    setCartonsHeaderState,
    pricingHeaderState,
    setPricingHeaderState,
    tradersHeaderState,
    setTradersHeaderState,
    traderCategoriesHeaderState,
    setTraderCategoriesHeaderState,
    traderPricingHeaderState,
    setTraderPricingHeaderState,
    defaultTraderCategoriesHeaderState,
    setDefaultTraderCategoriesHeaderState,
    customersHeaderState,
    setCustomersHeaderState,
    customerCategoriesHeaderState,
    setCustomerCategoriesHeaderState,
  } = useSettingsHeaderState({
    contentTitle: content.title,
    activeChildId,
  });

  const handleTopNavClick = (item: NavItem) => {
    navigate(item.href || `/${item.id}`);
  };

  const handleSidebarClick = (item: NavItem) => {
    navigate(`/${activeModule}${item.href || '/settings/site/language'}`);
  };

  const pageHeaderActions = isIsraelHarvestSettings ? (
    <IsraelHarvestSettingsHeaderActions
      childId={israelHarvestChildId}
      actionText={getSettingsHeaderActionText(lang)}
      fieldsHeaderState={israelFieldsHeaderState}
      fieldCategoriesHeaderState={israelFieldCategoriesHeaderState}
      sortCategoriesHeaderState={israelSortCategoriesHeaderState}
    />
  ) : (
    <SettingsSeasonsHeaderActions
      activeChildId={activeChildId}
      saveLabel={t.save}
      actionText={getSettingsHeaderActionText(lang)}
      onSave={handleUpdateSettings}
      seasonsHeaderState={seasonsHeaderState}
      fieldsHeaderState={fieldsHeaderState}
      cartonsHeaderState={cartonsHeaderState}
      pricingHeaderState={pricingHeaderState}
      tradersHeaderState={tradersHeaderState}
      traderCategoriesHeaderState={traderCategoriesHeaderState}
      traderPricingHeaderState={traderPricingHeaderState}
      defaultTraderCategoriesHeaderState={defaultTraderCategoriesHeaderState}
      customersHeaderState={customersHeaderState}
      customerCategoriesHeaderState={customerCategoriesHeaderState}
    />
  );

  return (
    <AppShell
      direction={lang === 'he' ? 'rtl' : 'ltr'}
      brandName="Wieders etrogs"
      pageTitle={isIsraelHarvestSettings ? israelHarvestPageTitle : pageTitle}
      pageHeaderActions={pageHeaderActions}
      topNav={t.topNav}
      sidebarSections={sidebarSections}
      activeSidebarItemId={
        isIsraelHarvestSettings ? israelHarvestChildId : activeChildId
      }
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
        userName: currentUser?.name || t.userNameFallback,
      }}
    >
      <section className={workspaceStyles.workspace}>
        {isIsraelHarvestSettings ? (
          <>
            <p className={workspaceStyles.description}>
              {israelHarvestDescription}
            </p>
            <IsraelHarvestSettingsSection
              lang={lang}
              onFieldsHeaderStateChange={setIsraelFieldsHeaderState}
              onFieldCategoriesHeaderStateChange={
                setIsraelFieldCategoriesHeaderState
              }
              onSortCategoriesHeaderStateChange={
                setIsraelSortCategoriesHeaderState
              }
            />
          </>
        ) : (
          <>
            <p className={workspaceStyles.description}>{content.description}</p>
            {setupNotice ? (
              <p className={feedbackStyles.setupNotice}>{setupNotice}</p>
            ) : null}
            {saveFeedback ? (
              <p className={feedbackStyles.saved}>{saveFeedback}</p>
            ) : null}

            <SettingsSitePreferencesPanel
              activeChildId={activeChildId}
              t={t}
              selectedLanguage={selectedLanguage}
              setSelectedLanguage={setSelectedLanguage}
              selectedPrimaryColor={selectedPrimaryColor}
              setSelectedPrimaryColor={setSelectedPrimaryColor}
              selectedAccentColor={selectedAccentColor}
              setSelectedAccentColor={setSelectedAccentColor}
              selectedTextColor={selectedTextColor}
              setSelectedTextColor={setSelectedTextColor}
              selectedDarkMode={selectedDarkMode}
              setSelectedDarkMode={setSelectedDarkMode}
              onReset={handleReset}
            />

            {renderSettingsActiveChild({
              activeChildId,
              isManager,
              lang,
              setSeasonsHeaderState,
              setFieldsHeaderState,
              setCartonsHeaderState,
              setPricingHeaderState,
              setTradersHeaderState,
              setTraderCategoriesHeaderState,
              setTraderPricingHeaderState,
              setDefaultTraderCategoriesHeaderState,
              setCustomersHeaderState,
              setCustomerCategoriesHeaderState,
            })}
          </>
        )}
      </section>
    </AppShell>
  );
}
