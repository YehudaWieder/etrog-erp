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

const MOVEMENT_TYPE_ORDER: Array<Exclude<MovementType, 'PRIVATE_SELECTION'>> = [
  'OWNERSHIP_TRANSFER',
  'ASSIGNED',
  'INTERNAL_TRANSFER',
  'SELF_PICKUP',
  'WASTE',
];

const ADJUSTMENT_TYPES = new Set<MovementType>(['WASTE']);

const ROW_STYLE: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  gap: '12px',
  alignItems: 'start',
};

const FIELD_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
};

const LABEL_STYLE: CSSProperties = {
  fontSize: '0.8rem',
  fontWeight: 500,
  color: 'var(--color-text-secondary, #4b5563)',
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
  const [stockSource, setStockSource] = useState<'GENERAL' | 'PRIVATE_SELECTION' | ''>('');
  const [customerId, setCustomerId] = useState('');
  const [traderCategoryId, setTraderCategoryId] = useState('');
  const [customerCategoryId, setCustomerCategoryId] = useState('');
  const [grade, setGrade] = useState('');
  const [customerGrade, setCustomerGrade] = useState('');
  const [pitamStatus, setPitamStatus] = useState<PitamStatus | ''>('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fromTraderStock, setFromTraderStock] = useState<TraderInventorySummaryRow[]>([]);
  const [isLoadingFromTraderStock, setIsLoadingFromTraderStock] = useState(false);
  const [generalStock, setGeneralStock] = useState<TraderInventorySummaryRow[]>([]);
  const [isLoadingGeneralStock, setIsLoadingGeneralStock] = useState(false);

  // ASSIGNED allocates from general (MODULO) stock — load it when this type is selected.
  useEffect(() => {
    if (type !== 'ASSIGNED' || !seasonId) {
      setGeneralStock([]);
      return;
    }

    let isActive = true;
    setIsLoadingGeneralStock(true);

    fetchTraderInventorySummary({
      seasonId,
      traderId: null,
      ownerScope: 'MODULO',
      shipmentScope: 'UNSHIPPED',
    })
      .then((result) => {
        if (!isActive) return;
        setGeneralStock(result.rows.filter((row) => row.quantity > 0));
      })
      .catch(() => {
        if (!isActive) return;
        setGeneralStock([]);
      })
      .finally(() => {
        if (!isActive) return;
        setIsLoadingGeneralStock(false);
      });

    return () => {
      isActive = false;
    };
  }, [type, seasonId]);

  // Ownership, internal transfers, self-pickup and waste (trader) use the source trader's actual stock.
  useEffect(() => {
    const activeFromTraderId = (type === 'SELF_PICKUP' || type === 'WASTE') ? traderId : fromTraderId;
    const isWaste = type === 'WASTE';
    const needsStockSource = type !== 'WASTE' || !isModulo;
    if (
      (type !== 'OWNERSHIP_TRANSFER' && type !== 'INTERNAL_TRANSFER' && type !== 'SELF_PICKUP' && !isWaste) ||
      !activeFromTraderId || !seasonId ||
      (needsStockSource && !stockSource) ||
      (isWaste && isModulo)
    ) {
      setFromTraderStock([]);
      return;
    }

    const shipmentScope = stockSource === 'PRIVATE_SELECTION' ? 'PRIVATE_SELECTION' : 'UNSHIPPED';

    let isActive = true;
    setIsLoadingFromTraderStock(true);

    fetchTraderInventorySummary({
      seasonId,
      traderId: Number(activeFromTraderId),
      ownerScope: 'TRADER',
      shipmentScope,
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
  }, [type, fromTraderId, traderId, stockSource, isModulo, seasonId]);

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

  const assignedCategoryOptions = useMemo(() => {
    const seen = new Map<number, string>();
    for (const row of generalStock) {
      if (!seen.has(row.traderCategoryId)) {
        seen.set(row.traderCategoryId, row.traderCategoryName ?? `#${row.traderCategoryId}`);
      }
    }
    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }, [generalStock]);

  const assignedGradeOptions = useMemo(() => {
    if (!traderCategoryId) return [];
    return [...new Set(
      generalStock
        .filter((row) => String(row.traderCategoryId) === traderCategoryId)
        .map((row) => row.grade),
    )];
  }, [generalStock, traderCategoryId]);

  const assignedPitamStatusOptions = useMemo(() => {
    if (!traderCategoryId || !grade) return [];
    return [...new Set(
      generalStock
        .filter((row) => String(row.traderCategoryId) === traderCategoryId && row.grade === grade)
        .map((row) => row.pitamStatus),
    )];
  }, [generalStock, traderCategoryId, grade]);

  const availableQuantityForAssigned = useMemo(() => {
    if (type !== 'ASSIGNED' || !traderCategoryId || !grade || !pitamStatus) return null;
    const match = generalStock.find(
      (row) => String(row.traderCategoryId) === traderCategoryId && row.grade === grade && row.pitamStatus === pitamStatus,
    );
    return match ? match.quantity : null;
  }, [type, generalStock, traderCategoryId, grade, pitamStatus]);

  const availableQuantityForSelection = useMemo(() => {
    const isWasteTrader = type === 'WASTE' && !isModulo && Boolean(stockSource);
    if ((type !== 'OWNERSHIP_TRANSFER' && type !== 'INTERNAL_TRANSFER' && type !== 'SELF_PICKUP' && !isWasteTrader) || !traderCategoryId || !grade || !pitamStatus) {
      return null;
    }
    const match = fromTraderStock.find(
      (row) => String(row.traderCategoryId) === traderCategoryId && row.grade === grade && row.pitamStatus === pitamStatus,
    );
    return match ? match.quantity : null;
  }, [type, fromTraderStock, traderCategoryId, grade, pitamStatus]);

  // Reset downstream selections whenever the source trader or stock source changes.
  useEffect(() => {
    if (type !== 'OWNERSHIP_TRANSFER' && type !== 'INTERNAL_TRANSFER') return;
    setStockSource('');
    setTraderCategoryId('');
    setGrade('');
    setPitamStatus('');
  }, [type, fromTraderId]);

  useEffect(() => {
    if (type !== 'SELF_PICKUP') return;
    setStockSource('');
    setTraderCategoryId('');
    setGrade('');
    setPitamStatus('');
  }, [type, traderId]);

  useEffect(() => {
    if (type !== 'WASTE') return;
    setStockSource('');
    setTraderCategoryId('');
    setGrade('');
    setPitamStatus('');
  }, [type, traderId, isModulo]);

  // Reset product fields when switching to ASSIGNED or when season changes.
  useEffect(() => {
    if (type !== 'ASSIGNED') return;
    setTraderCategoryId('');
    setGrade('');
    setPitamStatus('');
  }, [type, seasonId]);

  useEffect(() => {
    if ((type !== 'OWNERSHIP_TRANSFER' && type !== 'INTERNAL_TRANSFER' && type !== 'SELF_PICKUP' && type !== 'WASTE') || !grade) return;
    if (!fromTraderGradeOptions.includes(grade)) {
      setGrade('');
    }
  }, [type, fromTraderGradeOptions, grade]);

  useEffect(() => {
    if ((type !== 'OWNERSHIP_TRANSFER' && type !== 'INTERNAL_TRANSFER' && type !== 'SELF_PICKUP' && type !== 'WASTE') || !pitamStatus) return;
    if (!fromTraderPitamStatusOptions.includes(pitamStatus)) {
      setPitamStatus('');
    }
  }, [type, fromTraderPitamStatusOptions, pitamStatus]);

  useEffect(() => {
    if (type !== 'ASSIGNED' || !grade) return;
    if (!assignedGradeOptions.includes(grade)) {
      setGrade('');
    }
  }, [type, assignedGradeOptions, grade]);

  useEffect(() => {
    if (type !== 'ASSIGNED' || !pitamStatus) return;
    if (!(assignedPitamStatusOptions as string[]).includes(pitamStatus)) {
      setPitamStatus('');
    }
  }, [type, assignedPitamStatusOptions, pitamStatus]);

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
      : ADJUSTMENT_TYPES.has(type as MovementType)
        ? isModulo || Boolean(traderId)
        : false;

  const isToTraderEnabled = Boolean(fromTraderId);
  const isCustomerEnabled = Boolean(fromTraderId);
  const isCustomerCategoryEnabled = Boolean(customerId);
  const isTraderCategoryEnabled = isOwnerStepReady && Boolean(stockSource) && !isLoadingFromTraderStock;
  const isGradeEnabled = isTraderCategoryEnabled && Boolean(traderCategoryId);
  const isPitamEnabled = isGradeEnabled && Boolean(grade);
  const isQuantityEnabled = isPitamEnabled && Boolean(pitamStatus);

  // INTERNAL_TRANSFER gating: trader fields first (filtered by actual unshipped stock), then customer fields.
  const isItTraderCategoryEnabled = type === 'INTERNAL_TRANSFER' && Boolean(fromTraderId) && Boolean(stockSource) && !isLoadingFromTraderStock;
  const isItGradeEnabled = isItTraderCategoryEnabled && Boolean(traderCategoryId);
  const isItPitamEnabled = isItGradeEnabled && Boolean(grade);
  const isItCustomerEnabled = isItPitamEnabled && Boolean(pitamStatus);
  const isItCustomerCategoryEnabled = isItCustomerEnabled && Boolean(customerId);
  const isItCustomerGradeEnabled = isItCustomerCategoryEnabled && Boolean(customerCategoryId);
  const isItQuantityEnabled = isItCustomerGradeEnabled;

  const isAssignedCategoryEnabled = type === 'ASSIGNED' && Boolean(toTraderId) && !isLoadingGeneralStock;
  const isAssignedGradeEnabled = isAssignedCategoryEnabled && Boolean(traderCategoryId);
  const isAssignedPitamEnabled = isAssignedGradeEnabled && Boolean(grade);
  const isAssignedQuantityEnabled = isAssignedPitamEnabled && Boolean(pitamStatus);

  const isSelfPickupCategoryEnabled = type === 'SELF_PICKUP' && Boolean(traderId) && Boolean(stockSource) && !isLoadingFromTraderStock;
  const isSelfPickupGradeEnabled = isSelfPickupCategoryEnabled && Boolean(traderCategoryId);
  const isSelfPickupPitamEnabled = isSelfPickupGradeEnabled && Boolean(grade);
  const isSelfPickupQuantityEnabled = isSelfPickupPitamEnabled && Boolean(pitamStatus);

  const isWasteTraderCategoryEnabled = type === 'WASTE' && !isModulo && Boolean(traderId) && Boolean(stockSource) && !isLoadingFromTraderStock;
  const isWasteTraderGradeEnabled = isWasteTraderCategoryEnabled && Boolean(traderCategoryId);
  const isWasteTraderPitamEnabled = isWasteTraderGradeEnabled && Boolean(grade);
  const isWasteTraderQuantityEnabled = isWasteTraderPitamEnabled && Boolean(pitamStatus);

  const isWasteModuloCategoryEnabled = type === 'WASTE' && isModulo;
  const isWasteModuloGradeEnabled = isWasteModuloCategoryEnabled && Boolean(traderCategoryId);
  const isWasteModuloPitamEnabled = isWasteModuloGradeEnabled && Boolean(grade);
  const isWasteModuloQuantityEnabled = isWasteModuloPitamEnabled && Boolean(pitamStatus);

  const isNotesEnabled = type === 'INTERNAL_TRANSFER'
    ? isItQuantityEnabled && quantity !== ''
    : type === 'ASSIGNED'
      ? isAssignedQuantityEnabled && quantity !== ''
      : type === 'SELF_PICKUP'
        ? isSelfPickupQuantityEnabled && quantity !== ''
        : type === 'WASTE'
          ? (isModulo ? isWasteModuloQuantityEnabled : isWasteTraderQuantityEnabled) && quantity !== ''
          : isQuantityEnabled && quantity !== '';

  if (!isOpen) {
    return null;
  }

  const resetForm = () => {
    setType('');
    setFromTraderId('');
    setToTraderId('');
    setTraderId('');
    setIsModulo(false);
    setStockSource('');
    setCustomerId('');
    setTraderCategoryId('');
    setCustomerCategoryId('');
    setGrade('');
    setCustomerGrade('');
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

      if (type === 'SELF_PICKUP') {
        if (!traderId || !traderCategoryId || !grade || !pitamStatus) {
          setError(f.validationRequired);
          return;
        }

        await createTraderAdjustmentMovement({
          date: nowIso,
          traderId: Number(traderId),
          traderCategoryId: Number(traderCategoryId),
          grade,
          pitamStatus,
          quantity: quantityNumber,
          isModulo: false,
          type: 'SELF_PICKUP',
          stockSource: stockSource || undefined,
          notes: notes || null,
        });
      } else if (ADJUSTMENT_TYPES.has(type)) {
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
          stockSource: (!isModulo && stockSource) ? stockSource : undefined,
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
          stockSource: stockSource || undefined,
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
        if (!fromTraderId || !traderCategoryId || !grade || !pitamStatus || !customerId || !customerCategoryId || !customerGrade) {
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
          toGrade: customerGrade,
          stockSource: stockSource || undefined,
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
            <div style={{ ...FIELD_STYLE, gridColumn: '1 / -1' }}>
              <label style={LABEL_STYLE}>{f.typeLabel}</label>
              <select
                className="seasons-manager__year-input"
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
          </div>

          {type === 'OWNERSHIP_TRANSFER' ? (
            <>
              <div style={ROW_STYLE}>
                <div style={FIELD_STYLE}>
                  <label style={LABEL_STYLE}>{f.fromTraderLabel}</label>
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
                    <option value="">{f.traderPlaceholder}</option>
                    {sortedTraders
                      .filter((trader) => String(trader.id) !== toTraderId)
                      .map((trader) => (
                      <option key={`from-${trader.id}`} value={String(trader.id)}>
                        {trader.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={FIELD_STYLE}>
                  <label style={LABEL_STYLE}>{f.toTraderLabel}</label>
                  <select
                    className="seasons-manager__year-input"
                    value={toTraderId}
                    onChange={(event) => setToTraderId(event.target.value)}
                    disabled={!isToTraderEnabled}
                  >
                    <option value="">{f.traderPlaceholder}</option>
                    {sortedTraders
                      .filter((trader) => String(trader.id) !== fromTraderId)
                      .map((trader) => (
                      <option key={`to-${trader.id}`} value={String(trader.id)}>
                        {trader.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={FIELD_STYLE}>
                  <label style={LABEL_STYLE}>{f.itemStockSourceLabel}</label>
                  <select
                    className="seasons-manager__year-input"
                    value={stockSource}
                    onChange={(event) => setStockSource(event.target.value as 'GENERAL' | 'PRIVATE_SELECTION')}
                    disabled={!fromTraderId}
                  >
                    <option value="">{f.itemStockSourcePlaceholder}</option>
                    <option value="GENERAL">{f.itemStockSourceOptions.GENERAL}</option>
                    <option value="PRIVATE_SELECTION">{f.itemStockSourceOptions.PRIVATE_SELECTION}</option>
                  </select>
                </div>
              </div>
            </>
          ) : null}

          {type === 'ASSIGNED' ? (
            <>
              <div style={ROW_STYLE}>
                <div style={FIELD_STYLE}>
                  <label style={LABEL_STYLE}>{f.toTraderLabel}</label>
                  <select
                    className="seasons-manager__year-input"
                    value={toTraderId}
                    onChange={(event) => setToTraderId(event.target.value)}
                  >
                    <option value="">{f.traderPlaceholder}</option>
                    {sortedTraders.map((trader) => (
                      <option key={`assign-to-${trader.id}`} value={String(trader.id)}>
                        {trader.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={ROW_STYLE}>
                <div style={FIELD_STYLE}>
                  <label style={LABEL_STYLE}>{f.traderCategoryLabel}</label>
                  <select
                    className="seasons-manager__year-input"
                    value={traderCategoryId}
                    onChange={(event) => {
                      setTraderCategoryId(event.target.value);
                      setGrade('');
                      setPitamStatus('');
                    }}
                    disabled={!isAssignedCategoryEnabled || assignedCategoryOptions.length === 0}
                  >
                    <option value="">{f.traderCategoryPlaceholder}</option>
                    {assignedCategoryOptions.map((category) => (
                      <option key={category.id} value={String(category.id)}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={FIELD_STYLE}>
                  <label style={LABEL_STYLE}>{f.gradeLabel}</label>
                  <select
                    className="seasons-manager__year-input"
                    value={grade}
                    onChange={(event) => {
                      setGrade(event.target.value);
                      setPitamStatus('');
                    }}
                    disabled={!isAssignedGradeEnabled || assignedGradeOptions.length === 0}
                  >
                    <option value="">{f.gradePlaceholder}</option>
                    {assignedGradeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={FIELD_STYLE}>
                  <label style={LABEL_STYLE}>{f.pitamStatusLabel}</label>
                  <select
                    className="seasons-manager__year-input"
                    value={pitamStatus}
                    onChange={(event) => setPitamStatus(event.target.value as PitamStatus | '')}
                    disabled={!isAssignedPitamEnabled || assignedPitamStatusOptions.length === 0}
                  >
                    <option value="">{f.pitamStatusPlaceholder}</option>
                    {assignedPitamStatusOptions.map((option) => (
                      <option key={option} value={option}>
                        {i18n.pitamStatuses[option] || option}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={FIELD_STYLE}>
                  <label style={LABEL_STYLE}>{f.quantityLabel}</label>
                  <input
                    className="seasons-manager__year-input"
                    type="number"
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                    placeholder={f.quantityPlaceholder}
                    aria-label={f.quantityLabel}
                    max={availableQuantityForAssigned ?? undefined}
                    disabled={!isAssignedQuantityEnabled}
                  />
                  <span
                    style={{
                      fontSize: 12,
                      opacity: 0.75,
                      visibility: availableQuantityForAssigned !== null ? 'visible' : 'hidden',
                    }}
                  >
                    {availableQuantityForAssigned !== null ? f.availableQuantityHint(availableQuantityForAssigned) : ' '}
                  </span>
                </div>
              </div>
            </>
          ) : null}

          {type === 'INTERNAL_TRANSFER' ? (
            <>
              <div style={ROW_STYLE}>
                <div style={FIELD_STYLE}>
                  <label style={LABEL_STYLE}>{f.fromTraderLabel}</label>
                  <select
                    className="seasons-manager__year-input"
                    value={fromTraderId}
                    onChange={(event) => {
                      setFromTraderId(event.target.value);
                      setTraderCategoryId('');
                      setGrade('');
                      setPitamStatus('');
                      setCustomerId('');
                      setCustomerCategoryId('');
                      setCustomerGrade('');
                    }}
                  >
                    <option value="">{f.traderPlaceholder}</option>
                    {sortedTraders.map((trader) => (
                      <option key={`transfer-from-${trader.id}`} value={String(trader.id)}>
                        {trader.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={FIELD_STYLE}>
                  <label style={LABEL_STYLE}>{f.itemStockSourceLabel}</label>
                  <select
                    className="seasons-manager__year-input"
                    value={stockSource}
                    onChange={(event) => {
                      setStockSource(event.target.value as 'GENERAL' | 'PRIVATE_SELECTION');
                      setTraderCategoryId('');
                      setGrade('');
                      setPitamStatus('');
                      setCustomerId('');
                      setCustomerCategoryId('');
                      setCustomerGrade('');
                    }}
                    disabled={!fromTraderId}
                  >
                    <option value="">{f.itemStockSourcePlaceholder}</option>
                    <option value="GENERAL">{f.itemStockSourceOptions.GENERAL}</option>
                    <option value="PRIVATE_SELECTION">{f.itemStockSourceOptions.PRIVATE_SELECTION}</option>
                  </select>
                </div>
              </div>

              <div style={ROW_STYLE}>
                <div style={FIELD_STYLE}>
                  <label style={LABEL_STYLE}>{f.traderCategoryLabel}</label>
                  <select
                    className="seasons-manager__year-input"
                    value={traderCategoryId}
                    onChange={(event) => {
                      setTraderCategoryId(event.target.value);
                      setGrade('');
                      setPitamStatus('');
                      setCustomerId('');
                      setCustomerCategoryId('');
                      setCustomerGrade('');
                    }}
                    disabled={!isItTraderCategoryEnabled || fromTraderCategoryOptions.length === 0}
                  >
                    <option value="">{f.traderCategoryPlaceholder}</option>
                    {fromTraderCategoryOptions.map((category) => (
                      <option key={category.id} value={String(category.id)}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={FIELD_STYLE}>
                  <label style={LABEL_STYLE}>{f.gradeLabel}</label>
                  <select
                    className="seasons-manager__year-input"
                    value={grade}
                    onChange={(event) => {
                      setGrade(event.target.value);
                      setPitamStatus('');
                      setCustomerId('');
                      setCustomerCategoryId('');
                      setCustomerGrade('');
                    }}
                    disabled={!isItGradeEnabled || fromTraderGradeOptions.length === 0}
                  >
                    <option value="">{f.gradePlaceholder}</option>
                    {fromTraderGradeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={FIELD_STYLE}>
                  <label style={LABEL_STYLE}>{f.pitamStatusLabel}</label>
                  <select
                    className="seasons-manager__year-input"
                    value={pitamStatus}
                    onChange={(event) => {
                      setPitamStatus(event.target.value as PitamStatus | '');
                      setCustomerId('');
                      setCustomerCategoryId('');
                      setCustomerGrade('');
                    }}
                    disabled={!isItPitamEnabled || fromTraderPitamStatusOptions.length === 0}
                  >
                    <option value="">{f.pitamStatusPlaceholder}</option>
                    {fromTraderPitamStatusOptions.map((option) => (
                      <option key={option} value={option}>
                        {i18n.pitamStatuses[option] || option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={ROW_STYLE}>
                <div style={FIELD_STYLE}>
                  <label style={LABEL_STYLE}>{f.customerLabel}</label>
                  <select
                    className="seasons-manager__year-input"
                    value={customerId}
                    onChange={(event) => {
                      setCustomerId(event.target.value);
                      setCustomerCategoryId('');
                      setCustomerGrade('');
                    }}
                    disabled={!isItCustomerEnabled}
                  >
                    <option value="">{f.customerPlaceholder}</option>
                    {sortedCustomers.map((customer) => (
                      <option key={customer.id} value={String(customer.id)}>
                        {customer.customerName}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={FIELD_STYLE}>
                  <label style={LABEL_STYLE}>{f.customerCategoryLabel}</label>
                  <select
                    className="seasons-manager__year-input"
                    value={customerCategoryId}
                    onChange={(event) => {
                      const id = event.target.value;
                      setCustomerCategoryId(id);
                      const cat = availableCustomerCategories.find((c) => String(c.id) === id);
                      setCustomerGrade(cat?.grade ?? '');
                    }}
                    disabled={!isItCustomerCategoryEnabled}
                  >
                    <option value="">{f.customerCategoryPlaceholder}</option>
                    {availableCustomerCategories.map((category) => (
                      <option key={category.id} value={String(category.id)}>
                        {category.name} - {category.grade}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={FIELD_STYLE}>
                  <label style={LABEL_STYLE}>{f.gradeLabel}</label>
                  <input
                    className="seasons-manager__year-input"
                    type="text"
                    value={customerGrade}
                    readOnly
                    placeholder={f.gradePlaceholder}
                    style={{ background: 'var(--input-disabled-bg, #f5f5f5)', cursor: 'default' }}
                  />
                </div>

                <div style={FIELD_STYLE}>
                  <label style={LABEL_STYLE}>{f.quantityLabel}</label>
                  <input
                    className="seasons-manager__year-input"
                    type="number"
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                    placeholder={f.quantityPlaceholder}
                    aria-label={f.quantityLabel}
                    max={availableQuantityForSelection ?? undefined}
                    disabled={!isItQuantityEnabled}
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
            </>
          ) : null}

          {type === 'SELF_PICKUP' ? (
            <>
              <div style={ROW_STYLE}>
                <div style={FIELD_STYLE}>
                  <label style={LABEL_STYLE}>{f.traderLabel}</label>
                  <select
                    className="seasons-manager__year-input"
                    value={traderId}
                    onChange={(event) => setTraderId(event.target.value)}
                  >
                    <option value="">{f.traderPlaceholder}</option>
                    {sortedTraders.map((trader) => (
                      <option key={`sp-trader-${trader.id}`} value={String(trader.id)}>
                        {trader.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={FIELD_STYLE}>
                  <label style={LABEL_STYLE}>{f.itemStockSourceLabel}</label>
                  <select
                    className="seasons-manager__year-input"
                    value={stockSource}
                    onChange={(event) => setStockSource(event.target.value as 'GENERAL' | 'PRIVATE_SELECTION')}
                    disabled={!traderId}
                  >
                    <option value="">{f.itemStockSourcePlaceholder}</option>
                    <option value="GENERAL">{f.itemStockSourceOptions.GENERAL}</option>
                    <option value="PRIVATE_SELECTION">{f.itemStockSourceOptions.PRIVATE_SELECTION}</option>
                  </select>
                </div>
              </div>

              <div style={ROW_STYLE}>
                <div style={FIELD_STYLE}>
                  <label style={LABEL_STYLE}>{f.traderCategoryLabel}</label>
                  <select
                    className="seasons-manager__year-input"
                    value={traderCategoryId}
                    onChange={(event) => {
                      setTraderCategoryId(event.target.value);
                      setGrade('');
                      setPitamStatus('');
                    }}
                    disabled={!isSelfPickupCategoryEnabled || fromTraderCategoryOptions.length === 0}
                  >
                    <option value="">{f.traderCategoryPlaceholder}</option>
                    {fromTraderCategoryOptions.map((category) => (
                      <option key={category.id} value={String(category.id)}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={FIELD_STYLE}>
                  <label style={LABEL_STYLE}>{f.gradeLabel}</label>
                  <select
                    className="seasons-manager__year-input"
                    value={grade}
                    onChange={(event) => {
                      setGrade(event.target.value);
                      setPitamStatus('');
                    }}
                    disabled={!isSelfPickupGradeEnabled || fromTraderGradeOptions.length === 0}
                  >
                    <option value="">{f.gradePlaceholder}</option>
                    {fromTraderGradeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={FIELD_STYLE}>
                  <label style={LABEL_STYLE}>{f.pitamStatusLabel}</label>
                  <select
                    className="seasons-manager__year-input"
                    value={pitamStatus}
                    onChange={(event) => setPitamStatus(event.target.value as PitamStatus | '')}
                    disabled={!isSelfPickupPitamEnabled || fromTraderPitamStatusOptions.length === 0}
                  >
                    <option value="">{f.pitamStatusPlaceholder}</option>
                    {fromTraderPitamStatusOptions.map((option) => (
                      <option key={option} value={option}>
                        {i18n.pitamStatuses[option] || option}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={FIELD_STYLE}>
                  <label style={LABEL_STYLE}>{f.quantityLabel}</label>
                  <input
                    className="seasons-manager__year-input"
                    type="number"
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                    placeholder={f.quantityPlaceholder}
                    aria-label={f.quantityLabel}
                    max={availableQuantityForSelection ?? undefined}
                    disabled={!isSelfPickupQuantityEnabled}
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
            </>
          ) : null}

          {type === 'WASTE' ? (
            <>
              {/* Row 1: who is the source (general/modulo or specific trader) */}
              <div style={ROW_STYLE}>
                <div style={FIELD_STYLE}>
                  <label style={LABEL_STYLE}>{f.wasteSourceLabel}</label>
                  <select
                    className="seasons-manager__year-input"
                    value={isModulo ? 'MODULO' : traderId}
                    onChange={(event) => {
                      const val = event.target.value;
                      if (val === 'MODULO') {
                        setIsModulo(true);
                        setTraderId('');
                      } else {
                        setIsModulo(false);
                        setTraderId(val);
                      }
                    }}
                  >
                    <option value="">{f.wasteSourcePlaceholder}</option>
                    <option value="MODULO">{f.moduloOption}</option>
                    {sortedTraders.map((trader) => (
                      <option key={`waste-trader-${trader.id}`} value={String(trader.id)}>
                        {trader.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Stock source — disabled until a specific trader (not modulo) is selected */}
                <div style={FIELD_STYLE}>
                  <label style={LABEL_STYLE}>{f.itemStockSourceLabel}</label>
                  <select
                    className="seasons-manager__year-input"
                    value={stockSource}
                    onChange={(event) => setStockSource(event.target.value as 'GENERAL' | 'PRIVATE_SELECTION')}
                    disabled={isModulo || !traderId}
                  >
                    <option value="">{f.itemStockSourcePlaceholder}</option>
                    <option value="GENERAL">{f.itemStockSourceOptions.GENERAL}</option>
                    <option value="PRIVATE_SELECTION">{f.itemStockSourceOptions.PRIVATE_SELECTION}</option>
                  </select>
                </div>
              </div>

              {/* Row 2: product fields */}
              <div style={ROW_STYLE}>
                <div style={FIELD_STYLE}>
                  <label style={LABEL_STYLE}>{f.traderCategoryLabel}</label>
                  <select
                    className="seasons-manager__year-input"
                    value={traderCategoryId}
                    onChange={(event) => {
                      setTraderCategoryId(event.target.value);
                      setGrade('');
                      setPitamStatus('');
                    }}
                    disabled={isModulo ? !isWasteModuloCategoryEnabled : (!isWasteTraderCategoryEnabled || fromTraderCategoryOptions.length === 0)}
                  >
                    <option value="">{f.traderCategoryPlaceholder}</option>
                    {(isModulo ? traderCategories : fromTraderCategoryOptions).map((category) => (
                      <option key={category.id} value={String(category.id)}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={FIELD_STYLE}>
                  <label style={LABEL_STYLE}>{f.gradeLabel}</label>
                  <select
                    className="seasons-manager__year-input"
                    value={grade}
                    onChange={(event) => {
                      setGrade(event.target.value);
                      setPitamStatus('');
                    }}
                    disabled={isModulo ? !isWasteModuloGradeEnabled : (!isWasteTraderGradeEnabled || fromTraderGradeOptions.length === 0)}
                  >
                    <option value="">{f.gradePlaceholder}</option>
                    {(isModulo ? GRADE_OPTIONS : fromTraderGradeOptions).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={FIELD_STYLE}>
                  <label style={LABEL_STYLE}>{f.pitamStatusLabel}</label>
                  <select
                    className="seasons-manager__year-input"
                    value={pitamStatus}
                    onChange={(event) => setPitamStatus(event.target.value as PitamStatus | '')}
                    disabled={isModulo ? !isWasteModuloPitamEnabled : (!isWasteTraderPitamEnabled || fromTraderPitamStatusOptions.length === 0)}
                  >
                    <option value="">{f.pitamStatusPlaceholder}</option>
                    {(isModulo ? PITAM_STATUS_OPTIONS : fromTraderPitamStatusOptions).map((option) => (
                      <option key={option} value={option}>
                        {i18n.pitamStatuses[option] || option}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={FIELD_STYLE}>
                  <label style={LABEL_STYLE}>{f.quantityLabel}</label>
                  <input
                    className="seasons-manager__year-input"
                    type="number"
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                    placeholder={f.quantityPlaceholder}
                    aria-label={f.quantityLabel}
                    max={availableQuantityForSelection ?? undefined}
                    disabled={isModulo ? !isWasteModuloQuantityEnabled : !isWasteTraderQuantityEnabled}
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
            </>
          ) : null}

          {type === 'OWNERSHIP_TRANSFER' ? (
            <div style={ROW_STYLE}>
              <div style={FIELD_STYLE}>
                <label style={LABEL_STYLE}>{f.traderCategoryLabel}</label>
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
              </div>

              <div style={FIELD_STYLE}>
                <label style={LABEL_STYLE}>{f.gradeLabel}</label>
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
              </div>

              <div style={FIELD_STYLE}>
                <label style={LABEL_STYLE}>{f.pitamStatusLabel}</label>
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
              </div>

              <div style={FIELD_STYLE}>
                <label style={LABEL_STYLE}>{f.quantityLabel}</label>
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

          {type && type !== 'OWNERSHIP_TRANSFER' && type !== 'INTERNAL_TRANSFER' && type !== 'ASSIGNED' && type !== 'SELF_PICKUP' && type !== 'WASTE' ? (
            <div style={ROW_STYLE}>
              <div style={FIELD_STYLE}>
                <label style={LABEL_STYLE}>{f.traderCategoryLabel}</label>
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
              </div>

              <div style={FIELD_STYLE}>
                <label style={LABEL_STYLE}>{f.gradeLabel}</label>
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
              </div>

              <div style={FIELD_STYLE}>
                <label style={LABEL_STYLE}>{f.pitamStatusLabel}</label>
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
              </div>

              <div style={FIELD_STYLE}>
                <label style={LABEL_STYLE}>{f.quantityLabel}</label>
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
            </div>
          ) : null}

          {type ? (
            <div style={ROW_STYLE}>
              <div style={{ ...FIELD_STYLE, gridColumn: '1 / -1' }}>
                <label style={LABEL_STYLE}>{f.notesLabel}</label>
                <textarea
                  className="seasons-manager__year-input"
                  rows={2}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder={f.notesPlaceholder}
                  aria-label={f.notesLabel}
                  disabled={!isNotesEnabled}
                />
              </div>
            </div>
          ) : null}
        </div>

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
