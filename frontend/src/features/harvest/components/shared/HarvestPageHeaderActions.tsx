import { FaCirclePlus, FaPenToSquare, FaTrashCan } from 'react-icons/fa6';
import styles from '../../../../components/ui/styles/HeaderActionButtons.module.css';

type HarvestPageHeaderActionsProps = {
  addActionLabel: string;
  editActionLabel: string;
  deleteActionLabel: string;
  onAdd: () => void;
  onEdit?: () => void;
  onDelete: () => void;
  editDisabled: boolean;
  deleteDisabled: boolean;
  deleteTitle?: string;
  showEdit?: boolean;
  showDelete?: boolean;
};

export function HarvestPageHeaderActions({
  addActionLabel,
  editActionLabel,
  deleteActionLabel,
  onAdd,
  onEdit,
  onDelete,
  editDisabled,
  deleteDisabled,
  deleteTitle,
  showEdit = true,
  showDelete = true,
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
      {showEdit ? (
        <button
          type="button"
          className={`${styles.button} ${styles.success}`}
          onClick={onEdit}
          disabled={editDisabled}
          aria-label={editActionLabel}
        >
          <FaPenToSquare />
          <span>{editActionLabel}</span>
        </button>
      ) : null}
      {showDelete ? (
        <button
          type="button"
          className={`${styles.button} ${styles.danger}`}
          onClick={onDelete}
          disabled={deleteDisabled}
          aria-label={deleteActionLabel}
          title={deleteTitle}
        >
          <FaTrashCan />
          <span>{deleteActionLabel}</span>
        </button>
      ) : null}
    </div>
  );
}
