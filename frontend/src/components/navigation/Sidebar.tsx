import type { NavItem, SidebarSection } from '../../types/navigation';
import * as FAIcons from 'react-icons/fa6';
import React, { useEffect, useMemo, useState } from 'react';
import { resolveNavigationIcon } from './navigationIcons';

type SidebarProps = {
  sections: SidebarSection[];
  activeItemId?: string;
  onNavigate?: (item: NavItem) => void;
  footerSlot?: React.ReactNode;
};

function renderSidebarItemLabel(label: string) {
  const match = label.match(/^(.*\S)\s*(\([^)]*\))\s*$/);
  if (!match) {
    return label;
  }

  const [, mainText, parenthetical] = match;
  const isYearHint = /^\(\d+\)$/.test(parenthetical);
  return (
    <>
      {mainText}{' '}
      <span className={`app-shell__sidebar-subitem-hint${isYearHint ? ' app-shell__sidebar-subitem-hint--strong' : ''}`}>
        {parenthetical}
      </span>
    </>
  );
}

export function Sidebar({
  sections,
  activeItemId,
  onNavigate,
  footerSlot,
}: SidebarProps) {
  const initiallyOpenSectionIds = useMemo(() => {
    const withActiveChild = sections
      .filter((section) => section.items.some((item) => item.id === activeItemId) || section.id === activeItemId)
      .map((section) => section.id);

    if (withActiveChild.length > 0) {
      return withActiveChild;
    }

    return sections.length > 0 ? [sections[0].id] : [];
  }, [activeItemId, sections]);

  const [openSectionId, setOpenSectionId] = useState<string | null>(initiallyOpenSectionIds[0] ?? null);

  useEffect(() => {
    if (initiallyOpenSectionIds.length === 0) {
      return;
    }

    setOpenSectionId(initiallyOpenSectionIds[0]);
  }, [initiallyOpenSectionIds]);

  const ensureSectionOpen = (sectionId: string) => {
    setOpenSectionId(sectionId);
  };

  return (
    <aside className="app-shell__sidebar" aria-label="Page sidebar">
      <div className="app-shell__sidebar-scroll">
        {sections.map((section) => {
          const hasActiveChild = section.items.some((item) => item.id === activeItemId);
          const hasSelfRepresentingChild = section.items.some((item) => item.id === section.id);
          const isSectionActive = section.id === activeItemId && !hasSelfRepresentingChild;
          const isOpen = openSectionId === section.id;
          const hasChildren = section.items.length > 0;
          const contentId = `sidebar-section-${section.id}-content`;

          return (
          <section key={section.id} className="app-shell__sidebar-section">
            <button
              type="button"
              className={`app-shell__sidebar-title app-shell__sidebar-title--button${isSectionActive ? ' is-active' : hasActiveChild ? ' is-child-active' : ''}`}
              onClick={() => {
                if (section.href) {
                  onNavigate?.({ id: section.id, label: section.title, href: section.href });
                } else if (hasChildren && section.items[0]?.href) {
                  onNavigate?.(section.items[0]);
                }

                if (hasChildren) {
                  ensureSectionOpen(section.id);
                }
              }}
              aria-current={isSectionActive ? 'page' : undefined}
              aria-expanded={hasChildren ? isOpen : undefined}
              aria-controls={hasChildren ? contentId : undefined}
            >
              <span className="app-shell__sidebar-title-content">
                {section.icon && (
                  <>
                    {(() => {
                      const Icon = resolveNavigationIcon(section.icon);
                      return Icon ? <Icon style={{ color: 'currentColor' }} /> : null;
                    })()}
                  </>
                )}
                {section.title}
              </span>
              <span className="app-shell__sidebar-title-meta">
                {typeof section.badge === 'number' ? (
                  <span className="app-shell__badge">{section.badge}</span>
                ) : null}
                {hasChildren ? <FAIcons.FaChevronDown className={`app-shell__sidebar-chevron${isOpen ? ' is-open' : ''}`} /> : null}
              </span>
            </button>
            <div
              id={contentId}
              className={`app-shell__sidebar-subitems${isOpen ? ' is-open' : ''}`}
              hidden={!isOpen}
            >
              {section.items.map((item) => {
                const isActive = item.id === activeItemId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`app-shell__sidebar-item app-shell__sidebar-subitem${isActive ? ' is-active' : ''}`}
                    onClick={() => onNavigate?.(item)}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {item.icon && (
                        <>
                          {(() => {
                            const Icon = resolveNavigationIcon(item.icon);
                            return Icon ? <Icon style={{ color: 'currentColor' }} /> : null;
                          })()}
                        </>
                      )}
                      {renderSidebarItemLabel(item.label)}
                    </span>
                    {typeof item.badge === 'number' ? (
                      <span className="app-shell__badge">{item.badge}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </section>
          );
        })}
      </div>

      {footerSlot}
    </aside>
  );
}
