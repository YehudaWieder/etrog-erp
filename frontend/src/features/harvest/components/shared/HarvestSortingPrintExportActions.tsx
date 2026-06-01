import { FaFileArrowDown, FaPrint } from 'react-icons/fa6';
import sharedFilterStyles from '../../../../components/ui/styles/GlobalFiltersBar.module.css';

import type { HarvestI18n } from '../../i18n';

type HarvestSortingPrintExportActionsProps = {
  lang: 'he' | 'en';
  tableActionsLabel: string;
  t: HarvestI18n['sortingDailyDetails']['actions'];
  onPrintSummary: () => void;
  onExportSummary: () => void;
  onExportExpanded: () => void;
  onCloseMenuFromTarget: (target: EventTarget | null) => void;
  onCancelMenuClose: () => void;
  onScheduleMenuClose: (menu: HTMLDetailsElement) => void;
};

export function HarvestSortingPrintExportActions({
  lang,
  tableActionsLabel,
  t,
  onPrintSummary,
  onExportSummary,
  onExportExpanded,
  onCloseMenuFromTarget,
  onCancelMenuClose,
  onScheduleMenuClose,
}: HarvestSortingPrintExportActionsProps): JSX.Element {
  return (
    <div className={`global-filters-bar__icon-actions ${sharedFilterStyles.iconActions}`} aria-label={tableActionsLabel}>
      <button
        type="button"
        className={`global-filters-bar__icon-btn ${sharedFilterStyles.iconBtn}`}
        onClick={onPrintSummary}
        aria-label={t.printTableAriaLabel}
        title={t.printTitle}
      >
        <FaPrint />
      </button>

      <details
        className="global-filters-bar__icon-menu"
        onMouseEnter={onCancelMenuClose}
        onMouseLeave={(event) => {
          onScheduleMenuClose(event.currentTarget);
        }}
      >
        <summary
          className={`global-filters-bar__icon-btn ${sharedFilterStyles.iconBtn}`}
          aria-label={t.exportTableAriaLabel}
          title={t.exportTitle}
        >
          <FaFileArrowDown />
        </summary>
        <div className="global-filters-bar__menu-list" role="menu">
          <button
            type="button"
            className="global-filters-bar__menu-item"
            onClick={(event) => {
              onCloseMenuFromTarget(event.currentTarget);
              onExportSummary();
            }}
          >
            {t.standardDownload}
          </button>
          <button
            type="button"
            className="global-filters-bar__menu-item"
            onClick={(event) => {
              onCloseMenuFromTarget(event.currentTarget);
              onExportExpanded();
            }}
          >
            {t.expandedDownload}
          </button>
        </div>
      </details>
    </div>
  );
}
