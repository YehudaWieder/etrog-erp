import type { NavItem, SidebarSection } from '../../types/navigation';
import * as FAIcons from 'react-icons/fa6';
import { HomeIcon } from '../ui/HomeIcon';

const iconMap: Record<string, keyof typeof FAIcons> = {
  'fa-truck': 'FaTruck',
  'fa-box-open': 'FaBoxOpen',
  'fa-circle-check': 'FaCircleCheck',
  'fa-boxes-stacked': 'FaBoxesStacked',
  'fa-file-circle-xmark': 'FaFileCircleXmark',
  'fa-truck-ramp-box': 'FaTruckRampBox',
  'fa-box': 'FaBox',
  'fa-door-open': 'FaDoorOpen',
  'fa-lemon': 'FaLemon',
  'fa-paper-plane': 'FaPaperPlane',
  'fa-clock': 'FaClock',
};

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
      <div className="app-shell__brand" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <HomeIcon style={{ fontSize: 22, marginInlineEnd: 6 }} />
        {brandName}
      </div>
      <div className="app-shell__sidebar-scroll">
        {sections.map((section) => (
          <section key={section.id} className="app-shell__sidebar-section">
            <button
              type="button"
              className="app-shell__sidebar-title app-shell__sidebar-title--button"
              onClick={() => section.href && onNavigate?.({ id: section.id, label: section.title, href: section.href })}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {section.icon && (
                  <>
                    {(() => {
                      const Icon = FAIcons[iconMap[section.icon]];
                      return Icon ? <Icon style={{ color: '#3B6C25' }} /> : null;
                    })()}
                  </>
                )}
                {section.title}
              </span>
            </button>
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
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {item.icon && (
                        <>
                          {(() => {
                            const Icon = FAIcons[iconMap[item.icon]];
                            return Icon ? <Icon style={{ color: '#3B6C25' }} /> : null;
                          })()}
                        </>
                      )}
                      {item.label}
                    </span>
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
