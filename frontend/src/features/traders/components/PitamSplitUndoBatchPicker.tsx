import { useEffect, useRef, useState } from 'react';
import type { PitamSplitBatch } from '../../../services/inventoryMovementsApi';
import type { TraderCategoryWithShares } from '../../../services/traderCategoriesApi';
import type { AppLang } from '../i18n';
import styles from './styles/PitamSplitUndoBatchPicker.module.css';

// Kept minimal (rather than importing the whole trader-movements i18n type) so other features
// (e.g. shipments) can reuse this picker's styling without pulling in trader-specific i18n.
export type PitamSplitUndoBatchPickerLabels = {
  pitamSplitUndoSourceLabels: Record<'SPECIFIC_TRADER' | 'MODULO' | 'GENERAL', string>;
  pitamSplitUndoLoading: string;
  pitamSplitUndoNoBatches: string;
  pitamSplitUndoBatchPlaceholder: string;
  pitamSplitWithLabel: string;
  pitamSplitWithoutLabel: string;
};

type PitamSplitUndoBatchPickerProps = {
  lang: AppLang;
  labels: PitamSplitUndoBatchPickerLabels;
  batches: PitamSplitBatch[];
  traderCategories: TraderCategoryWithShares[];
  value: string;
  onChange: (batchId: string) => void;
  isLoading: boolean;
};

export function PitamSplitUndoBatchPicker({
  lang,
  labels,
  batches,
  traderCategories,
  value,
  onChange,
  isLoading,
}: PitamSplitUndoBatchPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const isDisabled = isLoading || batches.length === 0;
  const dateFormatterLocale = lang === 'he' ? 'he-IL' : 'en-US';

  const categoryName = (traderCategoryId: number) =>
    traderCategories.find((category) => category.id === traderCategoryId)?.name ?? `#${traderCategoryId}`;

  const sourceLabel = (batch: PitamSplitBatch) =>
    batch.source === 'SPECIFIC_TRADER' && batch.traderName ? batch.traderName : labels.pitamSplitUndoSourceLabels[batch.source];

  const selectedBatch = batches.find((batch) => batch.batchId === value) ?? null;

  const placeholderText = isLoading
    ? labels.pitamSplitUndoLoading
    : batches.length === 0
      ? labels.pitamSplitUndoNoBatches
      : labels.pitamSplitUndoBatchPlaceholder;

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setIsOpen((current) => !current)}
        disabled={isDisabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {selectedBatch ? (
          <span className={styles.triggerSummary}>
            <span className={`${styles.badge} ${styles[`badge_${selectedBatch.source}`]}`}>
              {sourceLabel(selectedBatch)}
            </span>
            <span className={styles.triggerDetails}>
              {categoryName(selectedBatch.traderCategoryId)} / {selectedBatch.grade}
            </span>
            <span className={styles.triggerQty}>
              +{selectedBatch.withQty} / +{selectedBatch.withoutQty}
            </span>
          </span>
        ) : (
          <span className={styles.placeholder}>{placeholderText}</span>
        )}
        <span className={styles.chevron} aria-hidden="true">▾</span>
      </button>

      {isOpen ? (
        <div className={styles.panel} role="listbox">
          {batches.map((batch) => {
            const isSelected = batch.batchId === value;
            return (
              <button
                type="button"
                key={batch.batchId}
                role="option"
                aria-selected={isSelected}
                className={`${styles.row} ${isSelected ? styles.rowSelected : ''}`}
                onClick={() => {
                  onChange(batch.batchId);
                  setIsOpen(false);
                }}
              >
                <div className={styles.rowTop}>
                  <span className={`${styles.badge} ${styles[`badge_${batch.source}`]}`}>{sourceLabel(batch)}</span>
                  <span className={styles.rowDate}>{new Date(batch.date).toLocaleDateString(dateFormatterLocale)}</span>
                </div>
                <div className={styles.rowBottom}>
                  <span className={styles.rowCategory}>
                    {categoryName(batch.traderCategoryId)} / {batch.grade}
                  </span>
                  <span className={styles.rowQtyGroup}>
                    <span className={styles.qtyChip}>{labels.pitamSplitWithLabel}: {batch.withQty}</span>
                    <span className={styles.qtyChip}>{labels.pitamSplitWithoutLabel}: {batch.withoutQty}</span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
