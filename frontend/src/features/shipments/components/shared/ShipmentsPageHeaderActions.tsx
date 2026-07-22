import { FaBoxesPacking, FaCirclePlus, FaPenToSquare, FaTrashCan } from 'react-icons/fa6';
import styles from '../../../../components/ui/styles/HeaderActionButtons.module.css';

type ExtraAction = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
};

type PackAction = {
  label: string;
  onClick: () => void;
  disabled: boolean;
};

type ShipmentsPageHeaderActionsProps = {
  addActionLabel: string;
  editActionLabel: string;
  deleteActionLabel: string;
  onAdd: () => void;
  onEdit: () => void;
  onDelete: () => void;
  addDisabled?: boolean;
  editDisabled: boolean;
  deleteDisabled: boolean;
  addTitle?: string;
  editTitle?: string;
  deleteTitle?: string;
  showAddAction?: boolean;
  showRowActions?: boolean;
  extraActions?: ExtraAction[];
  packAction?: PackAction;
};

export function ShipmentsPageHeaderActions({
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
  editTitle,
  deleteTitle,
  showAddAction = true,
  showRowActions = true,
  extraActions,
  packAction,
}: ShipmentsPageHeaderActionsProps): JSX.Element {
  return (
    <div className={styles.actions}>
      {extraActions?.map((action) => (
        <button
          key={action.label}
          type="button"
          className={`${styles.button} ${styles.success}`}
          onClick={action.onClick}
          disabled={action.disabled}
          aria-label={action.label}
          title={action.disabled ? addTitle : undefined}
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
          disabled={addDisabled}
          aria-label={addActionLabel}
          title={addTitle}
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
            title={editTitle}
          >
            <FaPenToSquare />
            <span>{editActionLabel}</span>
          </button>
          {packAction && (
            <button
              type="button"
              className={`${styles.button} ${styles.success}`}
              onClick={packAction.onClick}
              disabled={packAction.disabled}
              aria-label={packAction.label}
            >
              <FaBoxesPacking />
              <span>{packAction.label}</span>
            </button>
          )}
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
        </>
      )}
    </div>
  );
}
