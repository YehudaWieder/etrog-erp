import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { SubmitButton } from '../../../components/ui/SubmitButton';
import { TopLoadingBar } from '../../../components/ui/TopLoadingBar';
import type { AppLang } from '../i18n';
import { getTraderMovementsI18n } from '../i18n';
import type { Trader } from '../../../services/tradersApi';
import type { Customer } from '../../../services/customersApi';
import type { TraderCategoryWithShares } from '../../../services/traderCategoriesApi';
import type { CustomerCategory } from '../../../services/customerCategoriesApi';
import {
  InventoryOwnerType,
  createCustomerGeneralTransfer,
  createInternalTransfer,
  createPitamSplitMovement,
  createTraderAdjustmentMovement,
  undoPitamSplitBatch,
  type InternalTransferMovementType,
  type PitamSplitSource,
  type PitamStatus,
  type TraderAdjustmentMovementType,
} from '../../../services/inventoryMovementsApi';
import { ApiError } from '../../../services/apiClient';
import { fetchTraderInventorySummary } from '../services/traderInventorySummary.service';
import { usePitamSplitBatches } from '../hooks/usePitamSplitBatches';
import { PitamSplitUndoBatchPicker } from './PitamSplitUndoBatchPicker';
import type { TraderInventorySummaryRow } from '../traderInventory.types';

const GRADE_OPTIONS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו'] as const;
const PITAM_STATUS_OPTIONS: PitamStatus[] = ['WITH_PITAM', 'WITHOUT_PITAM', 'MIXED'];

type MovementType = InternalTransferMovementType | TraderAdjustmentMovementType | 'PITAM_SPLIT' | 'PITAM_SPLIT_UNDO';

const MOVEMENT_TYPE_ORDER: Array<Exclude<MovementType, 'PRIVATE_SELECTION'>> = [
  'OWNERSHIP_TRANSFER',
  'ASSIGNED',
  'INTERNAL_TRANSFER',
  'SELF_PICKUP',
  'WASTE',
  'PITAM_SPLIT',
  'PITAM_SPLIT_UNDO',
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
  // Only used for INTERNAL_TRANSFER when the trader's pitamStatus is MIXED — the customer side
  // can't stay "mixed", so the user must pick the actual resolved status for the customer record.
  const [customerPitamStatus, setCustomerPitamStatus] = useState<PitamStatus | ''>('');
  const [quantity, setQuantity] = useState('');
  const [pitamSplitSource, setPitamSplitSource] = useState<PitamSplitSource | ''>('');
  const [withQty, setWithQty] = useState('');
  const [withoutQty, setWithoutQty] = useState('');
  const [pitamSplitUndoBatchId, setPitamSplitUndoBatchId] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fromTraderStock, setFromTraderStock] = useState<TraderInventorySummaryRow[]>([]);
  const [isLoadingFromTraderStock, setIsLoadingFromTraderStock] = useState(false);
  const [generalStock, setGeneralStock] = useState<TraderInventorySummaryRow[]>([]);
  const [isLoadingGeneralStock, setIsLoadingGeneralStock] = useState(false);
  const [generalTransferStock, setGeneralTransferStock] = useState<TraderInventorySummaryRow[]>([]);
  const [isLoadingGeneralTransferStock, setIsLoadingGeneralTransferStock] = useState(false);

  // ASSIGNED, WASTE (general/modulo source), and PITAM_SPLIT (MODULO source) all allocate from MODULO stock.
  useEffect(() => {
    const needsGeneralStock = type === 'ASSIGNED' || (type === 'WASTE' && isModulo) || (type === 'PITAM_SPLIT' && pitamSplitSource === 'MODULO');
    if (!needsGeneralStock || !seasonId) {
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
  }, [type, isModulo, pitamSplitSource, seasonId]);

  // INTERNAL_TRANSFER "General" (customer allocation from general pool) draws from MODULO first,
  // then proportionally from every trader's share — so what's actually offerable is the union of
  // MODULO stock and stock held across all traders combined. PITAM_SPLIT "GENERAL" reuses the same
  // combined pool purely to compute an informational MIXED-availability hint (the server is the
  // source of truth for the actual per-trader share split).
  useEffect(() => {
    const needsCombinedStock = (type === 'INTERNAL_TRANSFER' && isModulo) || (type === 'PITAM_SPLIT' && pitamSplitSource === 'GENERAL');
    if (!needsCombinedStock || !seasonId) {
      setGeneralTransferStock([]);
      return;
    }

    let isActive = true;
    setIsLoadingGeneralTransferStock(true);

    fetchTraderInventorySummary({ seasonId, traderId: null, ownerScope: 'ALL', shipmentScope: 'UNSHIPPED' })
      .then((result) => {
        if (!isActive) return;
        setGeneralTransferStock(result.rows.filter((row) => row.quantity > 0));
      })
      .catch(() => {
        if (!isActive) return;
        setGeneralTransferStock([]);
      })
      .finally(() => {
        if (!isActive) return;
        setIsLoadingGeneralTransferStock(false);
      });

    return () => {
      isActive = false;
    };
  }, [type, isModulo, pitamSplitSource, seasonId]);

  // Ownership, internal transfers, self-pickup, waste (trader), and PITAM_SPLIT (SPECIFIC_TRADER)
  // all use the source trader's actual stock.
  useEffect(() => {
    const isPitamSplitTrader = type === 'PITAM_SPLIT' && pitamSplitSource === 'SPECIFIC_TRADER';
    const activeFromTraderId = (type === 'SELF_PICKUP' || type === 'WASTE' || isPitamSplitTrader) ? traderId : fromTraderId;
    const isWaste = type === 'WASTE';
    const isInternalTransferGeneral = type === 'INTERNAL_TRANSFER' && isModulo;
    const needsStockSource = type !== 'WASTE' && !isPitamSplitTrader || (type === 'WASTE' && !isModulo);
    if (
      isInternalTransferGeneral ||
      (type !== 'OWNERSHIP_TRANSFER' && type !== 'INTERNAL_TRANSFER' && type !== 'SELF_PICKUP' && !isWaste && !isPitamSplitTrader) ||
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

  const { batches: pitamSplitUndoBatches, isLoading: isPitamSplitUndoLoading } = usePitamSplitBatches(
    type === 'PITAM_SPLIT_UNDO',
    { seasonId },
  );

  const traderCategoryOrderById = useMemo(() => {
    const map = new Map<number, number>();
    for (const category of traderCategories) {
      map.set(category.id, category.orderIndex);
    }
    return map;
  }, [traderCategories]);

  const sortCategoryOptionsByPriority = (options: Array<{ id: number; name: string }>) =>
    [...options].sort((left, right) => {
      const li = traderCategoryOrderById.get(left.id);
      const ri = traderCategoryOrderById.get(right.id);
      if (li !== undefined && ri !== undefined) return li - ri;
      if (li !== undefined) return -1;
      if (ri !== undefined) return 1;
      return left.name.localeCompare(right.name);
    });

  const fromTraderCategoryOptions = useMemo(() => {
    const seen = new Map<number, string>();
    for (const row of fromTraderStock) {
      if (!seen.has(row.traderCategoryId)) {
        seen.set(row.traderCategoryId, row.traderCategoryName ?? `#${row.traderCategoryId}`);
      }
    }
    return sortCategoryOptionsByPriority([...seen.entries()].map(([id, name]) => ({ id, name })));
  }, [fromTraderStock, traderCategoryOrderById]);

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

  // Shared by ASSIGNED and WASTE (general/modulo source) — both draw purely from MODULO stock.
  const generalCategoryOptions = useMemo(() => {
    const seen = new Map<number, string>();
    for (const row of generalStock) {
      if (!seen.has(row.traderCategoryId)) {
        seen.set(row.traderCategoryId, row.traderCategoryName ?? `#${row.traderCategoryId}`);
      }
    }
    return sortCategoryOptionsByPriority([...seen.entries()].map(([id, name]) => ({ id, name })));
  }, [generalStock, traderCategoryOrderById]);

  const generalGradeOptions = useMemo(() => {
    if (!traderCategoryId) return [];
    return [...new Set(
      generalStock
        .filter((row) => String(row.traderCategoryId) === traderCategoryId)
        .map((row) => row.grade),
    )];
  }, [generalStock, traderCategoryId]);

  const generalPitamStatusOptions = useMemo(() => {
    if (!traderCategoryId || !grade) return [];
    return [...new Set(
      generalStock
        .filter((row) => String(row.traderCategoryId) === traderCategoryId && row.grade === grade)
        .map((row) => row.pitamStatus),
    )];
  }, [generalStock, traderCategoryId, grade]);

  // INTERNAL_TRANSFER "General" — options come from the combined MODULO + all-traders pool.
  const generalTransferCategoryOptions = useMemo(() => {
    const seen = new Map<number, string>();
    for (const row of generalTransferStock) {
      if (!seen.has(row.traderCategoryId)) {
        seen.set(row.traderCategoryId, row.traderCategoryName ?? `#${row.traderCategoryId}`);
      }
    }
    return sortCategoryOptionsByPriority([...seen.entries()].map(([id, name]) => ({ id, name })));
  }, [generalTransferStock, traderCategoryOrderById]);

  const generalTransferGradeOptions = useMemo(() => {
    if (!traderCategoryId) return [];
    return [...new Set(
      generalTransferStock
        .filter((row) => String(row.traderCategoryId) === traderCategoryId)
        .map((row) => row.grade),
    )];
  }, [generalTransferStock, traderCategoryId]);

  const generalTransferPitamStatusOptions = useMemo(() => {
    if (!traderCategoryId || !grade) return [];
    return [...new Set(
      generalTransferStock
        .filter((row) => String(row.traderCategoryId) === traderCategoryId && row.grade === grade)
        .map((row) => row.pitamStatus),
    )];
  }, [generalTransferStock, traderCategoryId, grade]);

  const availableQuantityForAssigned = useMemo(() => {
    if (type !== 'ASSIGNED' || !traderCategoryId || !grade || !pitamStatus) return null;
    const match = generalStock.find(
      (row) => String(row.traderCategoryId) === traderCategoryId && row.grade === grade && row.pitamStatus === pitamStatus,
    );
    return match ? match.quantity : null;
  }, [type, generalStock, traderCategoryId, grade, pitamStatus]);

  const availableQuantityForSelection = useMemo(() => {
    if (!traderCategoryId || !grade || !pitamStatus) return null;

    if (type === 'WASTE' && isModulo) {
      const match = generalStock.find(
        (row) => String(row.traderCategoryId) === traderCategoryId && row.grade === grade && row.pitamStatus === pitamStatus,
      );
      return match ? match.quantity : null;
    }

    if (type === 'INTERNAL_TRANSFER' && isModulo) {
      // Combined MODULO + all-traders pool can have several matching rows (one per trader) — sum them.
      const total = generalTransferStock
        .filter((row) => String(row.traderCategoryId) === traderCategoryId && row.grade === grade && row.pitamStatus === pitamStatus)
        .reduce((sum, row) => sum + row.quantity, 0);
      return total > 0 ? total : null;
    }

    const isWasteTrader = type === 'WASTE' && !isModulo && Boolean(stockSource);
    if (type !== 'OWNERSHIP_TRANSFER' && type !== 'INTERNAL_TRANSFER' && type !== 'SELF_PICKUP' && !isWasteTrader) {
      return null;
    }
    const match = fromTraderStock.find(
      (row) => String(row.traderCategoryId) === traderCategoryId && row.grade === grade && row.pitamStatus === pitamStatus,
    );
    return match ? match.quantity : null;
  }, [type, isModulo, generalStock, generalTransferStock, fromTraderStock, stockSource, traderCategoryId, grade, pitamStatus]);

  useEffect(() => {
    if (type !== 'PITAM_SPLIT') return;
    setTraderCategoryId('');
    setGrade('');
    setWithQty('');
    setWithoutQty('');
  }, [type, pitamSplitSource, traderId]);

  // Reset downstream selections whenever the source trader or stock source changes.
  useEffect(() => {
    if (type !== 'OWNERSHIP_TRANSFER' && type !== 'INTERNAL_TRANSFER') return;
    setStockSource('');
    setTraderCategoryId('');
    setGrade('');
    setPitamStatus('');
    setCustomerPitamStatus('');
  }, [type, fromTraderId, isModulo]);

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

  // When isModulo is set (WASTE general or INTERNAL_TRANSFER "General"), grade/pitam come from a
  // different pool entirely (generalStock / generalTransferStock, not fromTraderStock) — those
  // cases are validated by their own dedicated effects below, so skip this trader-stock check then.
  useEffect(() => {
    const usesOtherPool = isModulo && (type === 'WASTE' || type === 'INTERNAL_TRANSFER');
    if ((type !== 'OWNERSHIP_TRANSFER' && type !== 'INTERNAL_TRANSFER' && type !== 'SELF_PICKUP' && type !== 'WASTE') || !grade || usesOtherPool) return;
    if (!fromTraderGradeOptions.includes(grade)) {
      setGrade('');
    }
  }, [type, fromTraderGradeOptions, grade, isModulo]);

  useEffect(() => {
    const usesOtherPool = isModulo && (type === 'WASTE' || type === 'INTERNAL_TRANSFER');
    if ((type !== 'OWNERSHIP_TRANSFER' && type !== 'INTERNAL_TRANSFER' && type !== 'SELF_PICKUP' && type !== 'WASTE') || !pitamStatus || usesOtherPool) return;
    if (!fromTraderPitamStatusOptions.includes(pitamStatus)) {
      setPitamStatus('');
    }
  }, [type, fromTraderPitamStatusOptions, pitamStatus, isModulo]);

  // ASSIGNED and WASTE (general/modulo source) both offer grade/pitam filtered to actual MODULO stock.
  useEffect(() => {
    const usesGeneralStock = type === 'ASSIGNED' || (type === 'WASTE' && isModulo);
    if (!usesGeneralStock || !grade) return;
    if (!generalGradeOptions.includes(grade)) {
      setGrade('');
    }
  }, [type, isModulo, generalGradeOptions, grade]);

  useEffect(() => {
    const usesGeneralStock = type === 'ASSIGNED' || (type === 'WASTE' && isModulo);
    if (!usesGeneralStock || !pitamStatus) return;
    if (!(generalPitamStatusOptions as string[]).includes(pitamStatus)) {
      setPitamStatus('');
    }
  }, [type, isModulo, generalPitamStatusOptions, pitamStatus]);

  // INTERNAL_TRANSFER "General" offers grade/pitam filtered to the combined MODULO + all-traders pool.
  useEffect(() => {
    const usesGeneralTransferStock = type === 'INTERNAL_TRANSFER' && isModulo;
    if (!usesGeneralTransferStock || !grade) return;
    if (!generalTransferGradeOptions.includes(grade)) {
      setGrade('');
    }
  }, [type, isModulo, generalTransferGradeOptions, grade]);

  useEffect(() => {
    const usesGeneralTransferStock = type === 'INTERNAL_TRANSFER' && isModulo;
    if (!usesGeneralTransferStock || !pitamStatus) return;
    if (!(generalTransferPitamStatusOptions as string[]).includes(pitamStatus)) {
      setPitamStatus('');
    }
  }, [type, isModulo, generalTransferPitamStatusOptions, pitamStatus]);

  // PITAM_SPLIT reuses the same stock queries as the movement types above, selecting the right one
  // per source and filtering to MIXED rows only (the only status a split can resolve).
  const pitamSplitStockRows = useMemo(() => {
    if (type !== 'PITAM_SPLIT') return [];
    if (pitamSplitSource === 'SPECIFIC_TRADER') return fromTraderStock;
    if (pitamSplitSource === 'MODULO') return generalStock;
    if (pitamSplitSource === 'GENERAL') return generalTransferStock;
    return [];
  }, [type, pitamSplitSource, fromTraderStock, generalStock, generalTransferStock]);

  const pitamSplitMixedRows = useMemo(
    () => pitamSplitStockRows.filter((row) => row.pitamStatus === 'MIXED'),
    [pitamSplitStockRows],
  );

  const pitamSplitCategoryOptions = useMemo(() => {
    const seen = new Map<number, string>();
    for (const row of pitamSplitMixedRows) {
      if (!seen.has(row.traderCategoryId)) {
        seen.set(row.traderCategoryId, row.traderCategoryName ?? `#${row.traderCategoryId}`);
      }
    }
    return sortCategoryOptionsByPriority([...seen.entries()].map(([id, name]) => ({ id, name })));
  }, [pitamSplitMixedRows, traderCategoryOrderById]);

  const pitamSplitGradeOptions = useMemo(() => {
    if (!traderCategoryId) return [];
    return [...new Set(
      pitamSplitMixedRows
        .filter((row) => String(row.traderCategoryId) === traderCategoryId)
        .map((row) => row.grade),
    )];
  }, [pitamSplitMixedRows, traderCategoryId]);

  // Informational only — GENERAL sums MIXED stock across all traders (and modulo) combined, since
  // the actual per-trader share split is computed authoritatively on the server.
  const pitamSplitAvailable = useMemo(() => {
    if (type !== 'PITAM_SPLIT' || !traderCategoryId || !grade) return null;
    const total = pitamSplitMixedRows
      .filter((row) => String(row.traderCategoryId) === traderCategoryId && row.grade === grade)
      .reduce((sum, row) => sum + row.quantity, 0);
    return total > 0 ? total : null;
  }, [type, pitamSplitMixedRows, traderCategoryId, grade]);

  const isPitamSplitLoading = pitamSplitSource === 'SPECIFIC_TRADER'
    ? isLoadingFromTraderStock
    : pitamSplitSource === 'MODULO'
      ? isLoadingGeneralStock
      : pitamSplitSource === 'GENERAL'
        ? isLoadingGeneralTransferStock
        : false;

  const isPitamSplitSourceReady = pitamSplitSource === 'SPECIFIC_TRADER' ? Boolean(traderId) : Boolean(pitamSplitSource);
  const isPitamSplitCategoryEnabled = type === 'PITAM_SPLIT' && isPitamSplitSourceReady && !isPitamSplitLoading;
  const isPitamSplitGradeEnabled = isPitamSplitCategoryEnabled && Boolean(traderCategoryId);
  const isPitamSplitQuantityEnabled = isPitamSplitGradeEnabled && Boolean(grade);

  const pitamSplitTotalExceedsAvailable = pitamSplitAvailable !== null
    && (Number(withQty || 0) + Number(withoutQty || 0)) > pitamSplitAvailable;

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
  // When isModulo (General) is chosen, there is no single source trader/stockSource to wait on.
  const isItTraderCategoryEnabled = type === 'INTERNAL_TRANSFER' && (
    isModulo
      ? !isLoadingGeneralTransferStock
      : Boolean(fromTraderId) && Boolean(stockSource) && !isLoadingFromTraderStock
  );
  const isItGradeEnabled = isItTraderCategoryEnabled && Boolean(traderCategoryId);
  const isItPitamEnabled = isItGradeEnabled && Boolean(grade);
  const isItCustomerEnabled = isItPitamEnabled && Boolean(pitamStatus);
  const isItCustomerCategoryEnabled = isItCustomerEnabled && Boolean(customerId);
  const isItCustomerGradeEnabled = isItCustomerCategoryEnabled && Boolean(customerCategoryId);
  // When the trader's pitam status is MIXED, the customer-side status must be explicitly resolved
  // (a customer can't own "mixed" stock) before the transfer is considered complete.
  const isItCustomerPitamReady = pitamStatus !== 'MIXED' || Boolean(customerPitamStatus);
  const isItQuantityEnabled = isItCustomerGradeEnabled && isItCustomerPitamReady;

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

  const isWasteModuloCategoryEnabled = type === 'WASTE' && isModulo && !isLoadingGeneralStock;
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
          : type === 'PITAM_SPLIT'
            ? isPitamSplitQuantityEnabled && (withQty !== '' || withoutQty !== '')
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
    setCustomerPitamStatus('');
    setQuantity('');
    setPitamSplitSource('');
    setWithQty('');
    setWithoutQty('');
    setPitamSplitUndoBatchId('');
    setNotes('');
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleTypeChange = (nextType: MovementType | '') => {
    setType(nextType);
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
    setCustomerPitamStatus('');
    setQuantity('');
    setPitamSplitSource('');
    setWithQty('');
    setWithoutQty('');
    setPitamSplitUndoBatchId('');
    setError(null);
  };

  const handleSubmit = async () => {
    setError(null);

    if (!type) {
      setError(f.validationRequired);
      return;
    }

    if (type === 'PITAM_SPLIT') {
      const withQtyNumber = Number(withQty || 0);
      const withoutQtyNumber = Number(withoutQty || 0);

      if (
        !pitamSplitSource || !traderCategoryId || !grade ||
        (pitamSplitSource === 'SPECIFIC_TRADER' && !traderId) ||
        Number.isNaN(withQtyNumber) || Number.isNaN(withoutQtyNumber) ||
        withQtyNumber < 0 || withoutQtyNumber < 0 ||
        withQtyNumber + withoutQtyNumber <= 0
      ) {
        setError(f.validationRequired);
        return;
      }

      if (pitamSplitAvailable !== null && withQtyNumber + withoutQtyNumber > pitamSplitAvailable) {
        setError(f.pitamSplitExceedsAvailableError(pitamSplitAvailable));
        return;
      }

      try {
        setIsSubmitting(true);
        await createPitamSplitMovement({
          source: pitamSplitSource,
          traderId: pitamSplitSource === 'SPECIFIC_TRADER' ? Number(traderId) : undefined,
          traderCategoryId: Number(traderCategoryId),
          grade,
          withQty: withQtyNumber,
          withoutQty: withoutQtyNumber,
          notes: notes || null,
        });

        resetForm();
        onSaved();
      } catch (submitError) {
        setError(submitError instanceof ApiError ? submitError.message : f.validationRequired);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (type === 'PITAM_SPLIT_UNDO') {
      if (!pitamSplitUndoBatchId) {
        setError(f.validationRequired);
        return;
      }

      try {
        setIsSubmitting(true);
        await undoPitamSplitBatch(pitamSplitUndoBatchId);

        resetForm();
        onSaved();
      } catch (submitError) {
        setError(submitError instanceof ApiError ? submitError.message : f.validationRequired);
      } finally {
        setIsSubmitting(false);
      }
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
        if (
          !traderCategoryId || !grade || !pitamStatus || !customerId || !customerCategoryId || !customerGrade ||
          (!isModulo && !fromTraderId) ||
          (pitamStatus === 'MIXED' && !customerPitamStatus)
        ) {
          setError(f.validationRequired);
          return;
        }

        if (isModulo) {
          await createCustomerGeneralTransfer({
            date: nowIso,
            dateHebrew: new Date(nowIso).toLocaleDateString('he-IL'),
            quantity: quantityNumber,
            pitamStatus,
            grade,
            traderCategoryId: Number(traderCategoryId),
            customerId: Number(customerId),
            customerCategoryId: Number(customerCategoryId),
            notes: notes || null,
          });
        } else {
          await createInternalTransfer({
            type: 'INTERNAL_TRANSFER',
            date: nowIso,
            quantity: quantityNumber,
            fromOwnerType: InventoryOwnerType.TRADER,
            fromTraderId: Number(fromTraderId),
            fromTraderCategoryId: Number(traderCategoryId),
            fromGrade: grade,
            fromPitamStatus: pitamStatus,
            toPitamStatus: pitamStatus === 'MIXED' ? customerPitamStatus || undefined : undefined,
            toOwnerType: InventoryOwnerType.CUSTOMER,
            toCustomerId: Number(customerId),
            toCustomerCategoryId: Number(customerCategoryId),
            toGrade: customerGrade,
            stockSource: stockSource || undefined,
            notes: notes || null,
          });
        }
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

        <h3 className="modal-title" style={{ position: 'relative' }}>
          {f.title}
          <TopLoadingBar isLoading={isLoadingFromTraderStock || isLoadingGeneralStock || isLoadingGeneralTransferStock || isPitamSplitUndoLoading} />
        </h3>

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
                    disabled={!isAssignedCategoryEnabled || generalCategoryOptions.length === 0}
                  >
                    <option value="">{f.traderCategoryPlaceholder}</option>
                    {generalCategoryOptions.map((category) => (
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
                    disabled={!isAssignedGradeEnabled || generalGradeOptions.length === 0}
                  >
                    <option value="">{f.gradePlaceholder}</option>
                    {generalGradeOptions.map((option) => (
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
                    disabled={!isAssignedPitamEnabled || generalPitamStatusOptions.length === 0}
                  >
                    <option value="">{f.pitamStatusPlaceholder}</option>
                    {generalPitamStatusOptions.map((option) => (
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
                    value={isModulo ? 'MODULO' : fromTraderId}
                    onChange={(event) => {
                      const val = event.target.value;
                      if (val === 'MODULO') {
                        setIsModulo(true);
                        setFromTraderId('');
                      } else {
                        setIsModulo(false);
                        setFromTraderId(val);
                      }
                      setTraderCategoryId('');
                      setGrade('');
                      setPitamStatus('');
                      setCustomerPitamStatus('');
                      setCustomerId('');
                      setCustomerCategoryId('');
                      setCustomerGrade('');
                    }}
                  >
                    <option value="">{f.traderPlaceholder}</option>
                    <option value="MODULO">{f.moduloOption}</option>
                    {sortedTraders.map((trader) => (
                      <option key={`transfer-from-${trader.id}`} value={String(trader.id)}>
                        {trader.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Stock source only applies when transferring from a specific trader's stock. */}
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
                      setCustomerPitamStatus('');
                      setCustomerId('');
                      setCustomerCategoryId('');
                      setCustomerGrade('');
                    }}
                    disabled={isModulo || !fromTraderId}
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
                      setCustomerPitamStatus('');
                      setCustomerId('');
                      setCustomerCategoryId('');
                      setCustomerGrade('');
                    }}
                    disabled={!isItTraderCategoryEnabled || (isModulo ? generalTransferCategoryOptions.length === 0 : fromTraderCategoryOptions.length === 0)}
                  >
                    <option value="">{f.traderCategoryPlaceholder}</option>
                    {(isModulo ? generalTransferCategoryOptions : fromTraderCategoryOptions).map((category) => (
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
                      setCustomerPitamStatus('');
                      setCustomerId('');
                      setCustomerCategoryId('');
                      setCustomerGrade('');
                    }}
                    disabled={!isItGradeEnabled || (isModulo ? generalTransferGradeOptions.length === 0 : fromTraderGradeOptions.length === 0)}
                  >
                    <option value="">{f.gradePlaceholder}</option>
                    {(isModulo ? generalTransferGradeOptions : fromTraderGradeOptions).map((option) => (
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
                      setCustomerPitamStatus('');
                      setCustomerId('');
                      setCustomerCategoryId('');
                      setCustomerGrade('');
                    }}
                    disabled={!isItPitamEnabled || (isModulo ? generalTransferPitamStatusOptions.length === 0 : fromTraderPitamStatusOptions.length === 0)}
                  >
                    <option value="">{f.pitamStatusPlaceholder}</option>
                    {(isModulo ? generalTransferPitamStatusOptions : fromTraderPitamStatusOptions).map((option) => (
                      <option key={option} value={option}>
                        {i18n.pitamStatuses[option] || option}
                      </option>
                    ))}
                  </select>
                </div>

                {/* The trader side can be a MIXED batch, but a customer can't own "mixed" stock —
                    require picking the actual pitam status for the customer record in that case only. */}
                {pitamStatus === 'MIXED' ? (
                  <div style={FIELD_STYLE}>
                    <label style={LABEL_STYLE}>{f.customerPitamStatusLabel}</label>
                    <select
                      className="seasons-manager__year-input"
                      value={customerPitamStatus}
                      onChange={(event) => setCustomerPitamStatus(event.target.value as PitamStatus | '')}
                    >
                      <option value="">{f.pitamStatusPlaceholder}</option>
                      <option value="WITH_PITAM">{i18n.pitamStatuses.WITH_PITAM}</option>
                      <option value="WITHOUT_PITAM">{i18n.pitamStatuses.WITHOUT_PITAM}</option>
                    </select>
                  </div>
                ) : null}
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
                    disabled={isModulo ? (!isWasteModuloCategoryEnabled || generalCategoryOptions.length === 0) : (!isWasteTraderCategoryEnabled || fromTraderCategoryOptions.length === 0)}
                  >
                    <option value="">{f.traderCategoryPlaceholder}</option>
                    {(isModulo ? generalCategoryOptions : fromTraderCategoryOptions).map((category) => (
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
                    disabled={isModulo ? (!isWasteModuloGradeEnabled || generalGradeOptions.length === 0) : (!isWasteTraderGradeEnabled || fromTraderGradeOptions.length === 0)}
                  >
                    <option value="">{f.gradePlaceholder}</option>
                    {(isModulo ? generalGradeOptions : fromTraderGradeOptions).map((option) => (
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
                    disabled={isModulo ? (!isWasteModuloPitamEnabled || generalPitamStatusOptions.length === 0) : (!isWasteTraderPitamEnabled || fromTraderPitamStatusOptions.length === 0)}
                  >
                    <option value="">{f.pitamStatusPlaceholder}</option>
                    {(isModulo ? generalPitamStatusOptions : fromTraderPitamStatusOptions).map((option) => (
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

          {type === 'PITAM_SPLIT' ? (
            <>
              <div style={ROW_STYLE}>
                <div style={FIELD_STYLE}>
                  <label style={LABEL_STYLE}>{f.pitamSplitSourceLabel}</label>
                  <select
                    className="seasons-manager__year-input"
                    value={pitamSplitSource}
                    onChange={(event) => {
                      setPitamSplitSource(event.target.value as PitamSplitSource | '');
                      setTraderId('');
                      setTraderCategoryId('');
                      setGrade('');
                      setWithQty('');
                      setWithoutQty('');
                    }}
                  >
                    <option value="">{f.pitamSplitSourcePlaceholder}</option>
                    <option value="SPECIFIC_TRADER">{f.pitamSplitSourceOptions.SPECIFIC_TRADER}</option>
                    <option value="MODULO">{f.pitamSplitSourceOptions.MODULO}</option>
                    <option value="GENERAL">{f.pitamSplitSourceOptions.GENERAL}</option>
                  </select>
                </div>

                {pitamSplitSource === 'SPECIFIC_TRADER' ? (
                  <div style={FIELD_STYLE}>
                    <label style={LABEL_STYLE}>{f.traderLabel}</label>
                    <select
                      className="seasons-manager__year-input"
                      value={traderId}
                      onChange={(event) => setTraderId(event.target.value)}
                    >
                      <option value="">{f.traderPlaceholder}</option>
                      {sortedTraders.map((trader) => (
                        <option key={`pitam-split-trader-${trader.id}`} value={String(trader.id)}>
                          {trader.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
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
                      setWithQty('');
                      setWithoutQty('');
                    }}
                    disabled={!isPitamSplitCategoryEnabled || pitamSplitCategoryOptions.length === 0}
                  >
                    <option value="">{f.traderCategoryPlaceholder}</option>
                    {pitamSplitCategoryOptions.map((category) => (
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
                      setWithQty('');
                      setWithoutQty('');
                    }}
                    disabled={!isPitamSplitGradeEnabled || pitamSplitGradeOptions.length === 0}
                  >
                    <option value="">{f.gradePlaceholder}</option>
                    {pitamSplitGradeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={FIELD_STYLE}>
                  <label style={LABEL_STYLE}>{f.pitamSplitWithLabel}</label>
                  <input
                    className="seasons-manager__year-input"
                    type="number"
                    value={withQty}
                    onChange={(event) => setWithQty(event.target.value)}
                    placeholder={f.quantityPlaceholder}
                    aria-label={f.pitamSplitWithLabel}
                    max={pitamSplitAvailable ?? undefined}
                    disabled={!isPitamSplitQuantityEnabled}
                  />
                </div>

                <div style={FIELD_STYLE}>
                  <label style={LABEL_STYLE}>{f.pitamSplitWithoutLabel}</label>
                  <input
                    className="seasons-manager__year-input"
                    type="number"
                    value={withoutQty}
                    onChange={(event) => setWithoutQty(event.target.value)}
                    placeholder={f.quantityPlaceholder}
                    aria-label={f.pitamSplitWithoutLabel}
                    max={pitamSplitAvailable ?? undefined}
                    disabled={!isPitamSplitQuantityEnabled}
                  />
                </div>
              </div>

              {pitamSplitAvailable !== null ? (
                <div style={ROW_STYLE}>
                  <div style={{ ...FIELD_STYLE, gridColumn: '1 / -1' }}>
                    <span
                      className={pitamSplitTotalExceedsAvailable ? 'seasons-manager__error' : undefined}
                      style={{ fontSize: 12, opacity: pitamSplitTotalExceedsAvailable ? 1 : 0.75 }}
                    >
                      {pitamSplitTotalExceedsAvailable
                        ? f.pitamSplitExceedsAvailableError(pitamSplitAvailable)
                        : f.pitamSplitAvailableLabel(pitamSplitAvailable)}
                    </span>
                  </div>
                </div>
              ) : null}
            </>
          ) : null}

          {type === 'PITAM_SPLIT_UNDO' ? (
            <div style={ROW_STYLE}>
              <div style={{ ...FIELD_STYLE, gridColumn: '1 / -1' }}>
                <label style={LABEL_STYLE}>{f.pitamSplitUndoBatchLabel}</label>
                <PitamSplitUndoBatchPicker
                  lang={lang}
                  labels={f}
                  batches={pitamSplitUndoBatches}
                  traderCategories={traderCategories}
                  value={pitamSplitUndoBatchId}
                  onChange={setPitamSplitUndoBatchId}
                  isLoading={isPitamSplitUndoLoading}
                />
              </div>
            </div>
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

          {type && type !== 'OWNERSHIP_TRANSFER' && type !== 'INTERNAL_TRANSFER' && type !== 'ASSIGNED' && type !== 'SELF_PICKUP' && type !== 'WASTE' && type !== 'PITAM_SPLIT' && type !== 'PITAM_SPLIT_UNDO' ? (
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
