import { FaCirclePlus, FaPenToSquare, FaTrashCan } from 'react-icons/fa6';
import styles from '../../../../components/ui/styles/HeaderActionButtons.module.css';

type HarvestPageHeaderActionsProps = {
  addActionLabel: string;
  editActionLabel: string;
  deleteActionLabel: string;
  onAdd: () => void;
  onEdit?: () => void;
  onDelete: () => void;
  addDisabled?: boolean;
  editDisabled: boolean;
  deleteDisabled: boolean;
  addTitle?: string;
  deleteTitle?: string;
  showAdd?: boolean;
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
  addDisabled = false,
  editDisabled,
  deleteDisabled,
  addTitle,
  deleteTitle,
  showAdd = true,
  showEdit = true,
  showDelete = true,
}: HarvestPageHeaderActionsProps): JSX.Element {
  return (
    <div className={styles.actions}>
      {showAdd ? (
        <button
          type="button"
          className={`${styles.button} ${styles.success}`}
          onClick={onAdd}
          disabled={addDisabled}
          aria-label={addActionLabel}
          title={addTitle}
        >
          <FaCirclePlus />
          <span>{addActionLabel}</span>
        </button>
      ) : null}
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
