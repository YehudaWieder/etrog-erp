import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaCheck, FaRotateLeft, FaTrashCan } from 'react-icons/fa6';
import { AppShell } from '../../app/layout/AppShell';
import type { NavItem, SidebarSection } from '../../types/navigation';
import { getCurrentUser, isAuthenticated, logout } from '../../services/authService';
import SeasonsManagement, { type SeasonsHeaderState } from '../seasons/SeasonsManagement';

type Lang = 'he' | 'en';
type SettingsChildKey = 'language' | 'themeColor' | 'seasons' | 'fields' | 'traderCategories' | 'defaultTraderCategories' | 'customerCategories';

type SettingsContent = {
  title: string;
  description: string;
};

type SettingsI18n = {
  topNav: NavItem[];
  pageTitle: string;
  save: string;
  saved: string;
  reset: string;
  languageLabel: string;
  languageOptions: { he: string; en: string };
  colorLabel: string;
  colorHint: string;
  primaryColorLabel: string;
  accentColorLabel: string;
  textColorLabel: string;
  darkModeLabel: string;
  darkModeOn: string;
  darkModeOff: string;
  managerOnlyHint: string;
  sidebarWorker: SidebarSection[];
  sidebarManager: SidebarSection[];
  content: Record<SettingsChildKey, SettingsContent>;
};

const SETTINGS_I18N: Record<Lang, SettingsI18n> = {
  he: {
    topNav: [
      { id: 'harvest', label: 'קטיף ומיון', icon: 'fa-leaf' },
      { id: 'shipments', label: 'משלוחים', icon: 'fa-truck' },
      { id: 'partners', label: 'סוחרים', icon: 'fa-handshake' },
      { id: 'customers', label: 'לקוחות', icon: 'fa-users' },
      { id: 'workers', label: 'עובדים', icon: 'fa-person' },
      { id: 'payments', label: 'הוצאות ותשלומים', icon: 'fa-money-bill' },
    ],
    pageTitle: 'הגדרות',
    save: 'שמירה',
    saved: 'השינויים נשמרו',
    reset: 'אתחול',
    languageLabel: 'שפה',
    languageOptions: { he: 'עברית', en: 'English' },
    colorLabel: 'צבעים וממשק',
    colorHint: 'בחר את צבעי הממשק שלך. הגדרות נשמרות בדפדפן.',
    primaryColorLabel: 'צבע ראשי',
    accentColorLabel: 'צבע accent',
    textColorLabel: 'צבע טקסט',
    darkModeLabel: 'מוד כהה',
    darkModeOn: 'כהה',
    darkModeOff: 'בהיר',
    managerOnlyHint: 'תוכן זה זמין למנהל מערכת.',
    sidebarWorker: [
      {
        id: 'site',
        title: 'הגדרות אתר',
        href: '/settings/site/language',
        icon: 'fa-sliders',
        items: [
          { id: 'language', label: 'שפה', href: '/settings/site/language', icon: 'fa-globe' },
          { id: 'themeColor', label: 'צבע', href: '/settings/site/theme-color', icon: 'fa-palette' },
        ],
      },
    ],
    sidebarManager: [
      {
        id: 'site',
        title: 'הגדרות אתר',
        href: '/settings/site/language',
        icon: 'fa-sliders',
        items: [
          { id: 'language', label: 'שפה', href: '/settings/site/language', icon: 'fa-globe' },
          { id: 'themeColor', label: 'צבע', href: '/settings/site/theme-color', icon: 'fa-palette' },
        ],
      },
      {
        id: 'system',
        title: 'הגדרות מערכת',
        href: '/settings/system/seasons',
        icon: 'fa-cog',
        items: [
          { id: 'seasons', label: 'עונות', href: '/settings/system/seasons', icon: 'fa-calendar' },
          { id: 'fields', label: 'שדות', href: '/settings/system/fields', icon: 'fa-grip' },
        ],
      },
      {
        id: 'traders',
        title: 'סוחרים',
        href: '/settings/traders/categories',
        icon: 'fa-handshake',
        items: [
          { id: 'traderCategories', label: 'קטגוריות סוחרים', href: '/settings/traders/categories', icon: 'fa-tag' },
          { id: 'defaultTraderCategories', label: 'קטגוריות סוחרים ברירת מחדל', href: '/settings/traders/default-categories', icon: 'fa-bookmark' },
        ],
      },
      {
        id: 'customers',
        title: 'לקוחות',
        href: '/settings/customers/categories',
        icon: 'fa-users',
        items: [
          { id: 'customerCategories', label: 'קטגוריות לקוחות', href: '/settings/customers/categories', icon: 'fa-tag' },
        ],
      },
    ],
    content: {
      language: {
        title: 'הגדרות שפה',
        description: 'בחר שפת ממשק. השינוי מתעדכן מיידית ונשמר בדפדפן.',
      },
      themeColor: {
        title: 'הגדרות צבע',
        description: 'בחר צבע דומיננטי. הצבע נשמר מקומית כהעדפת משתמש.',
      },
      seasons: {
        title: 'ניהול עונות',
        description: 'כאן יופיעו פעולות יצירה, בחירה וסגירת עונות פעילות.',
      },
      fields: {
        title: 'ניהול שדות',
        description: 'כאן ינוהלו שדות ומאפייני שדה ברמת המערכת.',
      },
      traderCategories: {
        title: 'קטגוריות סוחרים',
        description: 'כאן תוגדר היררכיית קטגוריות לסוחרים.',
      },
      defaultTraderCategories: {
        title: 'קטגוריות סוחרים ברירת מחדל',
        description: 'כאן תוגדר ברירת המחדל לקטגוריות סוחרים בעת יצירת סוחר חדש.',
      },
      customerCategories: {
        title: 'קטגוריות לקוחות',
        description: 'כאן תוגדר היררכיית קטגוריות ללקוחות.',
      },
    },
  },
  en: {
    topNav: [
      { id: 'harvest', label: 'Harvest & Sorting' },
      { id: 'shipments', label: 'Shipments' },
      { id: 'partners', label: 'Partners' },
      { id: 'customers', label: 'Customers' },
      { id: 'workers', label: 'Workers' },
      { id: 'payments', label: 'Expenses & Payments' },
    ],
    pageTitle: 'Settings',
    save: 'Save',
    saved: 'Changes were saved',
    reset: 'Reset',
    languageLabel: 'Language',
    languageOptions: { he: 'Hebrew', en: 'English' },
    colorLabel: 'Colors & Interface',
    colorHint: 'Customize your interface colors. Settings are saved locally in your browser.',
    primaryColorLabel: 'Primary Color',
    accentColorLabel: 'Accent Color',
    textColorLabel: 'Text Color',
    darkModeLabel: 'Dark Mode',
    darkModeOn: 'Dark',
    darkModeOff: 'Light',
    managerOnlyHint: 'This area is visible to managers only.',
    sidebarWorker: [
      {
        id: 'site',
        title: 'Site Settings',
        href: '/settings/site/language',
        icon: 'fa-sliders',
        items: [
          { id: 'language', label: 'Language', href: '/settings/site/language', icon: 'fa-globe' },
          { id: 'themeColor', label: 'Color', href: '/settings/site/theme-color', icon: 'fa-palette' },
        ],
      },
    ],
    sidebarManager: [
      {
        id: 'site',
        title: 'Site Settings',
        href: '/settings/site/language',
        icon: 'fa-sliders',
        items: [
          { id: 'language', label: 'Language', href: '/settings/site/language', icon: 'fa-globe' },
          { id: 'themeColor', label: 'Color', href: '/settings/site/theme-color', icon: 'fa-palette' },
        ],
      },
      {
        id: 'system',
        title: 'System Settings',
        href: '/settings/system/seasons',
        icon: 'fa-cog',
        items: [
          { id: 'seasons', label: 'Seasons', href: '/settings/system/seasons', icon: 'fa-calendar' },
          { id: 'fields', label: 'Fields', href: '/settings/system/fields', icon: 'fa-grip' },
        ],
      },
      {
        id: 'traders',
        title: 'Traders',
        href: '/settings/traders/categories',
        icon: 'fa-handshake',
        items: [
          { id: 'traderCategories', label: 'Trader Categories', href: '/settings/traders/categories', icon: 'fa-tag' },
          { id: 'defaultTraderCategories', label: 'Default Trader Categories', href: '/settings/traders/default-categories', icon: 'fa-bookmark' },
        ],
      },
      {
        id: 'customers',
        title: 'Customers',
        href: '/settings/customers/categories',
        icon: 'fa-users',
        items: [
          { id: 'customerCategories', label: 'Customer Categories', href: '/settings/customers/categories', icon: 'fa-tag' },
        ],
      },
    ],
    content: {
      language: {
        title: 'Language Settings',
        description: 'Choose interface language. Change is applied immediately.',
      },
      themeColor: {
        title: 'Color Settings',
        description: 'Select dominant color. Saved as a local user preference.',
      },
      seasons: {
        title: 'Season Management',
        description: 'Season lifecycle configuration appears here.',
      },
      fields: {
        title: 'Field Management',
        description: 'System-level field definitions appear here.',
      },
      traderCategories: {
        title: 'Trader Categories',
        description: 'Maintain trader category hierarchy here.',
      },
      defaultTraderCategories: {
        title: 'Default Trader Categories',
        description: 'Set default trader categories used when creating a new trader.',
      },
      customerCategories: {
        title: 'Customer Categories',
        description: 'Maintain customer category hierarchy here.',
      },
    },
  },
};

const MANAGER_ROLES = new Set(['manager', 'owner', 'admin']);

function normalizeChildId(pathname: string, isManager: boolean): SettingsChildKey {
  const path = pathname.toLowerCase();

  if (path.includes('/site/theme-color')) return 'themeColor';
  if (path.includes('/site/language')) return 'language';
  if (path.includes('/system/seasons')) return isManager ? 'seasons' : 'language';
  if (path.includes('/system/fields')) return isManager ? 'fields' : 'language';
  if (path.includes('/traders/default-categories')) return isManager ? 'defaultTraderCategories' : 'language';
  if (path.includes('/traders/categories')) return isManager ? 'traderCategories' : 'language';
  if (path.includes('/customers/categories')) return isManager ? 'customerCategories' : 'language';

  return 'language';
}

export default function SettingsPage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = getCurrentUser();
  const [alertsCount, setAlertsCount] = useState<number>(0);
  const [saveFeedback, setSaveFeedback] = useState('');
  const [seasonsHeaderState, setSeasonsHeaderState] = useState<SeasonsHeaderState | null>(null);

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

  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('app.language');
      if (stored === 'en' || stored === 'he') {
        return stored;
      }
    }
    return 'he';
  });

  const t = SETTINGS_I18N[lang];
  const normalizedRole = (currentUser?.role || '').trim().toLowerCase();
  const isManager = MANAGER_ROLES.has(normalizedRole);
  const sidebarSections = isManager ? t.sidebarManager : t.sidebarWorker;
  const activeChildId = normalizeChildId(location.pathname, isManager);
  const content = t.content[activeChildId];

  const [selectedLanguage, setSelectedLanguage] = useState<Lang>(lang);
  const [selectedPrimaryColor, setSelectedPrimaryColor] = useState<string>('#ffca2b');
  const [selectedAccentColor, setSelectedAccentColor] = useState<string>('#2d5a27');
  const [selectedTextColor, setSelectedTextColor] = useState<string>('#333333');
  const [selectedDarkMode, setSelectedDarkMode] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const storedPrimary = window.localStorage.getItem('app.primaryColor');
    const storedAccent = window.localStorage.getItem('app.accentColor');
    const storedTextColor = window.localStorage.getItem('app.textColor');
    const storedDarkMode = window.localStorage.getItem('app.darkMode');

    if (storedPrimary) {
      setSelectedPrimaryColor(storedPrimary);
      document.documentElement.style.setProperty('--color-primary', storedPrimary);
    }
    if (storedAccent) {
      setSelectedAccentColor(storedAccent);
      document.documentElement.style.setProperty('--color-text-accent', storedAccent);
    }
    if (storedTextColor) {
      setSelectedTextColor(storedTextColor);
      document.documentElement.style.setProperty('--color-text-main', storedTextColor);
    }
    if (storedDarkMode !== null) {
      const isDarkMode = storedDarkMode === 'true';
      setSelectedDarkMode(isDarkMode);
      document.documentElement.setAttribute('data-dark-mode', isDarkMode ? 'true' : 'false');
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.style.setProperty('--color-primary', selectedPrimaryColor);
      document.documentElement.style.setProperty('--color-text-accent', selectedAccentColor);
      document.documentElement.style.setProperty('--color-text-main', selectedTextColor);
      document.documentElement.setAttribute('data-dark-mode', selectedDarkMode ? 'true' : 'false');
    }
  }, [selectedPrimaryColor, selectedAccentColor, selectedTextColor, selectedDarkMode]);

  const handleUpdateSettings = () => {
    const nextLanguage = selectedLanguage;

    if (typeof window !== 'undefined') {
      window.localStorage.setItem('app.language', nextLanguage);
      window.localStorage.setItem('app.primaryColor', selectedPrimaryColor);
      window.localStorage.setItem('app.accentColor', selectedAccentColor);
      window.localStorage.setItem('app.textColor', selectedTextColor);
      window.localStorage.setItem('app.darkMode', String(selectedDarkMode));
    }

    setLang(nextLanguage);
    setSaveFeedback(SETTINGS_I18N[nextLanguage].saved);

    // Reload to ensure all modules in the app consume persisted settings consistently.
    window.setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    }, 500);
  };

  const handleReset = () => {
    setSelectedPrimaryColor('#ffca2b');
    setSelectedAccentColor('#2d5a27');
    setSelectedTextColor('#333333');
    setSelectedDarkMode(false);
  };

  const handleTopNavClick = (item: NavItem) => {
    navigate(`/${item.id}`);
  };

  const handleSidebarClick = (item: NavItem) => {
    navigate(item.href || '/settings/site/language');
  };

  // הכותרת העליונה תמיד שם הטאב הפעיל; בעונות מציגים גם מונה כחלק מהכותרת.
  const pageTitle = activeChildId === 'seasons' && seasonsHeaderState
    ? `${content.title} (${seasonsHeaderState.count})`
    : content.title;
  const seasonsActionText = {
    activate: lang === 'he' ? 'הגדר כפעילה' : 'Set Active',
    remove: lang === 'he' ? 'מחיקה' : 'Delete',
  };

  const pageHeaderActions = activeChildId === 'seasons' && seasonsHeaderState ? (
    <div className="settings-seasons-header-buttons">
      <button
        type="button"
        className="settings-seasons-header-btn settings-seasons-header-btn--success"
        onClick={seasonsHeaderState.onActivate}
        disabled={seasonsHeaderState.isActivateDisabled}
      >
        <FaCheck />
        <span>{seasonsActionText.activate}</span>
      </button>
      <button
        type="button"
        className="settings-seasons-header-btn settings-seasons-header-btn--danger"
        onClick={seasonsHeaderState.onDelete}
        disabled={seasonsHeaderState.isDeleteDisabled}
      >
        <FaTrashCan />
        <span>{seasonsActionText.remove}</span>
      </button>
    </div>
  ) : activeChildId === 'language' || activeChildId === 'themeColor' ? (
    <div className="settings-seasons-header-buttons">
      <button
        type="button"
        className="settings-seasons-header-btn settings-seasons-header-btn--success"
        onClick={handleUpdateSettings}
      >
        <FaCheck />
        <span>{t.save}</span>
      </button>
    </div>
  ) : undefined;

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
        userName: currentUser?.name || (lang === 'he' ? 'הפרופיל שלי' : 'My Profile'),
      }}
    >
      <section className="settings-workspace">
        {saveFeedback ? <p className="settings-workspace__saved">{saveFeedback}</p> : null}

        {activeChildId === 'language' ? (
          <div className="settings-panel-wide settings-panel-wide--language">
            <button
              type="button"
              className={`settings-choice settings-choice--wide${selectedLanguage === 'he' ? ' is-active' : ''}`}
              onClick={() => setSelectedLanguage('he')}
            >
              {t.languageOptions.he}
            </button>
            <button
              type="button"
              className={`settings-choice settings-choice--wide${selectedLanguage === 'en' ? ' is-active' : ''}`}
              onClick={() => setSelectedLanguage('en')}
            >
              {t.languageOptions.en}
            </button>
          </div>
        ) : null}

        {activeChildId === 'themeColor' ? (
          <div className="settings-panel-wide settings-panel-wide--theme">
            <div className="settings-color-block">
              <label className="settings-color-label">
                {t.primaryColorLabel}
              </label>
              <div className="settings-color-control">
                <input
                  type="color"
                  value={selectedPrimaryColor}
                  onChange={(event) => setSelectedPrimaryColor(event.target.value)}
                  aria-label={t.primaryColorLabel}
                />
                <code className="settings-color-value">{selectedPrimaryColor}</code>
              </div>
            </div>

            <div className="settings-color-block">
              <label className="settings-color-label">
                {t.accentColorLabel}
              </label>
              <div className="settings-color-control">
                <input
                  type="color"
                  value={selectedAccentColor}
                  onChange={(event) => setSelectedAccentColor(event.target.value)}
                  aria-label={t.accentColorLabel}
                />
                <code className="settings-color-value">{selectedAccentColor}</code>
              </div>
            </div>

            <div className="settings-color-block">
              <label className="settings-color-label">
                {t.textColorLabel}
              </label>
              <div className="settings-color-control">
                <input
                  type="color"
                  value={selectedTextColor}
                  onChange={(event) => setSelectedTextColor(event.target.value)}
                  aria-label={t.textColorLabel}
                />
                <code className="settings-color-value">{selectedTextColor}</code>
              </div>
            </div>

            <div className="settings-color-block settings-color-block--mode">
              <label className="settings-color-label">
                {t.darkModeLabel}
              </label>
              <div className="settings-choice-list">
                <button
                  type="button"
                  className={`settings-choice${!selectedDarkMode ? ' is-active' : ''}`}
                  onClick={() => setSelectedDarkMode(false)}
                >
                  {t.darkModeOff}
                </button>
                <button
                  type="button"
                  className={`settings-choice${selectedDarkMode ? ' is-active' : ''}`}
                  onClick={() => setSelectedDarkMode(true)}
                >
                  {t.darkModeOn}
                </button>
              </div>
            </div>

            <div className="settings-reset-row">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleReset}
              >
                <FaRotateLeft />
                {t.reset}
              </button>
            </div>
          </div>
        ) : null}

        {activeChildId === 'seasons' ? (
          <SeasonsManagement onHeaderStateChange={setSeasonsHeaderState} />
        ) : null}

        {activeChildId !== 'language' && activeChildId !== 'themeColor' && activeChildId !== 'seasons' ? (
          isManager ? null : <p className="settings-workspace__manager-note">{t.managerOnlyHint}</p>
        ) : null}
      </section>
    </AppShell>
  );
}