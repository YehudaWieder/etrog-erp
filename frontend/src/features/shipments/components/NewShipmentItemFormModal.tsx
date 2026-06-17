import { FaXmark } from 'react-icons/fa6';
import type { OpenBoxRecord } from '../../../services/boxesApi';
import type { StockSource } from '../hooks/useNewShipmentItemForm';
import styles from './styles/NewShipmentItemFormModal.module.css';

type NewShipmentItemFormModalText = {
  title: string;
  description: string;
  stockSourceLabel: string;
  stockSourceLabels: { GENERAL: string; PRIVATE_SELECTION: string };
  boxLabel: string;
  boxPlaceholder: string;
  shipmentLabel: string;
  boxTypeLabel: string;
  boxCurrentQuantityLabel: string;
  boxOwnershipLabel: string;
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
  remainingCapacityHint: (n: number) => string;
  notesLabel: string;
  notesPlaceholder: string;
  save: string;
  cancel: string;
  ownershipLabels: Record<string, string>;
  pitamStatusLabels: Record<string, string>;
  boxOwnershipLabels: Record<string, string>;
  loadingInventory: string;
};

type NewShipmentItemFormModalProps = {
  isOpen: boolean;
  t: NewShipmentItemFormModalText;

  openBoxes: OpenBoxRecord[];
  availableTradersFromInventory: Array<{ id: number; name: string }>;
  availableCustomersFromInventory: Array<{ id: number; name: string }>;
  availableTraderCategories: Array<{ id: number; name: string }>;
  availableCustomerCategories: Array<{ id: number; name: string; grade: string | null }>;
  availableGrades: string[];
  availablePitamStatuses: string[];
  availableQuantity: number | null;
  remainingCapacity: number | null;
  isLoadingOptions: boolean;
  isLoadingInventory: boolean;

  selectedBoxId: string;
  onBoxIdChange: (v: string) => void;
  selectedBox: OpenBoxRecord | null;

  itemOwnership: string;
  onItemOwnershipChange: (v: string) => void;

  stockSource: StockSource;
  onStockSourceChange: (v: StockSource) => void;

  traderId: string;
  onTraderIdChange: (v: string) => void;

  customerId: string;
  onCustomerIdChange: (v: string) => void;

  traderCategoryId: string;
  onTraderCategoryIdChange: (v: string) => void;

  customerCategoryId: string;
  onCustomerCategoryIdChange: (v: string) => void;

  grade: string;
  onGradeChange: (v: string) => void;

  pitamStatus: string;
  onPitamStatusChange: (v: string) => void;

  quantity: string;
  onQuantityChange: (v: string) => void;

  notes: string;
  onNotesChange: (v: string) => void;

  isSubmitting: boolean;
  error: string | null;
  onSave: () => void;
  onClose: () => void;
};

const ITEM_OWNERSHIP_OPTIONS = ['TRADER', 'CUSTOMER', 'GENERAL', 'CUSTOM'] as const;

export function NewShipmentItemFormModal({
  isOpen,
  t,
  openBoxes,
  availableTradersFromInventory,
  availableCustomersFromInventory,
  availableTraderCategories,
  availableCustomerCategories,
  availableGrades,
  availablePitamStatuses,
  availableQuantity,
  remainingCapacity,
  isLoadingOptions,
  isLoadingInventory,
  selectedBoxId,
  onBoxIdChange,
  selectedBox,
  itemOwnership,
  onItemOwnershipChange,
  stockSource,
  onStockSourceChange,
  traderId,
  onTraderIdChange,
  customerId,
  onCustomerIdChange,
  traderCategoryId,
  onTraderCategoryIdChange,
  customerCategoryId,
  onCustomerCategoryIdChange,
  grade,
  onGradeChange,
  pitamStatus,
  onPitamStatusChange,
  quantity,
  onQuantityChange,
  notes,
  onNotesChange,
  isSubmitting,
  error,
  onSave,
  onClose,
}: NewShipmentItemFormModalProps): JSX.Element | null {
  if (!isOpen) return null;

  const boxOwnership = selectedBox?.ownershipType ?? null;
  const isTraderItem =
    boxOwnership === 'TRADER' || (boxOwnership === 'SHARED' && itemOwnership === 'TRADER');
  const isCustomerItem =
    boxOwnership === 'CUSTOMER' || (boxOwnership === 'SHARED' && itemOwnership === 'CUSTOMER');
  const isSharedBox = boxOwnership === 'SHARED';
  const isCustomBox = boxOwnership === 'CUSTOM';
  const isUnassignedBox = boxOwnership === 'GENERAL';
  const isSharedCustomItem = isSharedBox && itemOwnership === 'CUSTOM';
  const isSharedUnassignedItem = isSharedBox && itemOwnership === 'GENERAL';
  const isCustomFreeText = isCustomBox || isSharedCustomItem;

  // Group boxes by shipment for display
  const BOX_TYPE_SHORT: Record<string, string> = { SMALL: 'S', MEDIUM: 'M', LARGE: 'L', CUSTOM: 'C' };

  const boxOptions = openBoxes.map((box) => ({
    value: String(box.id),
    label: `${box.boxNumber} - ${
      box.trader ? box.trader.name
      : box.customer ? box.customer.customerName
      : t.boxOwnershipLabels[box.ownershipType] ?? box.ownershipType
    } (${BOX_TYPE_SHORT[box.boxType] ?? box.boxType})`,
    shipmentNumber: box.shipment.shipmentNumber,
  }));

  // Group by shipment
  const shipmentGroups = new Map<number, typeof boxOptions>();
  for (const opt of boxOptions) {
    const group = shipmentGroups.get(opt.shipmentNumber) ?? [];
    group.push(opt);
    shipmentGroups.set(opt.shipmentNumber, group);
  }

  const isFormBusy = isLoadingOptions || isSubmitting;
  const isInventoryLoading = isLoadingInventory;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog modal-dialog--form" style={{ minWidth: 'min(700px, 90vw)' }} onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" type="button" aria-label={t.cancel} onClick={onClose}>
          <FaXmark />
        </button>

        <h3 className="modal-title">{t.title}</h3>
        <p className="modal-message">{t.description}</p>

        <div className={styles.formGrid}>
          {/* Top row: Box | Shipment | Ownership | Name */}
          <div className={styles.topRow}>
            {/* Box selection */}
            <div className={styles.field}>
              <label className={styles.label}>{t.boxLabel}</label>
              <select
                className="seasons-manager__year-input"
                value={selectedBoxId}
                onChange={(e) => onBoxIdChange(e.target.value)}
                disabled={isFormBusy}
                autoFocus
              >
                <option value="">{t.boxPlaceholder}</option>
                {Array.from(shipmentGroups.entries()).map(([shipmentNumber, opts]) => (
                  <optgroup key={shipmentNumber} label={`משלוח ${shipmentNumber}`}>
                    {opts.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Shipment number (read-only info) */}
            <div className={styles.field}>
              <label className={styles.label}>{t.shipmentLabel}</label>
              <div className={styles.infoValue}>
                {selectedBox ? selectedBox.shipment.shipmentNumber : ''}
              </div>
            </div>

            {/* Box type (read-only info) */}
            <div className={styles.field}>
              <label className={styles.label}>{t.boxTypeLabel}</label>
              <div className={styles.infoValue}>
                {selectedBox ? (BOX_TYPE_SHORT[selectedBox.boxType] ?? selectedBox.boxType) : ''}
              </div>
            </div>

            {/* Current quantity already in box (read-only info) */}
            <div className={styles.field}>
              <label className={styles.label}>{t.boxCurrentQuantityLabel}</label>
              <div className={styles.infoValue}>
                {selectedBox ? selectedBox.totalQuantity : ''}
              </div>
            </div>
          </div>

          {/* SHARED box: item ownership + trader/customer picker */}
          {isCustomBox ? (
            <div className={styles.sharedRow}>
              <div className={styles.field}>
                <label className={styles.label}>{t.itemOwnershipLabel}</label>
                <input
                  className="seasons-manager__year-input"
                  type="text"
                  value={itemOwnership}
                  onChange={(e) => onItemOwnershipChange(e.target.value)}
                  placeholder={t.itemOwnershipPlaceholder}
                  disabled={isFormBusy}
                />
              </div>
            </div>
          ) : isSharedBox ? (
            <div className={styles.sharedRow}>
              <div className={styles.field}>
                <label className={styles.label}>{t.itemOwnershipLabel}</label>
                <select
                  className="seasons-manager__year-input"
                  value={itemOwnership}
                  onChange={(e) => onItemOwnershipChange(e.target.value)}
                  disabled={isFormBusy}
                >
                  <option value="">{t.itemOwnershipPlaceholder}</option>
                  {ITEM_OWNERSHIP_OPTIONS.map((type) => (
                    <option key={type} value={type}>
                      {t.ownershipLabels[type]}
                    </option>
                  ))}
                </select>
              </div>

              {!isSharedUnassignedItem && (
              <div className={styles.field}>
                <label className={styles.label}>
                  {t.ownerNameLabel}
                </label>
                {itemOwnership === 'CUSTOMER' ? (
                  <select
                    className="seasons-manager__year-input"
                    value={customerId}
                    onChange={(e) => onCustomerIdChange(e.target.value)}
                    disabled={isFormBusy}
                  >
                    <option value="">{t.customerPlaceholder}</option>
                    {availableCustomersFromInventory.map((cu) => (
                      <option key={cu.id} value={String(cu.id)}>{cu.name}</option>
                    ))}
                  </select>
                ) : isSharedCustomItem ? (
                  <input
                    className="seasons-manager__year-input"
                    type="text"
                    value={traderId}
                    onChange={(e) => onTraderIdChange(e.target.value)}
                    placeholder={t.ownerNameLabel}
                    disabled={isFormBusy}
                  />
                ) : (
                  <select
                    className="seasons-manager__year-input"
                    value={traderId}
                    onChange={(e) => onTraderIdChange(e.target.value)}
                    disabled={isFormBusy || isInventoryLoading || itemOwnership !== 'TRADER'}
                  >
                    <option value="">{t.traderPlaceholder}</option>
                    {availableTradersFromInventory.map((tr) => (
                      <option key={tr.id} value={String(tr.id)}>{tr.name}</option>
                    ))}
                  </select>
                )}
              </div>
              )}
            </div>
          ) : null}

          {/* Stock source selector — shown for TRADER items (TRADER box or SHARED+TRADER) */}
          {isTraderItem && (
            <div className={styles.sharedRow}>
              <div className={styles.field}>
                <label className={styles.label}>{t.stockSourceLabel}</label>
                <select
                  className="seasons-manager__year-input"
                  value={stockSource}
                  onChange={(e) => onStockSourceChange(e.target.value as StockSource)}
                  disabled={isFormBusy}
                >
                  <option value="GENERAL">{t.stockSourceLabels.GENERAL}</option>
                  <option value="PRIVATE_SELECTION">{t.stockSourceLabels.PRIVATE_SELECTION}</option>
                </select>
              </div>
            </div>
          )}

          {/* Second row: Category | Grade | Pitam | Quantity */}
          <div className={styles.secondRow}>
            {/* Category */}
            <div className={styles.field}>
              <label className={styles.label}>{t.categoryLabel}</label>
              {isCustomFreeText ? (
                <input
                  className="seasons-manager__year-input"
                  type="text"
                  value={traderCategoryId}
                  onChange={(e) => onTraderCategoryIdChange(e.target.value)}
                  placeholder={t.categoryPlaceholder}
                  disabled={isFormBusy}
                />
              ) : isCustomerItem ? (
                <select
                  className="seasons-manager__year-input"
                  value={customerCategoryId}
                  onChange={(e) => onCustomerCategoryIdChange(e.target.value)}
                  disabled={isFormBusy || isInventoryLoading || availableCustomerCategories.length === 0}
                >
                  <option value="">{isInventoryLoading ? t.loadingInventory : t.categoryPlaceholder}</option>
                  {availableCustomerCategories.map((cat) => (
                    <option key={cat.id} value={String(cat.id)}>
                      {cat.name} - {cat.grade}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  className="seasons-manager__year-input"
                  value={traderCategoryId}
                  onChange={(e) => onTraderCategoryIdChange(e.target.value)}
                  disabled={isFormBusy || isInventoryLoading || (!isTraderItem && !isUnassignedBox && !isSharedUnassignedItem) || availableTraderCategories.length === 0}
                >
                  <option value="">{isInventoryLoading ? t.loadingInventory : t.categoryPlaceholder}</option>
                  {availableTraderCategories.map((cat) => (
                    <option key={cat.id} value={String(cat.id)}>{cat.name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Grade */}
            <div className={styles.field}>
              <label className={styles.label}>{t.gradeLabel}</label>
              {isCustomFreeText ? (
                <input
                  className="seasons-manager__year-input"
                  type="text"
                  value={grade}
                  onChange={(e) => onGradeChange(e.target.value)}
                  placeholder={t.gradePlaceholder}
                  disabled={isFormBusy}
                />
              ) : isCustomerItem ? (
                <div className={styles.infoValue}>
                  {availableCustomerCategories.find((c) => String(c.id) === customerCategoryId)?.grade ?? ''}
                </div>
              ) : (
                <select
                  className="seasons-manager__year-input"
                  value={grade}
                  onChange={(e) => onGradeChange(e.target.value)}
                  disabled={isFormBusy || isInventoryLoading || (!isTraderItem && !isUnassignedBox && !isSharedUnassignedItem) || !traderCategoryId || availableGrades.length === 0}
                >
                  <option value="">{t.gradePlaceholder}</option>
                  {availableGrades.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Pitam status */}
            <div className={styles.field}>
              <label className={styles.label}>{t.pitamStatusLabel}</label>
              <select
                className="seasons-manager__year-input"
                value={pitamStatus}
                onChange={(e) => onPitamStatusChange(e.target.value)}
                disabled={isFormBusy || (!isCustomFreeText && (isInventoryLoading || availablePitamStatuses.length === 0 || (!isTraderItem && !isCustomerItem && !isUnassignedBox && !isSharedUnassignedItem)))}
              >
                <option value="">{t.pitamStatusPlaceholder}</option>
                {(isCustomFreeText ? Object.keys(t.pitamStatusLabels) : availablePitamStatuses).map((ps) => (
                  <option key={ps} value={ps}>
                    {t.pitamStatusLabels[ps] ?? ps}
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity */}
            <div className={styles.field}>
              <label className={styles.label}>{t.quantityLabel}</label>
              <input
                className="seasons-manager__year-input"
                type="number"
                min={1}
                step={1}
                max={
                  availableQuantity != null && remainingCapacity != null
                    ? Math.min(availableQuantity, remainingCapacity)
                    : (availableQuantity ?? remainingCapacity ?? undefined)
                }
                value={quantity}
                onChange={(e) => onQuantityChange(e.target.value)}
                onWheel={(e) => e.currentTarget.blur()}
                placeholder={t.quantityPlaceholder}
                disabled={isFormBusy || !pitamStatus}
              />
              <span className={styles.availableHint} style={{ visibility: availableQuantity !== null ? 'visible' : 'hidden' }}>
                {availableQuantity !== null ? t.availableQuantityHint(availableQuantity) : ' '}
              </span>
              {remainingCapacity !== null && (
                <span className={styles.availableHint}>
                  {t.remainingCapacityHint(remainingCapacity)}
                </span>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className={`${styles.field} ${styles.fieldFull}`}>
            <label className={styles.label}>{t.notesLabel}</label>
            <textarea
              className={`seasons-manager__year-input ${styles.textarea}`}
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = 'auto';
                el.style.height = `${el.scrollHeight}px`;
              }}
              placeholder={t.notesPlaceholder}
              rows={1}
            />
          </div>
        </div>

        {error ? <p className="seasons-manager__error">{error}</p> : null}

        <div className="modal-actions">
          <button className="btn btn-danger" type="button" onClick={onClose}>
            {t.cancel}
          </button>
          <button
            className="btn btn-success"
            type="button"
            onClick={onSave}
            disabled={isFormBusy || isInventoryLoading}
          >
            {t.save}
          </button>
        </div>
      </div>
    </div>
  );
}
