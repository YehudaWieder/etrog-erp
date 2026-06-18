import { FaCirclePlus } from 'react-icons/fa6';
import styles from '../../../../components/ui/styles/HeaderActionButtons.module.css';

type HarvestSummaryHeaderActionsProps = {
  addHarvestLabel: string;
  addSortingLabel: string;
  onAddHarvest: () => void;
  onAddSorting: () => void;
};

export function HarvestSummaryHeaderActions({
  addHarvestLabel,
  addSortingLabel,
  onAddHarvest,
  onAddSorting,
}: HarvestSummaryHeaderActionsProps): JSX.Element {
  return (
    <div className={styles.actions}>
      <button
        type="button"
        className={`${styles.button} ${styles.success}`}
        onClick={onAddHarvest}
        aria-label={addHarvestLabel}
      >
        <FaCirclePlus />
        <span>{addHarvestLabel}</span>
      </button>
      <button
        type="button"
        className={`${styles.button} ${styles.success}`}
        onClick={onAddSorting}
        aria-label={addSortingLabel}
      >
        <FaCirclePlus />
        <span>{addSortingLabel}</span>
      </button>
    </div>
  );
}
