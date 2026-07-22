import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppShell } from '../../app/layout/AppShell';
import type { NavItem, SidebarSection } from '../../types/navigation';
import { getCurrentUser, isAuthenticated, logout } from '../../services/authService';
import { SettingsSeasonsHeaderActions } from './components/SettingsSeasonsHeaderActions';
import { SettingsSitePreferencesPanel } from './components/SettingsSitePreferencesPanel';
import { getSettingsHeaderActionText, getSettingsI18n, isManagerRole } from './i18n';
import { useSettingsHeaderState } from './hooks/useSettingsHeaderState';
import { useSettingsPreferences } from './hooks/useSettingsPreferences';
import { normalizeSettingsChildId } from './utils/normalizeSettingsChildId.util';
import { renderSettingsActiveChild } from './utils/settingsChildRenderers.util';
import { fetchSeasons } from '../../store/seasonsSlice';
import type { AppDispatch, RootState } from '../../store';
import feedbackStyles from './styles/SettingsWorkspaceFeedback.module.css';
import workspaceStyles from '../../components/ui/styles/WorkspaceSection.module.css';

export default function SettingsPage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  const currentUser = getCurrentUser();
  const [alertsCount, setAlertsCount] = useState<number>(0);

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
      fetchUnreadCount().then((res) => setAlertsCount(res.count)).catch(() => setAlertsCount(0));
    });
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
    }
  }, [navigate]);

  const t = getSettingsI18n(lang);
  const isManager = isManagerRole(currentUser?.role);
  const baseSidebarSections = isManager ? t.sidebarManager : t.sidebarWorker;
  const sidebarSections = useMemo<SidebarSection[]>(() => {
    if (activeSeasonYearName == null) {
      return baseSidebarSections;
    }

    return baseSidebarSections.map((section) => ({
      ...section,
      items: section.items.map((item) =>
        item.id === 'traderCategories' || item.id === 'traderPricing' || item.id === 'customerCategories'
          ? { ...item, label: `${item.label} (${activeSeasonYearName})` }
          : item,
      ),
    }));
  }, [baseSidebarSections, activeSeasonYearName]);
  const activeChildId = normalizeSettingsChildId(location.pathname, isManager);
  const content = t.content[activeChildId];

  const setupStep = (location.state as { setupStep?: number } | null)?.setupStep;
  const setupNotice = setupStep != null ? (t.setupNotices[setupStep as 1 | 2 | 3] ?? null) : null;

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
    navigate(item.href || '/settings/site/language');
  };

  const pageHeaderActions = (
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
      pageTitle={pageTitle}
      pageHeaderActions={pageHeaderActions}
      topNav={t.topNav}
      sidebarSections={sidebarSections}
      activeSidebarItemId={activeChildId}
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
        userName: currentUser?.name || t.userNameFallback,
      }}
    >
      <section className={workspaceStyles.workspace}>
        <p className={workspaceStyles.description}>{content.description}</p>
        {setupNotice ? <p className={feedbackStyles.setupNotice}>{setupNotice}</p> : null}
        {saveFeedback ? <p className={feedbackStyles.saved}>{saveFeedback}</p> : null}

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
      </section>
    </AppShell>
  );
}
