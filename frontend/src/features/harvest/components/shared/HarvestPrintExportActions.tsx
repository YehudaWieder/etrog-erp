import { FaFileArrowDown, FaPrint } from 'react-icons/fa6';

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
    <div className="global-filters-bar__icon-actions" aria-label={tableActionsLabel}>
      <button
        type="button"
        className="global-filters-bar__icon-btn"
        onClick={onPrint}
        aria-label={printAriaLabel}
        title={printTitle}
      >
        <FaPrint />
      </button>
      <button
        type="button"
        className="global-filters-bar__icon-btn"
        onClick={onExport}
        aria-label={exportAriaLabel}
        title={exportTitle}
      >
        <FaFileArrowDown />
      </button>
    </div>
  );
}
