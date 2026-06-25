import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppShell } from '../../app/layout/AppShell';
import type { NavItem } from '../../types/navigation';
import { getCurrentUser, isAuthenticated, logout } from '../../services/authService';
import { SettingsSeasonsHeaderActions } from './components/SettingsSeasonsHeaderActions';
import { SettingsSitePreferencesPanel } from './components/SettingsSitePreferencesPanel';
import { getSettingsHeaderActionText, getSettingsI18n, isManagerRole } from './i18n';
import { useSettingsHeaderState } from './hooks/useSettingsHeaderState';
import { useSettingsPreferences } from './hooks/useSettingsPreferences';
import { normalizeSettingsChildId } from './utils/normalizeSettingsChildId.util';
import { renderSettingsActiveChild } from './utils/settingsChildRenderers.util';
import feedbackStyles from './styles/SettingsWorkspaceFeedback.module.css';
import workspaceStyles from '../../components/ui/styles/WorkspaceSection.module.css';

export default function SettingsPage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = getCurrentUser();
  const [alertsCount, setAlertsCount] = useState<number>(0);

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
  const sidebarSections = isManager ? t.sidebarManager : t.sidebarWorker;
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
          setDefaultTraderCategoriesHeaderState,
          setCustomersHeaderState,
          setCustomerCategoriesHeaderState,
        })}
      </section>
    </AppShell>
  );
}
