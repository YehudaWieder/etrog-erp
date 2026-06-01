import { FaCirclePlus, FaPenToSquare, FaTrashCan } from 'react-icons/fa6';
import styles from '../../../../components/ui/styles/HeaderActionButtons.module.css';

type HarvestPageHeaderActionsProps = {
  addActionLabel: string;
  editActionLabel: string;
  deleteActionLabel: string;
  onAdd: () => void;
  editDisabled: boolean;
  deleteDisabled: boolean;
};

export function HarvestPageHeaderActions({
  addActionLabel,
  editActionLabel,
  deleteActionLabel,
  onAdd,
  editDisabled,
  deleteDisabled,
}: HarvestPageHeaderActionsProps): JSX.Element {
  return (
    <div className={styles.actions}>
      <button
        type="button"
        className={`${styles.button} ${styles.success}`}
        onClick={onAdd}
        aria-label={addActionLabel}
      >
        <FaCirclePlus />
        <span>{addActionLabel}</span>
      </button>
      <button
        type="button"
        className={`${styles.button} ${styles.success}`}
        onClick={() => void 0}
        disabled={editDisabled}
        aria-label={editActionLabel}
      >
        <FaPenToSquare />
        <span>{editActionLabel}</span>
      </button>
      <button
        type="button"
        className={`${styles.button} ${styles.danger}`}
        onClick={() => void 0}
        disabled={deleteDisabled}
        aria-label={deleteActionLabel}
      >
        <FaTrashCan />
        <span>{deleteActionLabel}</span>
      </button>
    </div>
  );
}
