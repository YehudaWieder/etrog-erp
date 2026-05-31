import { FaFileInvoice } from 'react-icons/fa6';

type HarvestDetailsTriggerButtonProps = {
  ariaLabel: string;
  onClick: () => void;
};

export function HarvestDetailsTriggerButton({ ariaLabel, onClick }: HarvestDetailsTriggerButtonProps): JSX.Element {
  return (
    <button
      type="button"
      className="harvest-daily-workspace__details-trigger"
      aria-label={ariaLabel}
      onClick={onClick}
    >
      <FaFileInvoice />
    </button>
  );
}
