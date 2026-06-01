import { FaXmark } from 'react-icons/fa6';
import type { ShareRow } from '../tradersManagement.types';
import { DEFAULT_PERCENT_STEP } from '../utils/traderShares.util';
import styles from './styles/TraderCategoriesShared.module.css';

type TraderOption = {
  id: number;
  name: string;
};

type TraderCategoryFormModalText = {
  cancel: string;
  addTitle: string;
  editTitle: string;
  addMessage: string;
  editMessage: (name: string) => string;
  categoryNameLabel: string;
  categoryNamePlaceholder: string;
  notesLabel: string;
  notesPlaceholder: string;
  allocationSectionTitle: string;
  selectTraderOption: string;
  percentPlaceholder: (index: number) => string;
  removeRow: string;
  addRow: string;
  totalPercentLabel: string;
  save: string;
};

type TraderCategoryFormModalProps = {
  isAddDialogOpen: boolean;
  isEditDialogOpen: boolean;
  selectedCategoryName: string;
  t: TraderCategoryFormModalText;
  categoryName: string;
  setCategoryName: (value: string) => void;
  categoryNotes: string;
  setCategoryNotes: (value: string) => void;
  shareRows: ShareRow[];
  getAvailableTradersForRow: (row: ShareRow) => TraderOption[];
  updateShareRow: (rowId: number, changes: Partial<ShareRow>) => void;
  removeShareRow: (rowId: number) => void;
  addShareRow: () => void;
  totalPercent: number;
  isTotalExact: boolean;
  showAddRowBlockReason: boolean;
  addRowBlockReason: string | null;
  addError: string | null;
  editError: string | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSave: () => void;
};

export function TraderCategoryFormModal({
  isAddDialogOpen,
  isEditDialogOpen,
  selectedCategoryName,
  t,
  categoryName,
  setCategoryName,
  categoryNotes,
  setCategoryNotes,
  shareRows,
  getAvailableTradersForRow,
  updateShareRow,
  removeShareRow,
  addShareRow,
  totalPercent,
  isTotalExact,
  showAddRowBlockReason,
  addRowBlockReason,
  addError,
  editError,
  isSubmitting,
  onClose,
  onSave,
}: TraderCategoryFormModalProps): JSX.Element | null {
  if (!isAddDialogOpen && !isEditDialogOpen) {
    return null;
  }

  return (
    <div className="modal-overlay">
      <div className="modal-dialog modal-dialog--form">
        <button className="modal-close" type="button" aria-label={t.cancel} onClick={onClose}>
          <FaXmark />
        </button>
        <h3 className="modal-title">{isAddDialogOpen ? t.addTitle : t.editTitle}</h3>
        <div className="modal-message">
          {isAddDialogOpen ? t.addMessage : t.editMessage(selectedCategoryName)}
        </div>

        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label className={styles.label}>{t.categoryNameLabel}</label>
            <input
              className="seasons-manager__year-input"
              type="text"
              value={categoryName}
              onChange={(event) => setCategoryName(event.target.value)}
              placeholder={t.categoryNamePlaceholder}
              autoFocus
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t.notesLabel}</label>
            <input
              className="seasons-manager__year-input"
              type="text"
              value={categoryNotes}
              onChange={(event) => setCategoryNotes(event.target.value)}
              placeholder={t.notesPlaceholder}
            />
          </div>
        </div>

        <p className={styles.sharesSubtitle}>{t.allocationSectionTitle}</p>

        <div className={styles.sharesArea}>
          {shareRows.map((row, index) => {
            const availableTraders = getAvailableTradersForRow(row);

            return (
              <div key={row.rowId} className={styles.shareRow}>
                <select
                  className="seasons-manager__year-input"
                  value={row.traderId ?? ''}
                  onChange={(event) => {
                    const traderId = Number(event.target.value);
                    updateShareRow(row.rowId, {
                      traderId: Number.isFinite(traderId) && traderId > 0 ? traderId : null,
                    });
                  }}
                >
                  <option value="">{t.selectTraderOption}</option>
                  {availableTraders.map((trader) => (
                    <option key={trader.id} value={trader.id}>{trader.name}</option>
                  ))}
                </select>

                <input
                  className="seasons-manager__year-input"
                  type="number"
                  min={0}
                  max={100}
                  step={DEFAULT_PERCENT_STEP}
                  value={row.percent}
                  onChange={(event) => updateShareRow(row.rowId, { percent: event.target.value })}
                  placeholder={t.percentPlaceholder(index + 1)}
                />

                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => removeShareRow(row.rowId)}
                  disabled={shareRows.length <= 1}
                >
                  {t.removeRow}
                </button>
              </div>
            );
          })}

          <div className={styles.sharesActions}>
            <button type="button" className="btn btn-primary" onClick={addShareRow}>
              {t.addRow}
            </button>
            <strong className={`${styles.total}${isTotalExact ? '' : ` ${styles.totalInvalid}`}`}>
              {t.totalPercentLabel}: {totalPercent.toFixed(2)}%
            </strong>
          </div>

          {showAddRowBlockReason && addRowBlockReason ? <p className="seasons-manager__error">{addRowBlockReason}</p> : null}
        </div>

        {isAddDialogOpen && addError ? <p className="seasons-manager__error">{addError}</p> : null}
        {isEditDialogOpen && editError ? <p className="seasons-manager__error">{editError}</p> : null}

        <div className="modal-actions">
          <button className="btn btn-danger" onClick={onClose} type="button">
            {t.cancel}
          </button>
          <button className="btn btn-success" onClick={onSave} type="button" disabled={isSubmitting}>
            {t.save}
          </button>
        </div>
      </div>
    </div>
  );
}
