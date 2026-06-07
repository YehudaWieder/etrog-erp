import { FaFileArrowDown, FaPrint } from 'react-icons/fa6';
import sharedFilterStyles from '../../../components/ui/styles/GlobalFiltersBar.module.css';

type TraderPrintExportActionsProps = {
  lang: 'he' | 'en';
  tableActionsLabel: string;
  onPrint: () => void;
  onExport: () => Promise<void>;
  printAriaLabel: string;
  printTitle: string;
  exportAriaLabel: string;
  exportTitle: string;
};

export function TraderPrintExportActions({
  lang,
  tableActionsLabel,
  onPrint,
  onExport,
  printAriaLabel,
  printTitle,
  exportAriaLabel,
  exportTitle,
}: TraderPrintExportActionsProps): JSX.Element {
  return (
    <div className={`global-filters-bar__icon-actions ${sharedFilterStyles.iconActions}`} aria-label={tableActionsLabel}>
      <button
        type="button"
        className={`global-filters-bar__icon-btn ${sharedFilterStyles.iconBtn}`}
        onClick={onPrint}
        aria-label={printAriaLabel}
        title={printTitle}
      >
        <FaPrint />
      </button>
      <button
        type="button"
        className={`global-filters-bar__icon-btn ${sharedFilterStyles.iconBtn}`}
        onClick={onExport}
        aria-label={exportAriaLabel}
        title={exportTitle}
      >
        <FaFileArrowDown />
      </button>
    </div>
  );
}
