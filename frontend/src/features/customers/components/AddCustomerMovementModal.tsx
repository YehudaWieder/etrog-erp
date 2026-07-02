import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { SubmitButton } from '../../../components/ui/SubmitButton';
import type { Customer } from '../../../services/customersApi';
import type { Trader } from '../../../services/tradersApi';
import type { TraderCategoryWithShares } from '../../../services/traderCategoriesApi';
import type { CustomerCategory } from '../../../services/customerCategoriesApi';
import {
  InventoryOwnerType,
  createInternalTransfer,
  createCustomerAdjustmentMovement,
  type PitamStatus,
} from '../../../services/inventoryMovementsApi';
import { ApiError } from '../../../services/apiClient';
import { fetchCustomerInventorySummary } from '../services/customerInventorySummary.service';
import { fetchTraderInventorySummary } from '../../traders/services/traderInventorySummary.service';
import type { CustomerInventorySummaryRow } from '../customerInventory.types';
import type { AppLang } from '../../traders/i18n';

const GENERAL_TRADER_VALUE = 'GENERAL';

type CustomerMovementType = 'INTERNAL_TRANSFER' | 'SELF_PICKUP' | 'WASTE';

const MOVEMENT_TYPE_ORDER: CustomerMovementType[] = ['INTERNAL_TRANSFER', 'SELF_PICKUP', 'WASTE'];

const GRADE_OPTIONS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו'] as const;

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

const F = {
  he: {
    title: 'הוספת תנועת מלאי לקוח',
    closeLabel: 'סגור',
    typeLabel: 'סוג תנועה',
    typePlaceholder: 'בחר סוג פעולה',
    typeOptions: {
      INTERNAL_TRANSFER: 'העברה לסוחר',
      SELF_PICKUP: 'איסוף עצמי',
      WASTE: 'פחת',
    } as Record<CustomerMovementType, string>,
    customerLabel: 'לקוח',
    customerPlaceholder: 'בחר לקוח',
    customerCategoryLabel: 'קטגוריית לקוח',
    customerCategoryPlaceholder: 'בחר קטגוריה',
    gradeLabel: 'דרגה',
    pitamStatusLabel: 'סטטוס פיטם',
    pitamStatusPlaceholder: 'בחר סטטוס פיטם',
    pitamStatuses: { WITH_PITAM: 'עם פיטם', WITHOUT_PITAM: 'בלי פיטם', MIXED: 'מעורב' } as Record<string, string>,
    traderLabel: 'סוחר',
    traderPlaceholder: 'בחר סוחר',
    generalOption: 'כללי',
    traderCategoryLabel: 'קטגוריית סוחר',
    traderCategoryPlaceholder: 'בחר קטגוריית סוחר',
    gradePlaceholder: 'בחר דרגה',
    quantityPlaceholder: 'כמות',
    quantityLabel: 'כמות',
    availableQuantityHint: (n: number) => `זמין: ${n}`,
    notesPlaceholder: 'הערות (לא חובה)',
    notesLabel: 'הערות',
    validationRequired: 'יש למלא את כל שדות החובה.',
    cancel: 'ביטול',
    save: 'שמור',
    saving: 'שומר...',
  },
  en: {
    title: 'Add Customer Inventory Movement',
    closeLabel: 'Close',
    typeLabel: 'Movement Type',
    typePlaceholder: 'Select movement type',
    typeOptions: {
      INTERNAL_TRANSFER: 'Transfer to Trader',
      SELF_PICKUP: 'Self Pickup',
      WASTE: 'Waste',
    } as Record<CustomerMovementType, string>,
    customerLabel: 'Customer',
    customerPlaceholder: 'Select customer',
    customerCategoryLabel: 'Customer Category',
    customerCategoryPlaceholder: 'Select category',
    gradeLabel: 'Grade',
    pitamStatusLabel: 'Pitam Status',
    pitamStatusPlaceholder: 'Select pitam status',
    pitamStatuses: { WITH_PITAM: 'With pitam', WITHOUT_PITAM: 'Without pitam', MIXED: 'Mixed' } as Record<string, string>,
    traderLabel: 'Trader',
    traderPlaceholder: 'Select trader',
    generalOption: 'General',
    traderCategoryLabel: 'Trader Category',
    traderCategoryPlaceholder: 'Select trader category',
    gradePlaceholder: 'Select grade',
    quantityPlaceholder: 'Quantity',
    quantityLabel: 'Quantity',
    availableQuantityHint: (n: number) => `Available: ${n}`,
    notesPlaceholder: 'Notes (optional)',
    notesLabel: 'Notes',
    validationRequired: 'Please fill in all required fields.',
    cancel: 'Cancel',
    save: 'Save',
    saving: 'Saving...',
  },
} as const;

type AddCustomerMovementModalProps = {
  lang: AppLang;
  isOpen: boolean;
  seasonId: number | null;
  customers: Customer[];
  customerCategories: CustomerCategory[];
  traders: Trader[];
  traderCategories: TraderCategoryWithShares[];
  onClose: () => void;
  onSaved: () => void;
};

export function AddCustomerMovementModal({
  lang,
  isOpen,
  seasonId,
  customers,
  traders,
  traderCategories,
  onClose,
  onSaved,
}: AddCustomerMovementModalProps) {
  const f = F[lang];

  const [type, setType] = useState<CustomerMovementType | ''>('');
  const [customerId, setCustomerId] = useState('');
  const [customerCategoryId, setCustomerCategoryId] = useState('');
  const [pitamStatus, setPitamStatus] = useState<PitamStatus | ''>('');
  const [traderId, setTraderId] = useState('');
  const [traderCategoryId, setTraderCategoryId] = useState('');
  const [grade, setGrade] = useState('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerStock, setCustomerStock] = useState<CustomerInventorySummaryRow[]>([]);
  const [isLoadingStock, setIsLoadingStock] = useState(false);

  // Load customer stock when customer is selected
  useEffect(() => {
    if (!customerId || !seasonId) {
      setCustomerStock([]);
      return;
    }

    let isActive = true;
    setIsLoadingStock(true);

    fetchCustomerInventorySummary({ seasonId, customerId: Number(customerId), shipmentScope: 'UNSHIPPED' })
      .then((result) => {
        if (!isActive) return;
        setCustomerStock(result.rows.filter((row) => row.quantity > 0));
      })
      .catch(() => {
        if (!isActive) return;
        setCustomerStock([]);
      })
      .finally(() => {
        if (!isActive) return;
        setIsLoadingStock(false);
      });

    return () => {
      isActive = false;
    };
  }, [customerId, seasonId]);

  // Reset downstream fields when customer or type changes
  useEffect(() => {
    setCustomerCategoryId('');
    setPitamStatus('');
    setTraderId('');
    setTraderCategoryId('');
    setGrade('');
    setQuantity('');
  }, [customerId, type]);

  useEffect(() => {
    setPitamStatus('');
    setTraderId('');
    setTraderCategoryId('');
    setGrade('');
    setQuantity('');
  }, [customerCategoryId]);

  useEffect(() => {
    setTraderId('');
    setTraderCategoryId('');
    setGrade('');
    setQuantity('');
  }, [pitamStatus]);

  const availableCategoryOptions = useMemo(() => {
    const seen = new Map<number, { name: string; grade: string | null }>();
    for (const row of customerStock) {
      if (!seen.has(row.customerCategoryId)) {
        seen.set(row.customerCategoryId, {
          name: row.customerCategoryName ?? `#${row.customerCategoryId}`,
          grade: row.categoryGrade,
        });
      }
    }
    return [...seen.entries()].map(([id, info]) => ({ id, name: info.name, grade: info.grade }));
  }, [customerStock]);

  const selectedCategoryGrade = useMemo(
    () => availableCategoryOptions.find((c) => String(c.id) === customerCategoryId)?.grade ?? '',
    [availableCategoryOptions, customerCategoryId],
  );

  const availablePitamOptions = useMemo(() => {
    if (!customerCategoryId) return [];
    return [...new Set(
      customerStock
        .filter((row) => String(row.customerCategoryId) === customerCategoryId)
        .map((row) => row.pitamStatus),
    )];
  }, [customerStock, customerCategoryId]);

  const availableQuantity = useMemo(() => {
    if (!customerCategoryId || !pitamStatus) return null;
    const match = customerStock.find(
      (row) => String(row.customerCategoryId) === customerCategoryId && row.pitamStatus === pitamStatus,
    );
    return match ? match.quantity : null;
  }, [customerStock, customerCategoryId, pitamStatus]);

  const sortedCustomers = useMemo(
    () => [...customers].sort((a, b) => a.customerName.localeCompare(b.customerName, undefined, { sensitivity: 'base' })),
    [customers],
  );

  const sortedTraders = useMemo(
    () => [...traders].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
    [traders],
  );

  // Sequential gating
  const isCategoryEnabled = Boolean(customerId) && !isLoadingStock;
  const isPitamEnabled = isCategoryEnabled && Boolean(customerCategoryId);
  const isPitamFilled = isPitamEnabled && Boolean(pitamStatus);

  // For SELF_PICKUP / WASTE: quantity comes right after pitamStatus
  const isAdjustmentQuantityEnabled = isPitamFilled;

  // For INTERNAL_TRANSFER: trader fields come after pitamStatus, quantity comes last
  const isTraderEnabled = isPitamFilled;
  const isTraderCategoryEnabled = isTraderEnabled && Boolean(traderId);
  const isGradeEnabled = isTraderCategoryEnabled && Boolean(traderCategoryId);
  const isItQuantityEnabled = isGradeEnabled && Boolean(grade);

  const isNotesEnabled =
    type === 'INTERNAL_TRANSFER'
      ? isItQuantityEnabled && quantity !== ''
      : isAdjustmentQuantityEnabled && quantity !== '';

  if (!isOpen) return null;

  const resetForm = () => {
    setType('');
    setCustomerId('');
    setCustomerCategoryId('');
    setPitamStatus('');
    setTraderId('');
    setTraderCategoryId('');
    setGrade('');
    setQuantity('');
    setNotes('');
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    setError(null);

    if (!type || !customerId || !customerCategoryId || !pitamStatus) {
      setError(f.validationRequired);
      return;
    }

    if (type === 'INTERNAL_TRANSFER' && (!traderId || !traderCategoryId || !grade)) {
      setError(f.validationRequired);
      return;
    }

    const quantityNumber = Number(quantity);
    if (!quantity || Number.isNaN(quantityNumber) || quantityNumber <= 0) {
      setError(f.validationRequired);
      return;
    }

    const nowIso = new Date().toISOString();

    try {
      setIsSubmitting(true);

      if (type === 'INTERNAL_TRANSFER') {
        if (traderId === GENERAL_TRADER_VALUE) {
          // General distribution: same logic as harvest general sorting
          const selectedCategory = traderCategories.find((c) => String(c.id) === traderCategoryId);
          const shares = selectedCategory?.shares ?? [];

          const allocations = shares.map((share) => ({
            traderId: share.traderId,
            quantity: Math.floor((quantityNumber * share.percent) / 100),
          }));

          const canDistributeToAll = allocations.length > 0 && allocations.every((a) => a.quantity > 0);
          const totalAllocated = canDistributeToAll
            ? allocations.reduce((sum, a) => sum + a.quantity, 0)
            : 0;
          const remainder = quantityNumber - totalAllocated;

          const baseFrom = {
            date: nowIso,
            fromOwnerType: InventoryOwnerType.CUSTOMER,
            fromCustomerId: Number(customerId),
            fromCustomerCategoryId: Number(customerCategoryId),
            fromPitamStatus: pitamStatus as PitamStatus,
            toTraderCategoryId: Number(traderCategoryId),
            toGrade: grade,
            notes: notes || null,
          };

          if (canDistributeToAll) {
            for (const allocation of allocations) {
              await createInternalTransfer({
                ...baseFrom,
                type: 'INTERNAL_TRANSFER',
                quantity: allocation.quantity,
                toOwnerType: InventoryOwnerType.TRADER,
                toTraderId: allocation.traderId,
              });
            }
          }

          // Remainder (or everything if can't distribute) goes to MODULO
          const moduloAmount = canDistributeToAll ? remainder : quantityNumber;
          if (moduloAmount > 0) {
            await createInternalTransfer({
              ...baseFrom,
              type: 'INTERNAL_TRANSFER',
              quantity: moduloAmount,
              toOwnerType: InventoryOwnerType.MODULO,
            });
          }

          // Try to redistribute accumulated MODULO pool (same as tryAssignFromModuloPool)
          if (seasonId && shares.length > 0) {
            const moduloStock = await fetchTraderInventorySummary({
              seasonId,
              traderId: null,
              ownerScope: 'MODULO',
              shipmentScope: 'UNSHIPPED',
            });

            const moduloRow = moduloStock.rows.find(
              (r) =>
                String(r.traderCategoryId) === traderCategoryId &&
                r.grade === grade &&
                r.pitamStatus === pitamStatus,
            );
            const moduloBalance = moduloRow?.quantity ?? 0;

            if (moduloBalance > 0) {
              const moduloAllocations = shares.map((share) => ({
                traderId: share.traderId,
                quantity: Math.floor((moduloBalance * share.percent) / 100),
              }));

              if (moduloAllocations.every((a) => a.quantity > 0)) {
                for (const allocation of moduloAllocations) {
                  await createInternalTransfer({
                    type: 'ASSIGNED',
                    date: nowIso,
                    quantity: allocation.quantity,
                    pitamStatus: pitamStatus as PitamStatus,
                    grade,
                    traderCategoryId: Number(traderCategoryId),
                    fromOwnerType: InventoryOwnerType.MODULO,
                    toOwnerType: InventoryOwnerType.TRADER,
                    toTraderId: allocation.traderId,
                    notes: notes || null,
                  });
                }
              }
            }
          }
        } else {
          // Specific trader → enters as private selection (מיון פרטי)
          await createInternalTransfer({
            type: 'PRIVATE_SELECTION',
            date: nowIso,
            quantity: quantityNumber,
            fromOwnerType: InventoryOwnerType.CUSTOMER,
            fromCustomerId: Number(customerId),
            fromCustomerCategoryId: Number(customerCategoryId),
            fromPitamStatus: pitamStatus as PitamStatus,
            toOwnerType: InventoryOwnerType.TRADER,
            toTraderId: Number(traderId),
            toTraderCategoryId: Number(traderCategoryId),
            toGrade: grade,
            notes: notes || null,
          });
        }
      } else {
        await createCustomerAdjustmentMovement({
          date: nowIso,
          dateHebrew: new Date(nowIso).toLocaleDateString('he-IL'),
          customerId: Number(customerId),
          customerCategoryId: Number(customerCategoryId),
          pitamStatus: pitamStatus as PitamStatus,
          quantity: quantityNumber,
          type,
          takenFrom: 'GENERAL',
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
          {/* Row 1: movement type */}
          <div style={ROW_STYLE}>
            <div style={{ ...FIELD_STYLE, gridColumn: '1 / -1' }}>
              <label style={LABEL_STYLE}>{f.typeLabel}</label>
              <select
                className="seasons-manager__year-input"
                value={type}
                onChange={(event) => {
                  setType(event.target.value as CustomerMovementType | '');
                  setError(null);
                }}
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

          {type ? (
            <>
              {/* Row 2: customer + category + grade (read-only) + pitamStatus */}
              <div style={ROW_STYLE}>
                <div style={FIELD_STYLE}>
                  <label style={LABEL_STYLE}>{f.customerLabel}</label>
                  <select
                    className="seasons-manager__year-input"
                    value={customerId}
                    onChange={(event) => setCustomerId(event.target.value)}
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
                    onChange={(event) => setCustomerCategoryId(event.target.value)}
                    disabled={!isCategoryEnabled || availableCategoryOptions.length === 0}
                  >
                    <option value="">{f.customerCategoryPlaceholder}</option>
                    {availableCategoryOptions.map((cat) => (
                      <option key={cat.id} value={String(cat.id)}>
                        {cat.name}{cat.grade ? ` - ${cat.grade}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={FIELD_STYLE}>
                  <label style={LABEL_STYLE}>{f.gradeLabel}</label>
                  <input
                    className="seasons-manager__year-input"
                    type="text"
                    value={selectedCategoryGrade}
                    readOnly
                    placeholder={f.gradePlaceholder}
                    style={{ background: 'var(--input-disabled-bg, #f5f5f5)', cursor: 'default' }}
                  />
                </div>

                <div style={FIELD_STYLE}>
                  <label style={LABEL_STYLE}>{f.pitamStatusLabel}</label>
                  <select
                    className="seasons-manager__year-input"
                    value={pitamStatus}
                    onChange={(event) => setPitamStatus(event.target.value as PitamStatus | '')}
                    disabled={!isPitamEnabled || availablePitamOptions.length === 0}
                  >
                    <option value="">{f.pitamStatusPlaceholder}</option>
                    {availablePitamOptions.map((option) => (
                      <option key={option} value={option}>
                        {f.pitamStatuses[option] || option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 3: quantity for SELF_PICKUP / WASTE */}
              {type !== 'INTERNAL_TRANSFER' ? (
                <div style={ROW_STYLE}>
                  <div style={FIELD_STYLE}>
                    <label style={LABEL_STYLE}>{f.quantityLabel}</label>
                    <input
                      className="seasons-manager__year-input"
                      type="number"
                      value={quantity}
                      onChange={(event) => setQuantity(event.target.value)}
                      placeholder={f.quantityPlaceholder}
                      aria-label={f.quantityLabel}
                      max={availableQuantity ?? undefined}
                      disabled={!isAdjustmentQuantityEnabled}
                    />
                    <span
                      style={{
                        fontSize: 12,
                        opacity: 0.75,
                        visibility: availableQuantity !== null ? 'visible' : 'hidden',
                      }}
                    >
                      {availableQuantity !== null ? f.availableQuantityHint(availableQuantity) : ' '}
                    </span>
                  </div>
                </div>
              ) : null}

              {/* Row 3: trader + trader category + grade + quantity (INTERNAL_TRANSFER only) */}
              {type === 'INTERNAL_TRANSFER' ? (
                <div style={ROW_STYLE}>
                  <div style={FIELD_STYLE}>
                    <label style={LABEL_STYLE}>{f.traderLabel}</label>
                    <select
                      className="seasons-manager__year-input"
                      value={traderId}
                      onChange={(event) => {
                        setTraderId(event.target.value);
                        setTraderCategoryId('');
                        setGrade('');
                        setQuantity('');
                      }}
                      disabled={!isTraderEnabled}
                    >
                      <option value="">{f.traderPlaceholder}</option>
                      <option value={GENERAL_TRADER_VALUE}>{f.generalOption}</option>
                      {sortedTraders.map((trader) => (
                        <option key={trader.id} value={String(trader.id)}>
                          {trader.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={FIELD_STYLE}>
                    <label style={LABEL_STYLE}>{f.traderCategoryLabel}</label>
                    <select
                      className="seasons-manager__year-input"
                      value={traderCategoryId}
                      onChange={(event) => {
                        setTraderCategoryId(event.target.value);
                        setGrade('');
                        setQuantity('');
                      }}
                      disabled={!isTraderCategoryEnabled}
                    >
                      <option value="">{f.traderCategoryPlaceholder}</option>
                      {traderCategories.map((cat) => (
                        <option key={cat.id} value={String(cat.id)}>
                          {cat.name}
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
                        setQuantity('');
                      }}
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
                    <label style={LABEL_STYLE}>{f.quantityLabel}</label>
                    <input
                      className="seasons-manager__year-input"
                      type="number"
                      value={quantity}
                      onChange={(event) => setQuantity(event.target.value)}
                      placeholder={f.quantityPlaceholder}
                      aria-label={f.quantityLabel}
                      max={availableQuantity ?? undefined}
                      disabled={!isItQuantityEnabled}
                    />
                    <span
                      style={{
                        fontSize: 12,
                        opacity: 0.75,
                        visibility: availableQuantity !== null ? 'visible' : 'hidden',
                      }}
                    >
                      {availableQuantity !== null ? f.availableQuantityHint(availableQuantity) : ' '}
                    </span>
                  </div>
                </div>
              ) : null}

              {/* Notes row */}
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
            </>
          ) : null}
        </div>

        {error ? <p className="seasons-manager__error">{error}</p> : null}

        <div className="modal-actions">
          <button className="btn btn-danger" type="button" onClick={handleClose}>
            {f.cancel}
          </button>
          <SubmitButton
            className="btn btn-success"
            type="button"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            loadingText={f.saving}
          >
            {f.save}
          </SubmitButton>
        </div>
      </div>
    </div>
  );
}
