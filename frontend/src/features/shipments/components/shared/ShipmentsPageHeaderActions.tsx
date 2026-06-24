import { FaCirclePlus, FaPenToSquare, FaTrashCan } from 'react-icons/fa6';
import styles from '../../../../components/ui/styles/HeaderActionButtons.module.css';

type ExtraAction = {
  label: string;
  onClick: () => void;
};

type ShipmentsPageHeaderActionsProps = {
  addActionLabel: string;
  editActionLabel: string;
  deleteActionLabel: string;
  onAdd: () => void;
  onEdit: () => void;
  onDelete: () => void;
  editDisabled: boolean;
  deleteDisabled: boolean;
  showAddAction?: boolean;
  showRowActions?: boolean;
  extraActions?: ExtraAction[];
};

export function ShipmentsPageHeaderActions({
  addActionLabel,
  editActionLabel,
  deleteActionLabel,
  onAdd,
  onEdit,
  onDelete,
  editDisabled,
  deleteDisabled,
  showAddAction = true,
  showRowActions = true,
  extraActions,
}: ShipmentsPageHeaderActionsProps): JSX.Element {
  return (
    <div className={styles.actions}>
      {extraActions?.map((action) => (
        <button
          key={action.label}
          type="button"
          className={`${styles.button} ${styles.success}`}
          onClick={action.onClick}
          aria-label={action.label}
        >
          <FaCirclePlus />
          <span>{action.label}</span>
        </button>
      ))}
      {showAddAction && (
        <button
          type="button"
          className={`${styles.button} ${styles.success}`}
          onClick={onAdd}
          aria-label={addActionLabel}
        >
          <FaCirclePlus />
          <span>{addActionLabel}</span>
        </button>
      )}
      {showRowActions && (
        <>
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
          <button
            type="button"
            className={`${styles.button} ${styles.danger}`}
            onClick={onDelete}
            disabled={deleteDisabled}
            aria-label={deleteActionLabel}
          >
            <FaTrashCan />
            <span>{deleteActionLabel}</span>
          </button>
        </>
      )}
    </div>
  );
}
