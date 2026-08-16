import { useState } from 'react';
import { createPortal } from 'react-dom';
import { FaTrashCan } from 'react-icons/fa6';
import { SubmitButton } from '../../../components/ui/SubmitButton';
import type { Trader } from '../../../services/tradersApi';
import type { Customer } from '../../../services/customersApi';
import type { StockSource } from '../hooks/useNewShipmentItemForm';
import type { PackingItemRowDraft, PackingItemRowView } from '../hooks/usePackingForm';
import { createPitamSplitMovement } from '../../../services/inventoryMovementsApi';
import { ApiError } from '../../../services/apiClient';
import {
  PITAM_ROW_KEYS,
  SINGLE_GRADE_COLUMN_KEY,
  createEmptyGradeQuantityMatrix,
  isMatrixEmpty,
  type PitamRowKey,
} from '../utils/packingItemMatrix.util';
import styles from './styles/NewShipmentItemFormModal.module.css';

type PackingItemRowsText = {
  title: string;
  addRow: string;
  removeRow: string;
  rowPrefix: (index: number) => string;
  emptyHint: string;
  addRowDisabledHint: string;
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
  addExistingItemQuantityLabel: string;
  cancelExistingItemEditLabel: string;
  addExistingItemQuantityPopupTitle: string;
  addExistingItemQuantityPopupPrefix: string;
  addExistingItemQuantityPopupGradeWord: string;
  addExistingItemQuantityPopupOwnerWord: string;
  addExistingItemQuantityPopupInstruction: string;
  addExistingItemQuantityConfirmLabel: string;
  addExistingItemQuantityInvalidError: string;
  existingItemQuantityAddModeLabel: string;
  existingItemQuantitySubtractModeLabel: string;
  subtractExistingItemQuantityConfirmLabel: string;
  subtractExistingItemQuantityInvalidError: string;
  subtractExistingItemQuantityExceedsBaseError: (n: number) => string;
  addExistingItemQuantityAvailableHint: (n: number) => string;
  addExistingItemQuantityExceedsAvailableError: (n: number) => string;
  subtractExistingItemQuantityToZeroHint: string;
  cellQuantityExceedsAvailableHint: (n: number) => string;
  cancel: string;
  notesLabel: string;
  notesPlaceholder: string;
  loadingInventory: string;
  ownershipLabels: Record<string, string>;
  pitamStatusLabels: Record<string, string>;
  pitamSplitHintLabel: (n: number) => string;
  pitamSplitPopupTitle: string;
  pitamSplitWithLabel: string;
  pitamSplitWithoutLabel: string;
  pitamSplitAvailableLabel: (n: number) => string;
  pitamSplitExceedsAvailableError: (n: number) => string;
  pitamSplitConfirmLabel: string;
  pitamSplitConfirmingLabel: string;
  pitamSplitInvalidError: string;
  pitamSplitInsufficientStockError: string;
  pitamSplitGenericError: string;
};

type PackingItemRowsSectionProps = {
  rowsT: PackingItemRowsText;
  fieldsT: PackingItemFieldsText;
  boxOwnershipType: string;
  boxTraderId: string;
  boxCustomerId: string;
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
  onInvalidateTraderInventory: (traderId: number, stockSource: StockSource | '') => void;
  onInvalidateAllTraderInventory: () => void;
};

const ITEM_OWNERSHIP_OPTIONS = ['TRADER', 'CUSTOMER', 'GENERAL', 'CUSTOM'] as const;

export function PackingItemRowsSection({
  rowsT,
  fieldsT,
  boxOwnershipType,
  boxTraderId,
  boxCustomerId,
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
  onInvalidateTraderInventory,
  onInvalidateAllTraderInventory,
}: PackingItemRowsSectionProps) {
  const isSharedBox = boxOwnershipType === 'SHARED';
  const isCustomBox = boxOwnershipType === 'CUSTOM';
  const [didTryAddRow, setDidTryAddRow] = useState(false);
  const lastRow = rows[rows.length - 1];
  const lastRowHasExistingItem = lastRow
    ? Object.values(lastRow.existingItemByCell).some((gradeMap) => Object.keys(gradeMap).length > 0)
    : false;
  const lastRowHasQuantity = lastRow
    ? lastRow.isCustomFreeText
      ? Number(lastRow.draft.quantity) > 0
      : !isMatrixEmpty(lastRow.draft.quantities) || lastRowHasExistingItem
    : true;
  const canAddRow = !lastRow || (lastRow.hasCategorySelected && lastRowHasQuantity);

  const handleAddRowClick = () => {
    if (!canAddRow) {
      setDidTryAddRow(true);
      return;
    }
    setDidTryAddRow(false);
    onAddRow();
  };
  const [addQuantityCell, setAddQuantityCell] = useState<{
    itemId: number;
    baseQuantity: number;
    available: number;
    categoryName: string;
    gradeLabel: string;
    pitamLabel: string;
    ownerName: string;
  } | null>(null);
  const [addQuantityValue, setAddQuantityValue] = useState('');
  const [addQuantityError, setAddQuantityError] = useState('');
  const [addQuantityMode, setAddQuantityMode] = useState<'add' | 'subtract'>('add');

  const handleOpenAddQuantityPopup = (params: {
    itemId: number;
    baseQuantity: number;
    available: number;
    categoryName: string;
    gradeLabel: string;
    pitamLabel: string;
    ownerName: string;
  }) => {
    setAddQuantityCell(params);
    setAddQuantityValue('');
    setAddQuantityError('');
    setAddQuantityMode('add');
  };

  const handleCloseAddQuantityPopup = () => {
    setAddQuantityCell(null);
    setAddQuantityValue('');
    setAddQuantityError('');
    setAddQuantityMode('add');
  };

  const handleConfirmAddQuantity = () => {
    if (!addQuantityCell) {
      return;
    }
    const isSubtractMode = addQuantityMode === 'subtract';
    const parsedQuantity = Number(addQuantityValue);
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      setAddQuantityError(
        isSubtractMode ? fieldsT.subtractExistingItemQuantityInvalidError : fieldsT.addExistingItemQuantityInvalidError,
      );
      return;
    }
    if (isSubtractMode && parsedQuantity > addQuantityCell.baseQuantity) {
      setAddQuantityError(fieldsT.subtractExistingItemQuantityExceedsBaseError(addQuantityCell.baseQuantity));
      return;
    }
    if (!isSubtractMode && parsedQuantity > addQuantityCell.available) {
      setAddQuantityError(fieldsT.addExistingItemQuantityExceedsAvailableError(addQuantityCell.available));
      return;
    }
    const newTotal = isSubtractMode
      ? addQuantityCell.baseQuantity - parsedQuantity
      : addQuantityCell.baseQuantity + parsedQuantity;
    onStageExistingItemEdit(addQuantityCell.itemId, String(newTotal));
    handleCloseAddQuantityPopup();
  };

  const handleRevertCellEdit = (itemId: number) => {
    onStageExistingItemEdit(itemId, null);
  };

  // Trader-only / general-pool: a customer always has a definite pitam status, so there is nothing
  // to resolve there. A row on a GENERAL (unassigned) box has no single owning trader — its MIXED
  // split is resolved proportionally across every trader holding that category/grade instead.
  const [pitamSplitCell, setPitamSplitCell] = useState<{
    mixedAvailable: number;
    traderId: number | null;
    stockSource: StockSource | '';
    traderCategoryId: number;
    grade: string;
  } | null>(null);
  const [pitamSplitWithValue, setPitamSplitWithValue] = useState('');
  const [pitamSplitWithoutValue, setPitamSplitWithoutValue] = useState('');
  const [pitamSplitError, setPitamSplitError] = useState('');
  const [pitamSplitSubmitting, setPitamSplitSubmitting] = useState(false);

  const validatePitamSplitAmounts = (withValue: string, withoutValue: string) => {
    if (!pitamSplitCell) return;
    const withQty = Number(withValue || 0);
    const withoutQty = Number(withoutValue || 0);
    if (Number.isFinite(withQty) && Number.isFinite(withoutQty) && withQty + withoutQty > pitamSplitCell.mixedAvailable) {
      setPitamSplitError(fieldsT.pitamSplitExceedsAvailableError(pitamSplitCell.mixedAvailable));
    } else {
      setPitamSplitError('');
    }
  };

  const handleClosePitamSplitPopup = () => {
    setPitamSplitCell(null);
    setPitamSplitWithValue('');
    setPitamSplitWithoutValue('');
    setPitamSplitError('');
  };

  const handleConfirmPitamSplit = async () => {
    if (!pitamSplitCell) return;

    const withQty = Number(pitamSplitWithValue || 0);
    const withoutQty = Number(pitamSplitWithoutValue || 0);
    if (
      Number.isNaN(withQty) || Number.isNaN(withoutQty) ||
      withQty < 0 || withoutQty < 0 || withQty + withoutQty <= 0
    ) {
      setPitamSplitError(fieldsT.pitamSplitInvalidError);
      return;
    }

    if (withQty + withoutQty > pitamSplitCell.mixedAvailable) {
      setPitamSplitError(fieldsT.pitamSplitExceedsAvailableError(pitamSplitCell.mixedAvailable));
      return;
    }

    try {
      setPitamSplitSubmitting(true);
      await createPitamSplitMovement({
        source: pitamSplitCell.traderId !== null ? 'SPECIFIC_TRADER' : 'GENERAL',
        traderId: pitamSplitCell.traderId ?? undefined,
        traderCategoryId: pitamSplitCell.traderCategoryId,
        grade: pitamSplitCell.grade,
        withQty,
        withoutQty,
      });
      if (pitamSplitCell.traderId !== null) {
        onInvalidateTraderInventory(pitamSplitCell.traderId, pitamSplitCell.stockSource);
      } else {
        onInvalidateAllTraderInventory();
      }

      handleClosePitamSplitPopup();
    } catch (submitError) {
      setPitamSplitError(
        submitError instanceof ApiError
          ? submitError.message.toLowerCase().includes('insufficient')
            ? fieldsT.pitamSplitInsufficientStockError
            : submitError.message
          : fieldsT.pitamSplitGenericError,
      );
    } finally {
      setPitamSplitSubmitting(false);
    }
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
        const selectedCustomerCategoryForRow = view.availableCustomerCategories.find(
          (category) => String(category.id) === draft.customerCategoryId,
        );
        const rowCategoryName = view.isCustomerItem
          ? selectedCustomerCategoryForRow?.name ?? ''
          : view.availableTraderCategories.find((category) => String(category.id) === draft.traderCategoryId)?.name ?? '';
        const rowOwnerName = isCustomBox
          ? draft.itemOwnership
          : isSharedCustomItem
            ? draft.traderId
            : isSharedBox
              ? view.isCustomerItem
                ? customers.find((customer) => String(customer.id) === draft.customerId)?.customerName ?? ''
                : view.isTraderItem
                  ? traders.find((trader) => String(trader.id) === draft.traderId)?.name ?? ''
                  : ''
              : boxOwnershipType === 'CUSTOMER'
                ? customers.find((customer) => String(customer.id) === boxCustomerId)?.customerName ?? ''
                : boxOwnershipType === 'TRADER'
                  ? traders.find((trader) => String(trader.id) === boxTraderId)?.name ?? ''
                  : '';
        // Same resolution as usePackingForm's resolveEffectiveTraderId, needed here to fire a
        // PITAM_SPLIT resolution against the right trader when the user accepts the hint. Trader-only
        // — a customer always has a definite pitam status, so no equivalent exists for customer rows.
        const effTraderIdStr = view.isTraderItem ? (boxOwnershipType === 'TRADER' ? boxTraderId : draft.traderId) : '';

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
                          const pendingValue = existingItem ? pendingExistingItemEdits[existingItem.id] : undefined;
                          const hasPendingAddition = pendingValue !== undefined;

                          const mixedAvailable = view.cellAvailability.MIXED?.[gradeKey] ?? 0;
                          // Trader rows resolve their own MIXED stock; rows on a GENERAL/unassigned
                          // box or item have no single owning trader, so their split is resolved
                          // proportionally across every trader holding that category/grade instead.
                          // Customers always have a definite pitam status, so there is nothing to
                          // resolve on customer rows. Available regardless of whether the cell already
                          // has a packed item — there can still be unresolved MIXED stock left to split.
                          const isGeneralPoolItem = view.isUnassignedBox || view.isSharedUnassignedItem;
                          const canSuggestPitamSplit =
                            pitamKey === 'MIXED' &&
                            mixedAvailable > 0 &&
                            (view.isTraderItem ? Boolean(effTraderIdStr) : isGeneralPoolItem) &&
                            Boolean(draft.traderCategoryId) &&
                            gradeKey !== SINGLE_GRADE_COLUMN_KEY;

                          const pitamSplitButton = canSuggestPitamSplit ? (
                            <button
                              type="button"
                              className={styles.pitamSplitHintButton}
                              onClick={() =>
                                setPitamSplitCell({
                                  mixedAvailable,
                                  traderId: view.isTraderItem ? Number(effTraderIdStr) : null,
                                  stockSource: draft.stockSource,
                                  traderCategoryId: Number(draft.traderCategoryId),
                                  grade: gradeKey,
                                })
                              }
                              title={fieldsT.pitamSplitHintLabel(mixedAvailable)}
                            >
                              {fieldsT.pitamSplitHintLabel(mixedAvailable)}
                            </button>
                          ) : null;

                          if (isExistingCell && existingItem) {
                            return (
                              <td key={`packing-cell-${draft.id}-${pitamKey}-${gradeKey}`}>
                                <div className={styles.existingCellWrapper}>
                                  <input
                                    className="seasons-manager__year-input"
                                    type="number"
                                    min={1}
                                    step={1}
                                    disabled
                                    readOnly
                                    value={pendingValue ?? existingItem.quantity}
                                    onWheel={(e) => e.currentTarget.blur()}
                                    title={fieldsT.existingQuantityHint(Number(pendingValue ?? existingItem.quantity))}
                                  />
                                  {!hasPendingAddition ? (
                                    <button
                                      type="button"
                                      className={styles.existingCellActionButton}
                                      onClick={() =>
                                        handleOpenAddQuantityPopup({
                                          itemId: existingItem.id,
                                          baseQuantity: existingItem.quantity,
                                          available,
                                          categoryName: rowCategoryName,
                                          gradeLabel:
                                            gradeKey === SINGLE_GRADE_COLUMN_KEY
                                              ? selectedCustomerCategoryForRow?.grade ?? ''
                                              : gradeKey,
                                          pitamLabel: fieldsT.pitamStatusLabels[pitamKey] ?? pitamKey,
                                          ownerName: rowOwnerName,
                                        })
                                      }
                                      aria-label={fieldsT.addExistingItemQuantityLabel}
                                      title={fieldsT.addExistingItemQuantityLabel}
                                    >
                                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round">
                                        <path d="M12 5v14M5 12h14" />
                                      </svg>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      className={styles.existingCellActionButton}
                                      onClick={() => handleRevertCellEdit(existingItem.id)}
                                      aria-label={fieldsT.cancelExistingItemEditLabel}
                                      title={fieldsT.cancelExistingItemEditLabel}
                                    >
                                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round">
                                        <path d="M6 6l12 12M18 6l-12 12" />
                                      </svg>
                                    </button>
                                  )}
                                </div>
                                {pitamSplitButton}
                              </td>
                            );
                          }

                          const enteredRaw = draft.quantities[pitamKey][gradeKey] ?? '';
                          const enteredQuantity = Number(enteredRaw);
                          const exceedsAvailable =
                            enteredRaw.trim() !== '' && Number.isFinite(enteredQuantity) && enteredQuantity > available;

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
                                title={
                                  exceedsAvailable
                                    ? fieldsT.cellQuantityExceedsAvailableHint(available)
                                    : isLockedByFullBox
                                      ? (boxCapacityMessage ?? undefined)
                                      : isEnabled
                                        ? fieldsT.availableQuantityHint(available)
                                        : undefined
                                }
                                style={exceedsAvailable ? { borderColor: '#dc2626' } : undefined}
                              />
                              {exceedsAvailable ? (
                                <span style={{ color: '#dc2626', fontSize: '0.75rem', display: 'block' }}>
                                  {fieldsT.cellQuantityExceedsAvailableHint(available)}
                                </span>
                              ) : null}
                              {pitamSplitButton}
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
                  onClick={handleAddRowClick}
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

            {index === rows.length - 1 && didTryAddRow && !canAddRow ? (
              <p className="seasons-manager__error" style={{ margin: '0.5rem 0 0' }}>{rowsT.addRowDisabledHint}</p>
            ) : null}
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

      {addQuantityCell
        ? createPortal(
            <div className="modal-overlay" onClick={handleCloseAddQuantityPopup}>
              <div
                className={`modal-dialog modal-dialog--form ${styles.addQuantityDialog}`}
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  className="modal-close"
                  type="button"
                  aria-label={fieldsT.cancel}
                  onClick={handleCloseAddQuantityPopup}
                >
                  ✕
                </button>

                <h3 className="modal-title">{fieldsT.addExistingItemQuantityPopupTitle}</h3>

                <p className="modal-message">
                  {fieldsT.addExistingItemQuantityPopupPrefix} <strong>{addQuantityCell.categoryName}</strong>
                  {addQuantityCell.gradeLabel ? (
                    <>
                      {' '}
                      {fieldsT.addExistingItemQuantityPopupGradeWord} <strong>{addQuantityCell.gradeLabel}</strong>
                    </>
                  ) : null}
                  {' '}
                  <strong>{addQuantityCell.pitamLabel}</strong>
                  {addQuantityCell.ownerName ? (
                    <>
                      {' '}
                      {fieldsT.addExistingItemQuantityPopupOwnerWord} <strong>{addQuantityCell.ownerName}</strong>
                    </>
                  ) : null}
                  : <strong>{addQuantityCell.baseQuantity}</strong>.
                  <br />
                  {fieldsT.addExistingItemQuantityPopupInstruction}
                </p>

                <div className={styles.addQuantityModeToggle}>
                  <button
                    type="button"
                    className={`btn ${addQuantityMode === 'add' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => {
                      setAddQuantityMode('add');
                      setAddQuantityError('');
                    }}
                  >
                    {fieldsT.existingItemQuantityAddModeLabel}
                  </button>
                  <button
                    type="button"
                    className={`btn ${addQuantityMode === 'subtract' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => {
                      setAddQuantityMode('subtract');
                      setAddQuantityError('');
                    }}
                  >
                    {fieldsT.existingItemQuantitySubtractModeLabel}
                  </button>
                </div>

                {addQuantityMode === 'add' ? (
                  <p className="modal-message">
                    {fieldsT.addExistingItemQuantityAvailableHint(addQuantityCell.available)}
                  </p>
                ) : (
                  <p className="modal-message">{fieldsT.subtractExistingItemQuantityToZeroHint}</p>
                )}

                <div className={styles.addQuantityInputRow}>
                  <input
                    className="seasons-manager__year-input"
                    type="number"
                    min="0"
                    max={addQuantityMode === 'add' ? addQuantityCell.available : addQuantityCell.baseQuantity}
                    autoFocus
                    value={addQuantityValue}
                    onChange={(event) => {
                      setAddQuantityValue(event.target.value);
                      setAddQuantityError('');
                    }}
                    placeholder={fieldsT.quantityPlaceholder}
                    aria-label={fieldsT.addExistingItemQuantityPopupTitle}
                  />
                </div>
                {addQuantityError ? <p className="seasons-manager__error">{addQuantityError}</p> : null}

                <div className="modal-actions">
                  <button className="btn btn-danger" type="button" onClick={handleCloseAddQuantityPopup}>
                    {fieldsT.cancel}
                  </button>
                  <SubmitButton
                    className="btn btn-success"
                    onClick={handleConfirmAddQuantity}
                    isLoading={false}
                    loadingText={
                      addQuantityMode === 'subtract'
                        ? fieldsT.subtractExistingItemQuantityConfirmLabel
                        : fieldsT.addExistingItemQuantityConfirmLabel
                    }
                  >
                    {addQuantityMode === 'subtract'
                      ? fieldsT.subtractExistingItemQuantityConfirmLabel
                      : fieldsT.addExistingItemQuantityConfirmLabel}
                  </SubmitButton>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {pitamSplitCell
        ? createPortal(
            <div className="modal-overlay" onClick={handleClosePitamSplitPopup}>
              <div
                className={`modal-dialog modal-dialog--form ${styles.addQuantityDialog}`}
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  className="modal-close"
                  type="button"
                  aria-label={fieldsT.cancel}
                  onClick={handleClosePitamSplitPopup}
                >
                  ✕
                </button>

                <h3 className="modal-title">{fieldsT.pitamSplitPopupTitle}</h3>
                <p className="modal-message">{fieldsT.pitamSplitAvailableLabel(pitamSplitCell.mixedAvailable)}</p>

                <div className={styles.addQuantityInputRow}>
                  <div className={styles.field}>
                    <label className={styles.label}>{fieldsT.pitamSplitWithLabel}</label>
                    <input
                      className="seasons-manager__year-input"
                      type="number"
                      min="0"
                      max={pitamSplitCell.mixedAvailable}
                      autoFocus
                      value={pitamSplitWithValue}
                      onChange={(event) => {
                        setPitamSplitWithValue(event.target.value);
                        validatePitamSplitAmounts(event.target.value, pitamSplitWithoutValue);
                      }}
                      aria-label={fieldsT.pitamSplitWithLabel}
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>{fieldsT.pitamSplitWithoutLabel}</label>
                    <input
                      className="seasons-manager__year-input"
                      type="number"
                      min="0"
                      max={pitamSplitCell.mixedAvailable}
                      value={pitamSplitWithoutValue}
                      onChange={(event) => {
                        setPitamSplitWithoutValue(event.target.value);
                        validatePitamSplitAmounts(pitamSplitWithValue, event.target.value);
                      }}
                      aria-label={fieldsT.pitamSplitWithoutLabel}
                    />
                  </div>
                </div>
                {pitamSplitError ? <p className="seasons-manager__error">{pitamSplitError}</p> : null}

                <div className="modal-actions">
                  <button className="btn btn-danger" type="button" onClick={handleClosePitamSplitPopup} disabled={pitamSplitSubmitting}>
                    {fieldsT.cancel}
                  </button>
                  <SubmitButton
                    className="btn btn-success"
                    onClick={handleConfirmPitamSplit}
                    isLoading={pitamSplitSubmitting}
                    loadingText={fieldsT.pitamSplitConfirmingLabel}
                  >
                    {fieldsT.pitamSplitConfirmLabel}
                  </SubmitButton>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

    </div>
  );
}
