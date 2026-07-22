import { FaCirclePlus } from 'react-icons/fa6';
import styles from '../../../../components/ui/styles/HeaderActionButtons.module.css';

type HarvestSummaryHeaderActionsProps = {
  addHarvestLabel: string;
  addSortingLabel: string;
  onAddHarvest: () => void;
  onAddSorting: () => void;
  addDisabled?: boolean;
  addTitle?: string;
};

export function HarvestSummaryHeaderActions({
  addHarvestLabel,
  addSortingLabel,
  onAddHarvest,
  onAddSorting,
  addDisabled = false,
  addTitle,
}: HarvestSummaryHeaderActionsProps): JSX.Element {
  return (
    <div className={styles.actions}>
      <button
        type="button"
        className={`${styles.button} ${styles.success}`}
        onClick={onAddHarvest}
        disabled={addDisabled}
        aria-label={addHarvestLabel}
        title={addTitle}
      >
        <FaCirclePlus />
        <span>{addHarvestLabel}</span>
      </button>
      <button
        type="button"
        className={`${styles.button} ${styles.success}`}
        onClick={onAddSorting}
        disabled={addDisabled}
        aria-label={addSortingLabel}
        title={addTitle}
      >
        <FaCirclePlus />
        <span>{addSortingLabel}</span>
      </button>
    </div>
  );
}
