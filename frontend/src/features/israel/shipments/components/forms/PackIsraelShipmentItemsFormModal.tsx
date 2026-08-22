import { FaTrashCan, FaXmark } from 'react-icons/fa6';
import { SubmitButton } from '../../../../../components/ui/SubmitButton';
import { CustomSelect } from '../../../../../components/ui/CustomSelect';
import { TopLoadingBar } from '../../../../../components/ui/TopLoadingBar';
import type { IsraelBoxRecord, IsraelBoxStatus } from '../../../../../services/israel/israelBoxesApi';
import type { IsraelSortCategory } from '../../../../../services/israel/israelSortCategoriesApi';
import type { IsraelPitamStatus } from '../../../../../services/israel/israelClassificationsApi';
import type { PackIsraelShipmentItemRowDraft } from '../../hooks/usePackIsraelShipmentItemsForm';
import { IsraelBoxNumberTypeahead } from './IsraelBoxNumberTypeahead';
import boxFormStyles from './styles/BoxFormModal.module.css';
import styles from './styles/PackItemsFormModal.module.css';

const PITAM_STATUSES: IsraelPitamStatus[] = ['WITH_PITAM', 'WITHOUT_PITAM', 'MIXED'];

type PackIsraelShipmentItemsFormModalText = {
  title: string;
  description: string;
  boxLabel: string;
  boxPlaceholder: string;
  boxLoadingLabel: string;
  boxNoMatchesLabel: string;
  unassignedGroupLabel: string;
  shipmentGroupLabel: (shipmentNumber: number) => string;
  noBoxSelectedHint: string;
  shipmentDisplayLabel: string;
  boxNumberDisplayLabel: string;
  statusDisplayLabel: string;
  unassignedShipmentValue: string;
  categoryLabel: string;
  categoryPlaceholder: string;
  pitamStatusColumnLabel: string;
  quantityPlaceholder: string;
  availableQuantityHint: (n: number) => string;
  notesLabel: string;
  notesPlaceholder: string;
  save: string;
  saving: string;
  cancel: string;
  itemRows: {
    title: string;
    addRow: string;
    removeRow: string;
    rowPrefix: (index: number) => string;
    emptyHint: string;
    totalPackedQuantityLabel: string;
  };
};

type PackIsraelShipmentItemsFormModalProps = {
  isOpen: boolean;
  t: PackIsraelShipmentItemsFormModalText;
  pitamStatusLabels: Record<IsraelPitamStatus, string>;
  boxStatusLabels: Record<IsraelBoxStatus, string>;
  boxes: IsraelBoxRecord[];
  sortCategories: IsraelSortCategory[];
  isLoadingOptions: boolean;
  boxId: string;
  onBoxIdChange: (v: string) => void;
  selectedBox: IsraelBoxRecord | null;
  rows: PackIsraelShipmentItemRowDraft[];
  onAddRow: () => void;
  onRemoveRow: (rowId: string) => void;
  onRowCategoryChange: (rowId: string, categoryId: string) => void;
  onRowNotesChange: (rowId: string, notes: string) => void;
  onCellQuantityChange: (rowId: string, grade: string, pitamStatus: IsraelPitamStatus, value: string) => void;
  availableFor: (categoryId: number, grade: string, pitamStatus: IsraelPitamStatus) => number;
  totalPackedQuantity: number;
  isSubmitting: boolean;
  error: string | null;
  onSave: () => void;
  onClose: () => void;
};

export function PackIsraelShipmentItemsFormModal({
  isOpen,
  t,
  pitamStatusLabels,
  boxStatusLabels,
  boxes,
  sortCategories,
  isLoadingOptions,
  boxId,
  onBoxIdChange,
  selectedBox,
  rows,
  onAddRow,
  onRemoveRow,
  onRowCategoryChange,
  onRowNotesChange,
  onCellQuantityChange,
  availableFor,
  totalPackedQuantity,
  isSubmitting,
  error,
  onSave,
  onClose,
}: PackIsraelShipmentItemsFormModalProps): JSX.Element | null {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-dialog modal-dialog--form"
        style={{ width: 'min(1040px, 94vw)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" type="button" aria-label={t.cancel} onClick={onClose}>
          <FaXmark />
        </button>

        <h3 className="modal-title" style={{ position: 'relative' }}>
          {t.title}
          <TopLoadingBar isLoading={isLoadingOptions} />
        </h3>
        <p className="modal-message">{t.description}</p>

        <div className={boxFormStyles.formGrid}>
          <div className={boxFormStyles.topRow}>
            <div className={boxFormStyles.field}>
              <label className={boxFormStyles.label}>{t.boxLabel}</label>
              <IsraelBoxNumberTypeahead
                options={boxes.map((box) => ({ id: box.id, boxNumber: box.boxNumber, shipmentNumber: box.shipment?.shipmentNumber ?? null }))}
                unassignedGroupLabel={t.unassignedGroupLabel}
                shipmentGroupLabel={t.shipmentGroupLabel}
                value={boxId}
                onChange={onBoxIdChange}
                placeholder={t.boxPlaceholder}
                loadingLabel={t.boxLoadingLabel}
                noMatchesLabel={t.boxNoMatchesLabel}
                isLoading={isLoadingOptions}
              />
            </div>

            <div className={boxFormStyles.field}>
              <label className={boxFormStyles.label}>{t.shipmentDisplayLabel}</label>
              <input
                className="seasons-manager__year-input"
                type="text"
                disabled
                readOnly
                value={selectedBox ? selectedBox.shipment?.shipmentNumber ?? t.unassignedShipmentValue : ''}
                placeholder={t.boxPlaceholder}
              />
            </div>

            <div className={boxFormStyles.field}>
              <label className={boxFormStyles.label}>{t.boxNumberDisplayLabel}</label>
              <input
                className="seasons-manager__year-input"
                type="text"
                disabled
                readOnly
                value={selectedBox ? String(selectedBox.boxNumber) : ''}
                placeholder={t.boxPlaceholder}
              />
            </div>

            <div className={boxFormStyles.field}>
              <label className={boxFormStyles.label}>{t.statusDisplayLabel}</label>
              <CustomSelect
                className="seasons-manager__year-input"
                value={selectedBox ? selectedBox.status : ''}
                onChange={() => {}}
                disabled
                placeholder={t.boxPlaceholder}
                options={selectedBox ? [{ value: selectedBox.status, label: boxStatusLabels[selectedBox.status] }] : []}
              />
            </div>
          </div>
        </div>

        {!selectedBox ? <p className="seasons-manager__hint" style={{ margin: 0 }}>{t.noBoxSelectedHint}</p> : null}

        <div className={styles.rowsSection}>
          <div className={styles.rowsSectionHead}>
            <h4 className={styles.rowsTitle}>{t.itemRows.title}</h4>
            {rows.length === 0 ? (
              <button type="button" className="btn btn-primary" onClick={onAddRow} disabled={!selectedBox}>
                {t.itemRows.addRow}
              </button>
            ) : null}
          </div>

          {rows.length === 0 ? <p className={styles.rowsEmptyHint}>{t.itemRows.emptyHint}</p> : null}

          {selectedBox
            ? rows.map((row, index) => {
              const selectedCategory = sortCategories.find((category) => String(category.id) === row.categoryId);

              return (
                <div key={row.id} style={{ padding: '0.75rem 0', marginBottom: '0.75rem' }}>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong>{t.itemRows.rowPrefix(index)}</strong>
                  </div>

                  <div className={styles.topRow}>
                    <div className={styles.field}>
                      <label className={styles.label}>{t.categoryLabel}</label>
                      <CustomSelect
                        className="seasons-manager__year-input"
                        value={row.categoryId}
                        onChange={(value) => onRowCategoryChange(row.id, value)}
                        placeholder={t.categoryPlaceholder}
                        options={sortCategories.map((category) => ({ value: String(category.id), label: category.name }))}
                      />
                    </div>
                  </div>

                  {selectedCategory ? (
                    <div className={styles.quantityMatrix}>
                      <table className={styles.quantityMatrixTable}>
                        <thead>
                          <tr>
                            <th>{t.pitamStatusColumnLabel}</th>
                            {selectedCategory.supportedGrades.map((grade) => (
                              <th key={grade}>{grade}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {PITAM_STATUSES.map((pitamStatus) => (
                            <tr key={pitamStatus}>
                              <th>{pitamStatusLabels[pitamStatus]}</th>
                              {selectedCategory.supportedGrades.map((grade) => {
                                const enteredRaw = row.quantities[`${grade}|${pitamStatus}`] ?? '';
                                const enteredQuantity = Number(enteredRaw);
                                const room = availableFor(selectedCategory.id, grade, pitamStatus) + (Number.isFinite(enteredQuantity) ? enteredQuantity : 0);
                                const isEnabled = room > 0;
                                const exceedsAvailable = enteredRaw.trim() !== '' && Number.isFinite(enteredQuantity) && enteredQuantity > room;

                                return (
                                  <td key={grade}>
                                    <input
                                      className="seasons-manager__year-input"
                                      type="number"
                                      min={1}
                                      max={room || undefined}
                                      step={1}
                                      disabled={!isEnabled}
                                      value={enteredRaw}
                                      onChange={(e) => onCellQuantityChange(row.id, grade, pitamStatus, e.target.value)}
                                      onWheel={(e) => e.currentTarget.blur()}
                                      placeholder={t.availableQuantityHint(room)}
                                      title={isEnabled ? t.availableQuantityHint(room) : undefined}
                                      aria-label={`${t.categoryLabel} ${selectedCategory.name} ${grade} ${pitamStatusLabels[pitamStatus]}`}
                                      style={exceedsAvailable ? { borderColor: '#dc2626' } : undefined}
                                    />
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}

                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem' }}>
                    <div className={`${styles.field} ${styles.fieldFull}`}>
                      <label className={styles.label}>{t.notesLabel}</label>
                      <textarea
                        className={`seasons-manager__year-input ${styles.textarea}`}
                        value={row.notes}
                        onChange={(e) => onRowNotesChange(row.id, e.target.value)}
                        placeholder={t.notesPlaceholder}
                        rows={1}
                      />
                    </div>

                    {index === rows.length - 1 ? (
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={onAddRow}
                        style={{ flexShrink: 0 }}
                      >
                        {t.itemRows.addRow}
                      </button>
                    ) : null}

                    <button type="button" className="btn btn-danger" onClick={() => onRemoveRow(row.id)} style={{ flexShrink: 0 }}>
                      <FaTrashCan />
                      <span>{t.itemRows.removeRow}</span>
                    </button>
                  </div>
                </div>
              );
            })
            : null}

          {totalPackedQuantity > 0 ? (
            <div className={styles.totalPackedSummary}>
              <span>{t.itemRows.totalPackedQuantityLabel}</span>
              <span>{totalPackedQuantity.toLocaleString()}</span>
            </div>
          ) : null}
        </div>

        {error ? <p className="seasons-manager__error">{error}</p> : null}

        <div className="modal-actions">
          <button className="btn btn-danger" type="button" onClick={onClose}>
            {t.cancel}
          </button>
          <SubmitButton
            className="btn btn-success"
            onClick={onSave}
            disabled={isLoadingOptions || !selectedBox}
            isLoading={isSubmitting}
            loadingText={t.saving}
          >
            {t.save}
          </SubmitButton>
        </div>
      </div>
    </div>
  );
}
