import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './styles/CustomSelect.module.css';

export type CustomSelectOption = {
  value: string;
  label: string;
  group?: string;
  disabled?: boolean;
};

type CustomSelectProps = {
  id?: string;
  value: string;
  options: CustomSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
};

type FlatItem =
  | { kind: 'option'; option: CustomSelectOption }
  | { kind: 'group'; label: string };

function buildFlatItems(options: CustomSelectOption[]): FlatItem[] {
  const hasGroupedOptions = options.some((option) => Boolean(option.group));
  if (!hasGroupedOptions) {
    return options.map((option) => ({ kind: 'option', option }));
  }

  const ungrouped = options.filter((option) => !option.group);
  const groupedMap = new Map<string, CustomSelectOption[]>();
  for (const option of options) {
    if (!option.group) continue;
    if (!groupedMap.has(option.group)) groupedMap.set(option.group, []);
    groupedMap.get(option.group)!.push(option);
  }

  const items: FlatItem[] = ungrouped.map((option) => ({ kind: 'option', option }));
  for (const [groupLabel, groupOptions] of groupedMap.entries()) {
    items.push({ kind: 'group', label: groupLabel });
    for (const option of groupOptions) {
      items.push({ kind: 'option', option });
    }
  }
  return items;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  id,
  value,
  options,
  onChange,
  placeholder,
  disabled,
  className,
  ariaLabel,
}) => {
  const [open, setOpen] = useState(false);
  const [highlightedValue, setHighlightedValue] = useState<string | null>(null);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const flatItems = useMemo(() => buildFlatItems(options), [options]);
  const selectableOptions = useMemo(() => options.filter((option) => !option.disabled), [options]);
  const selectedOption = options.find((option) => option.value === value);

  useLayoutEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const openUpwards = spaceBelow < 260 && rect.top > spaceBelow;

      setMenuStyle({
        position: 'fixed',
        left: rect.left,
        width: rect.width,
        ...(openUpwards
          ? { top: 'auto', bottom: viewportHeight - rect.top + 6 }
          : { top: rect.bottom + 6, bottom: 'auto' }),
        maxHeight: Math.max(160, (openUpwards ? rect.top : spaceBelow) - 16),
      });
    };

    // Measure immediately so the menu never paints unpositioned (it would otherwise render
    // in normal document flow as the last element in <body> for a frame, jumping the page),
    // then keep re-measuring every frame in case the trigger shifts right after opening
    // (e.g. web fonts finishing their async load and reflowing surrounding text).
    updatePosition();
    let frameId = requestAnimationFrame(function loop() {
      updatePosition();
      frameId = requestAnimationFrame(loop);
    });

    return () => cancelAnimationFrame(frameId);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (listRef.current?.contains(target)) return;
      setOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      setHighlightedValue(value || selectableOptions[0]?.value || null);
    }
  }, [open, value, selectableOptions]);

  const commitSelection = (optionValue: string) => {
    onChange(optionValue);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const moveHighlight = (direction: 1 | -1) => {
    if (selectableOptions.length === 0) return;
    const currentIndex = selectableOptions.findIndex((option) => option.value === highlightedValue);
    const nextIndex =
      currentIndex === -1
        ? 0
        : (currentIndex + direction + selectableOptions.length) % selectableOptions.length;
    setHighlightedValue(selectableOptions[nextIndex].value);
  };

  const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;

    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
        event.preventDefault();
        setOpen(true);
      }
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        moveHighlight(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        moveHighlight(-1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (highlightedValue != null) commitSelection(highlightedValue);
        break;
      case 'Escape':
        event.preventDefault();
        setOpen(false);
        break;
      case 'Tab':
        setOpen(false);
        break;
      default:
        break;
    }
  };

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        id={id}
        ref={triggerRef}
        className={[styles.trigger, open ? styles.triggerOpen : '', className].filter(Boolean).join(' ')}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        onKeyDown={handleTriggerKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        <span className={`${styles.triggerLabel}${!selectedOption ? ` ${styles.triggerPlaceholder}` : ''}`}>
          {selectedOption ? selectedOption.label : placeholder || ''}
        </span>
        <svg className={styles.chevron} width="12" height="8" viewBox="0 0 12 8" fill="none" aria-hidden="true">
          <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open &&
        createPortal(
          <ul className={styles.menu} style={menuStyle} role="listbox" ref={listRef} aria-activedescendant={highlightedValue ?? undefined}>
            {flatItems.map((item, index) => {
              if (item.kind === 'group') {
                return (
                  <li key={`group-${item.label}-${index}`} className={styles.groupLabel} role="presentation">
                    {item.label}
                  </li>
                );
              }

              const { option } = item;
              const isSelected = option.value === value;
              const isHighlighted = option.value === highlightedValue;

              return (
                <li
                  key={`${option.value}-${index}`}
                  id={option.value}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={option.disabled}
                  className={[
                    styles.option,
                    isSelected ? styles.optionSelected : '',
                    isHighlighted ? styles.optionHighlighted : '',
                    option.disabled ? styles.optionDisabled : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onMouseEnter={() => !option.disabled && setHighlightedValue(option.value)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => !option.disabled && commitSelection(option.value)}
                >
                  {isSelected && (
                    <svg className={styles.checkIcon} width="13" height="10" viewBox="0 0 13 10" fill="none" aria-hidden="true">
                      <path d="M1 5L4.5 8.5L12 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  <span className={styles.optionLabel}>{option.label}</span>
                </li>
              );
            })}
          </ul>,
          document.body,
        )}
    </div>
  );
};

export default CustomSelect;
