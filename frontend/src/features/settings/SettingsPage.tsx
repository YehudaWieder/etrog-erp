import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppShell } from '../../app/layout/AppShell';
import type { NavItem, SidebarSection } from '../../types/navigation';
import { getCurrentUser, isAuthenticated, logout } from '../../services/authService';

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
  languageLabel: string;
  languageOptions: { he: string; en: string };
  colorLabel: string;
  colorHint: string;
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
    languageLabel: 'שפה',
    languageOptions: { he: 'עברית', en: 'English' },
    colorLabel: 'צבע',
    colorHint: 'בחר צבע ראשי לממשק. נשמר מקומית בדפדפן.',
    managerOnlyHint: 'תוכן זה זמין למנהל מערכת.',
    sidebarWorker: [
      {
        id: 'site',
        title: 'הגדרות אתר',
        href: '/settings/site/language',
        items: [
          { id: 'language', label: 'שפה', href: '/settings/site/language' },
          { id: 'themeColor', label: 'צבע', href: '/settings/site/theme-color' },
        ],
      },
    ],
    sidebarManager: [
      {
        id: 'site',
        title: 'הגדרות אתר',
        href: '/settings/site/language',
        items: [
          { id: 'language', label: 'שפה', href: '/settings/site/language' },
          { id: 'themeColor', label: 'צבע', href: '/settings/site/theme-color' },
        ],
      },
      {
        id: 'system',
        title: 'הגדרות מערכת',
        href: '/settings/system/seasons',
        items: [
          { id: 'seasons', label: 'עונות', href: '/settings/system/seasons' },
          { id: 'fields', label: 'שדות', href: '/settings/system/fields' },
        ],
      },
      {
        id: 'traders',
        title: 'סוחרים',
        href: '/settings/traders/categories',
        items: [
          { id: 'traderCategories', label: 'קטגוריות סוחרים', href: '/settings/traders/categories' },
          { id: 'defaultTraderCategories', label: 'קטגוריות סוחרים ברירת מחדל', href: '/settings/traders/default-categories' },
        ],
      },
      {
        id: 'customers',
        title: 'לקוחות',
        href: '/settings/customers/categories',
        items: [
          { id: 'customerCategories', label: 'קטגוריות לקוחות', href: '/settings/customers/categories' },
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
    languageLabel: 'Language',
    languageOptions: { he: 'Hebrew', en: 'English' },
    colorLabel: 'Color',
    colorHint: 'Pick a primary UI color. Stored locally in browser.',
    managerOnlyHint: 'This area is visible to managers only.',
    sidebarWorker: [
      {
        id: 'site',
        title: 'Site Settings',
        href: '/settings/site/language',
        items: [
          { id: 'language', label: 'Language', href: '/settings/site/language' },
          { id: 'themeColor', label: 'Color', href: '/settings/site/theme-color' },
        ],
      },
    ],
    sidebarManager: [
      {
        id: 'site',
        title: 'Site Settings',
        href: '/settings/site/language',
        items: [
          { id: 'language', label: 'Language', href: '/settings/site/language' },
          { id: 'themeColor', label: 'Color', href: '/settings/site/theme-color' },
        ],
      },
      {
        id: 'system',
        title: 'System Settings',
        href: '/settings/system/seasons',
        items: [
          { id: 'seasons', label: 'Seasons', href: '/settings/system/seasons' },
          { id: 'fields', label: 'Fields', href: '/settings/system/fields' },
        ],
      },
      {
        id: 'traders',
        title: 'Traders',
        href: '/settings/traders/categories',
        items: [
          { id: 'traderCategories', label: 'Trader Categories', href: '/settings/traders/categories' },
          { id: 'defaultTraderCategories', label: 'Default Trader Categories', href: '/settings/traders/default-categories' },
        ],
      },
      {
        id: 'customers',
        title: 'Customers',
        href: '/settings/customers/categories',
        items: [
          { id: 'customerCategories', label: 'Customer Categories', href: '/settings/customers/categories' },
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
  const [savedMessage, setSavedMessage] = useState('');

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
  const [selectedColor, setSelectedColor] = useState('#ffca2b');

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const storedColor = window.localStorage.getItem('app.themeColor');
    if (storedColor) {
      setSelectedColor(storedColor);
    }
  }, []);

  const handleSave = () => {
    const nextLanguage = selectedLanguage;
    const savedMessageText = SETTINGS_I18N[nextLanguage].saved;

    if (typeof window !== 'undefined') {
      window.localStorage.setItem('app.language', nextLanguage);
      window.localStorage.setItem('app.themeColor', selectedColor);
    }

    setLang(nextLanguage);
    setSavedMessage(savedMessageText);

    // Reload to ensure all app modules pick up persisted settings consistently.
    window.setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    }, 350);
  };

  const handleTopNavClick = (item: NavItem) => {
    navigate(`/${item.id}`);
  };

  const handleSidebarClick = (item: NavItem) => {
    navigate(item.href || '/settings/site/language');
  };

  return (
    <AppShell
      direction={lang === 'he' ? 'rtl' : 'ltr'}
      brandName="Wieders etrogs"
      pageTitle={t.pageTitle}
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
        <header className="settings-workspace__header">
          <div>
            <h2 className="settings-workspace__title">{content.title}</h2>
            <p className="settings-workspace__description">{content.description}</p>
          </div>
          <button type="button" className="btn btn-success" onClick={handleSave}>
            {t.save}
          </button>
        </header>

        {savedMessage ? <p className="settings-workspace__saved">{savedMessage}</p> : null}

        {activeChildId === 'language' ? (
          <div className="settings-card-grid">
            <article className="settings-card">
              <h3 className="settings-card__title">{t.languageLabel}</h3>
              <p className="settings-card__hint">{content.description}</p>
              <div className="settings-choice-list">
                <button
                  type="button"
                  className={`settings-choice${selectedLanguage === 'he' ? ' is-active' : ''}`}
                  onClick={() => setSelectedLanguage('he')}
                >
                  {t.languageOptions.he}
                </button>
                <button
                  type="button"
                  className={`settings-choice${selectedLanguage === 'en' ? ' is-active' : ''}`}
                  onClick={() => setSelectedLanguage('en')}
                >
                  {t.languageOptions.en}
                </button>
              </div>
            </article>
          </div>
        ) : null}

        {activeChildId === 'themeColor' ? (
          <div className="settings-card-grid">
            <article className="settings-card">
              <h3 className="settings-card__title">{t.colorLabel}</h3>
              <p className="settings-card__hint">{t.colorHint}</p>
              <div className="settings-color-picker-row">
                <input
                  type="color"
                  value={selectedColor}
                  onChange={(event) => setSelectedColor(event.target.value)}
                  aria-label={t.colorLabel}
                />
                <code className="settings-color-value">{selectedColor}</code>
              </div>
            </article>
          </div>
        ) : null}

        {activeChildId !== 'language' && activeChildId !== 'themeColor' ? (
          <div className="settings-card-grid">
            <article className="settings-card settings-card--placeholder">
              <h3 className="settings-card__title">{content.title}</h3>
              <p className="settings-card__hint">{content.description}</p>
              {isManager ? null : <p className="settings-workspace__manager-note">{t.managerOnlyHint}</p>}
            </article>
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}