import { FaFileArrowDown, FaPrint } from 'react-icons/fa6';

type HarvestSortingPrintExportActionsProps = {
  lang: 'he' | 'en';
  onPrintSummary: () => void;
  onExportSummary: () => void;
  onExportExpanded: () => void;
  onCloseMenuFromTarget: (target: EventTarget | null) => void;
  onCancelMenuClose: () => void;
  onScheduleMenuClose: (menu: HTMLDetailsElement) => void;
};

export function HarvestSortingPrintExportActions({
  lang,
  onPrintSummary,
  onExportSummary,
  onExportExpanded,
  onCloseMenuFromTarget,
  onCancelMenuClose,
  onScheduleMenuClose,
}: HarvestSortingPrintExportActionsProps): JSX.Element {
  return (
    <div className="global-filters-bar__icon-actions" aria-label={lang === 'he' ? 'פעולות טבלה' : 'Table actions'}>
      <button
        type="button"
        className="global-filters-bar__icon-btn"
        onClick={onPrintSummary}
        aria-label={lang === 'he' ? 'הדפסת טבלת המיון היומי' : 'Print daily sorting table'}
        title={lang === 'he' ? 'הדפסה' : 'Print'}
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
          className="global-filters-bar__icon-btn"
          aria-label={lang === 'he' ? 'יצוא טבלת המיון היומי לאקסל' : 'Export daily sorting table to Excel'}
          title={lang === 'he' ? 'יצוא לאקסל' : 'Export to Excel'}
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
            {lang === 'he' ? 'הורדה רגילה' : 'Standard download'}
          </button>
          <button
            type="button"
            className="global-filters-bar__menu-item"
            onClick={(event) => {
              onCloseMenuFromTarget(event.currentTarget);
              onExportExpanded();
            }}
          >
            {lang === 'he' ? 'הורדה מורחבת' : 'Expanded download'}
          </button>
        </div>
      </details>
    </div>
  );
}
