import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { AppLang } from '../i18n';
import { getTraderMovementsI18n } from '../i18n';
import type { Trader } from '../../../services/tradersApi';
import type { Customer } from '../../../services/customersApi';
import type { TraderCategoryWithShares } from '../../../services/traderCategoriesApi';
import type { CustomerCategory } from '../../../services/customerCategoriesApi';
import {
  InventoryOwnerType,
  createInternalTransfer,
  createTraderAdjustmentMovement,
  type InternalTransferMovementType,
  type PitamStatus,
  type TraderAdjustmentMovementType,
} from '../../../services/inventoryMovementsApi';
import { ApiError } from '../../../services/apiClient';
import { fetchTraderInventorySummary } from '../services/traderInventorySummary.service';
import type { TraderInventorySummaryRow } from '../traderInventory.types';

const GRADE_OPTIONS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו'] as const;
const PITAM_STATUS_OPTIONS: PitamStatus[] = ['WITH_PITAM', 'WITHOUT_PITAM', 'MIXED'];

type MovementType = InternalTransferMovementType | TraderAdjustmentMovementType;

const MOVEMENT_TYPE_ORDER: MovementType[] = [
  'OWNERSHIP_TRANSFER',
  'INTERNAL_TRANSFER',
  'ASSIGNED',
  'SELF_PICKUP',
  'WASTE',
  'ADJUSTMENT',
];

const ADJUSTMENT_TYPES = new Set<MovementType>(['SELF_PICKUP', 'WASTE', 'ADJUSTMENT']);

const ROW_STYLE: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  gap: '12px',
  alignItems: 'start',
};

type AddTraderMovementModalProps = {
  lang: AppLang;
  isOpen: boolean;
  seasonId: number | null;
  traders: Trader[];
  customers: Customer[];
  traderCategories: TraderCategoryWithShares[];
  customerCategories: CustomerCategory[];
  onClose: () => void;
  onSaved: () => void;
};

export function AddTraderMovementModal({
  lang,
  isOpen,
  seasonId,
  traders,
  customers,
  traderCategories,
  customerCategories,
  onClose,
  onSaved,
}: AddTraderMovementModalProps) {
  const i18n = getTraderMovementsI18n();
  const f = i18n.addMovementForm;

  const [type, setType] = useState<MovementType | ''>('');
  const [fromTraderId, setFromTraderId] = useState('');
  const [toTraderId, setToTraderId] = useState('');
  const [traderId, setTraderId] = useState('');
  const [isModulo, setIsModulo] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [traderCategoryId, setTraderCategoryId] = useState('');
  const [customerCategoryId, setCustomerCategoryId] = useState('');
  const [grade, setGrade] = useState('');
  const [pitamStatus, setPitamStatus] = useState<PitamStatus | ''>('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fromTraderStock, setFromTraderStock] = useState<TraderInventorySummaryRow[]>([]);
  const [isLoadingFromTraderStock, setIsLoadingFromTraderStock] = useState(false);

  // Ownership transfers may only move stock that the source trader actually has.
  useEffect(() => {
    if (type !== 'OWNERSHIP_TRANSFER' || !fromTraderId || !seasonId) {
      setFromTraderStock([]);
      return;
    }

    let isActive = true;
    setIsLoadingFromTraderStock(true);

    fetchTraderInventorySummary({
      seasonId,
      traderId: Number(fromTraderId),
      ownerScope: 'TRADER',
      shipmentScope: 'ALL',
    })
      .then((result) => {
        if (!isActive) return;
        setFromTraderStock(result.rows.filter((row) => row.quantity > 0));
      })
      .catch(() => {
        if (!isActive) return;
        setFromTraderStock([]);
      })
      .finally(() => {
        if (!isActive) return;
        setIsLoadingFromTraderStock(false);
      });

    return () => {
      isActive = false;
    };
  }, [type, fromTraderId, seasonId]);

  const fromTraderCategoryOptions = useMemo(() => {
    const seen = new Map<number, string>();
    for (const row of fromTraderStock) {
      if (!seen.has(row.traderCategoryId)) {
        seen.set(row.traderCategoryId, row.traderCategoryName ?? `#${row.traderCategoryId}`);
      }
    }
    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }, [fromTraderStock]);

  const fromTraderGradeOptions = useMemo(() => {
    if (!traderCategoryId) return [];
    return [...new Set(
      fromTraderStock
        .filter((row) => String(row.traderCategoryId) === traderCategoryId)
        .map((row) => row.grade),
    )];
  }, [fromTraderStock, traderCategoryId]);

  const fromTraderPitamStatusOptions = useMemo(() => {
    if (!traderCategoryId || !grade) return [];
    return [...new Set(
      fromTraderStock
        .filter((row) => String(row.traderCategoryId) === traderCategoryId && row.grade === grade)
        .map((row) => row.pitamStatus),
    )];
  }, [fromTraderStock, traderCategoryId, grade]);

  const availableQuantityForSelection = useMemo(() => {
    if (type !== 'OWNERSHIP_TRANSFER' || !traderCategoryId || !grade || !pitamStatus) {
      return null;
    }
    const match = fromTraderStock.find(
      (row) => String(row.traderCategoryId) === traderCategoryId && row.grade === grade && row.pitamStatus === pitamStatus,
    );
    return match ? match.quantity : null;
  }, [type, fromTraderStock, traderCategoryId, grade, pitamStatus]);

  // Reset downstream selections whenever the source trader's availability changes.
  useEffect(() => {
    if (type !== 'OWNERSHIP_TRANSFER') return;
    setTraderCategoryId('');
    setGrade('');
    setPitamStatus('');
  }, [type, fromTraderId]);

  useEffect(() => {
    if (type !== 'OWNERSHIP_TRANSFER' || !grade) return;
    if (!fromTraderGradeOptions.includes(grade)) {
      setGrade('');
    }
  }, [type, fromTraderGradeOptions, grade]);

  useEffect(() => {
    if (type !== 'OWNERSHIP_TRANSFER' || !pitamStatus) return;
    if (!fromTraderPitamStatusOptions.includes(pitamStatus)) {
      setPitamStatus('');
    }
  }, [type, fromTraderPitamStatusOptions, pitamStatus]);

  const sortedTraders = useMemo(
    () => [...traders].sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })),
    [traders],
  );

  const sortedCustomers = useMemo(
    () => [...customers].sort((left, right) => left.customerName.localeCompare(right.customerName, undefined, { sensitivity: 'base' })),
    [customers],
  );

  const availableCustomerCategories = useMemo(
    () => (customerId ? customerCategories.filter((category) => String(category.customerId) === customerId) : []),
    [customerCategories, customerId],
  );

  // Sequential gating: each field unlocks only once the field(s) before it are filled in.
  const isOwnerStepReady = type === 'OWNERSHIP_TRANSFER'
    ? Boolean(fromTraderId && toTraderId)
    : type === 'ASSIGNED'
      ? Boolean(toTraderId)
      : type === 'INTERNAL_TRANSFER'
        ? Boolean(customerCategoryId)
        : ADJUSTMENT_TYPES.has(type as MovementType)
          ? isModulo || Boolean(traderId)
          : false;

  const isToTraderEnabled = Boolean(fromTraderId);
  const isCustomerEnabled = Boolean(fromTraderId);
  const isCustomerCategoryEnabled = Boolean(customerId);
  const isTraderCategoryEnabled = isOwnerStepReady && !isLoadingFromTraderStock;
  const isGradeEnabled = isTraderCategoryEnabled && Boolean(traderCategoryId);
  const isPitamEnabled = isGradeEnabled && Boolean(grade);
  const isQuantityEnabled = isPitamEnabled && Boolean(pitamStatus);
  const isNotesEnabled = isQuantityEnabled && quantity !== '';

  if (!isOpen) {
    return null;
  }

  const resetForm = () => {
    setType('');
    setFromTraderId('');
    setToTraderId('');
    setTraderId('');
    setIsModulo(false);
    setCustomerId('');
    setTraderCategoryId('');
    setCustomerCategoryId('');
    setGrade('');
    setPitamStatus('');
    setQuantity('');
    setNotes('');
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleTypeChange = (nextType: MovementType | '') => {
    setType(nextType);
    setError(null);
  };

  const handleSubmit = async () => {
    setError(null);

    if (!type) {
      setError(f.validationRequired);
      return;
    }

    const quantityNumber = Number(quantity);
    if (!quantity || Number.isNaN(quantityNumber) || quantityNumber === 0) {
      setError(f.validationRequired);
      return;
    }

    const nowIso = new Date().toISOString();

    try {
      setIsSubmitting(true);

      if (ADJUSTMENT_TYPES.has(type)) {
        if (!traderCategoryId || !grade || !pitamStatus || (!isModulo && !traderId)) {
          setError(f.validationRequired);
          return;
        }

        await createTraderAdjustmentMovement({
          date: nowIso,
          traderId: isModulo ? null : Number(traderId),
          traderCategoryId: Number(traderCategoryId),
          grade,
          pitamStatus,
          quantity: quantityNumber,
          isModulo,
          type: type as TraderAdjustmentMovementType,
          notes: notes || null,
        });
      } else if (type === 'OWNERSHIP_TRANSFER') {
        if (!fromTraderId || !toTraderId || !traderCategoryId || !grade || !pitamStatus) {
          setError(f.validationRequired);
          return;
        }

        if (fromTraderId === toTraderId) {
          setError(f.validationSameTrader);
          return;
        }

        await createInternalTransfer({
          type: 'OWNERSHIP_TRANSFER',
          date: nowIso,
          quantity: quantityNumber,
          pitamStatus,
          grade,
          traderCategoryId: Number(traderCategoryId),
          fromOwnerType: InventoryOwnerType.TRADER,
          fromTraderId: Number(fromTraderId),
          toOwnerType: InventoryOwnerType.TRADER,
          toTraderId: Number(toTraderId),
          notes: notes || null,
        });
      } else if (type === 'ASSIGNED') {
        if (!toTraderId || !traderCategoryId || !grade || !pitamStatus) {
          setError(f.validationRequired);
          return;
        }

        await createInternalTransfer({
          type: 'ASSIGNED',
          date: nowIso,
          quantity: quantityNumber,
          pitamStatus,
          grade,
          traderCategoryId: Number(traderCategoryId),
          fromOwnerType: InventoryOwnerType.MODULO,
          toOwnerType: InventoryOwnerType.TRADER,
          toTraderId: Number(toTraderId),
          notes: notes || null,
        });
      } else if (type === 'INTERNAL_TRANSFER') {
        if (!fromTraderId || !traderCategoryId || !grade || !pitamStatus || !customerId || !customerCategoryId) {
          setError(f.validationRequired);
          return;
        }

        await createInternalTransfer({
          type: 'INTERNAL_TRANSFER',
          date: nowIso,
          quantity: quantityNumber,
          fromOwnerType: InventoryOwnerType.TRADER,
          fromTraderId: Number(fromTraderId),
          fromTraderCategoryId: Number(traderCategoryId),
          fromGrade: grade,
          fromPitamStatus: pitamStatus,
          toOwnerType: InventoryOwnerType.CUSTOMER,
          toCustomerId: Number(customerId),
          toCustomerCategoryId: Number(customerCategoryId),
          notes: notes || null,
        });
      }

      resetForm();
      onSaved();
    } catch (submitError) {
      setError(submitError instanceof ApiError ? submitError.message : f.validationRequired);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal-dialog modal-dialog--form"
        role="dialog"
        aria-modal="true"
        aria-label={f.title}
        dir={lang === 'he' ? 'rtl' : 'ltr'}
        style={{ width: 820 }}
        onClick={(event) => event.stopPropagation()}
      >
        <button className="modal-close" type="button" aria-label={f.closeLabel} onClick={handleClose}>
          ✕
        </button>

        <h3 className="modal-title">{f.title}</h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Row 1: action type */}
          <div style={ROW_STYLE}>
            <select
              className="seasons-manager__year-input"
              style={{ gridColumn: '1 / -1' }}
              value={type}
              onChange={(event) => handleTypeChange(event.target.value as MovementType | '')}
            >
              <option value="">{f.typePlaceholder}</option>
              {MOVEMENT_TYPE_ORDER.map((option) => (
                <option key={option} value={option}>
                  {f.typeOptions[option]}
                </option>
              ))}
            </select>
          </div>

          {type === 'OWNERSHIP_TRANSFER' ? (
            <div style={ROW_STYLE}>
              <select
                className="seasons-manager__year-input"
                value={fromTraderId}
                onChange={(event) => {
                  const nextFromTraderId = event.target.value;
                  setFromTraderId(nextFromTraderId);
                  if (nextFromTraderId && nextFromTraderId === toTraderId) {
                    setToTraderId('');
                  }
                }}
              >
                <option value="">{f.fromTraderLabel}</option>
                {sortedTraders
                  .filter((trader) => String(trader.id) !== toTraderId)
                  .map((trader) => (
                  <option key={`from-${trader.id}`} value={String(trader.id)}>
                    {trader.name}
                  </option>
                ))}
              </select>

              <select
                className="seasons-manager__year-input"
                value={toTraderId}
                onChange={(event) => setToTraderId(event.target.value)}
                disabled={!isToTraderEnabled}
              >
                <option value="">{f.toTraderLabel}</option>
                {sortedTraders
                  .filter((trader) => String(trader.id) !== fromTraderId)
                  .map((trader) => (
                  <option key={`to-${trader.id}`} value={String(trader.id)}>
                    {trader.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {type === 'ASSIGNED' ? (
            <div style={ROW_STYLE}>
              <select
                className="seasons-manager__year-input"
                value={toTraderId}
                onChange={(event) => setToTraderId(event.target.value)}
              >
                <option value="">{f.toTraderLabel}</option>
                {sortedTraders.map((trader) => (
                  <option key={`assign-to-${trader.id}`} value={String(trader.id)}>
                    {trader.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {type === 'INTERNAL_TRANSFER' ? (
            <div style={ROW_STYLE}>
              <select
                className="seasons-manager__year-input"
                value={fromTraderId}
                onChange={(event) => setFromTraderId(event.target.value)}
              >
                <option value="">{f.fromTraderLabel}</option>
                {sortedTraders.map((trader) => (
                  <option key={`transfer-from-${trader.id}`} value={String(trader.id)}>
                    {trader.name}
                  </option>
                ))}
              </select>

              <select
                className="seasons-manager__year-input"
                value={customerId}
                onChange={(event) => {
                  setCustomerId(event.target.value);
                  setCustomerCategoryId('');
                }}
                disabled={!isCustomerEnabled}
              >
                <option value="">{f.customerPlaceholder}</option>
                {sortedCustomers.map((customer) => (
                  <option key={customer.id} value={String(customer.id)}>
                    {customer.customerName}
                  </option>
                ))}
              </select>

              <select
                className="seasons-manager__year-input"
                value={customerCategoryId}
                onChange={(event) => setCustomerCategoryId(event.target.value)}
                disabled={!isCustomerCategoryEnabled}
              >
                <option value="">{f.customerCategoryPlaceholder}</option>
                {availableCustomerCategories.map((category) => (
                  <option key={category.id} value={String(category.id)}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {ADJUSTMENT_TYPES.has(type as MovementType) ? (
            <div style={ROW_STYLE}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="checkbox"
                  checked={isModulo}
                  onChange={(event) => {
                    setIsModulo(event.target.checked);
                    if (event.target.checked) {
                      setTraderId('');
                    }
                  }}
                />
                <span>{f.moduloOption}</span>
              </label>

              {!isModulo ? (
                <select
                  className="seasons-manager__year-input"
                  value={traderId}
                  onChange={(event) => setTraderId(event.target.value)}
                >
                  <option value="">{f.traderPlaceholder}</option>
                  {sortedTraders.map((trader) => (
                    <option key={`adj-trader-${trader.id}`} value={String(trader.id)}>
                      {trader.name}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>
          ) : null}

          {type === 'OWNERSHIP_TRANSFER' ? (
            <div style={ROW_STYLE}>
              <select
                className="seasons-manager__year-input"
                value={traderCategoryId}
                onChange={(event) => setTraderCategoryId(event.target.value)}
                disabled={!isTraderCategoryEnabled || fromTraderCategoryOptions.length === 0}
              >
                <option value="">{f.traderCategoryPlaceholder}</option>
                {fromTraderCategoryOptions.map((category) => (
                  <option key={category.id} value={String(category.id)}>
                    {category.name}
                  </option>
                ))}
              </select>

              <select
                className="seasons-manager__year-input"
                value={grade}
                onChange={(event) => setGrade(event.target.value)}
                disabled={!isGradeEnabled || fromTraderGradeOptions.length === 0}
              >
                <option value="">{f.gradePlaceholder}</option>
                {fromTraderGradeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>

              <select
                className="seasons-manager__year-input"
                value={pitamStatus}
                onChange={(event) => setPitamStatus(event.target.value as PitamStatus | '')}
                disabled={!isPitamEnabled || fromTraderPitamStatusOptions.length === 0}
              >
                <option value="">{f.pitamStatusPlaceholder}</option>
                {fromTraderPitamStatusOptions.map((option) => (
                  <option key={option} value={option}>
                    {i18n.pitamStatuses[option] || option}
                  </option>
                ))}
              </select>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <input
                  className="seasons-manager__year-input"
                  type="number"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  placeholder={f.quantityPlaceholder}
                  max={availableQuantityForSelection ?? undefined}
                  aria-label={f.quantityLabel}
                  disabled={!isQuantityEnabled}
                />
                <span
                  style={{
                    fontSize: 12,
                    opacity: 0.75,
                    visibility: availableQuantityForSelection !== null ? 'visible' : 'hidden',
                  }}
                >
                  {availableQuantityForSelection !== null ? f.availableQuantityHint(availableQuantityForSelection) : ' '}
                </span>
              </div>
            </div>
          ) : null}

          {type && type !== 'OWNERSHIP_TRANSFER' ? (
            <div style={ROW_STYLE}>
              <select
                className="seasons-manager__year-input"
                value={traderCategoryId}
                onChange={(event) => setTraderCategoryId(event.target.value)}
                disabled={!isTraderCategoryEnabled}
              >
                <option value="">{f.traderCategoryPlaceholder}</option>
                {traderCategories.map((category) => (
                  <option key={category.id} value={String(category.id)}>
                    {category.name}
                  </option>
                ))}
              </select>

              <select
                className="seasons-manager__year-input"
                value={grade}
                onChange={(event) => setGrade(event.target.value)}
                disabled={!isGradeEnabled}
              >
                <option value="">{f.gradePlaceholder}</option>
                {GRADE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>

              <select
                className="seasons-manager__year-input"
                value={pitamStatus}
                onChange={(event) => setPitamStatus(event.target.value as PitamStatus | '')}
                disabled={!isPitamEnabled}
              >
                <option value="">{f.pitamStatusPlaceholder}</option>
                {PITAM_STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {i18n.pitamStatuses[option] || option}
                  </option>
                ))}
              </select>

              <input
                className="seasons-manager__year-input"
                type="number"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                placeholder={f.quantityPlaceholder}
                aria-label={f.quantityLabel}
                disabled={!isQuantityEnabled}
              />
            </div>
          ) : null}

          {type ? (
            <div style={ROW_STYLE}>
              <textarea
                className="seasons-manager__year-input"
                style={{ gridColumn: '1 / -1' }}
                rows={2}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder={f.notesPlaceholder}
                aria-label={f.notesLabel}
                disabled={!isNotesEnabled}
              />
            </div>
          ) : null}
        </div>

        {type === 'ADJUSTMENT' ? <p style={{ fontSize: 12, opacity: 0.75, margin: '4px 0 0' }}>{f.adjustmentQuantityHint}</p> : null}

        {error ? <p className="seasons-manager__error">{error}</p> : null}

        <div className="modal-actions">
          <button className="btn btn-danger" type="button" onClick={handleClose}>
            {f.cancel}
          </button>
          <button className="btn btn-success" type="button" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? f.saving : f.save}
          </button>
        </div>
      </div>
    </div>
  );
}
