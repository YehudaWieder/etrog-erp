import { useEffect, useRef, useState } from 'react';
import type { RemainsInItalyWithdrawalBatch } from '../../../services/inventoryMovementsApi';
import type { TraderCategoryWithShares } from '../../../services/traderCategoriesApi';
import type { AppLang } from '../i18n';
import styles from './styles/RemainsInItalyWithdrawalBatchPicker.module.css';

// Kept minimal so other features could reuse this picker's styling without pulling in
// trader-specific i18n (mirrors PitamSplitUndoBatchPickerLabels).
export type RemainsInItalyWithdrawalBatchPickerLabels = {
  destinationOptions: Record<'TRADER' | 'CUSTOMER' | 'GENERAL', string>;
  riwUndoLoading: string;
  riwUndoNoBatches: string;
  riwUndoBatchPlaceholder: string;
  quantityLabel: string;
};

type RemainsInItalyWithdrawalBatchPickerProps = {
  lang: AppLang;
  labels: RemainsInItalyWithdrawalBatchPickerLabels;
  pitamStatusLabels: Record<'WITH_PITAM' | 'WITHOUT_PITAM' | 'MIXED', string>;
  batches: RemainsInItalyWithdrawalBatch[];
  traderCategories: TraderCategoryWithShares[];
  value: string;
  onChange: (id: string) => void;
  isLoading: boolean;
};

export function RemainsInItalyWithdrawalBatchPicker({
  lang,
  labels,
  pitamStatusLabels,
  batches,
  traderCategories,
  value,
  onChange,
  isLoading,
}: RemainsInItalyWithdrawalBatchPickerProps) {
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

  const destinationLabel = (batch: RemainsInItalyWithdrawalBatch) => {
    if (batch.destinationType === 'TRADER' && batch.traderName) return batch.traderName;
    if (batch.destinationType === 'CUSTOMER' && batch.customerName) return batch.customerName;
    return labels.destinationOptions[batch.destinationType];
  };

  const selectedBatch = batches.find((batch) => String(batch.id) === value) ?? null;

  const placeholderText = isLoading
    ? labels.riwUndoLoading
    : batches.length === 0
      ? labels.riwUndoNoBatches
      : labels.riwUndoBatchPlaceholder;

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
            <span className={`${styles.badge} ${styles[`badge_${selectedBatch.destinationType}`]}`}>
              {destinationLabel(selectedBatch)}
            </span>
            <span className={styles.triggerDetails}>
              {categoryName(selectedBatch.traderCategoryId)} / {selectedBatch.grade} / {pitamStatusLabels[selectedBatch.pitamStatus]}
            </span>
            <span className={styles.triggerQty}>{labels.quantityLabel}: {selectedBatch.quantity}</span>
          </span>
        ) : (
          <span className={styles.placeholder}>{placeholderText}</span>
        )}
        <span className={styles.chevron} aria-hidden="true">▾</span>
      </button>

      {isOpen ? (
        <div className={styles.panel} role="listbox">
          {batches.map((batch) => {
            const isSelected = String(batch.id) === value;
            return (
              <button
                type="button"
                key={batch.id}
                role="option"
                aria-selected={isSelected}
                className={`${styles.row} ${isSelected ? styles.rowSelected : ''}`}
                onClick={() => {
                  onChange(String(batch.id));
                  setIsOpen(false);
                }}
              >
                <div className={styles.rowTop}>
                  <span className={`${styles.badge} ${styles[`badge_${batch.destinationType}`]}`}>
                    {destinationLabel(batch)}
                  </span>
                  <span className={styles.rowDate}>{new Date(batch.date).toLocaleDateString(dateFormatterLocale)}</span>
                </div>
                <div className={styles.rowBottom}>
                  <span className={styles.rowCategory}>
                    {categoryName(batch.traderCategoryId)} / {batch.grade} / {pitamStatusLabels[batch.pitamStatus]}
                  </span>
                  <span className={styles.rowQtyGroup}>
                    <span className={styles.qtyChip}>{labels.quantityLabel}: {batch.quantity}</span>
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
