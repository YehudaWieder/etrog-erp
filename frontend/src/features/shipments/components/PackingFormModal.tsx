import { FaXmark } from 'react-icons/fa6';
import { SubmitButton } from '../../../components/ui/SubmitButton';
import { TopLoadingBar } from '../../../components/ui/TopLoadingBar';
import type { BoxStatus } from '../../../services/boxesApi';
import type { ShipmentRecord } from '../../../services/shipmentsApi';
import type { Trader } from '../../../services/tradersApi';
import type { Customer } from '../../../services/customersApi';
import type { PackingBoxOption, PackingItemRowDraft, PackingItemRowView } from '../hooks/usePackingForm';
import type { StockSource } from '../hooks/useNewShipmentItemForm';
import type { PitamRowKey } from '../utils/packingItemMatrix.util';
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
type BoxOwnership = 'GENERAL' | 'TRADER' | 'CUSTOMER' | 'SHARED' | 'CUSTOM';

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
  pitamSplitGenericError: string;
};

type PackingFormModalProps = {
  isOpen: boolean;
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
  onInvalidateTraderInventory: (traderId: number, stockSource: StockSource | '') => void;
  onInvalidateAllTraderInventory: () => void;

  isSubmitting: boolean;
  error: string | null;
  onSave: () => void;
  onClose: () => void;
};

const BOX_STATUSES_SHIPPED_ONLY: BoxStatus[] = ['SHIPPED', 'DELIVERED'];
const BOX_TYPES: BoxType[] = ['SMALL', 'MEDIUM', 'LARGE', 'CUSTOM'];
const OWNERSHIP_TYPES: BoxOwnership[] = ['GENERAL', 'TRADER', 'CUSTOMER', 'SHARED', 'CUSTOM'];
const BOX_TYPE_SHORT: Record<string, string> = { SMALL: 'S', MEDIUM: 'M', LARGE: 'L', CUSTOM: 'C' };

export function PackingFormModal({
  isOpen,
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
  onInvalidateTraderInventory,
  onInvalidateAllTraderInventory,
  isSubmitting,
  error,
  onSave,
  onClose,
}: PackingFormModalProps): JSX.Element | null {
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
            <select
              className="seasons-manager__year-input"
              value={selectedShipmentId}
              onChange={(e) => onShipmentIdChange(e.target.value)}
              disabled={isFieldsDisabled}
            >
              <option value="">{t.shipmentPlaceholder}</option>
              {shipments.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {s.shipmentNumber}
                </option>
              ))}
            </select>
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
              disabled={isFieldsDisabled}
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
              <select
                className="seasons-manager__year-input"
                value={status}
                onChange={(e) => onStatusChange(e.target.value as BoxStatus)}
                disabled={isFieldsDisabled}
              >
                {(status === 'SHIPPED' || status === 'DELIVERED' ? BOX_STATUSES_SHIPPED_ONLY : ['OPEN', 'CLOSED'] as BoxStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {t.statusOptions[s]}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {!isShipped ? (
            <>
              <div className={gridStyles.field}>
                <label className={gridStyles.label}>{t.boxTypeLabel}</label>
                <select
                  className="seasons-manager__year-input"
                  value={boxType}
                  onChange={(e) => onBoxTypeChange(e.target.value)}
                  disabled={isFieldsDisabled}
                >
                  <option value="">{t.boxTypePlaceholder}</option>
                  {BOX_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {t.boxTypeOptions[type]}
                    </option>
                  ))}
                </select>
              </div>

              {hasItems ? (
                <div className={gridStyles.field}>
                  <label className={gridStyles.label}>{itemFieldsT.boxCurrentQuantityLabel}</label>
                  <div style={infoStyle}>{boxTotalQuantity}</div>
                </div>
              ) : null}

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
                  <select
                    className="seasons-manager__year-input"
                    value={ownershipType}
                    onChange={(e) => onOwnershipTypeChange(e.target.value)}
                    disabled={isFieldsDisabled}
                  >
                    <option value="">{t.ownershipTypePlaceholder}</option>
                    {OWNERSHIP_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {t.ownershipTypeOptions[type]}
                      </option>
                    ))}
                  </select>
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
                    <select
                      className="seasons-manager__year-input"
                      value={traderId}
                      onChange={(e) => onTraderIdChange(e.target.value)}
                      disabled={isFieldsDisabled}
                    >
                      <option value="">{t.traderPlaceholder}</option>
                      {traders.map((trader) => (
                        <option key={trader.id} value={String(trader.id)}>
                          {trader.name}
                        </option>
                      ))}
                    </select>
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
                    <select
                      className="seasons-manager__year-input"
                      value={customerId}
                      onChange={(e) => onCustomerIdChange(e.target.value)}
                      disabled={isFieldsDisabled}
                    >
                      <option value="">{t.customerPlaceholder}</option>
                      {customers.map((customer) => (
                        <option key={customer.id} value={String(customer.id)}>
                          {customer.customerName}
                        </option>
                      ))}
                    </select>
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

        {isBoxSelected && isLoadingOptions ? (
          <p className="seasons-manager__hint" style={{ margin: 0 }}>{t.loadingBoxDetailsHint}</p>
        ) : null}

        {isBoxSelected && !isShipped && !isLoadingOptions ? (
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
            isBoxOpen={isBoxOpen}
            isBoxFull={isBoxFull}
            boxCapacityMessage={boxCapacityMessage}
            remainingCapacityMessage={remainingCapacityMessage}
            addItemDisabledHint={t.addItemDisabledHint}
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

        {error ? <p className="seasons-manager__error">{error}</p> : null}

        <div className="modal-actions">
          <button className="btn btn-danger" type="button" onClick={onClose}>
            {t.cancel}
          </button>
          <SubmitButton
            className="btn btn-success"
            onClick={onSave}
            disabled={isLoadingOptions || !isBoxSelected}
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
