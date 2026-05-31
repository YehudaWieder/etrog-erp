import type { HarvestSelectionSummaryLabels } from '../../harvestPage.types';

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
    <div className="harvest-daily-workspace__selection-summary" role="status" aria-live="polite">
      <span>{labels.selectedCells(selectedCellsCount)}</span>
      <span>{labels.total(formattedSelectedTotal)}</span>
      <button
        type="button"
        className="harvest-daily-workspace__selection-clear"
        onClick={onClear}
      >
        {labels.clear}
      </button>
    </div>
  );
}



