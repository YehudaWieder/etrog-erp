import { FaXmark } from 'react-icons/fa6';
import { SubmitButton } from '../../../components/ui/SubmitButton';
import { CustomSelect } from '../../../components/ui/CustomSelect';
import type { ConditionDraft, ShareRow } from '../tradersManagement.types';
import { DEFAULT_PERCENT_STEP } from '../utils/traderShares.util';
import { createEmptyConditionDraft, formatConditionSharesBreakdown } from '../utils/traderCategoryShareCondition.util';
import { TRADER_CATEGORY_GRADE_OPTIONS } from '../utils/traderCategoryGrades.util';
import type { GradeGroupRow } from '../utils/traderCategoryGradeGroups.util';
import type { TraderCategoriesI18n } from '../i18n';
import { TraderCategoryShareConditionModal } from './TraderCategoryShareConditionModal';
import styles from './styles/TraderCategoriesShared.module.css';

type TraderOption = {
  id: number;
  name: string;
};

// A subset of TraderCategoriesI18n. shareRows/shareCondition are optional because this modal is
// also reused by DefaultTraderCategoriesManagement (season-agnostic templates), which has no
// concept of distribution conditions — omitting them there simply hides the condition UI below.
export type TraderCategoryFormModalText = {
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
  supportedGradesLabel: string;
  gradeGroupsLabel: string;
  addGroupLabel: string;
  removeGroupLabel: string;
  groupNamePlaceholder: string;
  selectTraderOption: string;
  percentPlaceholder: (index: number) => string;
  removeRow: string;
  addRow: string;
  totalPercentLabel: string;
  save: string;
  saving: string;
  atLeastOneShare?: string;
  selectTrader?: string;
  uniqueTraders?: string;
  invalidPercent?: string;
  totalMustBeHundred?: string;
  shareRows?: TraderCategoriesI18n['shareRows'];
  shareCondition?: TraderCategoriesI18n['shareCondition'];
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
  supportedGrades: string[];
  toggleSupportedGrade: (grade: string) => void;
  gradeGroupRows: GradeGroupRow[];
  addGradeGroup: () => void;
  removeGradeGroup: (localId: number) => void;
  renameGradeGroup: (localId: number, name: string) => void;
  toggleGradeInGroup: (localId: number, grade: string) => void;
  shareRows: ShareRow[];
  traders?: TraderOption[];
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
  conditionDrafts?: ConditionDraft[];
  editingConditionIndex?: number | null;
  isConditionPopupOpen?: boolean;
  conditionError?: string | null;
  openConditionPopup?: (index?: number) => void;
  closeConditionPopup?: () => void;
  stageCondition?: (draft: ConditionDraft) => string | null;
  toggleConditionDraftStatus?: (index: number) => void;
  deleteConditionDraft?: (index: number) => void;
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
  supportedGrades,
  toggleSupportedGrade,
  gradeGroupRows,
  addGradeGroup,
  removeGradeGroup,
  renameGradeGroup,
  toggleGradeInGroup,
  shareRows,
  traders,
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
  conditionDrafts,
  editingConditionIndex,
  isConditionPopupOpen,
  conditionError,
  openConditionPopup,
  closeConditionPopup,
  stageCondition,
  toggleConditionDraftStatus,
  deleteConditionDraft,
  onClose,
  onSave,
}: TraderCategoryFormModalProps): JSX.Element | null {
  if (!isAddDialogOpen && !isEditDialogOpen) {
    return null;
  }

  const conditionEnabled = Boolean(
    t.shareCondition && openConditionPopup && closeConditionPopup && stageCondition && toggleConditionDraftStatus && deleteConditionDraft,
  );
  const conditionT = conditionEnabled ? (t as Required<Pick<typeof t, 'shareCondition' | 'shareRows'>> & typeof t) : null;

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

        <p className={styles.sharesSubtitle}>{t.supportedGradesLabel}</p>
        <div className={styles.gradesChecklist}>
          {TRADER_CATEGORY_GRADE_OPTIONS.map((grade) => (
            <label key={grade} className={styles.gradeCheckboxItem}>
              <input
                type="checkbox"
                checked={supportedGrades.includes(grade)}
                onChange={() => toggleSupportedGrade(grade)}
              />
              <span>{grade}</span>
            </label>
          ))}
        </div>

        <p className={styles.sharesSubtitle}>{t.gradeGroupsLabel}</p>
        <div className={styles.gradeGroupsArea}>
          {gradeGroupRows.map((group) => (
            <div key={group.localId} className={styles.gradeGroupRow}>
              <div className={styles.gradeGroupRowHead}>
                <input
                  className="seasons-manager__year-input"
                  type="text"
                  value={group.name}
                  onChange={(event) => renameGradeGroup(group.localId, event.target.value)}
                  placeholder={t.groupNamePlaceholder}
                />
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => removeGradeGroup(group.localId)}
                >
                  {t.removeGroupLabel}
                </button>
              </div>
              <div className={styles.gradesChecklist}>
                {supportedGrades.map((grade) => (
                  <label key={grade} className={styles.gradeCheckboxItem}>
                    <input
                      type="checkbox"
                      checked={group.grades.includes(grade)}
                      onChange={() => toggleGradeInGroup(group.localId, grade)}
                    />
                    <span>{grade}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}

          <button type="button" className="btn btn-primary" onClick={addGradeGroup}>
            {t.addGroupLabel}
          </button>
        </div>

        <p className={styles.sharesSubtitle}>{t.allocationSectionTitle}</p>

        <div className={styles.sharesArea}>
          {shareRows.map((row, index) => {
            const availableTraders = getAvailableTradersForRow(row);

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

        {conditionEnabled && conditionT ? (
          <>
            <p className={styles.sharesSubtitle}>{conditionT.shareCondition.sectionTitle}</p>
            <div className={styles.conditionArea}>
              {(conditionDrafts ?? [])
                .map((draft, index) => ({ draft, index }))
                .filter(({ draft }) => !draft.markedForDeletion)
                .map(({ draft, index }) => (
                  <div key={draft.id ?? `new-${index}`} className={styles.conditionSummaryRow}>
                    <div className={styles.conditionSummaryTop}>
                      <div className={styles.conditionSummaryHead}>
                        <strong className={styles.shareName}>{draft.name}</strong>
                      </div>
                      <span
                        className={`${styles.statusBadge} ${
                          draft.status === 'ACTIVE'
                            ? styles.statusBadgeActive
                            : draft.status === 'DISABLED'
                              ? styles.statusBadgeDisabled
                              : styles.statusBadgeEnded
                        }`}
                      >
                        {draft.status === 'ACTIVE'
                          ? conditionT.shareCondition.statusActiveBadge
                          : draft.status === 'DISABLED'
                            ? conditionT.shareCondition.statusDisabledBadge
                            : conditionT.shareCondition.statusEndedBadge}
                      </span>
                    </div>
                    <div className={styles.conditionSummaryBottom}>
                      <div className={styles.conditionSummaryDetails}>
                        <span>
                          {draft.endDate
                            ? conditionT.shareCondition.summaryDateRange(draft.startDate, draft.endDate)
                            : conditionT.shareCondition.summaryDateRangeOpenEnded(draft.startDate)}
                        </span>
                        {draft.endQuantityThreshold ? (
                          <span>{conditionT.shareCondition.summaryQuantityThreshold(Number(draft.endQuantityThreshold))}</span>
                        ) : null}
                        <span>
                          {conditionT.shareCondition.summarySharesBreakdown(
                            formatConditionSharesBreakdown(draft.shares, traders ?? []),
                          )}
                        </span>
                      </div>
                      {draft.status === 'ENDED' ? null : (
                        <div className={styles.conditionSummaryActions}>
                          <button type="button" className="btn btn-primary" onClick={() => openConditionPopup?.(index)}>
                            {conditionT.shareCondition.editButton}
                          </button>
                          <button type="button" className="btn btn-secondary" onClick={() => toggleConditionDraftStatus?.(index)}>
                            {draft.status === 'ACTIVE'
                              ? conditionT.shareCondition.disableButton
                              : conditionT.shareCondition.enableButton}
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger"
                            onClick={() => deleteConditionDraft?.(index)}
                            disabled={draft.hasLinkedStock}
                            title={draft.hasLinkedStock ? conditionT.shareCondition.deleteBlockedTooltip : undefined}
                          >
                            {conditionT.shareCondition.deleteButton}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

              <button
                type="button"
                className={`btn btn-primary ${styles.conditionAddButton}`}
                onClick={() => openConditionPopup?.()}
              >
                {conditionT.shareCondition.addButton}
              </button>

              {!isConditionPopupOpen && conditionError ? <p className="seasons-manager__error">{conditionError}</p> : null}
            </div>
          </>
        ) : null}

        {isAddDialogOpen && addError ? <p className="seasons-manager__error">{addError}</p> : null}
        {isEditDialogOpen && editError ? <p className="seasons-manager__error">{editError}</p> : null}

        <div className="modal-actions">
          <button className="btn btn-danger" onClick={onClose} type="button">
            {t.cancel}
          </button>
          <SubmitButton
            className="btn btn-success"
            onClick={onSave}
            type="button"
            isLoading={isSubmitting}
            loadingText={t.saving}
          >
            {t.save}
          </SubmitButton>
        </div>
      </div>

      {conditionEnabled && conditionT ? (
        <TraderCategoryShareConditionModal
          isOpen={Boolean(isConditionPopupOpen)}
          initialDraft={
            editingConditionIndex != null && conditionDrafts?.[editingConditionIndex]
              ? conditionDrafts[editingConditionIndex]
              : createEmptyConditionDraft()
          }
          traders={traders ?? []}
          t={conditionT}
          error={conditionError ?? null}
          onCancel={closeConditionPopup!}
          onSave={(draft) => {
            stageCondition!(draft);
          }}
        />
      ) : null}
    </div>
  );
}
