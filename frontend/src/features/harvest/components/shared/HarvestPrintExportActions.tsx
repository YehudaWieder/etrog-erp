import { FaFileArrowDown, FaPrint } from 'react-icons/fa6';
import sharedFilterStyles from '../../../../components/ui/styles/GlobalFiltersBar.module.css';

type HarvestPrintExportActionsProps = {
  lang: 'he' | 'en';
  tableActionsLabel: string;
  onPrint: () => void;
  onExport: () => void;
  printAriaLabel: string;
  printTitle: string;
  exportAriaLabel: string;
  exportTitle: string;
};

export function HarvestPrintExportActions({
  lang,
  tableActionsLabel,
  onPrint,
  onExport,
  printAriaLabel,
  printTitle,
  exportAriaLabel,
  exportTitle,
}: HarvestPrintExportActionsProps): JSX.Element {
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
