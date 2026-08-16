import { useEffect, useRef, useState } from 'react';
import type { ReclassificationBatch, ReclassificationTuple } from '../../../services/inventoryMovementsApi';
import type { TraderCategoryWithShares } from '../../../services/traderCategoriesApi';
import type { AppLang } from '../i18n';
import styles from './styles/ReclassificationBatchPicker.module.css';

// Kept minimal so other features could reuse this picker's styling without pulling in
// trader-specific i18n (mirrors RemainsInItalyWithdrawalBatchPickerLabels).
export type ReclassificationBatchPickerLabels = {
  reclassificationSourceOptions: Record<'SPECIFIC_TRADER' | 'GENERAL' | 'REMAINS_IN_ITALY', string>;
  reclassificationUndoLoading: string;
  reclassificationUndoNoBatches: string;
  reclassificationUndoBatchPlaceholder: string;
  quantityLabel: string;
  availableToCancelLabel: string;
  fullyPackedLabel: string;
};

type ReclassificationBatchPickerProps = {
  lang: AppLang;
  labels: ReclassificationBatchPickerLabels;
  pitamStatusLabels: Record<'WITH_PITAM' | 'WITHOUT_PITAM' | 'MIXED', string>;
  batches: ReclassificationBatch[];
  traderCategories: TraderCategoryWithShares[];
  value: string;
  onChange: (id: string) => void;
  isLoading: boolean;
};

export function ReclassificationBatchPicker({
  lang,
  labels,
  pitamStatusLabels,
  batches,
  traderCategories,
  value,
  onChange,
  isLoading,
}: ReclassificationBatchPickerProps) {
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

  const tupleLabel = (tuple: ReclassificationTuple | null) =>
    tuple ? `${categoryName(tuple.traderCategoryId)} / ${tuple.grade} / ${pitamStatusLabels[tuple.pitamStatus]}` : '—';

  const sourceLabel = (batch: ReclassificationBatch) =>
    batch.source === 'SPECIFIC_TRADER' && batch.traderName ? batch.traderName : labels.reclassificationSourceOptions[batch.source];

  // Ownership-changing batches: GENERAL landing on one trader's private selection, or SPECIFIC_TRADER
  // returning to the general pool - the source badge alone doesn't convey the destination in these
  // two cases, so append it to the "to" tuple label.
  const toDestinationNote = (batch: ReclassificationBatch) => {
    if (batch.source === 'GENERAL' && batch.toTraderId !== null) {
      return batch.toTraderName ?? `#${batch.toTraderId}`;
    }
    if (batch.source === 'SPECIFIC_TRADER' && batch.toTraderId === null) {
      return labels.reclassificationSourceOptions.GENERAL;
    }
    return null;
  };

  const toLabel = (batch: ReclassificationBatch) => {
    const note = toDestinationNote(batch);
    return note ? `${tupleLabel(batch.to)} (${note})` : tupleLabel(batch.to);
  };

  const selectedBatch = batches.find((batch) => String(batch.id) === value) ?? null;

  const placeholderText = isLoading
    ? labels.reclassificationUndoLoading
    : batches.length === 0
      ? labels.reclassificationUndoNoBatches
      : labels.reclassificationUndoBatchPlaceholder;

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
              {tupleLabel(selectedBatch.from)} → {toLabel(selectedBatch)}
            </span>
            <span className={styles.triggerQty}>{labels.quantityLabel}: {selectedBatch.quantity}</span>
            {selectedBatch.availableQuantity < selectedBatch.quantity ? (
              <span className={styles.qtyChipAvailable}>
                {selectedBatch.availableQuantity > 0
                  ? `${labels.availableToCancelLabel}: ${selectedBatch.availableQuantity}`
                  : labels.fullyPackedLabel}
              </span>
            ) : null}
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
            const isFullyPacked = batch.availableQuantity === 0;
            return (
              <button
                type="button"
                key={batch.id}
                role="option"
                aria-selected={isSelected}
                className={`${styles.row} ${isSelected ? styles.rowSelected : ''} ${isFullyPacked ? styles.rowBlocked : ''}`}
                onClick={() => {
                  onChange(String(batch.id));
                  setIsOpen(false);
                }}
              >
                <div className={styles.rowTop}>
                  <span className={`${styles.badge} ${styles[`badge_${batch.source}`]}`}>
                    {sourceLabel(batch)}
                  </span>
                  <span className={styles.rowDate}>{new Date(batch.date).toLocaleDateString(dateFormatterLocale)}</span>
                </div>
                <div className={styles.rowBottom}>
                  <span className={styles.rowCategory}>
                    {tupleLabel(batch.from)} → {toLabel(batch)}
                  </span>
                  <span className={styles.rowQtyGroup}>
                    <span className={styles.qtyChip}>{labels.quantityLabel}: {batch.quantity}</span>
                    {isFullyPacked ? (
                      <span className={styles.rowBlockedLabel}>{labels.fullyPackedLabel}</span>
                    ) : batch.availableQuantity < batch.quantity ? (
                      <span className={styles.qtyChipAvailable}>{labels.availableToCancelLabel}: {batch.availableQuantity}</span>
                    ) : null}
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
