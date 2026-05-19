import type { NavItem, SidebarSection } from '../../types/navigation';
import * as FAIcons from 'react-icons/fa6';

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
  'fa-id-card': 'FaIdCard',
  'fa-user-pen': 'FaUserPen',
  'fa-users': 'FaUsers',
  'fa-user-check': 'FaUserCheck',
  'fa-user-slash': 'FaUserSlash',
  'fa-envelope': 'FaEnvelope',
  'fa-inbox': 'FaInbox',
  'fa-envelope-open-text': 'FaEnvelopeOpenText',
};

type SidebarProps = {
  sections: SidebarSection[];
  activeItemId?: string;
  onNavigate?: (item: NavItem) => void;
  footerSlot?: React.ReactNode;
};

export function Sidebar({
  sections,
  activeItemId,
  onNavigate,
  footerSlot,
}: SidebarProps) {
  return (
    <aside className="app-shell__sidebar" aria-label="Page sidebar">
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
              {typeof section.badge === 'number' ? (
                <span className="app-shell__badge">{section.badge}</span>
              ) : null}
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
