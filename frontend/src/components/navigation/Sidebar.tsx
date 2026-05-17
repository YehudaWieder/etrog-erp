import type { NavItem, SidebarSection } from '../../types/navigation';

type SidebarProps = {
  brandName?: string;
  sections: SidebarSection[];
  activeItemId?: string;
  onNavigate?: (item: NavItem) => void;
  footerSlot?: React.ReactNode;
};

export function Sidebar({
  brandName,
  sections,
  activeItemId,
  onNavigate,
  footerSlot,
}: SidebarProps) {
  return (
    <aside className="app-shell__sidebar" aria-label="Page sidebar">
      <div className="app-shell__brand">{brandName}</div>

      <div className="app-shell__sidebar-scroll">
        {sections.map((section) => (
          <section key={section.id} className="app-shell__sidebar-section">
            <strong className="app-shell__sidebar-title">{section.title}</strong>
            <div>
              {section.items.map((item) => {
                const isActive = item.id === activeItemId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`app-shell__sidebar-item${isActive ? ' is-active' : ''}`}
                    onClick={() => onNavigate?.(item)}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span>{item.label}</span>
                    {typeof item.badge === 'number' ? (
                      <span className="app-shell__badge">{item.badge}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {footerSlot}
    </aside>
  );
}
