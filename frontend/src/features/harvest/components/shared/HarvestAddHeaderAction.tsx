import { FaCirclePlus } from 'react-icons/fa6';

type HarvestAddHeaderActionProps = {
  label: string;
  onClick: () => void;
};

export function HarvestAddHeaderAction({ label, onClick }: HarvestAddHeaderActionProps): JSX.Element {
  return (
    <div className="settings-seasons-header-buttons">
      <button
        type="button"
        className="settings-seasons-header-btn settings-seasons-header-btn--success"
        onClick={onClick}
        aria-label={label}
      >
        <FaCirclePlus />
        <span>{label}</span>
      </button>
    </div>
  );
}
