import { FaFileInvoice } from 'react-icons/fa6';
import styles from '../styles/HarvestInteractive.module.css';

type HarvestDetailsTriggerButtonProps = {
  ariaLabel: string;
  onClick: () => void;
};

export function HarvestDetailsTriggerButton({ ariaLabel, onClick }: HarvestDetailsTriggerButtonProps): JSX.Element {
  return (
    <button
      type="button"
      className={styles.detailsTrigger}
      aria-label={ariaLabel}
      onClick={onClick}
    >
      <FaFileInvoice />
    </button>
  );
}
