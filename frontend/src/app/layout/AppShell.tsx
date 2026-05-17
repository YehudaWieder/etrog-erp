import type { NavItem, SidebarSection } from '../../types/navigation';

import { Sidebar } from '../../components/navigation/Sidebar';
import { TopBar } from '../../components/navigation/TopBar';
import { HomeIcon } from '../../components/ui/HomeIcon';
import '../../styles/globals.css';
import { directionFromLanguage, getPreferredLanguage } from '../../utils/locale';

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
  topBarRightSlot?: React.ReactNode;
  sidebarFooterSlot?: React.ReactNode;
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
  topBarRightSlot,
  sidebarFooterSlot,
  children,
}: AppShellProps): JSX.Element {
  const preferredLanguage = getPreferredLanguage('he');
  const resolvedDirection = direction ?? directionFromLanguage(preferredLanguage);

  if (typeof document !== 'undefined') {
    document.documentElement.lang = preferredLanguage;
    document.documentElement.dir = resolvedDirection;
  }

  return (
    <div className="app-shell" data-direction={resolvedDirection}>
      {resolvedDirection === 'rtl' ? (
        <>
          <Sidebar
            brandName={brandName}
            sections={sidebarSections}
            activeItemId={activeSidebarItemId}
            onNavigate={onSidebarClick}
            footerSlot={sidebarFooterSlot}
          />
          <div className="app-shell__main">
            <TopBar
              links={topNav}
              activeId={activeTopNavId}
              onNavigate={onTopNavClick}
              rightSlot={topBarRightSlot}
            />
            <main className="app-shell__content">
              {pageTitle ? <h1 className="app-shell__page-title">{pageTitle}</h1> : null}
              {children}
            </main>
          </div>
        </>
      ) : (
        <>
          <div className="app-shell__main">
            <TopBar
              links={topNav}
              activeId={activeTopNavId}
              onNavigate={onTopNavClick}
              rightSlot={topBarRightSlot}
              leftSlot={
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <HomeIcon style={{ fontSize: 22, marginInlineEnd: 6 }} />
                  {brandName}
                </span>
              }
            />
            <main className="app-shell__content">
              {pageTitle ? <h1 className="app-shell__page-title">{pageTitle}</h1> : null}
              {children}
            </main>
          </div>
          <Sidebar
            brandName={brandName}
            sections={sidebarSections}
            activeItemId={activeSidebarItemId}
            onNavigate={onSidebarClick}
            footerSlot={sidebarFooterSlot}
          />
        </>
      )}
    </div>
  );
}
