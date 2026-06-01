import type { HarvestSelectionSummaryLabels } from '../../harvestPage.types';
import styles from '../styles/HarvestInteractive.module.css';

type HarvestSelectionSummaryProps = {
  selectedCellsCount: number;
  formattedSelectedTotal: string;
  labels: HarvestSelectionSummaryLabels;
  onClear: () => void;
};

export function HarvestSelectionSummary({
  selectedCellsCount,
  formattedSelectedTotal,
  labels,
  onClear,
}: HarvestSelectionSummaryProps): JSX.Element | null {
  if (selectedCellsCount <= 0) {
    return null;
  }

  return (
    <div className={styles.selectionSummary} role="status" aria-live="polite">
      <span>{labels.selectedCells(selectedCellsCount)}</span>
      <span>{labels.total(formattedSelectedTotal)}</span>
      <button
        type="button"
        className={styles.selectionClear}
        onClick={onClear}
      >
        {labels.clear}
      </button>
    </div>
  );
}



