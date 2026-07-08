import { useState } from 'react';
import { FaTrashCan } from 'react-icons/fa6';
import type { Trader } from '../../../services/tradersApi';
import type { Customer } from '../../../services/customersApi';
import type { StockSource } from '../hooks/useNewShipmentItemForm';
import type { PackingItemRowDraft, PackingItemRowView } from '../hooks/usePackingForm';
import {
  PITAM_ROW_KEYS,
  SINGLE_GRADE_COLUMN_KEY,
  createEmptyGradeQuantityMatrix,
  type PitamRowKey,
} from '../utils/packingItemMatrix.util';
import styles from './styles/NewShipmentItemFormModal.module.css';

type PackingItemRowsText = {
  title: string;
  addRow: string;
  removeRow: string;
  rowPrefix: (index: number) => string;
  emptyHint: string;
  totalPackedQuantityLabel: string;
};

type PackingItemFieldsText = {
  stockSourceLabel: string;
  stockSourcePlaceholder: string;
  stockSourceLabels: { GENERAL: string; PRIVATE_SELECTION: string };
  traderLabel: string;
  customerLabel: string;
  ownerNameLabel: string;
  traderPlaceholder: string;
  customerPlaceholder: string;
  itemOwnershipLabel: string;
  itemOwnershipPlaceholder: string;
  categoryLabel: string;
  categoryPlaceholder: string;
  gradeLabel: string;
  gradePlaceholder: string;
  pitamStatusLabel: string;
  pitamStatusPlaceholder: string;
  quantityLabel: string;
  quantityPlaceholder: string;
  availableQuantityHint: (n: number) => string;
  existingQuantityHint: (n: number) => string;
  editExistingItemLabel: string;
  cancelExistingItemEditLabel: string;
  notesLabel: string;
  notesPlaceholder: string;
  loadingInventory: string;
  ownershipLabels: Record<string, string>;
  pitamStatusLabels: Record<string, string>;
};

type PackingItemRowsSectionProps = {
  rowsT: PackingItemRowsText;
  fieldsT: PackingItemFieldsText;
  boxOwnershipType: string;
  rows: PackingItemRowView[];
  traders: Trader[];
  customers: Customer[];
  isLoadingInventory: boolean;
  isBoxOpen: boolean;
  isBoxFull: boolean;
  boxCapacityMessage: string | null;
  remainingCapacityMessage: string | null;
  addItemDisabledHint: string;
  totalPackedQuantity: number;
  pendingExistingItemEdits: Record<number, string>;
  onAddRow: () => void;
  onRemoveRow: (id: string) => void;
  onUpdateRow: (id: string, updater: Partial<PackingItemRowDraft>) => void;
  onUpdateRowQuantity: (id: string, pitamKey: PitamRowKey, gradeKey: string, value: string) => void;
  onStageExistingItemEdit: (itemId: number, value: string | null) => void;
};

const ITEM_OWNERSHIP_OPTIONS = ['TRADER', 'CUSTOMER', 'GENERAL', 'CUSTOM'] as const;

export function PackingItemRowsSection({
  rowsT,
  fieldsT,
  boxOwnershipType,
  rows,
  traders,
  customers,
  isLoadingInventory,
  isBoxOpen,
  isBoxFull,
  boxCapacityMessage,
  remainingCapacityMessage,
  addItemDisabledHint,
  totalPackedQuantity,
  pendingExistingItemEdits,
  onAddRow,
  onRemoveRow,
  onUpdateRow,
  onUpdateRowQuantity,
  onStageExistingItemEdit,
}: PackingItemRowsSectionProps) {
  const isSharedBox = boxOwnershipType === 'SHARED';
  const isCustomBox = boxOwnershipType === 'CUSTOM';
  const [unlockedCellKeys, setUnlockedCellKeys] = useState<Set<string>>(new Set());

  const handleUnlockCellForEdit = (cellKey: string) => {
    setUnlockedCellKeys((prev) => {
      const next = new Set(prev);
      next.add(cellKey);
      return next;
    });
  };

  const handleRevertCellEdit = (cellKey: string, itemId: number) => {
    setUnlockedCellKeys((prev) => {
      if (!prev.has(cellKey)) {
        return prev;
      }
      const next = new Set(prev);
      next.delete(cellKey);
      return next;
    });
    onStageExistingItemEdit(itemId, null);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '1rem 0 0.5rem' }}>
        <h4 style={{ margin: 0 }}>{rowsT.title}</h4>
        {isBoxOpen && remainingCapacityMessage ? (
          <span className={styles.availableHint}>{remainingCapacityMessage}</span>
        ) : null}
      </div>

      {!isBoxOpen ? (
        <p className="seasons-manager__hint" style={{ margin: 0 }}>{addItemDisabledHint}</p>
      ) : rows.length === 0 && !isBoxFull ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <p className="seasons-manager__hint" style={{ margin: 0 }}>{rowsT.emptyHint}</p>
          <button type="button" className="btn btn-primary" onClick={onAddRow}>
            {rowsT.addRow}
          </button>
        </div>
      ) : null}

      {rows.map((view, index) => {
        const { draft } = view;
        const isSharedCustomItem = isSharedBox && draft.itemOwnership === 'CUSTOM';
        const isSharedUnassignedItem = isSharedBox && draft.itemOwnership === 'GENERAL';

        return (
          <div key={draft.id} style={{ padding: '0.75rem 0', marginBottom: '0.75rem' }}>
            <div style={{ marginBottom: '0.5rem' }}>
              <strong>{rowsT.rowPrefix(index)}</strong>
            </div>

            <div className={styles.topRow}>
              {isCustomBox ? (
                <div className={styles.field}>
                  <label className={styles.label}>{fieldsT.itemOwnershipLabel}</label>
                  <input
                    className="seasons-manager__year-input"
                    type="text"
                    value={draft.itemOwnership}
                    onChange={(e) => onUpdateRow(draft.id, { itemOwnership: e.target.value })}
                    placeholder={fieldsT.itemOwnershipPlaceholder}
                  />
                </div>
              ) : isSharedBox ? (
                <div className={styles.field}>
                  <label className={styles.label}>{fieldsT.itemOwnershipLabel}</label>
                  <select
                    className="seasons-manager__year-input"
                    value={draft.itemOwnership}
                    onChange={(e) => onUpdateRow(draft.id, {
                      itemOwnership: e.target.value,
                      stockSource: '',
                      traderId: '',
                      customerId: '',
                      traderCategoryId: '',
                      customerCategoryId: '',
                      grade: '',
                      pitamStatus: '',
                      quantity: '',
                      quantities: createEmptyGradeQuantityMatrix(),
                    })}
                  >
                    <option value="">{fieldsT.itemOwnershipPlaceholder}</option>
                    {ITEM_OWNERSHIP_OPTIONS.map((type) => (
                      <option key={type} value={type}>{fieldsT.ownershipLabels[type]}</option>
                    ))}
                  </select>
                </div>
              ) : null}

              {isSharedBox && !isSharedUnassignedItem && draft.itemOwnership ? (
                <div className={styles.field}>
                  <label className={styles.label}>{fieldsT.ownerNameLabel}</label>
                  {draft.itemOwnership === 'CUSTOMER' ? (
                    <select
                      className="seasons-manager__year-input"
                      value={draft.customerId}
                      onChange={(e) => onUpdateRow(draft.id, { customerId: e.target.value, customerCategoryId: '', quantities: createEmptyGradeQuantityMatrix() })}
                    >
                      <option value="">{fieldsT.customerPlaceholder}</option>
                      {customers.map((c) => (
                        <option key={c.id} value={String(c.id)}>{c.customerName}</option>
                      ))}
                    </select>
                  ) : isSharedCustomItem ? (
                    <input
                      className="seasons-manager__year-input"
                      type="text"
                      value={draft.traderId}
                      onChange={(e) => onUpdateRow(draft.id, { traderId: e.target.value })}
                      placeholder={fieldsT.ownerNameLabel}
                    />
                  ) : (
                    <select
                      className="seasons-manager__year-input"
                      value={draft.traderId}
                      onChange={(e) => onUpdateRow(draft.id, { traderId: e.target.value, traderCategoryId: '', quantities: createEmptyGradeQuantityMatrix() })}
                    >
                      <option value="">{fieldsT.traderPlaceholder}</option>
                      {traders.map((tr) => (
                        <option key={tr.id} value={String(tr.id)}>{tr.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              ) : null}

              {view.isTraderItem ? (
                <div className={styles.field}>
                  <label className={styles.label}>{fieldsT.stockSourceLabel}</label>
                  <select
                    className="seasons-manager__year-input"
                    value={draft.stockSource}
                    onChange={(e) => onUpdateRow(draft.id, { stockSource: e.target.value as StockSource, traderCategoryId: '', quantities: createEmptyGradeQuantityMatrix() })}
                  >
                    <option value="">{fieldsT.stockSourcePlaceholder}</option>
                    <option value="GENERAL">{fieldsT.stockSourceLabels.GENERAL}</option>
                    <option value="PRIVATE_SELECTION">{fieldsT.stockSourceLabels.PRIVATE_SELECTION}</option>
                  </select>
                </div>
              ) : null}

              <div className={styles.field}>
                <label className={styles.label}>{fieldsT.categoryLabel}</label>
                {view.isCustomFreeText ? (
                  <input
                    className="seasons-manager__year-input"
                    type="text"
                    value={draft.traderCategoryId}
                    onChange={(e) => onUpdateRow(draft.id, { traderCategoryId: e.target.value })}
                    placeholder={fieldsT.categoryPlaceholder}
                  />
                ) : view.isCustomerItem ? (
                  <select
                    className="seasons-manager__year-input"
                    value={draft.customerCategoryId}
                    onChange={(e) => onUpdateRow(draft.id, { customerCategoryId: e.target.value, quantities: createEmptyGradeQuantityMatrix() })}
                    disabled={isLoadingInventory || view.availableCustomerCategories.length === 0}
                  >
                    <option value="">{isLoadingInventory ? fieldsT.loadingInventory : fieldsT.categoryPlaceholder}</option>
                    {view.availableCustomerCategories.map((cat) => (
                      <option key={cat.id} value={String(cat.id)}>{cat.name} - {cat.grade}</option>
                    ))}
                  </select>
                ) : (
                  <select
                    className="seasons-manager__year-input"
                    value={draft.traderCategoryId}
                    onChange={(e) => onUpdateRow(draft.id, { traderCategoryId: e.target.value, quantities: createEmptyGradeQuantityMatrix() })}
                    disabled={isLoadingInventory || view.availableTraderCategories.length === 0}
                  >
                    <option value="">{isLoadingInventory ? fieldsT.loadingInventory : fieldsT.categoryPlaceholder}</option>
                    {view.availableTraderCategories.map((cat) => (
                      <option key={cat.id} value={String(cat.id)}>{cat.name}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {view.isCustomFreeText ? (
              <div className={styles.secondRow}>
                <div className={styles.field}>
                  <label className={styles.label}>{fieldsT.gradeLabel}</label>
                  <input
                    className="seasons-manager__year-input"
                    type="text"
                    value={draft.grade}
                    onChange={(e) => onUpdateRow(draft.id, { grade: e.target.value })}
                    placeholder={fieldsT.gradePlaceholder}
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>{fieldsT.pitamStatusLabel}</label>
                  <select
                    className="seasons-manager__year-input"
                    value={draft.pitamStatus}
                    onChange={(e) => onUpdateRow(draft.id, { pitamStatus: e.target.value })}
                  >
                    <option value="">{fieldsT.pitamStatusPlaceholder}</option>
                    {Object.keys(fieldsT.pitamStatusLabels).map((ps) => (
                      <option key={ps} value={ps}>{fieldsT.pitamStatusLabels[ps] ?? ps}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>{fieldsT.quantityLabel}</label>
                  <input
                    className="seasons-manager__year-input"
                    type="number"
                    min={1}
                    step={1}
                    value={draft.quantity}
                    onChange={(e) => onUpdateRow(draft.id, { quantity: e.target.value })}
                    onWheel={(e) => e.currentTarget.blur()}
                    placeholder={fieldsT.quantityPlaceholder}
                    disabled={isBoxFull && !draft.quantity.trim()}
                    title={isBoxFull && !draft.quantity.trim() ? (boxCapacityMessage ?? undefined) : undefined}
                  />
                </div>
              </div>
            ) : (
              <div className={styles.quantityMatrix}>
                <table className={styles.quantityMatrixTable}>
                  <thead>
                    <tr>
                      <th>{fieldsT.pitamStatusLabel}</th>
                      {view.displayGradeColumns.map((gradeKey) => (
                        <th key={`packing-grade-col-${draft.id}-${gradeKey}`}>
                          {gradeKey === SINGLE_GRADE_COLUMN_KEY ? fieldsT.quantityLabel : gradeKey}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PITAM_ROW_KEYS.map((pitamKey) => (
                      <tr key={`packing-pitam-row-${draft.id}-${pitamKey}`}>
                        <th>{fieldsT.pitamStatusLabels[pitamKey] ?? pitamKey}</th>
                        {view.displayGradeColumns.map((gradeKey) => {
                          const available = view.cellAvailability[pitamKey]?.[gradeKey] ?? 0;
                          const isEnabled = available > 0;
                          const hasValue = Boolean((draft.quantities[pitamKey][gradeKey] ?? '').trim());
                          const isLockedByFullBox = isBoxFull && !hasValue;
                          const existingItem = view.existingItemByCell[pitamKey]?.[gradeKey];
                          const isExistingCell = Boolean(existingItem);
                          const cellKey = `${draft.id}:${pitamKey}:${gradeKey}`;
                          const isCellUnlocked = isExistingCell && unlockedCellKeys.has(cellKey);
                          const pendingValue = existingItem ? pendingExistingItemEdits[existingItem.id] : undefined;

                          if (isExistingCell && existingItem) {
                            return (
                              <td key={`packing-cell-${draft.id}-${pitamKey}-${gradeKey}`}>
                                <div className={styles.existingCellWrapper}>
                                  <input
                                    className="seasons-manager__year-input"
                                    type="number"
                                    min={1}
                                    step={1}
                                    disabled={!isCellUnlocked}
                                    readOnly={!isCellUnlocked}
                                    value={pendingValue ?? existingItem.quantity}
                                    onChange={(e) => {
                                      if (isCellUnlocked) {
                                        onStageExistingItemEdit(existingItem.id, e.target.value);
                                      }
                                    }}
                                    onWheel={(e) => e.currentTarget.blur()}
                                    title={!isCellUnlocked ? fieldsT.existingQuantityHint(existingItem.quantity) : undefined}
                                  />
                                  {!isCellUnlocked ? (
                                    <button
                                      type="button"
                                      className={styles.editExistingCellButton}
                                      onClick={() => handleUnlockCellForEdit(cellKey)}
                                      aria-label={fieldsT.editExistingItemLabel}
                                      title={fieldsT.editExistingItemLabel}
                                    >
                                      ✎
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      className={styles.editExistingCellButton}
                                      onClick={() => handleRevertCellEdit(cellKey, existingItem.id)}
                                      aria-label={fieldsT.cancelExistingItemEditLabel}
                                      title={fieldsT.cancelExistingItemEditLabel}
                                    >
                                      ×
                                    </button>
                                  )}
                                </div>
                              </td>
                            );
                          }

                          return (
                            <td key={`packing-cell-${draft.id}-${pitamKey}-${gradeKey}`}>
                              <input
                                className="seasons-manager__year-input"
                                type="number"
                                min={1}
                                max={available || undefined}
                                step={1}
                                disabled={!isEnabled || isLockedByFullBox}
                                value={draft.quantities[pitamKey][gradeKey] ?? ''}
                                onChange={(e) => onUpdateRowQuantity(draft.id, pitamKey, gradeKey, e.target.value)}
                                onWheel={(e) => e.currentTarget.blur()}
                                placeholder={fieldsT.availableQuantityHint(available)}
                                title={isLockedByFullBox ? (boxCapacityMessage ?? undefined) : isEnabled ? fieldsT.availableQuantityHint(available) : undefined}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem' }}>
              <div className={`${styles.field} ${styles.fieldFull}`}>
                <label className={styles.label}>{fieldsT.notesLabel}</label>
                <textarea
                  className={`seasons-manager__year-input ${styles.textarea}`}
                  value={draft.notes}
                  onChange={(e) => onUpdateRow(draft.id, { notes: e.target.value })}
                  placeholder={fieldsT.notesPlaceholder}
                  rows={1}
                />
              </div>

              {index === rows.length - 1 ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={onAddRow}
                  disabled={!isBoxOpen || isBoxFull}
                  title={!isBoxOpen ? addItemDisabledHint : isBoxFull ? (boxCapacityMessage ?? undefined) : undefined}
                  style={{ flexShrink: 0 }}
                >
                  {rowsT.addRow}
                </button>
              ) : null}

              <button type="button" className="btn btn-danger" onClick={() => onRemoveRow(draft.id)} style={{ flexShrink: 0 }}>
                <FaTrashCan />
                <span>{rowsT.removeRow}</span>
              </button>
            </div>
          </div>
        );
      })}

      {rows.length ? (
        <div className={styles.totalPackedSummary}>
          <span>{rowsT.totalPackedQuantityLabel}</span>
          <span>{totalPackedQuantity}</span>
        </div>
      ) : null}

      {isBoxOpen && boxCapacityMessage ? (
        <p className="seasons-manager__error" style={{ margin: '0.5rem 0 0' }}>{boxCapacityMessage}</p>
      ) : null}
    </div>
  );
}
