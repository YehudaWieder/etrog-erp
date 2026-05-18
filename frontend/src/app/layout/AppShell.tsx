import type { NavItem, SidebarSection } from '../../types/navigation';

import { Sidebar } from '../../components/navigation/Sidebar';
import { AppTopBar } from '../../components/navigation/AppTopBar';
import type { ProfileMenuProps } from '../../components/navigation/ProfileMenu';
import { directionFromLanguage, getPreferredLanguage } from '../../utils/locale';

type TopBarOptions = ProfileMenuProps & {
  alertsCount?: number;
  onAlertsClick?: () => void;
};

type AppShellProps = {
  direction?: 'rtl' | 'ltr';
  brandName?: string;
  pageTitle?: string;
  topNav: NavItem[];
  activeTopNavId?: string;
  sidebarSections: SidebarSection[];
  activeSidebarItemId?: string;
  onTopNavClick?: (item: NavItem) => void;
  onSidebarClick?: (item: NavItem) => void;
  onBrandClick?: () => void;
  topBarOptions: TopBarOptions;
  sidebarFooterSlot?: React.ReactNode;
  hideSidebar?: boolean;
  children: React.ReactNode;
};

export function AppShell({
  direction,
  brandName = 'Wieders etrogs',
  pageTitle,
  topNav,
  activeTopNavId,
  sidebarSections,
  activeSidebarItemId,
  onTopNavClick,
  onSidebarClick,
  onBrandClick,
  topBarOptions,
  sidebarFooterSlot,
  hideSidebar = false,
  children,
}: AppShellProps): JSX.Element {
  const preferredLanguage = getPreferredLanguage('he');
  const resolvedDirection = direction ?? directionFromLanguage(preferredLanguage);
  const topBarLanguage: 'he' | 'en' = preferredLanguage.toLowerCase().startsWith('en') ? 'en' : 'he';

  if (typeof document !== 'undefined') {
    document.documentElement.lang = preferredLanguage;
    document.documentElement.dir = resolvedDirection;
  }

  return (
    <div className="app-shell" data-direction={resolvedDirection}>
      <AppTopBar
        links={topNav}
        activeId={activeTopNavId}
        onNavigate={onTopNavClick}
        brandName={brandName}
        lang={topBarLanguage}
        onBrandClick={onBrandClick}
        alertsCount={topBarOptions.alertsCount}
        onAlertsClick={topBarOptions.onAlertsClick}
        isAuthenticated={topBarOptions.isAuthenticated}
        onLogin={topBarOptions.onLogin}
        onRegister={topBarOptions.onRegister}
        onLogout={topBarOptions.onLogout}
        onProfile={topBarOptions.onProfile}
        userName={topBarOptions.userName}
      />
      <div className="app-shell__body">
        {!hideSidebar && (
          <Sidebar
            sections={sidebarSections}
            activeItemId={activeSidebarItemId}
            onNavigate={onSidebarClick}
            footerSlot={sidebarFooterSlot}
          />
        )}
        <div className="app-shell__main">
          <main className="app-shell__content">
            {pageTitle ? <h1 className="app-shell__page-title">{pageTitle}</h1> : null}
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
