import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError } from '../../../services/apiClient';
import { getBoxById, getBoxesByShipment, packBox, type BoxStatus, type PackBoxItemPayload } from '../../../services/boxesApi';
import { getActiveSeason } from '../../../services/seasonsApi';
import { getShipmentsBySeason, type ShipmentRecord } from '../../../services/shipmentsApi';
import { getSystemConfig, type SystemConfig } from '../../../services/systemConfigApi';
import { getShipmentItemsByBox, type ShipmentItemRecord } from '../../../services/shipmentItemsApi';
import { getTraders, type Trader } from '../../../services/tradersApi';
import { getCustomers, type Customer } from '../../../services/customersApi';
import { getTraderCategoriesWithShares } from '../../../services/traderCategoriesApi';
import {
  getTraderAvailableInventory,
  getCustomerAvailableInventory,
  getAllTradersAvailableInventory,
  type TraderInventoryRow,
  type CustomerInventoryRow,
} from '../../../services/inventoryApi';
import type { StockSource } from './useNewShipmentItemForm';
import {
  ALL_GRADE_COLUMNS,
  PITAM_ROW_KEYS,
  SINGLE_GRADE_COLUMN_KEY,
  createEmptyGradeQuantityMatrix,
  getFilledMatrixEntries,
  setMatrixQuantity,
  type GradeQuantityMatrix,
  type PitamRowKey,
} from '../utils/packingItemMatrix.util';

type PackingFormText = {
  validationBoxNumberRequired: string;
  validationBoxNumberPositive: string;
  validationTraderRequired: string;
  validationCustomerRequired: string;
  duplicateBoxNumber: string;
  errorOwnershipLocked: string;
  errorBoxTypeCapacity: (quantity: number, capacity: number) => string;
  boxOverCapacityHint: (entered: number, remaining: number) => string;
  genericError: string;
};

type PackingItemRowText = {
  validationOwnershipRequired: string;
  validationTraderRequired: string;
  validationCustomerRequired: string;
  validationCategoryRequired: string;
  validationGradeRequired: string;
  validationPitamRequired: string;
  validationQuantityRequired: string;
  validationQuantityPositive: string;
  validationQuantityExceedsAvailable: string;
  validationMatrixEmpty: string;
  duplicateItemError: string;
  boxNotOpenError: string;
  errorBoxCapacityExceeded: string;
  existingItemInvalidQuantityError: string;
  existingItemUpdateError: string;
  genericError: string;
};

export type PackingBoxOption = {
  id: number;
  boxNumber: number;
  shipmentNumber: number;
  status: BoxStatus;
  boxType: 'SMALL' | 'MEDIUM' | 'LARGE' | 'CUSTOM';
  ownershipType: string;
  traderName: string | null;
  customerName: string | null;
};

export type PackingItemRowDraft = {
  id: string;
  itemOwnership: string;
  stockSource: StockSource | '';
  traderId: string;
  customerId: string;
  traderCategoryId: string;
  customerCategoryId: string;
  // Free-text grade/pitam/quantity fields, used only for CUSTOM-ownership rows (no inventory, no matrix).
  grade: string;
  pitamStatus: string;
  quantity: string;
  // Grade x pitam-status quantity matrix, used for every other ownership (inventory-backed) row.
  quantities: GradeQuantityMatrix;
  notes: string;
};

export type PackingItemRowView = {
  draft: PackingItemRowDraft;
  isCustomFreeText: boolean;
  isUnassignedBox: boolean;
  isSharedUnassignedItem: boolean;
  isTraderItem: boolean;
  isCustomerItem: boolean;
  hasCategorySelected: boolean;
  availableTraderCategories: Array<{ id: number; name: string }>;
  availableCustomerCategories: Array<{ id: number; name: string; grade: string | null }>;
  displayGradeColumns: string[];
  cellAvailability: Record<PitamRowKey, Record<string, number>>;
  existingItemByCell: Record<PitamRowKey, Record<string, { id: number; quantity: number }>>;
};

type UsePackingFormProps = {
  isOpen: boolean;
  t: PackingFormText;
  itemsT: PackingItemRowText;
  onSuccess: () => void;
  onClose: () => void;
};

type UsePackingFormResult = {
  boxOptions: PackingBoxOption[];
  isLoadingBoxOptions: boolean;
  selectedBoxId: string;
  setSelectedBoxId: (v: string) => void;
  selectedBoxStatus: BoxStatus | null;

  shipments: ShipmentRecord[];
  traders: Trader[];
  customers: Customer[];
  isLoadingOptions: boolean;
  hasItems: boolean;
  boxTotalQuantity: number;
  isShipmentFrozen: boolean;
  isShipmentShipped: boolean;
  isChangingShipment: boolean;
  originalBoxNumber: number;
  selectedShipmentId: string;
  setSelectedShipmentId: (v: string) => void;
  boxNumber: string;
  setBoxNumber: (v: string) => void;
  status: BoxStatus;
  setStatus: (v: BoxStatus) => void;
  boxType: string;
  setBoxType: (v: string) => void;
  ownershipType: string;
  setOwnershipType: (v: string) => void;
  traderId: string;
  setTraderId: (v: string) => void;
  customerId: string;
  setCustomerId: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  isShipped: boolean;

  itemRows: PackingItemRowDraft[];
  itemRowsView: PackingItemRowView[];
  isLoadingRowInventory: boolean;
  isBoxFull: boolean;
  isBoxOverCapacity: boolean;
  draftQuantityTotal: number;
  totalPackedQuantity: number;
  boxRemainingCapacity: number | null;
  boxCapacity: number | null;
  addItemRow: () => void;
  removeItemRow: (id: string) => void;
  updateItemRow: (id: string, updater: Partial<PackingItemRowDraft>) => void;
  updateItemRowQuantity: (id: string, pitamKey: PitamRowKey, gradeKey: string, value: string) => void;
  pendingExistingItemEdits: Record<number, string>;
  stageExistingItemEdit: (itemId: number, value: string | null) => void;
  invalidateTraderInventory: (traderId: number, stockSource: StockSource | '') => void;
  invalidateAllTraderInventory: () => void;

  isSubmitting: boolean;
  error: string | null;
  handleSaveAll: () => Promise<void>;
  handleClose: () => void;
};

function createEmptyItemRowDraft(id: string): PackingItemRowDraft {
  return {
    id,
    itemOwnership: '',
    stockSource: '',
    traderId: '',
    customerId: '',
    traderCategoryId: '',
    customerCategoryId: '',
    grade: '',
    pitamStatus: '',
    quantity: '',
    quantities: createEmptyGradeQuantityMatrix(),
    notes: '',
  };
}

export function usePackingForm({ isOpen, t, itemsT, onSuccess, onClose }: UsePackingFormProps): UsePackingFormResult {
  const [boxOptions, setBoxOptions] = useState<PackingBoxOption[]>([]);
  const [isLoadingBoxOptions, setIsLoadingBoxOptions] = useState(false);

  const [shipments, setShipments] = useState<ShipmentRecord[]>([]);
  const [traders, setTraders] = useState<Trader[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [traderCategoryOrderById, setTraderCategoryOrderById] = useState<Map<number, number>>(new Map());
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);

  const [selectedBoxId, setSelectedBoxIdRaw] = useState('');
  const [originalShipmentId, setOriginalShipmentId] = useState('');
  const [originalBoxNumber, setOriginalBoxNumber] = useState(0);
  const [selectedShipmentId, setSelectedShipmentId] = useState('');
  const [boxNumber, setBoxNumber] = useState('');
  const [status, setStatus] = useState<BoxStatus>('OPEN');
  const [boxType, setBoxType] = useState('');
  const [ownershipType, setOwnershipType] = useState('');
  const [traderId, setTraderId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [notes, setNotes] = useState('');
  const [hasItems, setHasItems] = useState(false);
  const [existingBoxItems, setExistingBoxItems] = useState<ShipmentItemRecord[]>([]);
  const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);
  const [boxTotalQuantity, setBoxTotalQuantity] = useState(0);
  const [isShipmentFrozen, setIsShipmentFrozen] = useState(false);
  const [isShipmentShipped, setIsShipmentShipped] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [itemRows, setItemRows] = useState<PackingItemRowDraft[]>([]);
  const [pendingExistingItemEdits, setPendingExistingItemEdits] = useState<Record<number, string>>({});
  const rowCounterRef = useRef(1);

  const [allTraderInventory, setAllTraderInventory] = useState<TraderInventoryRow[]>([]);
  const [traderInventoryCache, setTraderInventoryCache] = useState<Map<string, TraderInventoryRow[]>>(new Map());
  const [customerInventoryCache, setCustomerInventoryCache] = useState<Map<number, CustomerInventoryRow[]>>(new Map());
  const [isLoadingRowInventory, setIsLoadingRowInventory] = useState(false);
  const fetchedTraderKeysRef = useRef(new Set<string>());
  const fetchedCustomerKeysRef = useRef(new Set<number>());

  // Load the list of boxes for the active season whenever the modal opens
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let isMounted = true;
    setIsLoadingBoxOptions(true);

    const load = async () => {
      try {
        const activeSeason = await getActiveSeason();
        const [seasonShipments, boxSystemConfig] = await Promise.all([
          getShipmentsBySeason(activeSeason.id),
          getSystemConfig(activeSeason.id),
        ]);
        const capacityMap: Record<string, number | null> = {
          SMALL: boxSystemConfig.smallBoxCapacity,
          MEDIUM: boxSystemConfig.mediumBoxCapacity,
          LARGE: boxSystemConfig.largeBoxCapacity,
          CUSTOM: null,
        };
        const boxesByShipment = await Promise.all(
          seasonShipments.map(async (shipment) => {
            const boxes = await getBoxesByShipment(shipment.id);
            return boxes
              // Only OPEN boxes with remaining capacity can be packed — mirrors the "add item"
              // flow's getOpenBoxes(), which is the only place shipment items can ever be created.
              .filter((box) => {
                if (box.status !== 'OPEN') return false;
                const capacity = capacityMap[box.boxType] ?? null;
                return capacity === null || box.totalQuantity < capacity;
              })
              .map((box) => ({
                id: box.id,
                boxNumber: box.boxNumber,
                shipmentNumber: shipment.shipmentNumber,
                status: box.status,
                boxType: box.boxType,
                ownershipType: box.ownershipType,
                traderName: box.trader?.name ?? null,
                customerName: box.customer?.customerName ?? null,
              }));
          }),
        );

        if (!isMounted) {
          return;
        }

        setBoxOptions(boxesByShipment.flat().sort((a, b) => b.boxNumber - a.boxNumber));
      } catch {
        if (isMounted) {
          setBoxOptions([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingBoxOptions(false);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Load options and full box details when a box is selected
  useEffect(() => {
    if (!selectedBoxId) {
      return;
    }

    const boxId = Number(selectedBoxId);
    let isMounted = true;
    setIsLoadingOptions(true);
    setHasItems(false);
    setIsShipmentFrozen(false);
    setError(null);

    const load = async () => {
      try {
        const activeSeason = await getActiveSeason();
        const [fullBox, boxItems, nextShipments, nextTraders, nextCustomers, nextSystemConfig, nextTraderCategories] =
          await Promise.all([
            getBoxById(boxId),
            getShipmentItemsByBox(boxId),
            getShipmentsBySeason(activeSeason.id),
            getTraders(),
            getCustomers(),
            getSystemConfig(activeSeason.id),
            getTraderCategoriesWithShares(activeSeason.id),
          ]);

        if (!isMounted) {
          return;
        }

        setShipments(nextShipments);
        setTraders(nextTraders);
        setCustomers(nextCustomers);
        setTraderCategoryOrderById(new Map(nextTraderCategories.map((category) => [category.id, category.orderIndex])));
        setSystemConfig(nextSystemConfig);
        setHasItems(boxItems.length > 0);
        setExistingBoxItems(boxItems);
        setBoxTotalQuantity(fullBox.totalQuantity);

        const boxShipment = nextShipments.find((s) => s.id === fullBox.shipmentId);
        setIsShipmentFrozen(boxShipment?.status === 'DELIVERED');
        setIsShipmentShipped(boxShipment?.status === 'SHIPPED');

        setOriginalShipmentId(String(fullBox.shipmentId));
        setOriginalBoxNumber(fullBox.boxNumber);
        setSelectedShipmentId(String(fullBox.shipmentId));
        setBoxNumber(String(fullBox.boxNumber));
        setStatus(fullBox.status);
        setBoxType(fullBox.boxType);
        setOwnershipType(fullBox.ownershipType);
        setTraderId(fullBox.traderId !== null && fullBox.traderId !== undefined ? String(fullBox.traderId) : '');
        setCustomerId(fullBox.customerId !== null && fullBox.customerId !== undefined ? String(fullBox.customerId) : '');
        setNotes(fullBox.notes ?? '');
      } catch {
        if (!isMounted) {
          return;
        }
        setShipments([]);
        setTraders([]);
        setCustomers([]);
        setTraderCategoryOrderById(new Map());
      } finally {
        if (isMounted) {
          setIsLoadingOptions(false);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [selectedBoxId]);

  // GENERAL/SHARED boxes draw from the aggregated all-traders inventory (unassigned share pool)
  useEffect(() => {
    if (!selectedBoxId || (ownershipType !== 'GENERAL' && ownershipType !== 'SHARED')) {
      setAllTraderInventory([]);
      return;
    }

    let isMounted = true;
    getAllTradersAvailableInventory()
      .then((rows) => { if (isMounted) setAllTraderInventory(rows); })
      .catch(() => { if (isMounted) setAllTraderInventory([]); });

    return () => { isMounted = false; };
  }, [selectedBoxId, ownershipType]);

  const traderKeysSignature = useMemo(() => {
    const keys = new Set<string>();
    if (ownershipType === 'TRADER' && traderId) {
      for (const row of itemRows) {
        if (row.stockSource) keys.add(`${traderId}:${row.stockSource}`);
      }
    } else if (ownershipType === 'SHARED') {
      for (const row of itemRows) {
        if (row.itemOwnership === 'TRADER' && row.traderId && row.stockSource) keys.add(`${row.traderId}:${row.stockSource}`);
      }
    }
    return Array.from(keys).sort().join(',');
  }, [itemRows, ownershipType, traderId]);

  const customerKeysSignature = useMemo(() => {
    const keys = new Set<number>();
    if (ownershipType === 'CUSTOMER' && customerId) {
      keys.add(Number(customerId));
    } else if (ownershipType === 'SHARED') {
      for (const row of itemRows) {
        if (row.itemOwnership === 'CUSTOMER' && row.customerId) keys.add(Number(row.customerId));
      }
    }
    return Array.from(keys).sort((a, b) => a - b).join(',');
  }, [itemRows, ownershipType, customerId]);

  useEffect(() => {
    fetchedTraderKeysRef.current.clear();
    fetchedCustomerKeysRef.current.clear();
    setTraderInventoryCache(new Map());
    setCustomerInventoryCache(new Map());
  }, [selectedBoxId]);

  useEffect(() => {
    if (!selectedBoxId || !traderKeysSignature) return;
    const keys = traderKeysSignature.split(',').filter(Boolean);
    const missing = keys.filter((k) => !fetchedTraderKeysRef.current.has(k));
    if (missing.length === 0) return;
    missing.forEach((k) => fetchedTraderKeysRef.current.add(k));

    let isMounted = true;
    setIsLoadingRowInventory(true);
    Promise.all(
      missing.map(async (key) => {
        const [traderIdPart, stockSourcePart] = key.split(':');
        try {
          const rows = await getTraderAvailableInventory(Number(traderIdPart), stockSourcePart as StockSource);
          return [key, rows] as const;
        } catch {
          return [key, [] as TraderInventoryRow[]] as const;
        }
      }),
    )
      .then((entries) => {
        if (!isMounted) return;
        setTraderInventoryCache((prev) => {
          const next = new Map(prev);
          for (const [key, rows] of entries) next.set(key, rows);
          return next;
        });
      })
      .finally(() => { if (isMounted) setIsLoadingRowInventory(false); });

    return () => { isMounted = false; };
  }, [selectedBoxId, traderKeysSignature]);

  useEffect(() => {
    if (!selectedBoxId || !customerKeysSignature) return;
    const keys = customerKeysSignature.split(',').filter(Boolean).map(Number);
    const missing = keys.filter((k) => !fetchedCustomerKeysRef.current.has(k));
    if (missing.length === 0) return;
    missing.forEach((k) => fetchedCustomerKeysRef.current.add(k));

    let isMounted = true;
    setIsLoadingRowInventory(true);
    Promise.all(
      missing.map(async (customerIdKey) => {
        try {
          const rows = await getCustomerAvailableInventory(customerIdKey);
          return [customerIdKey, rows] as const;
        } catch {
          return [customerIdKey, [] as CustomerInventoryRow[]] as const;
        }
      }),
    )
      .then((entries) => {
        if (!isMounted) return;
        setCustomerInventoryCache((prev) => {
          const next = new Map(prev);
          for (const [key, rows] of entries) next.set(key, rows);
          return next;
        });
      })
      .finally(() => { if (isMounted) setIsLoadingRowInventory(false); });

    return () => { isMounted = false; };
  }, [selectedBoxId, customerKeysSignature]);

  const resolveEffectiveTraderId = useCallback((row: PackingItemRowDraft): number | null => {
    if (ownershipType === 'TRADER') return traderId ? Number(traderId) : null;
    if (ownershipType === 'SHARED' && row.itemOwnership === 'TRADER' && row.traderId) return Number(row.traderId);
    return null;
  }, [ownershipType, traderId]);

  const resolveEffectiveCustomerId = useCallback((row: PackingItemRowDraft): number | null => {
    if (ownershipType === 'CUSTOMER') return customerId ? Number(customerId) : null;
    if (ownershipType === 'SHARED' && row.itemOwnership === 'CUSTOMER' && row.customerId) return Number(row.customerId);
    return null;
  }, [ownershipType, customerId]);

  // Identifies the ownership+source "pool" a row draws from (ignoring category), so sibling rows
  // drawing from the same pool can't pick a category another row already claimed.
  const comboPrefixOf = useCallback((draft: PackingItemRowDraft): string | null => {
    const resolveFor = (rowOwnership: string, rowTraderId: string, rowCustomerId: string, rowStockSource: string) => {
      if (rowOwnership === 'TRADER') {
        return rowTraderId ? `TRADER:${rowTraderId}:${rowStockSource}` : null;
      }
      if (rowOwnership === 'CUSTOMER') {
        return rowCustomerId ? `CUSTOMER:${rowCustomerId}` : null;
      }
      if (rowOwnership === 'GENERAL') {
        return 'GENERAL';
      }
      return null;
    };

    if (ownershipType === 'SHARED') {
      return resolveFor(draft.itemOwnership, draft.traderId, draft.customerId, draft.stockSource);
    }
    if (ownershipType === 'TRADER' || ownershipType === 'CUSTOMER' || ownershipType === 'GENERAL') {
      return resolveFor(ownershipType, traderId, customerId, draft.stockSource);
    }
    return null;
  }, [ownershipType, traderId, customerId]);

  // Category id already claimed by another draft row sharing the same combo prefix, keyed by prefix.
  const usedCategoryByPrefix = useMemo(() => {
    const map = new Map<string, Map<string, string>>();
    for (const draft of itemRows) {
      const prefix = comboPrefixOf(draft);
      if (!prefix) continue;

      const isCustomerRow = ownershipType === 'CUSTOMER' || (ownershipType === 'SHARED' && draft.itemOwnership === 'CUSTOMER');
      const categoryId = isCustomerRow ? draft.customerCategoryId : draft.traderCategoryId;
      if (!categoryId) continue;

      let byCategory = map.get(prefix);
      if (!byCategory) {
        byCategory = new Map();
        map.set(prefix, byCategory);
      }
      byCategory.set(categoryId, draft.id);
    }
    return map;
  }, [itemRows, ownershipType, comboPrefixOf]);

  const itemRowsView = useMemo<PackingItemRowView[]>(() => {
    return itemRows.map((draft) => {
      const isCustomBox = ownershipType === 'CUSTOM';
      const isSharedBox = ownershipType === 'SHARED';
      const isSharedCustomItem = isSharedBox && draft.itemOwnership === 'CUSTOM';
      const isCustomFreeText = isCustomBox || isSharedCustomItem;
      const isUnassignedBox = ownershipType === 'GENERAL';
      const isSharedUnassignedItem = isSharedBox && draft.itemOwnership === 'GENERAL';
      const isTraderItem = ownershipType === 'TRADER' || (isSharedBox && draft.itemOwnership === 'TRADER');
      const isCustomerItem = ownershipType === 'CUSTOMER' || (isSharedBox && draft.itemOwnership === 'CUSTOMER');

      const effTraderId = resolveEffectiveTraderId(draft);
      const effCustomerId = resolveEffectiveCustomerId(draft);
      const useAllTraders = isUnassignedBox || isSharedUnassignedItem;
      const traderSource = useAllTraders
        ? allTraderInventory
        : effTraderId
          ? traderInventoryCache.get(`${effTraderId}:${draft.stockSource}`) ?? []
          : [];
      const customerSource = effCustomerId ? customerInventoryCache.get(effCustomerId) ?? [] : [];

      const rowPrefix = comboPrefixOf(draft);
      const usedByOtherRows = rowPrefix ? usedCategoryByPrefix.get(rowPrefix) : undefined;
      const isClaimedByOtherRow = (categoryId: number) => {
        if (!usedByOtherRows) return false;
        const owningRowId = usedByOtherRows.get(String(categoryId));
        return owningRowId !== undefined && owningRowId !== draft.id;
      };

      const traderCategorySeen = new Map<number, string>();
      for (const row of traderSource) {
        if (!traderCategorySeen.has(row.traderCategoryId)) {
          traderCategorySeen.set(row.traderCategoryId, row.traderCategoryName ?? String(row.traderCategoryId));
        }
      }
      const availableTraderCategories = Array.from(traderCategorySeen.entries())
        .filter(([id]) => !isClaimedByOtherRow(id))
        .map(([id, name]) => ({ id, name }))
        .sort((left, right) => {
          const leftOrder = traderCategoryOrderById.get(left.id);
          const rightOrder = traderCategoryOrderById.get(right.id);
          if (leftOrder !== undefined && rightOrder !== undefined) return leftOrder - rightOrder;
          if (leftOrder !== undefined) return -1;
          if (rightOrder !== undefined) return 1;
          return left.name.localeCompare(right.name);
        });

      const customerCategorySeen = new Map<number, { name: string; grade: string | null }>();
      for (const row of customerSource) {
        if (!customerCategorySeen.has(row.customerCategoryId)) {
          customerCategorySeen.set(row.customerCategoryId, {
            name: row.customerCategoryName ?? String(row.customerCategoryId),
            grade: row.categoryGrade,
          });
        }
      }
      const availableCustomerCategories = Array.from(customerCategorySeen.entries())
        .filter(([id]) => !isClaimedByOtherRow(id))
        .map(([id, { name, grade }]) => ({ id, name, grade }));

      const hasCategorySelected = isCustomerItem ? Boolean(draft.customerCategoryId) : Boolean(draft.traderCategoryId);

      // The matrix is always displayed; only cell availability depends on the selected ownership/source
      // and category. Grade columns are the full fixed set for trader/general rows, or a single implied
      // column for customer rows (whose grade comes from the category itself).
      const cellAvailability: Record<PitamRowKey, Record<string, number>> = {
        WITH_PITAM: {},
        WITHOUT_PITAM: {},
        MIXED: {},
      };
      const displayGradeColumns: string[] = isCustomerItem ? [SINGLE_GRADE_COLUMN_KEY] : [...ALL_GRADE_COLUMNS];

      if (isCustomerItem) {
        if (draft.customerCategoryId) {
          for (const row of customerSource) {
            if (String(row.customerCategoryId) !== draft.customerCategoryId) continue;
            const pitamKey = row.pitamStatus as PitamRowKey;
            if (!PITAM_ROW_KEYS.includes(pitamKey)) continue;
            cellAvailability[pitamKey][SINGLE_GRADE_COLUMN_KEY] = (cellAvailability[pitamKey][SINGLE_GRADE_COLUMN_KEY] ?? 0) + row.quantity;
          }
        }
      } else if (draft.traderCategoryId) {
        for (const row of traderSource) {
          if (String(row.traderCategoryId) !== draft.traderCategoryId) continue;
          const pitamKey = row.pitamStatus as PitamRowKey;
          if (!PITAM_ROW_KEYS.includes(pitamKey)) continue;
          cellAvailability[pitamKey][row.grade] = (cellAvailability[pitamKey][row.grade] ?? 0) + row.quantity;
        }
      }

      // Cells that already have a matching item packed in this box (same category/grade/pitam/
      // ownership/owner combo) can't accept another one — the backend enforces this as a duplicate.
      // Surface the existing item there (with its id, for inline editing) instead of leaving the
      // cell open for a new entry.
      const existingItemByCell: Record<PitamRowKey, Record<string, { id: number; quantity: number }>> = {
        WITH_PITAM: {},
        WITHOUT_PITAM: {},
        MIXED: {},
      };

      if (!isCustomFreeText) {
        const resolvedOwnership = ownershipType === 'SHARED' ? draft.itemOwnership : ownershipType;

        for (const item of existingBoxItems) {
          if (item.ownershipType !== resolvedOwnership) continue;
          const pitamKey = (item.pitamStatus ?? '') as PitamRowKey;
          if (!PITAM_ROW_KEYS.includes(pitamKey)) continue;

          if (isCustomerItem) {
            if (!draft.customerCategoryId || String(item.customerCategoryId) !== draft.customerCategoryId) continue;
            const existing = existingItemByCell[pitamKey][SINGLE_GRADE_COLUMN_KEY];
            existingItemByCell[pitamKey][SINGLE_GRADE_COLUMN_KEY] = existing
              ? { id: existing.id, quantity: existing.quantity + item.quantity }
              : { id: item.id, quantity: item.quantity };
          } else {
            if (!draft.traderCategoryId || String(item.traderCategoryId) !== draft.traderCategoryId) continue;
            if (!item.grade) continue;
            if (resolvedOwnership === 'TRADER') {
              if (item.traderId !== effTraderId) continue;
              if (item.isPrivateSelection !== (draft.stockSource === 'PRIVATE_SELECTION')) continue;
            }
            const existing = existingItemByCell[pitamKey][item.grade];
            existingItemByCell[pitamKey][item.grade] = existing
              ? { id: existing.id, quantity: existing.quantity + item.quantity }
              : { id: item.id, quantity: item.quantity };
          }
        }
      }

      return {
        draft,
        isCustomFreeText,
        isUnassignedBox,
        isSharedUnassignedItem,
        isTraderItem,
        isCustomerItem,
        hasCategorySelected,
        availableTraderCategories,
        availableCustomerCategories,
        displayGradeColumns,
        cellAvailability,
        existingItemByCell,
      };
    });
  }, [itemRows, ownershipType, allTraderInventory, traderInventoryCache, customerInventoryCache, resolveEffectiveTraderId, resolveEffectiveCustomerId, comboPrefixOf, usedCategoryByPrefix, existingBoxItems, traderCategoryOrderById]);

  const boxCapacity = useMemo(() => {
    if (!boxType || boxType === 'CUSTOM' || !systemConfig) return null;
    const capacityMap: Record<string, number | null> = {
      SMALL: systemConfig.smallBoxCapacity,
      MEDIUM: systemConfig.mediumBoxCapacity,
      LARGE: systemConfig.largeBoxCapacity,
    };
    return capacityMap[boxType] ?? null;
  }, [boxType, systemConfig]);

  // Live running total of every quantity currently drafted across all item rows, matrix cells
  // and free-text CUSTOM rows alike — used to lock the form once the box would be filled.
  const draftQuantityTotal = useMemo(() => {
    let sum = 0;
    for (const draft of itemRows) {
      const isCustomBox = ownershipType === 'CUSTOM';
      const isSharedCustomItem = ownershipType === 'SHARED' && draft.itemOwnership === 'CUSTOM';
      if (isCustomBox || isSharedCustomItem) {
        const quantityValue = Number(draft.quantity);
        if (Number.isFinite(quantityValue) && quantityValue > 0) sum += quantityValue;
        continue;
      }
      sum += getFilledMatrixEntries(draft.quantities).reduce((rowSum, entry) => rowSum + entry.quantity, 0);
    }
    return sum;
  }, [itemRows, ownershipType]);

  // Net change to the box total from pending edits to already-existing items — folded into the
  // capacity math below so editing an existing quantity up/down is reflected immediately.
  const pendingEditsQuantityDelta = useMemo(() => {
    let delta = 0;
    for (const [itemIdStr, rawValue] of Object.entries(pendingExistingItemEdits)) {
      const item = existingBoxItems.find((row) => row.id === Number(itemIdStr));
      if (!item) continue;
      const nextQuantity = Number(rawValue);
      if (Number.isFinite(nextQuantity)) delta += nextQuantity - item.quantity;
    }
    return delta;
  }, [pendingExistingItemEdits, existingBoxItems]);

  const effectiveBoxTotalQuantity = boxTotalQuantity + pendingEditsQuantityDelta;
  const totalPackedQuantity = effectiveBoxTotalQuantity + draftQuantityTotal;
  const boxRemainingCapacity = boxCapacity !== null ? Math.max(0, boxCapacity - effectiveBoxTotalQuantity) : null;
  // Compared against the absolute capacity (not the clamped boxRemainingCapacity above), so an
  // overage caused purely by a pending edit to an existing item — with no new draft rows at all —
  // is still caught instead of silently clamping to "box full" with no over-capacity error.
  const isBoxFull = boxCapacity !== null && totalPackedQuantity >= boxCapacity;
  const isBoxOverCapacity = boxCapacity !== null && totalPackedQuantity > boxCapacity;

  const resetFields = useCallback(() => {
    setOriginalShipmentId('');
    setOriginalBoxNumber(0);
    setSelectedShipmentId('');
    setBoxNumber('');
    setStatus('OPEN');
    setBoxType('');
    setOwnershipType('');
    setTraderId('');
    setCustomerId('');
    setNotes('');
    setHasItems(false);
    setExistingBoxItems([]);
    setIsShipmentFrozen(false);
    setIsShipmentShipped(false);
    setItemRows([]);
    setPendingExistingItemEdits({});
    setError(null);
  }, []);

  const stageExistingItemEdit = useCallback((itemId: number, value: string | null) => {
    setPendingExistingItemEdits((prev) => {
      if (value === null) {
        if (!(itemId in prev)) {
          return prev;
        }
        const next = { ...prev };
        delete next[itemId];
        return next;
      }
      return { ...prev, [itemId]: value };
    });
  }, []);

  // Called after a PITAM_SPLIT resolution succeeds mid-packing (see PackingItemRowsSection), so the
  // affected row's cached availability is refetched instead of staying stale until the box changes.
  const invalidateTraderInventory = useCallback((traderIdVal: number, stockSource: StockSource | '') => {
    if (!stockSource) return;
    const key = `${traderIdVal}:${stockSource}`;
    fetchedTraderKeysRef.current.delete(key);
    setTraderInventoryCache((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  }, []);

  // Called after a GENERAL-source PITAM_SPLIT resolution succeeds mid-packing, so the aggregated
  // all-traders pool backing GENERAL/unassigned rows is refetched instead of staying stale.
  const invalidateAllTraderInventory = useCallback(() => {
    if (ownershipType !== 'GENERAL' && ownershipType !== 'SHARED') return;
    getAllTradersAvailableInventory()
      .then((rows) => setAllTraderInventory(rows))
      .catch(() => {});
  }, [ownershipType]);

  const setSelectedBoxId = useCallback((v: string) => {
    setSelectedBoxIdRaw(v);
    resetFields();
  }, [resetFields]);

  const handleClose = useCallback(() => {
    setSelectedBoxIdRaw('');
    resetFields();
    onClose();
  }, [onClose, resetFields]);

  const addItemRow = useCallback(() => {
    const nextId = rowCounterRef.current;
    rowCounterRef.current += 1;
    setItemRows((prev) => [...prev, createEmptyItemRowDraft(`packing-row-${nextId}`)]);
  }, []);

  const removeItemRow = useCallback((id: string) => {
    setItemRows((prev) => prev.filter((row) => row.id !== id));
  }, []);

  const updateItemRow = useCallback((id: string, updater: Partial<PackingItemRowDraft>) => {
    setItemRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...updater } : row)));
  }, []);

  const updateItemRowQuantity = useCallback((id: string, pitamKey: PitamRowKey, gradeKey: string, value: string) => {
    setItemRows((prev) => prev.map((row) => (
      row.id === id ? { ...row, quantities: setMatrixQuantity(row.quantities, pitamKey, gradeKey, value) } : row
    )));
  }, []);

  const buildRowPayloads = useCallback((view: PackingItemRowView): PackBoxItemPayload[] | { rowError: string } => {
    const { draft } = view;
    const isSharedBox = ownershipType === 'SHARED';
    const isSharedCustomItem = isSharedBox && draft.itemOwnership === 'CUSTOM';

    if (isSharedBox && !draft.itemOwnership) {
      return { rowError: itemsT.validationOwnershipRequired };
    }

    const resolvedOwnership =
      ownershipType === 'TRADER' ? 'TRADER'
        : ownershipType === 'CUSTOMER' ? 'CUSTOMER'
          : ownershipType === 'SHARED' ? draft.itemOwnership
            : 'GENERAL';

    const resolvedTraderId = resolveEffectiveTraderId(draft);
    const resolvedCustomerId = resolveEffectiveCustomerId(draft);

    // CUSTOM ownership has no inventory to back a matrix — keep the plain grade/pitam/quantity fields.
    if (view.isCustomFreeText) {
      if (!draft.traderCategoryId.trim()) return { rowError: itemsT.validationCategoryRequired };
      if (!draft.pitamStatus) return { rowError: itemsT.validationPitamRequired };
      if (!draft.quantity.trim()) return { rowError: itemsT.validationQuantityRequired };

      const quantityValue = Number(draft.quantity);
      if (!Number.isInteger(quantityValue) || quantityValue <= 0) {
        return { rowError: itemsT.validationQuantityPositive };
      }

      const payload: PackBoxItemPayload = {
        pitamStatus: draft.pitamStatus,
        quantity: quantityValue,
        notes: draft.notes.trim() || undefined,
        customLabel: draft.traderCategoryId.trim(),
        ownershipType: isSharedCustomItem ? 'CUSTOM' : undefined,
      };
      if (draft.grade.trim()) payload.customGrade = draft.grade.trim();

      return [payload];
    }

    if (resolvedOwnership === 'TRADER' && !resolvedTraderId) {
      return { rowError: itemsT.validationTraderRequired };
    }
    if (resolvedOwnership === 'CUSTOMER' && !resolvedCustomerId) {
      return { rowError: itemsT.validationCustomerRequired };
    }
    if (!view.hasCategorySelected) {
      return { rowError: itemsT.validationCategoryRequired };
    }

    const filledEntries = getFilledMatrixEntries(draft.quantities);
    if (filledEntries.length === 0) {
      // A row can exist purely to surface an already-packed combo's matrix for inline editing (via
      // the pencil icon on existing cells) without adding any new quantity. Such a row has nothing
      // new to submit here, so skip it instead of blocking the form with a "quantity required" error.
      return [];
    }

    const payloads: PackBoxItemPayload[] = [];
    for (const entry of filledEntries) {
      const available = view.cellAvailability[entry.pitamStatus]?.[entry.grade ?? SINGLE_GRADE_COLUMN_KEY] ?? 0;
      if (entry.quantity > available) {
        return { rowError: itemsT.validationQuantityExceedsAvailable };
      }

      const payload: PackBoxItemPayload = {
        pitamStatus: entry.pitamStatus,
        quantity: entry.quantity,
        ownershipType: isSharedBox ? resolvedOwnership : undefined,
        notes: draft.notes.trim() || undefined,
      };

      if (view.isUnassignedBox || view.isSharedUnassignedItem) {
        payload.traderCategoryId = Number(draft.traderCategoryId);
        payload.grade = entry.grade ?? undefined;
      } else if (resolvedOwnership === 'TRADER') {
        payload.traderId = resolvedTraderId ?? undefined;
        payload.traderCategoryId = Number(draft.traderCategoryId);
        payload.grade = entry.grade ?? undefined;
        payload.isPrivateSelection = draft.stockSource === 'PRIVATE_SELECTION';
      } else if (resolvedOwnership === 'CUSTOMER') {
        payload.customerId = resolvedCustomerId ?? undefined;
        payload.customerCategoryId = Number(draft.customerCategoryId);
      }

      payloads.push(payload);
    }

    return payloads;
  }, [ownershipType, itemsT, resolveEffectiveTraderId, resolveEffectiveCustomerId]);

  const handleSaveAll = useCallback(async () => {
    if (!selectedBoxId) {
      return;
    }

    if (!boxNumber.trim()) {
      setError(t.validationBoxNumberRequired);
      return;
    }

    const boxNumberValue = Number(boxNumber);
    if (!Number.isInteger(boxNumberValue) || boxNumberValue <= 0) {
      setError(t.validationBoxNumberPositive);
      return;
    }

    if (ownershipType === 'TRADER' && !traderId) {
      setError(t.validationTraderRequired);
      return;
    }

    if (ownershipType === 'CUSTOMER' && !customerId) {
      setError(t.validationCustomerRequired);
      return;
    }

    if (boxType && boxType !== 'CUSTOM' && systemConfig) {
      const capacityMap: Record<string, number | null> = {
        SMALL: systemConfig.smallBoxCapacity,
        MEDIUM: systemConfig.mediumBoxCapacity,
        LARGE: systemConfig.largeBoxCapacity,
      };
      const capacity = capacityMap[boxType] ?? null;
      if (capacity !== null && effectiveBoxTotalQuantity > capacity) {
        setError(t.errorBoxTypeCapacity(effectiveBoxTotalQuantity, capacity));
        return;
      }
    }

    if (isBoxOverCapacity) {
      setError(t.boxOverCapacityHint(totalPackedQuantity - boxTotalQuantity, Math.max(0, (boxCapacity ?? 0) - boxTotalQuantity)));
      return;
    }

    const itemPayloads: PackBoxItemPayload[] = [];
    for (const view of itemRowsView) {
      const result = buildRowPayloads(view);
      if ('rowError' in result) {
        setError(result.rowError);
        return;
      }
      itemPayloads.push(...result);
    }

    const existingItemEdits: { itemId: number; quantity: number }[] = [];
    for (const [itemIdStr, rawValue] of Object.entries(pendingExistingItemEdits)) {
      const quantity = Number(rawValue);
      if (!Number.isInteger(quantity) || quantity <= 0) {
        setError(itemsT.existingItemInvalidQuantityError);
        return;
      }
      existingItemEdits.push({ itemId: Number(itemIdStr), quantity });
    }

    setError(null);
    setIsSubmitting(true);

    try {
      // Edits to already-packed items and creation of new ones are sent together so the backend
      // can apply both inside a single transaction — either everything lands, or nothing does.
      await packBox(
        {
          id: Number(selectedBoxId),
          shipmentId: selectedShipmentId ? Number(selectedShipmentId) : undefined,
          boxNumber: boxNumberValue,
          status,
          boxType: boxType as 'SMALL' | 'MEDIUM' | 'LARGE' | 'CUSTOM' | undefined,
          ownershipType: ownershipType as 'TRADER' | 'CUSTOMER' | 'SHARED' | 'GENERAL' | 'CUSTOM' | undefined,
          traderId: ownershipType === 'TRADER' ? Number(traderId) : null,
          customerId: ownershipType === 'CUSTOMER' ? Number(customerId) : null,
          notes: notes.trim() || null,
          items: itemPayloads,
          itemEdits: existingItemEdits.map((edit) => ({ id: edit.itemId, quantity: edit.quantity })),
        },
        { suppressGlobalFeedback: true },
      );

      setPendingExistingItemEdits({});
      onSuccess();
      handleClose();
    } catch (err) {
      if (err instanceof ApiError) {
        const lowerMessage = err.message.toLowerCase();
        if (err.status === 409 && lowerMessage.includes('shipment item')) {
          setError(itemsT.duplicateItemError);
        } else if (err.status === 409) {
          setError(t.duplicateBoxNumber);
        } else if (err.status === 400 && lowerMessage.includes('ownership')) {
          setError(t.errorOwnershipLocked);
        } else if (err.status === 400 && lowerMessage.includes('not open')) {
          setError(itemsT.boxNotOpenError);
        } else if (err.status === 400 && lowerMessage.includes('capacity')) {
          setError(itemsT.errorBoxCapacityExceeded);
        } else if (err.status === 400 && lowerMessage.includes('insufficient')) {
          setError(itemsT.validationQuantityExceedsAvailable);
        } else {
          setError(t.genericError);
        }
      } else {
        setError(t.genericError);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [boxNumber, boxType, effectiveBoxTotalQuantity, boxRemainingCapacity, buildRowPayloads, customerId, draftQuantityTotal, handleClose, isBoxOverCapacity, itemRowsView, notes, onSuccess, ownershipType, pendingExistingItemEdits, selectedBoxId, selectedShipmentId, status, systemConfig, t, itemsT, traderId]);

  const selectedBoxStatus = boxOptions.find((b) => String(b.id) === selectedBoxId)?.status ?? null;

  return {
    boxOptions,
    isLoadingBoxOptions,
    selectedBoxId,
    setSelectedBoxId,
    selectedBoxStatus,

    shipments,
    traders,
    customers,
    isLoadingOptions,
    hasItems,
    boxTotalQuantity,
    isShipmentFrozen,
    isShipmentShipped,
    originalBoxNumber,
    selectedShipmentId,
    setSelectedShipmentId,
    boxNumber,
    setBoxNumber,
    status,
    setStatus,
    boxType,
    setBoxType,
    ownershipType,
    setOwnershipType,
    traderId,
    setTraderId,
    customerId,
    setCustomerId,
    notes,
    setNotes,
    isChangingShipment: selectedShipmentId !== originalShipmentId,
    isShipped: status === 'SHIPPED' || status === 'CLOSED' || status === 'DELIVERED',

    itemRows,
    itemRowsView,
    isLoadingRowInventory,
    isBoxFull,
    isBoxOverCapacity,
    draftQuantityTotal,
    totalPackedQuantity,
    boxRemainingCapacity,
    boxCapacity,
    addItemRow,
    removeItemRow,
    updateItemRow,
    updateItemRowQuantity,
    pendingExistingItemEdits,
    stageExistingItemEdit,
    invalidateTraderInventory,
    invalidateAllTraderInventory,

    isSubmitting,
    error,
    handleSaveAll,
    handleClose,
  };
}
