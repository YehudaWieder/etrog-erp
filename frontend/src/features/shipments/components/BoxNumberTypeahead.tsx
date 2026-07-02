import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { PackingBoxOption } from '../hooks/usePackingForm';

type BoxNumberTypeaheadProps = {
  options: PackingBoxOption[];
  formatOptionLabel: (box: PackingBoxOption) => string;
  shipmentGroupLabel: (shipmentNumber: number) => string;
  value: string;
  onChange: (id: string) => void;
  placeholder: string;
  loadingLabel: string;
  noMatchesLabel: string;
  isLoading: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
};

export function BoxNumberTypeahead({
  options,
  formatOptionLabel,
  shipmentGroupLabel,
  value,
  onChange,
  placeholder,
  loadingLabel,
  noMatchesLabel,
  isLoading,
  disabled,
  autoFocus,
}: BoxNumberTypeaheadProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [menuRect, setMenuRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedBox = useMemo(() => options.find((box) => String(box.id) === value) ?? null, [options, value]);

  const updateMenuRect = () => {
    const rect = inputRef.current?.getBoundingClientRect();
    if (rect) {
      setMenuRect({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    updateMenuRect();

    // The dropdown is rendered in a portal (outside the modal's own stacking context, which
    // otherwise traps it beneath later sibling content — see .modal-dialog > :not(.modal-close)).
    // Reposition it on scroll/resize since it's now fixed-positioned relative to the viewport.
    const handleReposition = () => updateMenuRect();
    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);
    return () => {
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
    };
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (containerRef.current?.contains(target)) return;
      if ((event.target as HTMLElement)?.closest('[data-box-typeahead-menu]')) return;
      setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredGroups = useMemo(() => {
    const trimmed = query.trim();
    const filtered = trimmed
      ? options.filter((box) => String(box.boxNumber).includes(trimmed))
      : options;

    const groups = new Map<number, PackingBoxOption[]>();
    for (const box of filtered) {
      const group = groups.get(box.shipmentNumber) ?? [];
      group.push(box);
      groups.set(box.shipmentNumber, group);
    }
    return Array.from(groups.entries());
  }, [options, query]);

  const handleSelect = (box: PackingBoxOption) => {
    onChange(String(box.id));
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        className="seasons-manager__year-input"
        type="text"
        value={isOpen ? query : selectedBox ? formatOptionLabel(selectedBox) : ''}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => { setIsOpen(true); setQuery(''); }}
        onKeyDown={(e) => { if (e.key === 'Escape') setIsOpen(false); }}
        placeholder={isLoading ? loadingLabel : placeholder}
        disabled={disabled || isLoading}
        autoComplete="off"
        autoFocus={autoFocus}
      />

      {isOpen && menuRect ? createPortal(
        <div
          data-box-typeahead-menu
          style={{
            position: 'fixed',
            top: menuRect.top,
            left: menuRect.left,
            width: menuRect.width,
            maxHeight: 260,
            overflowY: 'auto',
            background: 'var(--color-bg, #fff)',
            border: '1px solid var(--color-border, #e5e7eb)',
            borderRadius: 6,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
            zIndex: 2000,
          }}
        >
          {filteredGroups.length === 0 ? (
            <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem', color: 'var(--color-text-muted, #6b7280)' }}>
              {noMatchesLabel}
            </div>
          ) : (
            filteredGroups.map(([shipmentNumber, boxes]) => (
              <div key={shipmentNumber}>
                <div
                  style={{
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'var(--color-text-muted, #6b7280)',
                    background: 'var(--color-bg-subtle, #f3f4f6)',
                  }}
                >
                  {shipmentGroupLabel(shipmentNumber)}
                </div>
                {boxes.map((box) => (
                  <div
                    key={box.id}
                    onMouseDown={(e) => { e.preventDefault(); handleSelect(box); }}
                    style={{
                      padding: '0.4rem 0.75rem',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      background: String(box.id) === value ? 'var(--color-bg-subtle, #f3f4f6)' : undefined,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-bg-subtle, #f3f4f6)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = String(box.id) === value ? 'var(--color-bg-subtle, #f3f4f6)' : ''; }}
                  >
                    {formatOptionLabel(box)}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>,
        document.body,
      ) : null}
    </div>
  );
}
