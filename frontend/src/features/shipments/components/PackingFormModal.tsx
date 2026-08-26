import { useState } from 'react';
import { createPortal } from 'react-dom';
import { FaXmark } from 'react-icons/fa6';
import { SubmitButton } from '../../../components/ui/SubmitButton';
import { TopLoadingBar } from '../../../components/ui/TopLoadingBar';
import { CustomSelect } from '../../../components/ui/CustomSelect';
import type { BoxStatus } from '../../../services/boxesApi';
import type { ShipmentRecord } from '../../../services/shipmentsApi';
import type { Trader } from '../../../services/tradersApi';
import type { Customer } from '../../../services/customersApi';
import type { PackingBoxOption, PackingItemRowDraft, PackingItemRowView } from '../hooks/usePackingForm';
import type { StockSource } from '../hooks/useNewShipmentItemForm';
import type { PitamRowKey } from '../utils/packingItemMatrix.util';
import {
  fetchPitamSplitBatches,
  undoPitamSplitBatch,
  updatePitamSplitBatch,
  type PitamSplitBatch,
} from '../../../services/inventoryMovementsApi';
import { ApiError } from '../../../services/apiClient';
import { getActiveSeason } from '../../../services/seasonsApi';
import { getTraderCategoriesWithShares, type TraderCategoryWithShares } from '../../../services/traderCategoriesApi';
import { PitamSplitUndoBatchPicker } from '../../traders/components/PitamSplitUndoBatchPicker';
import { PackingItemRowsSection } from './PackingItemRowsSection';
import { BoxNumberTypeahead } from './BoxNumberTypeahead';
import gridStyles from './styles/NewShipmentItemFormModal.module.css';

const infoStyle: React.CSSProperties = {
  width: 240,
  maxWidth: '100%',
  minHeight: 42,
  padding: '0.4rem 0.6rem',
  background: 'var(--color-bg-subtle, #f5f5f5)',
  borderRadius: 4,
  fontSize: '0.9rem',
  display: 'flex',
  alignItems: 'center',
};

type BoxType = 'SMALL' | 'MEDIUM' | 'LARGE' | 'CUSTOM';
type BoxOwnership = 'GENERAL' | 'TRADER' | 'CUSTOMER' | 'SHARED' | 'CUSTOM' | 'EXTERNAL_TRADER';

type PackingFormModalText = {
  title: string;
  boxNumberLabel: string;
  boxNumberPlaceholder: string;
  loadingBoxes: string;
  noBoxSelectedHint: string;
  loadingBoxDetailsHint: string;
  noBoxMatchesHint: string;
  editBoxNumberLabel: string;
  editBoxNumberPlaceholder: string;
  addItemDisabledHint: string;
  boxFullHint: string;
  boxOverCapacityHint: (entered: number, remaining: number) => string;
  shipmentLabel: string;
  shipmentPlaceholder: string;
  statusLabel: string;
  boxTypeLabel: string;
  boxTypePlaceholder: string;
  ownershipTypeLabel: string;
  ownershipTypePlaceholder: string;
  ownershipLockedHint: string;
  shipmentFrozenHint: string;
  traderLabel: string;
  traderPlaceholder: string;
  customerLabel: string;
  customerPlaceholder: string;
  ownerNameLabel: string;
  ownerNamePlaceholder: string;
  addItemDisabledExternalTraderHint: string;
  notesLabel: string;
  notesPlaceholder: string;
  save: string;
  saving: string;
  cancel: string;
  statusOptions: Record<BoxStatus, string>;
  boxTypeOptions: Record<BoxType, string>;
  ownershipTypeOptions: Record<BoxOwnership, string>;
  itemRows: {
    title: string;
    addRow: string;
    removeRow: string;
    rowPrefix: (index: number) => string;
    emptyHint: string;
    addRowDisabledHint: string;
    totalPackedQuantityLabel: string;
  };
  pendingRemovedItemRowsTitle: string;
  pendingRemovedItemRowsHint: string;
  restorePendingRemovedItemRow: string;
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
  boxCurrentQuantityLabel: string;
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
  remainingCapacityHint: (n: number) => string;
  notesLabel: string;
  notesPlaceholder: string;
  loadingInventory: string;
  ownershipLabels: Record<string, string>;
  pitamStatusLabels: Record<string, string>;
  boxOwnershipLabels: Record<string, string>;
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
  pitamSplitManageTriggerButtonLabel: string;
  pitamSplitManagePopupTitle: string;
  pitamSplitManageLoadingLabel: string;
  pitamSplitManageNoBatchesLabel: string;
  pitamSplitManageGenericError: string;
  pitamSplitManageSelectPlaceholder: string;
  pitamSplitManageSourceLabels: Record<'SPECIFIC_TRADER' | 'MODULO' | 'GENERAL', string>;
  pitamSplitManageUpdateLabel: string;
  pitamSplitManageCancelSplitLabel: string;
  pitamSplitManageCancelingLabel: string;
  pitamSplitManageSaveLabel: string;
  pitamSplitManageSavingLabel: string;
  pitamSplitManageDiscardEditLabel: string;
  pitamSplitManageCloseLabel: string;
  pitamSplitManageAvailableToCancelLabel: string;
  pitamSplitManageFullyPackedLabel: string;
};

type PackingFormModalProps = {
  isOpen: boolean;
  lang: 'he' | 'en';
  t: PackingFormModalText;
  itemFieldsT: PackingItemFieldsText;
  boxOptions: PackingBoxOption[];
  isLoadingBoxOptions: boolean;
  selectedBoxId: string;
  onSelectedBoxIdChange: (v: string) => void;
  shipments: ShipmentRecord[];
  traders: Trader[];
  customers: Customer[];
  isLoadingOptions: boolean;
  hasItems: boolean;
  boxTotalQuantity: number;
  selectedShipmentId: string;
  onShipmentIdChange: (v: string) => void;
  boxNumber: string;
  onBoxNumberChange: (v: string) => void;
  status: BoxStatus;
  onStatusChange: (v: BoxStatus) => void;
  boxType: string;
  onBoxTypeChange: (v: string) => void;
  ownershipType: string;
  onOwnershipTypeChange: (v: string) => void;
  traderId: string;
  onTraderIdChange: (v: string) => void;
  customerId: string;
  onCustomerIdChange: (v: string) => void;
  externalOwnerName: string;
  onExternalOwnerNameChange: (v: string) => void;
  notes: string;
  onNotesChange: (v: string) => void;
  isShipped: boolean;
  isShipmentFrozen: boolean;
  isChangingShipment: boolean;

  itemRowsView: PackingItemRowView[];
  isLoadingRowInventory: boolean;
  isBoxFull: boolean;
  isBoxOverCapacity: boolean;
  draftQuantityTotal: number;
  totalPackedQuantity: number;
  boxRemainingCapacity: number | null;
  boxCapacity: number | null;
  onAddItemRow: () => void;
  onRemoveItemRow: (id: string) => void;
  onUpdateItemRow: (id: string, updater: Partial<PackingItemRowDraft>) => void;
  onUpdateItemRowQuantity: (id: string, pitamKey: PitamRowKey, gradeKey: string, value: string) => void;
  pendingExistingItemEdits: Record<number, string>;
  onStageExistingItemEdit: (itemId: number, value: string | null) => void;
  removedItemGroups: { ids: number[]; label: string }[];
  onRestoreItemGroup: (ids: number[]) => void;
  onInvalidateTraderInventory: (traderId: number, stockSource: StockSource | '') => void;
  onInvalidateAllTraderInventory: () => void;

  isSubmitting: boolean;
  error: string | null;
  onSave: () => void;
  onClose: () => void;
};

const BOX_STATUSES_SHIPPED_ONLY: BoxStatus[] = ['SHIPPED', 'DELIVERED'];
const BOX_TYPES: BoxType[] = ['SMALL', 'MEDIUM', 'LARGE', 'CUSTOM'];
const OWNERSHIP_TYPES: BoxOwnership[] = ['GENERAL', 'TRADER', 'CUSTOMER', 'SHARED', 'EXTERNAL_TRADER'];
const BOX_TYPE_SHORT: Record<string, string> = { SMALL: 'S', MEDIUM: 'M', LARGE: 'L', CUSTOM: 'C' };

export function PackingFormModal({
  isOpen,
  lang,
  t,
  itemFieldsT,
  boxOptions,
  isLoadingBoxOptions,
  selectedBoxId,
  onSelectedBoxIdChange,
  shipments,
  traders,
  customers,
  isLoadingOptions,
  hasItems,
  boxTotalQuantity,
  selectedShipmentId,
  onShipmentIdChange,
  boxNumber,
  onBoxNumberChange,
  status,
  onStatusChange,
  boxType,
  onBoxTypeChange,
  ownershipType,
  onOwnershipTypeChange,
  traderId,
  onTraderIdChange,
  customerId,
  onCustomerIdChange,
  externalOwnerName,
  onExternalOwnerNameChange,
  notes,
  onNotesChange,
  isShipped,
  isShipmentFrozen,
  isChangingShipment,
  itemRowsView,
  isLoadingRowInventory,
  isBoxFull,
  isBoxOverCapacity,
  draftQuantityTotal,
  totalPackedQuantity,
  boxRemainingCapacity,
  boxCapacity,
  onAddItemRow,
  onRemoveItemRow,
  onUpdateItemRow,
  onUpdateItemRowQuantity,
  pendingExistingItemEdits,
  onStageExistingItemEdit,
  removedItemGroups,
  onRestoreItemGroup,
  onInvalidateTraderInventory,
  onInvalidateAllTraderInventory,
  isSubmitting,
  error,
  onSave,
  onClose,
}: PackingFormModalProps): JSX.Element | null {
  // Global "manage classified mixed stock" popup — lets the user pick any existing PITAM_SPLIT
  // batch for the active season and either update its with/without split or cancel it outright,
  // mirroring the batch picker used on the trader movements screen. Declared above the `isOpen`
  // early return so hook order stays stable regardless of whether the modal is shown.
  const [isManagePopupOpen, setIsManagePopupOpen] = useState(false);
  const [manageBatches, setManageBatches] = useState<PitamSplitBatch[]>([]);
  const [manageLoading, setManageLoading] = useState(false);
  const [manageError, setManageError] = useState('');
  const [manageTraderCategories, setManageTraderCategories] = useState<TraderCategoryWithShares[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [manageMode, setManageMode] = useState<'select' | 'edit'>('select');
  const [manageActionSubmitting, setManageActionSubmitting] = useState(false);
  const [manageEditWithValue, setManageEditWithValue] = useState('');
  const [manageEditWithoutValue, setManageEditWithoutValue] = useState('');
  const [manageEditError, setManageEditError] = useState('');

  const selectedManageBatch = manageBatches.find((batch) => batch.batchId === selectedBatchId) ?? null;

  const loadManageBatches = async () => {
    setManageLoading(true);
    setManageError('');
    try {
      const [batches, activeSeason] = await Promise.all([
        fetchPitamSplitBatches({}),
        manageTraderCategories.length === 0 ? getActiveSeason() : Promise.resolve(null),
      ]);
      setManageBatches(batches);
      if (activeSeason) {
        const categories = await getTraderCategoriesWithShares(activeSeason.id);
        setManageTraderCategories(categories);
      }
    } catch (loadError) {
      setManageError(loadError instanceof ApiError ? loadError.message : itemFieldsT.pitamSplitManageGenericError);
    } finally {
      setManageLoading(false);
    }
  };

  const handleOpenManagePopup = () => {
    setIsManagePopupOpen(true);
    setManageMode('select');
    setSelectedBatchId('');
    setManageError('');
    setManageEditWithValue('');
    setManageEditWithoutValue('');
    setManageEditError('');
    void loadManageBatches();
  };

  const handleCloseManagePopup = () => {
    setIsManagePopupOpen(false);
    setManageBatches([]);
    setSelectedBatchId('');
    setManageMode('select');
    setManageError('');
    setManageEditWithValue('');
    setManageEditWithoutValue('');
    setManageEditError('');
  };

  const invalidateForManageBatch = (batch: PitamSplitBatch) => {
    if (batch.traderId !== null) {
      onInvalidateTraderInventory(batch.traderId, '');
    } else {
      onInvalidateAllTraderInventory();
    }
  };

  const handleStartEditSelectedBatch = () => {
    if (!selectedManageBatch) return;
    setManageEditWithValue(String(selectedManageBatch.withQty));
    setManageEditWithoutValue(String(selectedManageBatch.withoutQty));
    setManageEditError('');
    setManageMode('edit');
  };

  const handleDiscardEditSelectedBatch = () => {
    setManageMode('select');
    setManageEditWithValue('');
    setManageEditWithoutValue('');
    setManageEditError('');
  };

  const handleConfirmEditSelectedBatch = async () => {
    if (!selectedManageBatch) return;

    const withQty = Number(manageEditWithValue || 0);
    const withoutQty = Number(manageEditWithoutValue || 0);
    if (
      Number.isNaN(withQty) || Number.isNaN(withoutQty) ||
      withQty < 0 || withoutQty < 0 || withQty + withoutQty <= 0
    ) {
      setManageEditError(itemFieldsT.pitamSplitInvalidError);
      return;
    }

    try {
      setManageActionSubmitting(true);
      await updatePitamSplitBatch(selectedManageBatch.batchId, {
        source: selectedManageBatch.source,
        traderId: selectedManageBatch.traderId ?? undefined,
        traderCategoryId: selectedManageBatch.traderCategoryId,
        grade: selectedManageBatch.grade,
        withQty,
        withoutQty,
      });
      invalidateForManageBatch(selectedManageBatch);
      handleCloseManagePopup();
    } catch (updateError) {
      setManageEditError(updateError instanceof ApiError ? updateError.message : itemFieldsT.pitamSplitGenericError);
    } finally {
      setManageActionSubmitting(false);
    }
  };

  const handleCancelSelectedBatch = async () => {
    if (!selectedManageBatch) return;
    setManageError('');
    try {
      setManageActionSubmitting(true);
      await undoPitamSplitBatch(selectedManageBatch.batchId);
      invalidateForManageBatch(selectedManageBatch);
      handleCloseManagePopup();
    } catch (cancelError) {
      setManageError(cancelError instanceof ApiError ? cancelError.message : itemFieldsT.pitamSplitManageGenericError);
    } finally {
      setManageActionSubmitting(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  const isBoxSelected = selectedBoxId !== '';
  const isFieldsDisabled = !isBoxSelected || isLoadingOptions;
  const isBoxOpen = status === 'OPEN';
  const boxCapacityMessage = isBoxOverCapacity
    ? t.boxOverCapacityHint(totalPackedQuantity - boxTotalQuantity, Math.max(0, (boxCapacity ?? 0) - boxTotalQuantity))
    : isBoxFull
      ? t.boxFullHint
      : null;
  const remainingCapacityMessage = !isBoxFull && boxRemainingCapacity !== null
    ? itemFieldsT.remainingCapacityHint(boxRemainingCapacity - draftQuantityTotal)
    : null;

  const formatBoxOptionLabel = (box: PackingBoxOption) => `${box.boxNumber} - ${
    box.traderName ?? box.customerName ?? itemFieldsT.boxOwnershipLabels[box.ownershipType] ?? box.ownershipType
  } (${BOX_TYPE_SHORT[box.boxType] ?? box.boxType})`;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog modal-dialog--form" style={{ minWidth: 'min(760px, 92vw)' }} onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" type="button" aria-label={t.cancel} onClick={onClose}>
          <FaXmark />
        </button>

        <h3 className="modal-title" style={{ position: 'relative' }}>
          {t.title}
          <TopLoadingBar isLoading={isLoadingBoxOptions || isLoadingOptions} />
        </h3>

        <div className={gridStyles.topRow}>
          <div className={gridStyles.field}>
            <label className={gridStyles.label}>{t.boxNumberLabel}</label>
            <BoxNumberTypeahead
              options={boxOptions}
              formatOptionLabel={formatBoxOptionLabel}
              shipmentGroupLabel={(shipmentNumber) => `${t.shipmentLabel} ${shipmentNumber}`}
              value={selectedBoxId}
              onChange={onSelectedBoxIdChange}
              placeholder={t.boxNumberPlaceholder}
              loadingLabel={t.loadingBoxes}
              noMatchesLabel={t.noBoxMatchesHint}
              isLoading={isLoadingBoxOptions}
            />
          </div>

          <div className={gridStyles.field}>
            <label className={gridStyles.label}>{t.shipmentLabel}</label>
            <CustomSelect
              className="seasons-manager__year-input"
              value={selectedShipmentId}
              onChange={(v) => onShipmentIdChange(v)}
              disabled={isFieldsDisabled}
              placeholder={t.shipmentPlaceholder}
              options={shipments.map((s) => ({ value: String(s.id), label: String(s.shipmentNumber) }))}
            />
          </div>

          <div className={gridStyles.field}>
            <label className={gridStyles.label}>{t.editBoxNumberLabel}</label>
            <input
              className="seasons-manager__year-input"
              type="number"
              min={1}
              step={1}
              value={boxNumber}
              onChange={(e) => onBoxNumberChange(e.target.value)}
              onWheel={(e) => e.currentTarget.blur()}
              placeholder={t.editBoxNumberPlaceholder}
              disabled
              readOnly
            />
          </div>

          {isShipmentFrozen ? (
            <p className="seasons-manager__hint" style={{ gridColumn: '1 / -1', margin: 0 }}>
              {t.shipmentFrozenHint}
            </p>
          ) : null}

          {!isChangingShipment ? (
            <div className={gridStyles.field}>
              <label className={gridStyles.label}>{t.statusLabel}</label>
              <CustomSelect
                className="seasons-manager__year-input"
                value={status}
                onChange={(v) => onStatusChange(v as BoxStatus)}
                disabled={isFieldsDisabled}
                options={(status === 'SHIPPED' || status === 'DELIVERED' ? BOX_STATUSES_SHIPPED_ONLY : ['OPEN', 'CLOSED'] as BoxStatus[]).map((s) => ({
                  value: s,
                  label: t.statusOptions[s],
                }))}
              />
            </div>
          ) : null}

          {!isShipped ? (
            <>
              {ownershipType !== 'EXTERNAL_TRADER' ? (
                <div className={gridStyles.field}>
                  <label className={gridStyles.label}>{t.boxTypeLabel}</label>
                  <CustomSelect
                    className="seasons-manager__year-input"
                    value={boxType}
                    onChange={(v) => onBoxTypeChange(v)}
                    disabled={isFieldsDisabled}
                    placeholder={t.boxTypePlaceholder}
                    options={BOX_TYPES.map((type) => ({ value: type, label: t.boxTypeOptions[type] }))}
                  />
                </div>
              ) : null}

              <div className={gridStyles.field}>
                <label className={gridStyles.label}>{itemFieldsT.boxCurrentQuantityLabel}</label>
                <div style={infoStyle}>{boxTotalQuantity}</div>
              </div>

              <p
                className="seasons-manager__hint"
                style={{
                  gridColumn: '1 / -1',
                  visibility: !isLoadingOptions && hasItems ? 'visible' : 'hidden',
                  margin: 0,
                }}
              >
                {t.ownershipLockedHint}
              </p>

              <div className={gridStyles.field}>
                <label className={gridStyles.label}>{t.ownershipTypeLabel}</label>
                {hasItems ? (
                  <div style={infoStyle}>
                    {t.ownershipTypeOptions[ownershipType as BoxOwnership] || ownershipType || '—'}
                  </div>
                ) : (
                  <CustomSelect
                    className="seasons-manager__year-input"
                    value={ownershipType}
                    onChange={(v) => onOwnershipTypeChange(v)}
                    disabled={isFieldsDisabled}
                    placeholder={t.ownershipTypePlaceholder}
                    options={OWNERSHIP_TYPES.map((type) => ({ value: type, label: t.ownershipTypeOptions[type] }))}
                  />
                )}
              </div>

              {ownershipType === 'TRADER' ? (
                <div className={gridStyles.field}>
                  <label className={gridStyles.label}>{t.traderLabel}</label>
                  {hasItems ? (
                    <div style={infoStyle}>
                      {traders.find((tr) => String(tr.id) === traderId)?.name || traderId || '—'}
                    </div>
                  ) : (
                    <CustomSelect
                      className="seasons-manager__year-input"
                      value={traderId}
                      onChange={(v) => onTraderIdChange(v)}
                      disabled={isFieldsDisabled}
                      placeholder={t.traderPlaceholder}
                      options={traders.map((trader) => ({ value: String(trader.id), label: trader.name }))}
                    />
                  )}
                </div>
              ) : null}

              {ownershipType === 'CUSTOMER' ? (
                <div className={gridStyles.field}>
                  <label className={gridStyles.label}>{t.customerLabel}</label>
                  {hasItems ? (
                    <div style={infoStyle}>
                      {customers.find((c) => String(c.id) === customerId)?.customerName || customerId || '—'}
                    </div>
                  ) : (
                    <CustomSelect
                      className="seasons-manager__year-input"
                      value={customerId}
                      onChange={(v) => onCustomerIdChange(v)}
                      disabled={isFieldsDisabled}
                      placeholder={t.customerPlaceholder}
                      options={customers.map((customer) => ({ value: String(customer.id), label: customer.customerName }))}
                    />
                  )}
                </div>
              ) : null}

              {ownershipType === 'EXTERNAL_TRADER' ? (
                <div className={gridStyles.field}>
                  <label className={gridStyles.label}>{t.ownerNameLabel}</label>
                  {hasItems ? (
                    <div style={infoStyle}>{externalOwnerName || '—'}</div>
                  ) : (
                    <input
                      className="seasons-manager__year-input"
                      type="text"
                      value={externalOwnerName}
                      onChange={(e) => onExternalOwnerNameChange(e.target.value)}
                      placeholder={t.ownerNamePlaceholder}
                      disabled={isFieldsDisabled}
                    />
                  )}
                </div>
              ) : null}
            </>
          ) : null}

          <div className={`${gridStyles.field} ${gridStyles.fieldFull}`}>
            <label className={gridStyles.label}>{t.notesLabel}</label>
            <textarea
              className={`seasons-manager__year-input ${gridStyles.textarea}`}
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = 'auto';
                el.style.height = `${el.scrollHeight}px`;
              }}
              placeholder={t.notesPlaceholder}
              rows={1}
              disabled={isFieldsDisabled}
            />
          </div>
        </div>

        {!isBoxSelected ? (
          <p className="seasons-manager__hint" style={{ margin: 0 }}>{t.noBoxSelectedHint}</p>
        ) : null}

        {isBoxSelected ? (
          <div className={gridStyles.rowsSection}>
            {isLoadingOptions ? (
              <p className="seasons-manager__hint" style={{ margin: 0 }}>{t.loadingBoxDetailsHint}</p>
            ) : null}

            {!isLoadingOptions ? (
              <PackingItemRowsSection
                rowsT={t.itemRows}
                fieldsT={itemFieldsT}
                boxOwnershipType={ownershipType}
                boxTraderId={traderId}
                boxCustomerId={customerId}
                rows={itemRowsView}
                traders={traders}
                customers={customers}
                isLoadingInventory={isLoadingRowInventory}
                isBoxOpen={isBoxOpen && ownershipType !== 'EXTERNAL_TRADER'}
                isBoxFull={isBoxFull}
                boxCapacityMessage={boxCapacityMessage}
                remainingCapacityMessage={remainingCapacityMessage}
                addItemDisabledHint={ownershipType === 'EXTERNAL_TRADER' ? t.addItemDisabledExternalTraderHint : t.addItemDisabledHint}
                totalPackedQuantity={totalPackedQuantity}
                pendingExistingItemEdits={pendingExistingItemEdits}
                onAddRow={onAddItemRow}
                onRemoveRow={onRemoveItemRow}
                onUpdateRow={onUpdateItemRow}
                onUpdateRowQuantity={onUpdateItemRowQuantity}
                onStageExistingItemEdit={onStageExistingItemEdit}
                onInvalidateTraderInventory={onInvalidateTraderInventory}
                onInvalidateAllTraderInventory={onInvalidateAllTraderInventory}
              />
            ) : null}
          </div>
        ) : null}

        {isBoxSelected && removedItemGroups.length ? (
          <div style={{ marginTop: '1rem' }}>
            <h4 style={{ margin: '0 0 0.25rem' }}>{t.pendingRemovedItemRowsTitle}</h4>
            <p className={gridStyles.quantityMatrixHint}>{t.pendingRemovedItemRowsHint}</p>
            {removedItemGroups.map((group) => (
              <div
                key={group.ids.join('-')}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0' }}
              >
                <span>{group.label}</span>
                <button type="button" className="btn btn-secondary" onClick={() => onRestoreItemGroup(group.ids)}>
                  {t.restorePendingRemovedItemRow}
                </button>
              </div>
            ))}
          </div>
        ) : null}

        {error ? <p className="seasons-manager__error">{error}</p> : null}

        <div className="modal-actions">
          <button
            className="btn btn-primary"
            type="button"
            onClick={handleOpenManagePopup}
            style={{ marginInlineEnd: 'auto' }}
          >
            {itemFieldsT.pitamSplitManageTriggerButtonLabel}
          </button>
          <button className="btn btn-danger" type="button" onClick={onClose}>
            {t.cancel}
          </button>
          <SubmitButton
            className="btn btn-success"
            onClick={onSave}
            disabled={isLoadingOptions || !isBoxSelected || isBoxOverCapacity}
            isLoading={isSubmitting}
            loadingText={t.saving}
          >
            {t.save}
          </SubmitButton>
        </div>
      </div>

      {isManagePopupOpen
        ? createPortal(
            <div className="modal-overlay" onClick={handleCloseManagePopup}>
              <div
                className={`modal-dialog modal-dialog--form ${gridStyles.manageDialog}`}
                style={{ width: 'min(600px, 94vw)', minHeight: '420px' }}
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  className="modal-close"
                  type="button"
                  aria-label={itemFieldsT.pitamSplitManageCloseLabel}
                  onClick={handleCloseManagePopup}
                >
                  ✕
                </button>

                <h3 className="modal-title" style={{ position: 'relative' }}>
                  {itemFieldsT.pitamSplitManagePopupTitle}
                  <TopLoadingBar isLoading={manageLoading} />
                </h3>

                <div className={gridStyles.addQuantityInputRow} style={{ width: '100%' }}>
                  <div className={`${gridStyles.field} ${gridStyles.fieldFull}`} style={{ width: '100%', maxWidth: 'none' }}>
                    <PitamSplitUndoBatchPicker
                      lang={lang}
                      labels={{
                        pitamSplitUndoSourceLabels: itemFieldsT.pitamSplitManageSourceLabels,
                        pitamSplitUndoLoading: itemFieldsT.pitamSplitManageLoadingLabel,
                        pitamSplitUndoNoBatches: itemFieldsT.pitamSplitManageNoBatchesLabel,
                        pitamSplitUndoBatchPlaceholder: itemFieldsT.pitamSplitManageSelectPlaceholder,
                        pitamSplitWithLabel: itemFieldsT.pitamSplitWithLabel,
                        pitamSplitWithoutLabel: itemFieldsT.pitamSplitWithoutLabel,
                        availableToCancelLabel: itemFieldsT.pitamSplitManageAvailableToCancelLabel,
                        fullyPackedLabel: itemFieldsT.pitamSplitManageFullyPackedLabel,
                      }}
                      batches={manageBatches}
                      traderCategories={manageTraderCategories}
                      value={selectedBatchId}
                      onChange={(batchId) => {
                        setSelectedBatchId(batchId);
                        setManageMode('select');
                        setManageError('');
                      }}
                      isLoading={manageLoading}
                    />
                  </div>
                </div>

                {selectedManageBatch && manageMode === 'edit' ? (
                  <>
                    <div className={gridStyles.addQuantityInputRow}>
                      <div className={gridStyles.field}>
                        <label className={gridStyles.label}>{itemFieldsT.pitamSplitWithLabel}</label>
                        <input
                          className="seasons-manager__year-input"
                          type="number"
                          min="0"
                          autoFocus
                          value={manageEditWithValue}
                          onChange={(event) => {
                            setManageEditWithValue(event.target.value);
                            setManageEditError('');
                          }}
                          aria-label={itemFieldsT.pitamSplitWithLabel}
                        />
                      </div>
                      <div className={gridStyles.field}>
                        <label className={gridStyles.label}>{itemFieldsT.pitamSplitWithoutLabel}</label>
                        <input
                          className="seasons-manager__year-input"
                          type="number"
                          min="0"
                          value={manageEditWithoutValue}
                          onChange={(event) => {
                            setManageEditWithoutValue(event.target.value);
                            setManageEditError('');
                          }}
                          aria-label={itemFieldsT.pitamSplitWithoutLabel}
                        />
                      </div>
                    </div>
                    {manageEditError ? <p className="seasons-manager__error">{manageEditError}</p> : null}
                  </>
                ) : null}

                {manageError ? <p className="seasons-manager__error">{manageError}</p> : null}

                <div className="modal-actions" style={{ marginTop: 'auto' }}>
                  {selectedManageBatch && manageMode === 'select' ? (
                    <>
                      <button className="btn btn-success" type="button" onClick={handleStartEditSelectedBatch}>
                        {itemFieldsT.pitamSplitManageUpdateLabel}
                      </button>
                      <SubmitButton
                        className="btn btn-success"
                        onClick={handleCancelSelectedBatch}
                        isLoading={manageActionSubmitting}
                        loadingText={itemFieldsT.pitamSplitManageCancelingLabel}
                      >
                        {itemFieldsT.pitamSplitManageCancelSplitLabel}
                      </SubmitButton>
                    </>
                  ) : null}
                  {selectedManageBatch && manageMode === 'edit' ? (
                    <>
                      <button
                        className="btn btn-secondary"
                        type="button"
                        onClick={handleDiscardEditSelectedBatch}
                        disabled={manageActionSubmitting}
                      >
                        {itemFieldsT.pitamSplitManageDiscardEditLabel}
                      </button>
                      <SubmitButton
                        className="btn btn-success"
                        onClick={handleConfirmEditSelectedBatch}
                        isLoading={manageActionSubmitting}
                        loadingText={itemFieldsT.pitamSplitManageSavingLabel}
                      >
                        {itemFieldsT.pitamSplitManageSaveLabel}
                      </SubmitButton>
                    </>
                  ) : null}
                  <button className="btn btn-danger" type="button" onClick={handleCloseManagePopup}>
                    {itemFieldsT.pitamSplitManageCloseLabel}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
