import { useEffect, useState } from 'react';
import { FaXmark } from 'react-icons/fa6';
import { SubmitButton } from '../../../components/ui/SubmitButton';
import { CustomSelect } from '../../../components/ui/CustomSelect';
import type { ConditionDraft, ShareRow } from '../tradersManagement.types';
import { DEFAULT_PERCENT_STEP, calculateTotalPercent, createEmptyShareRow, getNextShareRowId } from '../utils/traderShares.util';
import { getAddShareRowBlockReason, getAvailableTradersForRow } from '../services/traderShareRows.service';
import { resolveTradersAppLang } from '../i18n';
import type { TraderCategoryFormModalText } from './TraderCategoryFormModal';
import styles from './styles/TraderCategoriesShared.module.css';

type TraderOption = {
  id: number;
  name: string;
};

type ConditionModalText = Required<Pick<TraderCategoryFormModalText, 'shareCondition' | 'shareRows'>> & TraderCategoryFormModalText;

type TraderCategoryShareConditionModalProps = {
  isOpen: boolean;
  initialDraft: ConditionDraft;
  traders: TraderOption[];
  t: ConditionModalText;
  error: string | null;
  onCancel: () => void;
  onSave: (draft: ConditionDraft) => void;
};

export function TraderCategoryShareConditionModal({
  isOpen,
  initialDraft,
  traders,
  t,
  error,
  onCancel,
  onSave,
}: TraderCategoryShareConditionModalProps): JSX.Element | null {
  const appLang = resolveTradersAppLang();
  const [draft, setDraft] = useState<ConditionDraft>(initialDraft);
  const [showAddRowBlockReason, setShowAddRowBlockReason] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDraft(initialDraft);
      setShowAddRowBlockReason(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const totalPercent = calculateTotalPercent(draft.shares);
  const isTotalExact = Math.abs(totalPercent - 100) <= 0.001;
  const selectedTraderIdsCount = new Set(
    draft.shares.map((row) => row.traderId).filter((traderId): traderId is number => traderId !== null),
  ).size;
  const hasAvailableTraders = selectedTraderIdsCount < traders.length;
  const addRowBlockReason = getAddShareRowBlockReason({
    shareRows: draft.shares,
    isHebrew: appLang === 'he',
    isTotalAtLeastHundred: totalPercent >= 100 - 0.001,
    hasAvailableTraders,
    labels: t.shareRows,
  });
  const canAddShareRow = addRowBlockReason === null;

  const updateShareRow = (rowId: number, changes: Partial<ShareRow>) => {
    setDraft((current) => ({
      ...current,
      shares: current.shares.map((row) => (row.rowId === rowId ? { ...row, ...changes } : row)),
    }));
  };

  const removeShareRow = (rowId: number) => {
    setDraft((current) => {
      if (current.shares.length === 1) {
        return current;
      }
      return { ...current, shares: current.shares.filter((row) => row.rowId !== rowId) };
    });
  };

  const addShareRow = () => {
    if (!canAddShareRow) {
      setShowAddRowBlockReason(true);
      return;
    }

    setShowAddRowBlockReason(false);
    setDraft((current) => ({
      ...current,
      shares: [...current.shares, createEmptyShareRow(getNextShareRowId(current.shares))],
    }));
  };

  return (
    <div className="modal-overlay">
      <div className="modal-dialog modal-dialog--form">
        <button className="modal-close" type="button" aria-label={t.cancel} onClick={onCancel}>
          <FaXmark />
        </button>
        <h3 className="modal-title">{draft.id ? t.shareCondition.popupEditTitle : t.shareCondition.popupAddTitle}</h3>

        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label className={styles.label}>{t.shareCondition.nameLabel}</label>
            <input
              className="seasons-manager__year-input"
              type="text"
              value={draft.name}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              placeholder={t.shareCondition.namePlaceholder}
              autoFocus
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t.shareCondition.statusLabel}</label>
            <CustomSelect
              className="seasons-manager__year-input"
              value={draft.status}
              onChange={(value) => setDraft((current) => ({ ...current, status: value as ConditionDraft['status'] }))}
              options={[
                { value: 'ACTIVE', label: t.shareCondition.statusActiveOption },
                { value: 'DISABLED', label: t.shareCondition.statusDisabledOption },
              ]}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t.shareCondition.startDateLabel}</label>
            <input
              className="seasons-manager__year-input"
              type="date"
              value={draft.startDate}
              onChange={(event) => setDraft((current) => ({ ...current, startDate: event.target.value }))}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t.shareCondition.endDateLabel}</label>
            <input
              className="seasons-manager__year-input"
              type="date"
              value={draft.endDate}
              onChange={(event) => setDraft((current) => ({ ...current, endDate: event.target.value }))}
            />
            <span className={styles.fieldHint}>{t.shareCondition.endDateOptionalHint}</span>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t.shareCondition.quantityThresholdLabel}</label>
            <input
              className="seasons-manager__year-input"
              type="number"
              min={0}
              value={draft.endQuantityThreshold}
              onChange={(event) => setDraft((current) => ({ ...current, endQuantityThreshold: event.target.value }))}
              placeholder={t.shareCondition.quantityThresholdPlaceholder}
            />
            <span className={styles.fieldHint}>{t.shareCondition.quantityThresholdOptionalHint}</span>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t.shareCondition.endConditionModeLabel}</label>
            <CustomSelect
              className="seasons-manager__year-input"
              value={draft.endConditionMode}
              onChange={(value) => setDraft((current) => ({ ...current, endConditionMode: value as ConditionDraft['endConditionMode'] }))}
              options={[
                { value: 'EITHER', label: t.shareCondition.endConditionModeEitherOption },
                { value: 'BOTH', label: t.shareCondition.endConditionModeBothOption },
              ]}
            />
          </div>
        </div>

        <p className={styles.sharesSubtitle}>{t.shareCondition.sharesTitle}</p>

        <div className={styles.sharesArea}>
          {draft.shares.map((row, index) => {
            const availableTraders = getAvailableTradersForRow(draft.shares, row.rowId, traders, row.traderId);

            return (
              <div key={row.rowId} className={styles.shareRow}>
                <CustomSelect
                  className="seasons-manager__year-input"
                  value={row.traderId !== null && row.traderId !== undefined ? String(row.traderId) : ''}
                  onChange={(value) => {
                    const traderId = Number(value);
                    updateShareRow(row.rowId, {
                      traderId: Number.isFinite(traderId) && traderId > 0 ? traderId : null,
                    });
                  }}
                  placeholder={t.selectTraderOption}
                  options={availableTraders.map((trader) => ({ value: String(trader.id), label: trader.name }))}
                />

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
                  disabled={draft.shares.length <= 1}
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

        {error ? <p className="seasons-manager__error">{error}</p> : null}

        <div className="modal-actions">
          <button className="btn btn-danger" onClick={onCancel} type="button">
            {t.shareCondition.popupCancel}
          </button>
          <SubmitButton
            className="btn btn-success"
            onClick={() => onSave(draft)}
            type="button"
            isLoading={false}
            loadingText={t.shareCondition.popupSave}
          >
            {t.shareCondition.popupSave}
          </SubmitButton>
        </div>
      </div>
    </div>
  );
}
