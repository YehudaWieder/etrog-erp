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
  createReclassificationMovement,
  createRemainsInItalyWithdrawal,
  createTraderAdjustmentMovement,
  undoPitamSplitBatch,
  undoReclassificationBatch,
  undoRemainsInItalyWithdrawal,
  updatePitamSplitBatch,
  updateReclassificationBatch,
  updateRemainsInItalyWithdrawal,
  type InternalTransferMovementType,
  type PitamSplitSource,
  type PitamStatus,
  type ReclassificationSource,
  type RemainsInItalyDestinationType,
  type TraderAdjustmentMovementType,
} from '../../../services/inventoryMovementsApi';
import { ApiError } from '../../../services/apiClient';
import { fetchTraderInventorySummary } from '../services/traderInventorySummary.service';
import { usePitamSplitBatches } from '../hooks/usePitamSplitBatches';
import { useReclassificationBatches } from '../hooks/useReclassificationBatches';
import { useRemainsInItalyWithdrawalBatches } from '../hooks/useRemainsInItalyWithdrawalBatches';
import { PitamSplitUndoBatchPicker } from './PitamSplitUndoBatchPicker';
import { ReclassificationBatchPicker } from './ReclassificationBatchPicker';
import { RemainsInItalyWithdrawalBatchPicker } from './RemainsInItalyWithdrawalBatchPicker';
import type { TraderInventorySummaryRow } from '../traderInventory.types';
import remainsInItalyCheckboxStyles from './styles/RemainsInItalyCheckbox.module.css';

const GRADE_OPTIONS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו'] as const;
const GRADE_ORDER = new Map<string, number>(GRADE_OPTIONS.map((grade, index) => [grade, index]));

// Grade dropdowns are built from whatever order stock rows come back in (DB/insertion order),
// which reads as scrambled to a user expecting א/ב/ג/... — always sort to the canonical order.
function sortGrades<T extends string>(grades: T[]): T[] {
  return [...grades].sort((a, b) => (GRADE_ORDER.get(a) ?? 99) - (GRADE_ORDER.get(b) ?? 99));
}
const PITAM_STATUS_OPTIONS: PitamStatus[] = ['WITH_PITAM', 'WITHOUT_PITAM', 'MIXED'];

type MovementType = InternalTransferMovementType | TraderAdjustmentMovementType | 'PITAM_SPLIT' | 'PITAM_SPLIT_MANAGE' | 'REMAINS_IN_ITALY_WITHDRAWAL' | 'REMAINS_IN_ITALY_WITHDRAWAL_MANAGE' | 'RECLASSIFICATION' | 'RECLASSIFICATION_MANAGE';

const MOVEMENT_TYPE_ORDER: Array<Exclude<MovementType, 'PRIVATE_SELECTION'>> = [
  'OWNERSHIP_TRANSFER',
  'ASSIGNED',
  'INTERNAL_TRANSFER',
  'SELF_PICKUP',
  'WASTE',
  'REMAINS_IN_ITALY_WITHDRAWAL',
  'REMAINS_IN_ITALY_WITHDRAWAL_MANAGE',
  'PITAM_SPLIT',
  'PITAM_SPLIT_MANAGE',
  'RECLASSIFICATION',
  'RECLASSIFICATION_MANAGE',
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

// Most pitam-split validation errors are already Hebrew (thrown directly by pitam-split.service.ts),
// but the shared inventory-availability stock check it also calls is an English message reused across
// many unrelated flows (packing, transfers, adjustments) that pattern-match on the word "insufficient" —
// so it can't be translated at the source. Substitute a Hebrew message for that one case here instead.
function describePitamSplitError(
  error: unknown,
  f: { pitamSplitInsufficientStockError: string; validationRequired: string },
): string {
  if (!(error instanceof ApiError)) {
    return f.validationRequired;
  }
  return error.message.toLowerCase().includes('insufficient')
    ? f.pitamSplitInsufficientStockError
    : error.message;
}

// Same rationale as describePitamSplitError above — the shared inventory-availability stock check
// reclassification.service.ts also calls throws an untranslated English "insufficient" message.
function describeReclassificationError(
  error: unknown,
  f: { reclassificationInsufficientStockError: string; validationRequired: string },
): string {
  if (!(error instanceof ApiError)) {
    return f.validationRequired;
  }
  return error.message.toLowerCase().includes('insufficient')
    ? f.reclassificationInsufficientStockError
    : error.message;
}

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
  // Update/cancel an existing PITAM_SPLIT batch — mirrors the "manage classified mixed stock"
  // popup on the shipments packing form: pick a batch, then either edit its with/without split
  // (delete+recreate in one backend transaction) or cancel it outright.
  const [pitamManageMode, setPitamManageMode] = useState<'select' | 'edit'>('select');
  const [pitamManageEditWithValue, setPitamManageEditWithValue] = useState('');
  const [pitamManageEditWithoutValue, setPitamManageEditWithoutValue] = useState('');
  const [pitamManageEditError, setPitamManageEditError] = useState('');
  const [pitamManageActionSubmitting, setPitamManageActionSubmitting] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fromTraderStock, setFromTraderStock] = useState<TraderInventorySummaryRow[]>([]);
  const [isLoadingFromTraderStock, setIsLoadingFromTraderStock] = useState(false);
  const [generalStock, setGeneralStock] = useState<TraderInventorySummaryRow[]>([]);
  const [isLoadingGeneralStock, setIsLoadingGeneralStock] = useState(false);
  const [generalTransferStock, setGeneralTransferStock] = useState<TraderInventorySummaryRow[]>([]);
  const [isLoadingGeneralTransferStock, setIsLoadingGeneralTransferStock] = useState(false);
  const [remainsInItalyDestination, setRemainsInItalyDestination] = useState<RemainsInItalyDestinationType | ''>('');
  const [remainsInItalyStock, setRemainsInItalyStock] = useState<TraderInventorySummaryRow[]>([]);
  const [isLoadingRemainsInItalyStock, setIsLoadingRemainsInItalyStock] = useState(false);
  // Update/cancel an existing REMAINS_IN_ITALY_WITHDRAWAL — mirrors PITAM_SPLIT_MANAGE: pick a
  // withdrawal, then either edit its destination/quantity (delete+recreate in one backend
  // transaction) or cancel it outright. Category/grade/pitamStatus stay fixed on edit.
  const [riwManageBatchId, setRiwManageBatchId] = useState('');
  const [riwManageMode, setRiwManageMode] = useState<'select' | 'edit'>('select');
  const [riwManageEditDestination, setRiwManageEditDestination] = useState<RemainsInItalyDestinationType | ''>('');
  const [riwManageEditTraderId, setRiwManageEditTraderId] = useState('');
  const [riwManageEditCustomerId, setRiwManageEditCustomerId] = useState('');
  const [riwManageEditCustomerCategoryId, setRiwManageEditCustomerCategoryId] = useState('');
  const [riwManageEditQuantity, setRiwManageEditQuantity] = useState('');
  const [riwManageEditError, setRiwManageEditError] = useState('');
  const [riwManageActionSubmitting, setRiwManageActionSubmitting] = useState(false);
  const [reclassificationSource, setReclassificationSource] = useState<ReclassificationSource | ''>('');
  // "To" side of a reclassification is never constrained by existing stock (unlike the "from" side),
  // so it needs its own state distinct from the shared traderCategoryId/grade/pitamStatus used for "from".
  const [reclassToTraderCategoryId, setReclassToTraderCategoryId] = useState('');
  const [reclassToGrade, setReclassToGrade] = useState('');
  const [reclassToPitamStatus, setReclassToPitamStatus] = useState<PitamStatus | ''>('');
  // Only relevant when source=GENERAL and the matching grade is picked as "to" — mirrors the harvest
  // form's per-grade remainsInItalyGradeH/V checkboxes (HarvestBulkFormModal): when the flag for the
  // chosen "to" grade is on, the whole reclassified quantity is parked in the remains-in-Italy bucket
  // un-split instead of falling through the default per-trader share split.
  const [reclassToRemainsInItalyGradeH, setReclassToRemainsInItalyGradeH] = useState(false);
  const [reclassToRemainsInItalyGradeV, setReclassToRemainsInItalyGradeV] = useState(false);
  // Update/cancel an existing RECLASSIFICATION batch — mirrors PITAM_SPLIT_MANAGE: pick a batch, then
  // either edit its quantity (delete+recreate in one backend transaction) or cancel it outright.
  const [reclassManageBatchId, setReclassManageBatchId] = useState('');
  const [reclassManageMode, setReclassManageMode] = useState<'select' | 'edit'>('select');
  const [reclassManageEditQuantity, setReclassManageEditQuantity] = useState('');
  const [reclassManageEditError, setReclassManageEditError] = useState('');
  const [reclassManageActionSubmitting, setReclassManageActionSubmitting] = useState(false);

  // ASSIGNED and PITAM_SPLIT (MODULO source) allocate from MODULO stock only.
  useEffect(() => {
    const needsGeneralStock = type === 'ASSIGNED' || (type === 'PITAM_SPLIT' && pitamSplitSource === 'MODULO');
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

  // INTERNAL_TRANSFER "General" (customer allocation from general pool) and WASTE "כללי" both draw
  // from MODULO first, then proportionally from every trader's share — so what's actually offerable
  // is the union of MODULO stock and stock held across all traders combined. PITAM_SPLIT "GENERAL"
  // reuses the same combined pool purely to compute an informational MIXED-availability hint (the
  // server is the source of truth for the actual per-trader share split).
  useEffect(() => {
    const needsCombinedStock = (type === 'INTERNAL_TRANSFER' && isModulo) || (type === 'WASTE' && isModulo) || (type === 'PITAM_SPLIT' && pitamSplitSource === 'GENERAL') || (type === 'RECLASSIFICATION' && reclassificationSource === 'GENERAL');
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
  }, [type, isModulo, pitamSplitSource, reclassificationSource, seasonId]);

  // Ownership, internal transfers, self-pickup, waste (trader), and PITAM_SPLIT (SPECIFIC_TRADER)
  // all use the source trader's actual stock.
  useEffect(() => {
    const isPitamSplitTrader = type === 'PITAM_SPLIT' && pitamSplitSource === 'SPECIFIC_TRADER';
    const isReclassificationTrader = type === 'RECLASSIFICATION' && reclassificationSource === 'SPECIFIC_TRADER';
    const activeFromTraderId = (type === 'SELF_PICKUP' || type === 'WASTE' || isPitamSplitTrader || isReclassificationTrader) ? traderId : fromTraderId;
    const isWaste = type === 'WASTE';
    const isWasteTrader = isWaste && !isModulo;
    const isInternalTransferGeneral = type === 'INTERNAL_TRANSFER' && isModulo;
    const needsStockSource = type !== 'WASTE' && !isPitamSplitTrader && !isReclassificationTrader;
    if (
      isInternalTransferGeneral ||
      (type !== 'OWNERSHIP_TRANSFER' && type !== 'INTERNAL_TRANSFER' && type !== 'SELF_PICKUP' && !isWaste && !isPitamSplitTrader && !isReclassificationTrader) ||
      !activeFromTraderId || !seasonId ||
      (needsStockSource && !stockSource) ||
      (isWaste && isModulo)
    ) {
      setFromTraderStock([]);
      return;
    }

    // WASTE against a specific trader and RECLASSIFICATION's "מלאי פרטי" source both always draw
    // from that trader's private-selection pool only — never their share of the general pool.
    const shipmentScope =
      isWasteTrader || isReclassificationTrader || stockSource === 'PRIVATE_SELECTION' ? 'PRIVATE_SELECTION' : 'UNSHIPPED';

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
  }, [type, fromTraderId, traderId, stockSource, isModulo, reclassificationSource, seasonId]);

  // REMAINS_IN_ITALY_WITHDRAWAL draws from the regional-retention bucket (traderId: null, isModulo:
  // false) directly. RECLASSIFICATION's "GENERAL" source fetches this pool too and merges it into
  // reclassificationStockRows, so grade ה/ו appear as ordinary options under "כללי" instead of behind a
  // separate source choice.
  useEffect(() => {
    const needsRemainsInItalyForReclass = type === 'RECLASSIFICATION' && reclassificationSource === 'GENERAL';
    if ((type !== 'REMAINS_IN_ITALY_WITHDRAWAL' && !needsRemainsInItalyForReclass) || !seasonId) {
      setRemainsInItalyStock([]);
      return;
    }

    let isActive = true;
    setIsLoadingRemainsInItalyStock(true);

    fetchTraderInventorySummary({
      seasonId,
      traderId: null,
      ownerScope: 'ALL',
      shipmentScope: 'REMAINS_IN_ITALY',
    })
      .then((result) => {
        if (!isActive) return;
        setRemainsInItalyStock(result.rows.filter((row) => row.quantity > 0));
      })
      .catch(() => {
        if (!isActive) return;
        setRemainsInItalyStock([]);
      })
      .finally(() => {
        if (!isActive) return;
        setIsLoadingRemainsInItalyStock(false);
      });

    return () => {
      isActive = false;
    };
  }, [type, reclassificationSource, seasonId]);

  const { batches: pitamSplitUndoBatches, isLoading: isPitamSplitUndoLoading, reload: reloadPitamSplitUndoBatches } = usePitamSplitBatches(
    type === 'PITAM_SPLIT_MANAGE',
    { seasonId },
  );

  const selectedManageBatch = pitamSplitUndoBatches.find((batch) => batch.batchId === pitamSplitUndoBatchId) ?? null;

  const { batches: riwBatches, isLoading: isRiwUndoLoading, reload: reloadRiwBatches } = useRemainsInItalyWithdrawalBatches(
    type === 'REMAINS_IN_ITALY_WITHDRAWAL_MANAGE',
    { seasonId },
  );

  const selectedRiwManageBatch = riwBatches.find((batch) => String(batch.id) === riwManageBatchId) ?? null;

  const { batches: reclassificationBatches, isLoading: isReclassificationUndoLoading, reload: reloadReclassificationBatches } = useReclassificationBatches(
    type === 'RECLASSIFICATION_MANAGE',
    { seasonId },
  );

  const selectedReclassManageBatch = reclassificationBatches.find((batch) => String(batch.id) === reclassManageBatchId) ?? null;

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
    return sortGrades([...new Set(
      fromTraderStock
        .filter((row) => String(row.traderCategoryId) === traderCategoryId)
        .map((row) => row.grade),
    )]);
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
    return sortGrades([...new Set(
      generalStock
        .filter((row) => String(row.traderCategoryId) === traderCategoryId)
        .map((row) => row.grade),
    )]);
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
    return sortGrades([...new Set(
      generalTransferStock
        .filter((row) => String(row.traderCategoryId) === traderCategoryId)
        .map((row) => row.grade),
    )]);
  }, [generalTransferStock, traderCategoryId]);

  const generalTransferPitamStatusOptions = useMemo(() => {
    if (!traderCategoryId || !grade) return [];
    return [...new Set(
      generalTransferStock
        .filter((row) => String(row.traderCategoryId) === traderCategoryId && row.grade === grade)
        .map((row) => row.pitamStatus),
    )];
  }, [generalTransferStock, traderCategoryId, grade]);

  const remainsInItalyCategoryOptions = useMemo(() => {
    const seen = new Map<number, string>();
    for (const row of remainsInItalyStock) {
      if (!seen.has(row.traderCategoryId)) {
        seen.set(row.traderCategoryId, row.traderCategoryName ?? `#${row.traderCategoryId}`);
      }
    }
    return sortCategoryOptionsByPriority([...seen.entries()].map(([id, name]) => ({ id, name })));
  }, [remainsInItalyStock, traderCategoryOrderById]);

  const remainsInItalyGradeOptions = useMemo(() => {
    if (!traderCategoryId) return [];
    return sortGrades([...new Set(
      remainsInItalyStock
        .filter((row) => String(row.traderCategoryId) === traderCategoryId)
        .map((row) => row.grade),
    )]);
  }, [remainsInItalyStock, traderCategoryId]);

  const remainsInItalyPitamStatusOptions = useMemo(() => {
    if (!traderCategoryId || !grade) return [];
    return [...new Set(
      remainsInItalyStock
        .filter((row) => String(row.traderCategoryId) === traderCategoryId && row.grade === grade)
        .map((row) => row.pitamStatus),
    )];
  }, [remainsInItalyStock, traderCategoryId, grade]);

  const availableQuantityForRemainsInItaly = useMemo(() => {
    if (type !== 'REMAINS_IN_ITALY_WITHDRAWAL' || !traderCategoryId || !grade || !pitamStatus) return null;
    const match = remainsInItalyStock.find(
      (row) => String(row.traderCategoryId) === traderCategoryId && row.grade === grade && row.pitamStatus === pitamStatus,
    );
    return match ? match.quantity : null;
  }, [type, remainsInItalyStock, traderCategoryId, grade, pitamStatus]);

  const availableQuantityForAssigned = useMemo(() => {
    if (type !== 'ASSIGNED' || !traderCategoryId || !grade || !pitamStatus) return null;
    const match = generalStock.find(
      (row) => String(row.traderCategoryId) === traderCategoryId && row.grade === grade && row.pitamStatus === pitamStatus,
    );
    return match ? match.quantity : null;
  }, [type, generalStock, traderCategoryId, grade, pitamStatus]);

  const availableQuantityForSelection = useMemo(() => {
    if (!traderCategoryId || !grade || !pitamStatus) return null;

    if ((type === 'WASTE' && isModulo) || (type === 'INTERNAL_TRANSFER' && isModulo)) {
      // "כללי" WASTE draws from MODULO first, then proportionally from every trader's share —
      // so the offerable total is the combined MODULO + all-traders pool (same pool INTERNAL_TRANSFER's
      // general branch already uses). This is only a UI hint; the server is the source of truth.
      const total = generalTransferStock
        .filter((row) => String(row.traderCategoryId) === traderCategoryId && row.grade === grade && row.pitamStatus === pitamStatus)
        .reduce((sum, row) => sum + row.quantity, 0);
      return total > 0 ? total : null;
    }

    const isWasteTrader = type === 'WASTE' && !isModulo;
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

  useEffect(() => {
    if (type !== 'RECLASSIFICATION') return;
    setTraderCategoryId('');
    setGrade('');
    setPitamStatus('');
    setReclassToTraderCategoryId('');
    setReclassToGrade('');
    setReclassToPitamStatus('');
    setQuantity('');
  }, [type, reclassificationSource, traderId]);

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

  // Reset destination-specific and product fields whenever the destination changes.
  useEffect(() => {
    if (type !== 'REMAINS_IN_ITALY_WITHDRAWAL') return;
    setTraderId('');
    setCustomerId('');
    setCustomerCategoryId('');
    setCustomerGrade('');
    setTraderCategoryId('');
    setGrade('');
    setPitamStatus('');
  }, [type, remainsInItalyDestination]);

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

  // ASSIGNED offers grade/pitam filtered to actual MODULO stock.
  useEffect(() => {
    const usesGeneralStock = type === 'ASSIGNED';
    if (!usesGeneralStock || !grade) return;
    if (!generalGradeOptions.includes(grade)) {
      setGrade('');
    }
  }, [type, isModulo, generalGradeOptions, grade]);

  useEffect(() => {
    const usesGeneralStock = type === 'ASSIGNED';
    if (!usesGeneralStock || !pitamStatus) return;
    if (!(generalPitamStatusOptions as string[]).includes(pitamStatus)) {
      setPitamStatus('');
    }
  }, [type, isModulo, generalPitamStatusOptions, pitamStatus]);

  // INTERNAL_TRANSFER "General" and WASTE "כללי" both offer grade/pitam filtered to the combined
  // MODULO + all-traders pool.
  useEffect(() => {
    const usesGeneralTransferStock = (type === 'INTERNAL_TRANSFER' || type === 'WASTE') && isModulo;
    if (!usesGeneralTransferStock || !grade) return;
    if (!generalTransferGradeOptions.includes(grade)) {
      setGrade('');
    }
  }, [type, isModulo, generalTransferGradeOptions, grade]);

  useEffect(() => {
    const usesGeneralTransferStock = (type === 'INTERNAL_TRANSFER' || type === 'WASTE') && isModulo;
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
    return sortGrades([...new Set(
      pitamSplitMixedRows
        .filter((row) => String(row.traderCategoryId) === traderCategoryId)
        .map((row) => row.grade),
    )]);
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

  // RECLASSIFICATION reuses the same stock queries as the movement types above, selecting the right
  // one per source — SPECIFIC_TRADER uses the chosen trader's own stock; GENERAL merges the combined
  // MODULO + all-traders pool with the remains-in-Italy bucket (grade ה/ו stock lives there instead of
  // in modulo/traders), so the user picks "כללי" once and grade ה/ו are just more options in the same
  // list rather than a separate source. Which pool a chosen tuple actually resolves to is recomputed at
  // submit time (see reclassificationEffectiveSource) so the backend receives the right `source` value.
  // Unlike PITAM_SPLIT there's no MIXED-only filtering — any pitam status can be reclassified.
  const reclassificationStockRows = useMemo(() => {
    if (type !== 'RECLASSIFICATION') return [];
    if (reclassificationSource === 'SPECIFIC_TRADER') return fromTraderStock;
    if (reclassificationSource === 'GENERAL') return [...generalTransferStock, ...remainsInItalyStock];
    return [];
  }, [type, reclassificationSource, fromTraderStock, generalTransferStock, remainsInItalyStock]);

  const reclassificationCategoryOptions = useMemo(() => {
    const seen = new Map<number, string>();
    for (const row of reclassificationStockRows) {
      if (!seen.has(row.traderCategoryId)) {
        seen.set(row.traderCategoryId, row.traderCategoryName ?? `#${row.traderCategoryId}`);
      }
    }
    return sortCategoryOptionsByPriority([...seen.entries()].map(([id, name]) => ({ id, name })));
  }, [reclassificationStockRows, traderCategoryOrderById]);

  const reclassificationGradeOptions = useMemo(() => {
    if (!traderCategoryId) return [];
    return sortGrades([...new Set(
      reclassificationStockRows
        .filter((row) => String(row.traderCategoryId) === traderCategoryId)
        .map((row) => row.grade),
    )]);
  }, [reclassificationStockRows, traderCategoryId]);

  const reclassificationPitamStatusOptions = useMemo(() => {
    if (!traderCategoryId || !grade) return [];
    return [...new Set(
      reclassificationStockRows
        .filter((row) => String(row.traderCategoryId) === traderCategoryId && row.grade === grade)
        .map((row) => row.pitamStatus),
    )];
  }, [reclassificationStockRows, traderCategoryId, grade]);

  // GENERAL stock rows are one row per trader (+ one for modulo), not a pre-summed total, so
  // availability must be summed across every matching row — not just the first one found. For
  // SPECIFIC_TRADER (מלאי פרטי) there's only ever one matching row anyway, so summing is a no-op there.
  const reclassificationAvailable = useMemo(() => {
    if (type !== 'RECLASSIFICATION' || !traderCategoryId || !grade || !pitamStatus) return null;
    const matches = reclassificationStockRows.filter(
      (row) => String(row.traderCategoryId) === traderCategoryId && row.grade === grade && row.pitamStatus === pitamStatus,
    );
    return matches.length > 0 ? matches.reduce((sum, row) => sum + row.quantity, 0) : null;
  }, [type, reclassificationStockRows, traderCategoryId, grade, pitamStatus]);

  // The visible source is just SPECIFIC_TRADER / GENERAL, but the backend still needs to know whether
  // GENERAL stock actually sits in the modulo+traders pool or in the remains-in-Italy bucket (grade
  // ה/ו), since those are deducted differently server-side. Resolved from which fetch actually matched
  // the chosen "from" tuple.
  const reclassificationEffectiveSource = useMemo((): ReclassificationSource | '' => {
    if (reclassificationSource !== 'GENERAL') return reclassificationSource;
    if (!traderCategoryId || !grade || !pitamStatus) return reclassificationSource;
    const inRemainsInItaly = remainsInItalyStock.some(
      (row) => String(row.traderCategoryId) === traderCategoryId && row.grade === grade && row.pitamStatus === pitamStatus,
    );
    return inRemainsInItaly ? 'REMAINS_IN_ITALY' : 'GENERAL';
  }, [reclassificationSource, traderCategoryId, grade, pitamStatus, remainsInItalyStock]);

  const isReclassificationLoading = reclassificationSource === 'SPECIFIC_TRADER'
    ? isLoadingFromTraderStock
    : reclassificationSource === 'GENERAL'
      ? (isLoadingGeneralTransferStock || isLoadingRemainsInItalyStock)
      : false;

  const isReclassificationSourceReady = reclassificationSource === 'SPECIFIC_TRADER' ? Boolean(traderId) : Boolean(reclassificationSource);
  const isReclassificationCategoryEnabled = type === 'RECLASSIFICATION' && isReclassificationSourceReady && !isReclassificationLoading;
  const isReclassificationGradeEnabled = isReclassificationCategoryEnabled && Boolean(traderCategoryId);
  const isReclassificationPitamEnabled = isReclassificationGradeEnabled && Boolean(grade);
  const isReclassificationQuantityEnabled = isReclassificationPitamEnabled && Boolean(pitamStatus);

  // The "to" side isn't constrained by existing stock, but is still sequenced after the "from" side.
  const isReclassificationToCategoryEnabled = type === 'RECLASSIFICATION' && isReclassificationPitamEnabled;
  const isReclassificationToGradeEnabled = isReclassificationToCategoryEnabled && Boolean(reclassToTraderCategoryId);
  const isReclassificationToPitamEnabled = isReclassificationToGradeEnabled && Boolean(reclassToGrade);
  const isReclassificationToReady = isReclassificationToPitamEnabled && Boolean(reclassToPitamStatus);

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

  const riwManageEditCustomerCategories = useMemo(
    () => (riwManageEditCustomerId ? customerCategories.filter((category) => String(category.customerId) === riwManageEditCustomerId) : []),
    [customerCategories, riwManageEditCustomerId],
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

  const isWasteTraderCategoryEnabled = type === 'WASTE' && !isModulo && Boolean(traderId) && !isLoadingFromTraderStock;
  const isWasteTraderGradeEnabled = isWasteTraderCategoryEnabled && Boolean(traderCategoryId);
  const isWasteTraderPitamEnabled = isWasteTraderGradeEnabled && Boolean(grade);
  const isWasteTraderQuantityEnabled = isWasteTraderPitamEnabled && Boolean(pitamStatus);

  const isWasteModuloCategoryEnabled = type === 'WASTE' && isModulo && !isLoadingGeneralTransferStock;
  const isWasteModuloGradeEnabled = isWasteModuloCategoryEnabled && Boolean(traderCategoryId);
  const isWasteModuloPitamEnabled = isWasteModuloGradeEnabled && Boolean(grade);
  const isWasteModuloQuantityEnabled = isWasteModuloPitamEnabled && Boolean(pitamStatus);

  // REMAINS_IN_ITALY_WITHDRAWAL gating: destination first (and who, for TRADER/CUSTOMER), then product fields.
  const isRiwDestinationReady = remainsInItalyDestination === 'TRADER'
    ? Boolean(traderId)
    : remainsInItalyDestination === 'CUSTOMER'
      ? Boolean(customerId && customerCategoryId)
      : remainsInItalyDestination === 'GENERAL';
  const isRiwCategoryEnabled = type === 'REMAINS_IN_ITALY_WITHDRAWAL' && isRiwDestinationReady && !isLoadingRemainsInItalyStock;
  const isRiwGradeEnabled = isRiwCategoryEnabled && Boolean(traderCategoryId);
  const isRiwPitamEnabled = isRiwGradeEnabled && Boolean(grade);
  const isRiwQuantityEnabled = isRiwPitamEnabled && Boolean(pitamStatus);
  const isRiwCustomerCategoryEnabled = remainsInItalyDestination === 'CUSTOMER' && Boolean(customerId);

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
            : type === 'REMAINS_IN_ITALY_WITHDRAWAL'
              ? isRiwQuantityEnabled && quantity !== ''
              : type === 'RECLASSIFICATION'
                ? isReclassificationToReady && quantity !== ''
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
    setPitamManageMode('select');
    setPitamManageEditWithValue('');
    setPitamManageEditWithoutValue('');
    setPitamManageEditError('');
    setRemainsInItalyDestination('');
    setRiwManageBatchId('');
    setRiwManageMode('select');
    setRiwManageEditDestination('');
    setRiwManageEditTraderId('');
    setRiwManageEditCustomerId('');
    setRiwManageEditCustomerCategoryId('');
    setRiwManageEditQuantity('');
    setRiwManageEditError('');
    setReclassificationSource('');
    setReclassToTraderCategoryId('');
    setReclassToGrade('');
    setReclassToPitamStatus('');
    setReclassToRemainsInItalyGradeH(false);
    setReclassToRemainsInItalyGradeV(false);
    setReclassManageBatchId('');
    setReclassManageMode('select');
    setReclassManageEditQuantity('');
    setReclassManageEditError('');
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
    setPitamManageMode('select');
    setPitamManageEditWithValue('');
    setPitamManageEditWithoutValue('');
    setPitamManageEditError('');
    setRemainsInItalyDestination('');
    setRiwManageBatchId('');
    setRiwManageMode('select');
    setRiwManageEditDestination('');
    setRiwManageEditTraderId('');
    setRiwManageEditCustomerId('');
    setRiwManageEditCustomerCategoryId('');
    setRiwManageEditQuantity('');
    setRiwManageEditError('');
    setReclassificationSource('');
    setReclassToTraderCategoryId('');
    setReclassToGrade('');
    setReclassToPitamStatus('');
    setReclassToRemainsInItalyGradeH(false);
    setReclassToRemainsInItalyGradeV(false);
    setReclassManageBatchId('');
    setReclassManageMode('select');
    setReclassManageEditQuantity('');
    setReclassManageEditError('');
    setError(null);
  };

  const handleStartEditSelectedManageBatch = () => {
    if (!selectedManageBatch) return;
    setPitamManageEditWithValue(String(selectedManageBatch.withQty));
    setPitamManageEditWithoutValue(String(selectedManageBatch.withoutQty));
    setPitamManageEditError('');
    setPitamManageMode('edit');
  };

  const handleDiscardEditSelectedManageBatch = () => {
    setPitamManageMode('select');
    setPitamManageEditWithValue('');
    setPitamManageEditWithoutValue('');
    setPitamManageEditError('');
  };

  const handleConfirmEditSelectedManageBatch = async () => {
    if (!selectedManageBatch) return;

    const nextWithQty = Number(pitamManageEditWithValue || 0);
    const nextWithoutQty = Number(pitamManageEditWithoutValue || 0);
    if (
      Number.isNaN(nextWithQty) || Number.isNaN(nextWithoutQty) ||
      nextWithQty < 0 || nextWithoutQty < 0 || nextWithQty + nextWithoutQty <= 0
    ) {
      setPitamManageEditError(f.validationRequired);
      return;
    }

    try {
      setPitamManageActionSubmitting(true);
      await updatePitamSplitBatch(selectedManageBatch.batchId, {
        source: selectedManageBatch.source,
        traderId: selectedManageBatch.traderId ?? undefined,
        traderCategoryId: selectedManageBatch.traderCategoryId,
        grade: selectedManageBatch.grade,
        withQty: nextWithQty,
        withoutQty: nextWithoutQty,
      });
      setPitamSplitUndoBatchId('');
      setPitamManageMode('select');
      setPitamManageEditWithValue('');
      setPitamManageEditWithoutValue('');
      reloadPitamSplitUndoBatches();
      onSaved();
    } catch (updateError) {
      setPitamManageEditError(describePitamSplitError(updateError, f));
    } finally {
      setPitamManageActionSubmitting(false);
    }
  };

  const handleCancelSelectedManageBatch = async () => {
    if (!selectedManageBatch) return;
    setError(null);
    try {
      setPitamManageActionSubmitting(true);
      await undoPitamSplitBatch(selectedManageBatch.batchId);
      setPitamSplitUndoBatchId('');
      reloadPitamSplitUndoBatches();
      onSaved();
    } catch (cancelError) {
      setError(cancelError instanceof ApiError ? cancelError.message : f.validationRequired);
    } finally {
      setPitamManageActionSubmitting(false);
    }
  };

  const handleStartEditSelectedRiwBatch = () => {
    if (!selectedRiwManageBatch) return;
    setRiwManageEditDestination(selectedRiwManageBatch.destinationType);
    setRiwManageEditTraderId(selectedRiwManageBatch.traderId ? String(selectedRiwManageBatch.traderId) : '');
    setRiwManageEditCustomerId(selectedRiwManageBatch.customerId ? String(selectedRiwManageBatch.customerId) : '');
    setRiwManageEditCustomerCategoryId(selectedRiwManageBatch.customerCategoryId ? String(selectedRiwManageBatch.customerCategoryId) : '');
    setRiwManageEditQuantity(String(selectedRiwManageBatch.quantity));
    setRiwManageEditError('');
    setRiwManageMode('edit');
  };

  const handleDiscardEditSelectedRiwBatch = () => {
    setRiwManageMode('select');
    setRiwManageEditDestination('');
    setRiwManageEditTraderId('');
    setRiwManageEditCustomerId('');
    setRiwManageEditCustomerCategoryId('');
    setRiwManageEditQuantity('');
    setRiwManageEditError('');
  };

  const handleConfirmEditSelectedRiwBatch = async () => {
    if (!selectedRiwManageBatch) return;

    const nextQuantity = Number(riwManageEditQuantity || 0);
    if (
      !riwManageEditDestination ||
      Number.isNaN(nextQuantity) || !Number.isInteger(nextQuantity) || nextQuantity <= 0 ||
      (riwManageEditDestination === 'TRADER' && !riwManageEditTraderId) ||
      (riwManageEditDestination === 'CUSTOMER' && (!riwManageEditCustomerId || !riwManageEditCustomerCategoryId))
    ) {
      setRiwManageEditError(f.validationRequired);
      return;
    }

    try {
      setRiwManageActionSubmitting(true);
      await updateRemainsInItalyWithdrawal(selectedRiwManageBatch.id, {
        date: selectedRiwManageBatch.date,
        traderCategoryId: selectedRiwManageBatch.traderCategoryId,
        grade: selectedRiwManageBatch.grade,
        pitamStatus: selectedRiwManageBatch.pitamStatus,
        quantity: nextQuantity,
        destinationType: riwManageEditDestination,
        traderId: riwManageEditDestination === 'TRADER' ? Number(riwManageEditTraderId) : undefined,
        customerId: riwManageEditDestination === 'CUSTOMER' ? Number(riwManageEditCustomerId) : undefined,
        customerCategoryId: riwManageEditDestination === 'CUSTOMER' ? Number(riwManageEditCustomerCategoryId) : undefined,
        notes: selectedRiwManageBatch.notes,
      });
      setRiwManageBatchId('');
      handleDiscardEditSelectedRiwBatch();
      reloadRiwBatches();
      onSaved();
    } catch (updateError) {
      setRiwManageEditError(updateError instanceof ApiError ? updateError.message : f.validationRequired);
    } finally {
      setRiwManageActionSubmitting(false);
    }
  };

  const handleCancelSelectedRiwBatch = async () => {
    if (!selectedRiwManageBatch) return;
    setError(null);
    try {
      setRiwManageActionSubmitting(true);
      await undoRemainsInItalyWithdrawal(selectedRiwManageBatch.id);
      setRiwManageBatchId('');
      reloadRiwBatches();
      onSaved();
    } catch (cancelError) {
      setError(cancelError instanceof ApiError ? cancelError.message : f.validationRequired);
    } finally {
      setRiwManageActionSubmitting(false);
    }
  };

  const handleStartEditSelectedReclassBatch = () => {
    if (!selectedReclassManageBatch) return;
    setReclassManageEditQuantity(String(selectedReclassManageBatch.quantity));
    setReclassManageEditError('');
    setReclassManageMode('edit');
  };

  const handleDiscardEditSelectedReclassBatch = () => {
    setReclassManageMode('select');
    setReclassManageEditQuantity('');
    setReclassManageEditError('');
  };

  const handleConfirmEditSelectedReclassBatch = async () => {
    if (!selectedReclassManageBatch) return;

    const nextQuantity = Number(reclassManageEditQuantity || 0);
    if (Number.isNaN(nextQuantity) || nextQuantity <= 0) {
      setReclassManageEditError(f.validationRequired);
      return;
    }

    // Source/from/to stay fixed on edit — only the quantity changes (mirrors PITAM_SPLIT_MANAGE).
    const toTuple = selectedReclassManageBatch.to ?? selectedReclassManageBatch.from;

    try {
      setReclassManageActionSubmitting(true);
      await updateReclassificationBatch(selectedReclassManageBatch.id, {
        source: selectedReclassManageBatch.source,
        traderId: selectedReclassManageBatch.traderId ?? undefined,
        fromTraderCategoryId: selectedReclassManageBatch.from.traderCategoryId,
        fromGrade: selectedReclassManageBatch.from.grade,
        fromPitamStatus: selectedReclassManageBatch.from.pitamStatus,
        toTraderCategoryId: toTuple.traderCategoryId,
        toGrade: toTuple.grade,
        toPitamStatus: toTuple.pitamStatus,
        quantity: nextQuantity,
        notes: selectedReclassManageBatch.notes,
      });
      setReclassManageBatchId('');
      setReclassManageMode('select');
      setReclassManageEditQuantity('');
      reloadReclassificationBatches();
      onSaved();
    } catch (updateError) {
      setReclassManageEditError(describeReclassificationError(updateError, f));
    } finally {
      setReclassManageActionSubmitting(false);
    }
  };

  const handleCancelSelectedReclassBatch = async () => {
    if (!selectedReclassManageBatch) return;
    setError(null);
    try {
      setReclassManageActionSubmitting(true);
      await undoReclassificationBatch(selectedReclassManageBatch.id);
      setReclassManageBatchId('');
      reloadReclassificationBatches();
      onSaved();
    } catch (cancelError) {
      setError(cancelError instanceof ApiError ? cancelError.message : f.validationRequired);
    } finally {
      setReclassManageActionSubmitting(false);
    }
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
        setError(describePitamSplitError(submitError, f));
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (type === 'PITAM_SPLIT_MANAGE' || type === 'REMAINS_IN_ITALY_WITHDRAWAL_MANAGE' || type === 'RECLASSIFICATION_MANAGE') {
      // Update/cancel are self-contained actions triggered by their own buttons (see the
      // *_MANAGE fields below) — the generic Save button doesn't apply here.
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
          // WASTE against a specific trader always targets private-selection stock server-side —
          // no stockSource choice is offered in this form anymore.
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
      } else if (type === 'REMAINS_IN_ITALY_WITHDRAWAL') {
        if (
          !remainsInItalyDestination || !traderCategoryId || !grade || !pitamStatus ||
          (remainsInItalyDestination === 'TRADER' && !traderId) ||
          (remainsInItalyDestination === 'CUSTOMER' && (!customerId || !customerCategoryId))
        ) {
          setError(f.validationRequired);
          return;
        }

        await createRemainsInItalyWithdrawal({
          date: nowIso,
          quantity: quantityNumber,
          traderCategoryId: Number(traderCategoryId),
          grade,
          pitamStatus,
          destinationType: remainsInItalyDestination,
          traderId: remainsInItalyDestination === 'TRADER' ? Number(traderId) : undefined,
          customerId: remainsInItalyDestination === 'CUSTOMER' ? Number(customerId) : undefined,
          customerCategoryId: remainsInItalyDestination === 'CUSTOMER' ? Number(customerCategoryId) : undefined,
          notes: notes || null,
        });
      } else if (type === 'RECLASSIFICATION') {
        if (
          !reclassificationSource || !traderCategoryId || !grade || !pitamStatus ||
          !reclassToTraderCategoryId || !reclassToGrade || !reclassToPitamStatus ||
          (reclassificationSource === 'SPECIFIC_TRADER' && !traderId)
        ) {
          setError(f.validationRequired);
          return;
        }

        if (
          traderCategoryId === reclassToTraderCategoryId &&
          grade === reclassToGrade &&
          pitamStatus === reclassToPitamStatus
        ) {
          setError(f.reclassificationSameTupleError);
          return;
        }

        if (reclassificationAvailable !== null && quantityNumber > reclassificationAvailable) {
          setError(f.reclassificationExceedsAvailableError(reclassificationAvailable));
          return;
        }

        await createReclassificationMovement({
          source: (reclassificationEffectiveSource || reclassificationSource) as ReclassificationSource,
          traderId: reclassificationSource === 'SPECIFIC_TRADER' ? Number(traderId) : undefined,
          fromTraderCategoryId: Number(traderCategoryId),
          fromGrade: grade,
          fromPitamStatus: pitamStatus,
          toTraderCategoryId: Number(reclassToTraderCategoryId),
          toGrade: reclassToGrade,
          toPitamStatus: reclassToPitamStatus,
          quantity: quantityNumber,
          toRemainsInItaly:
            reclassificationEffectiveSource === 'GENERAL' &&
            ((reclassToGrade === 'ה' && reclassToRemainsInItalyGradeH) || (reclassToGrade === 'ו' && reclassToRemainsInItalyGradeV))
              ? true
              : undefined,
          date: nowIso,
          notes: notes || null,
        });
      }

      resetForm();
      onSaved();
    } catch (submitError) {
      setError(
        type === 'RECLASSIFICATION'
          ? describeReclassificationError(submitError, f)
          : submitError instanceof ApiError ? submitError.message : f.validationRequired,
      );
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
        style={{ width: 820, minHeight: 480 }}
        onClick={(event) => event.stopPropagation()}
      >
        <button className="modal-close" type="button" aria-label={f.closeLabel} onClick={handleClose}>
          ✕
        </button>

        <h3 className="modal-title" style={{ position: 'relative' }}>
          {f.title}
          <TopLoadingBar isLoading={isLoadingFromTraderStock || isLoadingGeneralStock || isLoadingGeneralTransferStock || isPitamSplitUndoLoading || isReclassificationUndoLoading} />
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
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

          {!type ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-text-secondary, #6b7280)',
                fontSize: '0.95rem',
              }}
            >
              {f.typePlaceholder}
            </div>
          ) : null}

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

                {/* The trader side can be a MIXED batch — require explicitly picking the pitam
                    status for the customer record in that case (defaults to nothing selected). */}
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
                      <option value="MIXED">{i18n.pitamStatuses.MIXED}</option>
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
                    disabled={isModulo ? (!isWasteModuloCategoryEnabled || generalTransferCategoryOptions.length === 0) : (!isWasteTraderCategoryEnabled || fromTraderCategoryOptions.length === 0)}
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
                    }}
                    disabled={isModulo ? (!isWasteModuloGradeEnabled || generalTransferGradeOptions.length === 0) : (!isWasteTraderGradeEnabled || fromTraderGradeOptions.length === 0)}
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
                    onChange={(event) => setPitamStatus(event.target.value as PitamStatus | '')}
                    disabled={isModulo ? (!isWasteModuloPitamEnabled || generalTransferPitamStatusOptions.length === 0) : (!isWasteTraderPitamEnabled || fromTraderPitamStatusOptions.length === 0)}
                  >
                    <option value="">{f.pitamStatusPlaceholder}</option>
                    {(isModulo ? generalTransferPitamStatusOptions : fromTraderPitamStatusOptions).map((option) => (
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

          {type === 'REMAINS_IN_ITALY_WITHDRAWAL' ? (
            <>
              <div style={ROW_STYLE}>
                <div style={FIELD_STYLE}>
                  <label style={LABEL_STYLE}>{f.destinationLabel}</label>
                  <select
                    className="seasons-manager__year-input"
                    value={remainsInItalyDestination}
                    onChange={(event) => setRemainsInItalyDestination(event.target.value as RemainsInItalyDestinationType | '')}
                  >
                    <option value="">{f.destinationPlaceholder}</option>
                    <option value="TRADER">{f.destinationOptions.TRADER}</option>
                    <option value="CUSTOMER">{f.destinationOptions.CUSTOMER}</option>
                    <option value="GENERAL">{f.destinationOptions.GENERAL}</option>
                  </select>
                </div>

                {remainsInItalyDestination === 'TRADER' ? (
                  <div style={FIELD_STYLE}>
                    <label style={LABEL_STYLE}>{f.traderLabel}</label>
                    <select
                      className="seasons-manager__year-input"
                      value={traderId}
                      onChange={(event) => setTraderId(event.target.value)}
                    >
                      <option value="">{f.traderPlaceholder}</option>
                      {sortedTraders.map((trader) => (
                        <option key={`riw-trader-${trader.id}`} value={String(trader.id)}>
                          {trader.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}

                {remainsInItalyDestination === 'CUSTOMER' ? (
                  <>
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
                      >
                        <option value="">{f.customerPlaceholder}</option>
                        {sortedCustomers.map((customer) => (
                          <option key={`riw-customer-${customer.id}`} value={String(customer.id)}>
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
                        disabled={!isRiwCustomerCategoryEnabled}
                      >
                        <option value="">{f.customerCategoryPlaceholder}</option>
                        {availableCustomerCategories.map((category) => (
                          <option key={category.id} value={String(category.id)}>
                            {category.name} - {category.grade}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
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
                      setPitamStatus('');
                    }}
                    disabled={!isRiwCategoryEnabled || remainsInItalyCategoryOptions.length === 0}
                  >
                    <option value="">{f.traderCategoryPlaceholder}</option>
                    {remainsInItalyCategoryOptions.map((category) => (
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
                    disabled={!isRiwGradeEnabled || remainsInItalyGradeOptions.length === 0}
                  >
                    <option value="">{f.gradePlaceholder}</option>
                    {remainsInItalyGradeOptions.map((option) => (
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
                    disabled={!isRiwPitamEnabled || remainsInItalyPitamStatusOptions.length === 0}
                  >
                    <option value="">{f.pitamStatusPlaceholder}</option>
                    {remainsInItalyPitamStatusOptions.map((option) => (
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
                    max={availableQuantityForRemainsInItaly ?? undefined}
                    disabled={!isRiwQuantityEnabled}
                  />
                  <span
                    style={{
                      fontSize: 12,
                      opacity: 0.75,
                      visibility: availableQuantityForRemainsInItaly !== null ? 'visible' : 'hidden',
                    }}
                  >
                    {availableQuantityForRemainsInItaly !== null ? f.availableQuantityHint(availableQuantityForRemainsInItaly) : ' '}
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

          {type === 'PITAM_SPLIT_MANAGE' ? (
            <>
              <div style={ROW_STYLE}>
                <div style={{ ...FIELD_STYLE, gridColumn: '1 / -1' }}>
                  <label style={LABEL_STYLE}>{f.pitamSplitUndoBatchLabel}</label>
                  <PitamSplitUndoBatchPicker
                    lang={lang}
                    labels={f}
                    batches={pitamSplitUndoBatches}
                    traderCategories={traderCategories}
                    value={pitamSplitUndoBatchId}
                    onChange={(batchId) => {
                      setPitamSplitUndoBatchId(batchId);
                      setPitamManageMode('select');
                      setPitamManageEditError('');
                    }}
                    isLoading={isPitamSplitUndoLoading}
                  />
                </div>
              </div>

              {selectedManageBatch && pitamManageMode === 'edit' ? (
                <div style={ROW_STYLE}>
                  <div style={FIELD_STYLE}>
                    <label style={LABEL_STYLE}>{f.pitamSplitWithLabel}</label>
                    <input
                      className="seasons-manager__year-input"
                      type="number"
                      value={pitamManageEditWithValue}
                      onChange={(event) => {
                        setPitamManageEditWithValue(event.target.value);
                        setPitamManageEditError('');
                      }}
                      placeholder={f.quantityPlaceholder}
                      aria-label={f.pitamSplitWithLabel}
                    />
                  </div>
                  <div style={FIELD_STYLE}>
                    <label style={LABEL_STYLE}>{f.pitamSplitWithoutLabel}</label>
                    <input
                      className="seasons-manager__year-input"
                      type="number"
                      value={pitamManageEditWithoutValue}
                      onChange={(event) => {
                        setPitamManageEditWithoutValue(event.target.value);
                        setPitamManageEditError('');
                      }}
                      placeholder={f.quantityPlaceholder}
                      aria-label={f.pitamSplitWithoutLabel}
                    />
                  </div>
                </div>
              ) : null}

              {pitamManageEditError ? <p className="seasons-manager__error">{pitamManageEditError}</p> : null}
            </>
          ) : null}

          {type === 'REMAINS_IN_ITALY_WITHDRAWAL_MANAGE' ? (
            <>
              <div style={ROW_STYLE}>
                <div style={{ ...FIELD_STYLE, gridColumn: '1 / -1' }}>
                  <label style={LABEL_STYLE}>{f.riwUndoBatchLabel}</label>
                  <RemainsInItalyWithdrawalBatchPicker
                    lang={lang}
                    labels={f}
                    pitamStatusLabels={i18n.pitamStatuses}
                    batches={riwBatches}
                    traderCategories={traderCategories}
                    value={riwManageBatchId}
                    onChange={(id) => {
                      setRiwManageBatchId(id);
                      setRiwManageMode('select');
                      setRiwManageEditError('');
                    }}
                    isLoading={isRiwUndoLoading}
                  />
                </div>
              </div>

              {selectedRiwManageBatch && riwManageMode === 'edit' ? (
                <>
                  <div style={ROW_STYLE}>
                    <div style={FIELD_STYLE}>
                      <label style={LABEL_STYLE}>{f.destinationLabel}</label>
                      <select
                        className="seasons-manager__year-input"
                        value={riwManageEditDestination}
                        onChange={(event) => {
                          setRiwManageEditDestination(event.target.value as RemainsInItalyDestinationType | '');
                          setRiwManageEditTraderId('');
                          setRiwManageEditCustomerId('');
                          setRiwManageEditCustomerCategoryId('');
                          setRiwManageEditError('');
                        }}
                      >
                        <option value="">{f.destinationPlaceholder}</option>
                        <option value="TRADER">{f.destinationOptions.TRADER}</option>
                        <option value="CUSTOMER">{f.destinationOptions.CUSTOMER}</option>
                        <option value="GENERAL">{f.destinationOptions.GENERAL}</option>
                      </select>
                    </div>

                    {riwManageEditDestination === 'TRADER' ? (
                      <div style={FIELD_STYLE}>
                        <label style={LABEL_STYLE}>{f.traderLabel}</label>
                        <select
                          className="seasons-manager__year-input"
                          value={riwManageEditTraderId}
                          onChange={(event) => setRiwManageEditTraderId(event.target.value)}
                        >
                          <option value="">{f.traderPlaceholder}</option>
                          {sortedTraders.map((trader) => (
                            <option key={`riw-manage-trader-${trader.id}`} value={String(trader.id)}>
                              {trader.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}

                    {riwManageEditDestination === 'CUSTOMER' ? (
                      <>
                        <div style={FIELD_STYLE}>
                          <label style={LABEL_STYLE}>{f.customerLabel}</label>
                          <select
                            className="seasons-manager__year-input"
                            value={riwManageEditCustomerId}
                            onChange={(event) => {
                              setRiwManageEditCustomerId(event.target.value);
                              setRiwManageEditCustomerCategoryId('');
                            }}
                          >
                            <option value="">{f.customerPlaceholder}</option>
                            {sortedCustomers.map((customer) => (
                              <option key={`riw-manage-customer-${customer.id}`} value={String(customer.id)}>
                                {customer.customerName}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div style={FIELD_STYLE}>
                          <label style={LABEL_STYLE}>{f.customerCategoryLabel}</label>
                          <select
                            className="seasons-manager__year-input"
                            value={riwManageEditCustomerCategoryId}
                            onChange={(event) => setRiwManageEditCustomerCategoryId(event.target.value)}
                            disabled={!riwManageEditCustomerId}
                          >
                            <option value="">{f.customerCategoryPlaceholder}</option>
                            {riwManageEditCustomerCategories.map((category) => (
                              <option key={category.id} value={String(category.id)}>
                                {category.name} - {category.grade}
                              </option>
                            ))}
                          </select>
                        </div>
                      </>
                    ) : null}
                  </div>

                  <div style={ROW_STYLE}>
                    <div style={FIELD_STYLE}>
                      <label style={LABEL_STYLE}>{f.quantityLabel}</label>
                      <input
                        className="seasons-manager__year-input"
                        type="number"
                        value={riwManageEditQuantity}
                        onChange={(event) => {
                          setRiwManageEditQuantity(event.target.value);
                          setRiwManageEditError('');
                        }}
                        placeholder={f.quantityPlaceholder}
                        aria-label={f.quantityLabel}
                      />
                    </div>
                  </div>
                </>
              ) : null}

              {riwManageEditError ? <p className="seasons-manager__error">{riwManageEditError}</p> : null}
            </>
          ) : null}

          {type === 'RECLASSIFICATION' ? (
            <>
              <div style={ROW_STYLE}>
                <div style={FIELD_STYLE}>
                  <label style={LABEL_STYLE}>{f.reclassificationSourceLabel}</label>
                  <select
                    className="seasons-manager__year-input"
                    value={reclassificationSource}
                    onChange={(event) => {
                      setReclassificationSource(event.target.value as ReclassificationSource | '');
                      setTraderId('');
                      setTraderCategoryId('');
                      setGrade('');
                      setPitamStatus('');
                      setReclassToTraderCategoryId('');
                      setReclassToGrade('');
                      setReclassToPitamStatus('');
                      setReclassToRemainsInItalyGradeH(false);
                      setReclassToRemainsInItalyGradeV(false);
                      setQuantity('');
                    }}
                  >
                    <option value="">{f.reclassificationSourcePlaceholder}</option>
                    <option value="SPECIFIC_TRADER">{f.reclassificationSourceOptions.SPECIFIC_TRADER}</option>
                    <option value="GENERAL">{f.reclassificationSourceOptions.GENERAL}</option>
                  </select>
                </div>

                {reclassificationSource === 'SPECIFIC_TRADER' ? (
                  <div style={FIELD_STYLE}>
                    <label style={LABEL_STYLE}>{f.traderLabel}</label>
                    <select
                      className="seasons-manager__year-input"
                      value={traderId}
                      onChange={(event) => setTraderId(event.target.value)}
                    >
                      <option value="">{f.traderPlaceholder}</option>
                      {sortedTraders.map((trader) => (
                        <option key={`reclass-trader-${trader.id}`} value={String(trader.id)}>
                          {trader.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}

                {/* Mirrors the harvest form's per-grade remainsInItalyGradeH/V checkboxes: only relevant
                    when the "from" stock actually comes out of the GENERAL (modulo + traders) pool — when
                    the chosen "from" tuple resolves to the remains-in-Italy bucket instead (grade ה/ו
                    picked under "כללי"), the backend always routes the result through the default
                    per-trader share split, so these would be silently ignored — hide them in that case. */}
                {reclassificationEffectiveSource === 'GENERAL' ? (
                  <>
                    <label className={remainsInItalyCheckboxStyles.field}>
                      <input
                        type="checkbox"
                        checked={reclassToRemainsInItalyGradeH}
                        onChange={(event) => setReclassToRemainsInItalyGradeH(event.target.checked)}
                      />
                      <span>{f.reclassificationRemainsInItalyGradeHLabel}</span>
                    </label>
                    <label className={remainsInItalyCheckboxStyles.field}>
                      <input
                        type="checkbox"
                        checked={reclassToRemainsInItalyGradeV}
                        onChange={(event) => setReclassToRemainsInItalyGradeV(event.target.checked)}
                      />
                      <span>{f.reclassificationRemainsInItalyGradeVLabel}</span>
                    </label>
                  </>
                ) : null}
              </div>

              <div style={ROW_STYLE}>
                <div style={{ ...FIELD_STYLE, gridColumn: '1 / -1' }}>
                  <label style={LABEL_STYLE}>{f.reclassificationFromLabel}</label>
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
                    disabled={!isReclassificationCategoryEnabled || reclassificationCategoryOptions.length === 0}
                  >
                    <option value="">{f.traderCategoryPlaceholder}</option>
                    {reclassificationCategoryOptions.map((category) => (
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
                    disabled={!isReclassificationGradeEnabled || reclassificationGradeOptions.length === 0}
                  >
                    <option value="">{f.gradePlaceholder}</option>
                    {reclassificationGradeOptions.map((option) => (
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
                    disabled={!isReclassificationPitamEnabled || reclassificationPitamStatusOptions.length === 0}
                  >
                    <option value="">{f.pitamStatusPlaceholder}</option>
                    {reclassificationPitamStatusOptions.map((option) => (
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
                    max={reclassificationAvailable ?? undefined}
                    disabled={!isReclassificationQuantityEnabled}
                  />
                  <span
                    style={{
                      fontSize: 12,
                      opacity: 0.75,
                      visibility: reclassificationAvailable !== null ? 'visible' : 'hidden',
                    }}
                  >
                    {reclassificationAvailable !== null ? f.reclassificationAvailableLabel(reclassificationAvailable) : ' '}
                  </span>
                </div>
              </div>

              <div style={ROW_STYLE}>
                <div style={{ ...FIELD_STYLE, gridColumn: '1 / -1' }}>
                  <label style={LABEL_STYLE}>{f.reclassificationToLabel}</label>
                </div>
              </div>

              <div style={ROW_STYLE}>
                <div style={FIELD_STYLE}>
                  <label style={LABEL_STYLE}>{f.traderCategoryLabel}</label>
                  <select
                    className="seasons-manager__year-input"
                    value={reclassToTraderCategoryId}
                    onChange={(event) => {
                      setReclassToTraderCategoryId(event.target.value);
                      setReclassToGrade('');
                      setReclassToPitamStatus('');
                    }}
                    disabled={!isReclassificationToCategoryEnabled}
                  >
                    <option value="">{f.traderCategoryPlaceholder}</option>
                    {traderCategories.map((category) => (
                      <option key={`reclass-to-${category.id}`} value={String(category.id)}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={FIELD_STYLE}>
                  <label style={LABEL_STYLE}>{f.gradeLabel}</label>
                  <select
                    className="seasons-manager__year-input"
                    value={reclassToGrade}
                    onChange={(event) => {
                      setReclassToGrade(event.target.value);
                      setReclassToPitamStatus('');
                    }}
                    disabled={!isReclassificationToGradeEnabled}
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
                    value={reclassToPitamStatus}
                    onChange={(event) => setReclassToPitamStatus(event.target.value as PitamStatus | '')}
                    disabled={!isReclassificationToPitamEnabled}
                  >
                    <option value="">{f.pitamStatusPlaceholder}</option>
                    {PITAM_STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {i18n.pitamStatuses[option] || option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          ) : null}

          {type === 'RECLASSIFICATION_MANAGE' ? (
            <>
              <div style={ROW_STYLE}>
                <div style={{ ...FIELD_STYLE, gridColumn: '1 / -1' }}>
                  <label style={LABEL_STYLE}>{f.reclassificationUndoBatchLabel}</label>
                  <ReclassificationBatchPicker
                    lang={lang}
                    labels={f}
                    pitamStatusLabels={i18n.pitamStatuses}
                    batches={reclassificationBatches}
                    traderCategories={traderCategories}
                    value={reclassManageBatchId}
                    onChange={(id) => {
                      setReclassManageBatchId(id);
                      setReclassManageMode('select');
                      setReclassManageEditError('');
                    }}
                    isLoading={isReclassificationUndoLoading}
                  />
                </div>
              </div>

              {selectedReclassManageBatch && reclassManageMode === 'edit' ? (
                <div style={ROW_STYLE}>
                  <div style={FIELD_STYLE}>
                    <label style={LABEL_STYLE}>{f.quantityLabel}</label>
                    <input
                      className="seasons-manager__year-input"
                      type="number"
                      value={reclassManageEditQuantity}
                      onChange={(event) => {
                        setReclassManageEditQuantity(event.target.value);
                        setReclassManageEditError('');
                      }}
                      placeholder={f.quantityPlaceholder}
                      aria-label={f.quantityLabel}
                    />
                  </div>
                </div>
              ) : null}

              {reclassManageEditError ? <p className="seasons-manager__error">{reclassManageEditError}</p> : null}
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

          {type && type !== 'OWNERSHIP_TRANSFER' && type !== 'INTERNAL_TRANSFER' && type !== 'ASSIGNED' && type !== 'SELF_PICKUP' && type !== 'WASTE' && type !== 'PITAM_SPLIT' && type !== 'PITAM_SPLIT_MANAGE' && type !== 'REMAINS_IN_ITALY_WITHDRAWAL' && type !== 'REMAINS_IN_ITALY_WITHDRAWAL_MANAGE' && type !== 'RECLASSIFICATION' && type !== 'RECLASSIFICATION_MANAGE' ? (
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

          {type && type !== 'PITAM_SPLIT_MANAGE' && type !== 'REMAINS_IN_ITALY_WITHDRAWAL_MANAGE' && type !== 'RECLASSIFICATION_MANAGE' ? (
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

        <div className="modal-actions" style={{ marginTop: 'auto' }}>
          {type === 'PITAM_SPLIT_MANAGE' && selectedManageBatch && pitamManageMode === 'select' ? (
            <>
              <button className="btn btn-success" type="button" onClick={handleStartEditSelectedManageBatch}>
                {f.pitamSplitManageUpdateLabel}
              </button>
              <SubmitButton
                className="btn btn-success"
                type="button"
                onClick={handleCancelSelectedManageBatch}
                isLoading={pitamManageActionSubmitting}
                loadingText={f.pitamSplitManageCancelingLabel}
              >
                {f.pitamSplitManageCancelSplitLabel}
              </SubmitButton>
            </>
          ) : null}
          {type === 'PITAM_SPLIT_MANAGE' && selectedManageBatch && pitamManageMode === 'edit' ? (
            <>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={handleDiscardEditSelectedManageBatch}
                disabled={pitamManageActionSubmitting}
              >
                {f.pitamSplitManageDiscardEditLabel}
              </button>
              <SubmitButton
                className="btn btn-success"
                type="button"
                onClick={handleConfirmEditSelectedManageBatch}
                isLoading={pitamManageActionSubmitting}
                loadingText={f.pitamSplitManageSavingLabel}
              >
                {f.pitamSplitManageSaveLabel}
              </SubmitButton>
            </>
          ) : null}
          {type === 'REMAINS_IN_ITALY_WITHDRAWAL_MANAGE' && selectedRiwManageBatch && riwManageMode === 'select' ? (
            <>
              <button className="btn btn-success" type="button" onClick={handleStartEditSelectedRiwBatch}>
                {f.riwManageUpdateLabel}
              </button>
              <SubmitButton
                className="btn btn-success"
                type="button"
                onClick={handleCancelSelectedRiwBatch}
                isLoading={riwManageActionSubmitting}
                loadingText={f.riwManageCancelingLabel}
              >
                {f.riwManageCancelLabel}
              </SubmitButton>
            </>
          ) : null}
          {type === 'REMAINS_IN_ITALY_WITHDRAWAL_MANAGE' && selectedRiwManageBatch && riwManageMode === 'edit' ? (
            <>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={handleDiscardEditSelectedRiwBatch}
                disabled={riwManageActionSubmitting}
              >
                {f.riwManageDiscardEditLabel}
              </button>
              <SubmitButton
                className="btn btn-success"
                type="button"
                onClick={handleConfirmEditSelectedRiwBatch}
                isLoading={riwManageActionSubmitting}
                loadingText={f.riwManageSavingLabel}
              >
                {f.riwManageSaveLabel}
              </SubmitButton>
            </>
          ) : null}
          {type === 'RECLASSIFICATION_MANAGE' && selectedReclassManageBatch && reclassManageMode === 'select' ? (
            <>
              <button className="btn btn-success" type="button" onClick={handleStartEditSelectedReclassBatch}>
                {f.reclassificationManageUpdateLabel}
              </button>
              <SubmitButton
                className="btn btn-success"
                type="button"
                onClick={handleCancelSelectedReclassBatch}
                isLoading={reclassManageActionSubmitting}
                loadingText={f.reclassificationManageCancelingLabel}
              >
                {f.reclassificationManageCancelLabel}
              </SubmitButton>
            </>
          ) : null}
          {type === 'RECLASSIFICATION_MANAGE' && selectedReclassManageBatch && reclassManageMode === 'edit' ? (
            <>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={handleDiscardEditSelectedReclassBatch}
                disabled={reclassManageActionSubmitting}
              >
                {f.reclassificationManageDiscardEditLabel}
              </button>
              <SubmitButton
                className="btn btn-success"
                type="button"
                onClick={handleConfirmEditSelectedReclassBatch}
                isLoading={reclassManageActionSubmitting}
                loadingText={f.reclassificationManageSavingLabel}
              >
                {f.reclassificationManageSaveLabel}
              </SubmitButton>
            </>
          ) : null}
          <button className="btn btn-danger" type="button" onClick={handleClose}>
            {f.cancel}
          </button>
          {type !== 'PITAM_SPLIT_MANAGE' && type !== 'REMAINS_IN_ITALY_WITHDRAWAL_MANAGE' && type !== 'RECLASSIFICATION_MANAGE' ? (
            <SubmitButton
              className="btn btn-success"
              type="button"
              onClick={handleSubmit}
              isLoading={isSubmitting}
              loadingText={f.saving}
            >
              {f.save}
            </SubmitButton>
          ) : null}
        </div>
      </div>
    </div>
  );
}
