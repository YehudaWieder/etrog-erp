import { FaCirclePlus, FaPenToSquare, FaTrashCan } from 'react-icons/fa6';

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
    <div className="settings-seasons-header-buttons">
      <button
        type="button"
        className="settings-seasons-header-btn settings-seasons-header-btn--success"
        onClick={onAdd}
        aria-label={addActionLabel}
      >
        <FaCirclePlus />
        <span>{addActionLabel}</span>
      </button>
      <button
        type="button"
        className="settings-seasons-header-btn settings-seasons-header-btn--success"
        onClick={() => void 0}
        disabled={editDisabled}
        aria-label={editActionLabel}
      >
        <FaPenToSquare />
        <span>{editActionLabel}</span>
      </button>
      <button
        type="button"
        className="settings-seasons-header-btn settings-seasons-header-btn--danger"
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
