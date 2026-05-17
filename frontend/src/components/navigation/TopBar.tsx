import type { NavItem } from '../../types/navigation';

type TopBarProps = {
  links: NavItem[];
  activeId?: string;
  onNavigate?: (item: NavItem) => void;
  rightSlot?: React.ReactNode;
  leftSlot?: React.ReactNode;
};

export function TopBar({
  links,
  activeId,
  onNavigate,
  rightSlot,
  leftSlot,
}: TopBarProps) {
  return (
    <header className="app-shell__topbar">
      {leftSlot && <div className="app-shell__topbar-left">{leftSlot}</div>}
      <nav className="app-shell__topbar-links" aria-label="Primary navigation">
        {links.map((item) => {
          const isActive = item.id === activeId;
          return (
            <button
              key={item.id}
              type="button"
              className={`app-shell__topbar-link${isActive ? ' is-active' : ''}`}
              onClick={() => onNavigate?.(item)}
              aria-current={isActive ? 'page' : undefined}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
      {rightSlot}
    </header>
  );
}
