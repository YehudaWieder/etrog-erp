import { FaCirclePlus } from 'react-icons/fa6';
import styles from '../../../../components/ui/styles/HeaderActionButtons.module.css';

type HarvestAddHeaderActionProps = {
  label: string;
  onClick: () => void;
};

export function HarvestAddHeaderAction({ label, onClick }: HarvestAddHeaderActionProps): JSX.Element {
  return (
    <div className={styles.actions}>
      <button
        type="button"
        className={`${styles.button} ${styles.success}`}
        onClick={onClick}
        aria-label={label}
      >
        <FaCirclePlus />
        <span>{label}</span>
      </button>
    </div>
  );
}
