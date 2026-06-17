import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError, apiClient } from '../../../services/apiClient';
import { getOpenBoxes, type OpenBoxRecord } from '../../../services/boxesApi';
import {
  getTraderAvailableInventory,
  getCustomerAvailableInventory,
  getAllTradersAvailableInventory,
  type TraderInventoryRow,
  type CustomerInventoryRow,
} from '../../../services/inventoryApi';
import { getTraders, type Trader } from '../../../services/tradersApi';
import { getCustomers, type Customer } from '../../../services/customersApi';

export type ItemOwnership = 'TRADER' | 'CUSTOMER' | 'GENERAL';

type NewShipmentItemFormText = {
  validationBoxRequired: string;
  validationOwnershipRequired: string;
  validationTraderRequired: string;
  validationCustomerRequired: string;
  validationCategoryRequired: string;
  validationGradeRequired: string;
  validationPitamRequired: string;
  validationQuantityRequired: string;
  validationQuantityPositive: string;
  validationQuantityExceedsAvailable: string;
  validationQuantityExceedsCapacity: string;
  duplicateItemError: string;
  genericError: string;
};

type UseNewShipmentItemFormProps = {
  isOpen: boolean;
  t: NewShipmentItemFormText;
  onSuccess: () => void;
  onClose: () => void;
};

export type StockSource = 'GENERAL' | 'PRIVATE_SELECTION';

export type UseNewShipmentItemFormResult = {
  openBoxes: OpenBoxRecord[];
  traders: Trader[];
  customers: Customer[];
  traderInventory: TraderInventoryRow[];
  customerInventory: CustomerInventoryRow[];
  isLoadingOptions: boolean;
  isLoadingInventory: boolean;

  selectedBoxId: string;
  setSelectedBoxId: (v: string) => void;
  selectedBox: OpenBoxRecord | null;

  itemOwnership: string;
  setItemOwnership: (v: string) => void;

  stockSource: StockSource;
  setStockSource: (v: StockSource) => void;

  traderId: string;
  setTraderId: (v: string) => void;

  customerId: string;
  setCustomerId: (v: string) => void;

  traderCategoryId: string;
  setTraderCategoryId: (v: string) => void;

  customerCategoryId: string;
  setCustomerCategoryId: (v: string) => void;

  grade: string;
  setGrade: (v: string) => void;

  pitamStatus: string;
  setPitamStatus: (v: string) => void;

  quantity: string;
  setQuantity: (v: string) => void;

  notes: string;
  setNotes: (v: string) => void;

  availableGrades: string[];
  availablePitamStatuses: string[];
  availableTraderCategories: Array<{ id: number; name: string }>;
  availableCustomerCategories: Array<{ id: number; name: string; grade: string | null }>;
  availableQuantity: number | null;
  remainingCapacity: number | null;

  availableTradersFromInventory: Array<{ id: number; name: string }>;
  availableCustomersFromInventory: Array<{ id: number; name: string }>;

  isSubmitting: boolean;
  error: string | null;
  handleSave: () => Promise<void>;
  handleClose: () => void;
};

export function useNewShipmentItemForm({
  isOpen,
  t,
  onSuccess,
  onClose,
}: UseNewShipmentItemFormProps): UseNewShipmentItemFormResult {
  const [openBoxes, setOpenBoxes] = useState<OpenBoxRecord[]>([]);
  const [traders, setTraders] = useState<Trader[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);

  const [allTraderInventory, setAllTraderInventory] = useState<TraderInventoryRow[]>([]);
  const [traderInventory, setTraderInventory] = useState<TraderInventoryRow[]>([]);
  const [customerInventory, setCustomerInventory] = useState<CustomerInventoryRow[]>([]);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);

  const [selectedBoxId, setSelectedBoxIdRaw] = useState('');
  const [itemOwnership, setItemOwnershipRaw] = useState('');
  const [stockSource, setStockSourceRaw] = useState<StockSource>('GENERAL');
  const [traderId, setTraderIdRaw] = useState('');
  const [customerId, setCustomerIdRaw] = useState('');
  const [traderCategoryId, setTraderCategoryIdRaw] = useState('');
  const [customerCategoryId, setCustomerCategoryIdRaw] = useState('');
  const [grade, setGradeRaw] = useState('');
  const [pitamStatus, setPitamStatusRaw] = useState('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load boxes + traders + customers when modal opens
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    setIsLoadingOptions(true);

    Promise.all([getOpenBoxes(), getTraders(), getCustomers()])
      .then(([boxes, traderList, customerList]) => {
        if (!isMounted) return;
        setOpenBoxes(boxes.filter((b) => b.capacity === null || b.totalQuantity < b.capacity));
        setTraders(traderList);
        setCustomers(customerList);
      })
      .catch(() => {
        if (!isMounted) return;
        setOpenBoxes([]);
        setTraders([]);
        setCustomers([]);
      })
      .finally(() => {
        if (isMounted) setIsLoadingOptions(false);
      });

    return () => { isMounted = false; };
  }, [isOpen]);

  const selectedBox = useMemo(
    () => openBoxes.find((b) => String(b.id) === selectedBoxId) ?? null,
    [openBoxes, selectedBoxId],
  );

  // Resolve effective trader/customer IDs based on box ownership
  const effectiveTraderId = useMemo(() => {
    if (!selectedBox) return null;
    if (selectedBox.ownershipType === 'TRADER') return selectedBox.traderId;
    if (selectedBox.ownershipType === 'SHARED' && (itemOwnership === 'TRADER') && traderId) return Number(traderId);
    return null;
  }, [selectedBox, itemOwnership, traderId]);

  const effectiveCustomerId = useMemo(() => {
    if (!selectedBox) return null;
    if (selectedBox.ownershipType === 'CUSTOMER') return selectedBox.customerId;
    if (selectedBox.ownershipType === 'SHARED' && (itemOwnership === 'CUSTOMER') && customerId) return Number(customerId);
    return null;
  }, [selectedBox, itemOwnership, customerId]);

  // Load all trader inventory once when any SHARED box is selected (for trader picker)
  useEffect(() => {
    if (!isOpen || !selectedBox || (selectedBox.ownershipType !== 'SHARED' && selectedBox.ownershipType !== 'GENERAL')) {
      setAllTraderInventory([]);
      return;
    }
    let isMounted = true;
    setIsLoadingInventory(true);
    getAllTradersAvailableInventory()
      .then((rows) => { if (isMounted) setAllTraderInventory(rows); })
      .catch(() => { if (isMounted) setAllTraderInventory([]); })
      .finally(() => { if (isMounted) setIsLoadingInventory(false); });
    return () => { isMounted = false; };
  }, [isOpen, selectedBox]);

  // Load trader-specific inventory when a trader is resolved or stock source changes
  useEffect(() => {
    if (!isOpen || !effectiveTraderId) {
      setTraderInventory([]);
      return;
    }
    let isMounted = true;
    setIsLoadingInventory(true);
    getTraderAvailableInventory(effectiveTraderId, stockSource)
      .then((rows) => { if (isMounted) setTraderInventory(rows); })
      .catch(() => { if (isMounted) setTraderInventory([]); })
      .finally(() => { if (isMounted) setIsLoadingInventory(false); });
    return () => { isMounted = false; };
  }, [isOpen, effectiveTraderId, stockSource]);

  // Load customer inventory when a customer is resolved
  useEffect(() => {
    if (!isOpen || !effectiveCustomerId) {
      setCustomerInventory([]);
      return;
    }
    let isMounted = true;
    setIsLoadingInventory(true);
    getCustomerAvailableInventory(effectiveCustomerId)
      .then((rows) => { if (isMounted) setCustomerInventory(rows); })
      .catch(() => { if (isMounted) setCustomerInventory([]); })
      .finally(() => { if (isMounted) setIsLoadingInventory(false); });
    return () => { isMounted = false; };
  }, [isOpen, effectiveCustomerId]);

  // Derived: traders who have stock (for SHARED box trader picker)
  const availableTradersFromInventory = useMemo(() => {
    const seen = new Map<number, string>();
    for (const row of allTraderInventory) {
      if (row.traderId !== null && row.traderName && !seen.has(row.traderId)) {
        seen.set(row.traderId, row.traderName);
      }
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [allTraderInventory]);

  // Derived: customers who have stock (for SHARED box customer picker)
  // We use the full customer list but could filter; keeping all customers for simplicity
  // (backend will validate availability)
  const availableCustomersFromInventory = useMemo(() => {
    return customers.map((c) => ({ id: c.id, name: c.customerName }));
  }, [customers]);

  // Derived: available trader categories (unique by id)
  // For UNASSIGNED boxes or SHARED+UNASSIGNED items, aggregated from allTraderInventory; otherwise from trader-specific inventory
  const availableTraderCategories = useMemo(() => {
    const useAllTraders = selectedBox?.ownershipType === 'GENERAL' || (selectedBox?.ownershipType === 'SHARED' && itemOwnership === 'GENERAL');
    const source = useAllTraders ? allTraderInventory : traderInventory;
    const seen = new Map<number, string>();
    for (const row of source) {
      if (!seen.has(row.traderCategoryId)) {
        seen.set(row.traderCategoryId, row.traderCategoryName ?? String(row.traderCategoryId));
      }
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [allTraderInventory, traderInventory, selectedBox, itemOwnership]);

  // Derived: available customer categories
  const availableCustomerCategories = useMemo(() => {
    const seen = new Map<number, { name: string; grade: string | null }>();
    for (const row of customerInventory) {
      if (!seen.has(row.customerCategoryId)) {
        seen.set(row.customerCategoryId, {
          name: row.customerCategoryName ?? String(row.customerCategoryId),
          grade: row.categoryGrade,
        });
      }
    }
    return Array.from(seen.entries()).map(([id, { name, grade: g }]) => ({ id, name, grade: g }));
  }, [customerInventory]);

  // Derived: grades for selected trader category
  // For UNASSIGNED boxes or SHARED+UNASSIGNED items, aggregated from allTraderInventory; otherwise from trader-specific inventory
  const availableGrades = useMemo(() => {
    if (!traderCategoryId) return [];
    const useAllTraders = selectedBox?.ownershipType === 'GENERAL' || (selectedBox?.ownershipType === 'SHARED' && itemOwnership === 'GENERAL');
    const source = useAllTraders ? allTraderInventory : traderInventory;
    return [
      ...new Set(
        source
          .filter((row) => String(row.traderCategoryId) === traderCategoryId)
          .map((row) => row.grade),
      ),
    ].sort((a, b) => a.localeCompare(b, 'he'));
  }, [allTraderInventory, traderInventory, traderCategoryId, selectedBox, itemOwnership]);

  // Derived: pitam statuses for selected combination
  const availablePitamStatuses = useMemo(() => {
    // Unassigned box or SHARED+UNASSIGNED item: from allTraderInventory aggregated
    if ((selectedBox?.ownershipType === 'GENERAL' || (selectedBox?.ownershipType === 'SHARED' && itemOwnership === 'GENERAL')) && traderCategoryId && grade) {
      return [
        ...new Set(
          allTraderInventory
            .filter((row) => String(row.traderCategoryId) === traderCategoryId && row.grade === grade)
            .map((row) => row.pitamStatus),
        ),
      ];
    }
    // Trader path: filter by category + grade
    if (traderCategoryId && grade) {
      return [
        ...new Set(
          traderInventory
            .filter(
              (row) =>
                String(row.traderCategoryId) === traderCategoryId && row.grade === grade,
            )
            .map((row) => row.pitamStatus),
        ),
      ];
    }
    // Customer path: filter by category
    if (customerCategoryId) {
      return [
        ...new Set(
          customerInventory
            .filter((row) => String(row.customerCategoryId) === customerCategoryId)
            .map((row) => row.pitamStatus),
        ),
      ];
    }
    return [];
  }, [allTraderInventory, traderInventory, customerInventory, traderCategoryId, grade, customerCategoryId, selectedBox, itemOwnership]);

  // Derived: remaining capacity in the selected box (null for CUSTOM or unconfigured)
  const remainingCapacity = useMemo(() => {
    if (!selectedBox || selectedBox.boxType === 'CUSTOM') return null;
    if (selectedBox.capacity == null) return null;
    return selectedBox.capacity - (selectedBox.totalQuantity ?? 0);
  }, [selectedBox]);

  // Derived: available quantity for current selection
  const availableQuantity = useMemo(() => {
    // Unassigned box or SHARED+UNASSIGNED item: sum all traders' stock for this combination
    if ((selectedBox?.ownershipType === 'GENERAL' || (selectedBox?.ownershipType === 'SHARED' && itemOwnership === 'GENERAL')) && traderCategoryId && grade && pitamStatus) {
      const total = allTraderInventory
        .filter(
          (r) =>
            String(r.traderCategoryId) === traderCategoryId &&
            r.grade === grade &&
            r.pitamStatus === pitamStatus,
        )
        .reduce((sum, r) => sum + r.quantity, 0);
      return total > 0 ? total : null;
    }
    if (traderCategoryId && grade && pitamStatus) {
      const row = traderInventory.find(
        (r) =>
          String(r.traderCategoryId) === traderCategoryId &&
          r.grade === grade &&
          r.pitamStatus === pitamStatus,
      );
      return row ? row.quantity : null;
    }
    if (customerCategoryId && pitamStatus) {
      const row = customerInventory.find(
        (r) =>
          String(r.customerCategoryId) === customerCategoryId &&
          r.pitamStatus === pitamStatus,
      );
      return row ? row.quantity : null;
    }
    return null;
  }, [allTraderInventory, traderInventory, customerInventory, traderCategoryId, grade, customerCategoryId, pitamStatus, selectedBox, itemOwnership]);

  // Setters that reset downstream fields on change
  const setStockSource = useCallback((v: StockSource) => {
    setStockSourceRaw(v);
    setTraderCategoryIdRaw('');
    setGradeRaw('');
    setPitamStatusRaw('');
    setQuantity('');
    setError(null);
  }, []);

  const setSelectedBoxId = useCallback((v: string) => {
    setSelectedBoxIdRaw(v);
    setItemOwnershipRaw('');
    setStockSourceRaw('GENERAL');
    setTraderIdRaw('');
    setCustomerIdRaw('');
    setTraderCategoryIdRaw('');
    setCustomerCategoryIdRaw('');
    setGradeRaw('');
    setPitamStatusRaw('');
    setQuantity('');
    setError(null);
  }, []);

  const setItemOwnership = useCallback((v: string) => {
    setItemOwnershipRaw(v);
    setStockSourceRaw('GENERAL');
    setTraderIdRaw('');
    setCustomerIdRaw('');
    setTraderCategoryIdRaw('');
    setCustomerCategoryIdRaw('');
    setGradeRaw('');
    setPitamStatusRaw('');
    setQuantity('');
    setError(null);
  }, []);

  const setTraderId = useCallback((v: string) => {
    setTraderIdRaw(v);
    setTraderCategoryIdRaw('');
    setGradeRaw('');
    setPitamStatusRaw('');
    setQuantity('');
    setError(null);
  }, []);

  const setCustomerId = useCallback((v: string) => {
    setCustomerIdRaw(v);
    setCustomerCategoryIdRaw('');
    setPitamStatusRaw('');
    setQuantity('');
    setError(null);
  }, []);

  const setTraderCategoryId = useCallback((v: string) => {
    setTraderCategoryIdRaw(v);
    setGradeRaw('');
    setPitamStatusRaw('');
    setQuantity('');
    setError(null);
  }, []);

  const setCustomerCategoryId = useCallback((v: string) => {
    setCustomerCategoryIdRaw(v);
    setPitamStatusRaw('');
    setQuantity('');
    setError(null);
  }, []);

  const setGrade = useCallback((v: string) => {
    setGradeRaw(v);
    setPitamStatusRaw('');
    setQuantity('');
    setError(null);
  }, []);

  const setPitamStatus = useCallback((v: string) => {
    setPitamStatusRaw(v);
    setQuantity('');
    setError(null);
  }, []);

  const resetForm = useCallback(() => {
    setSelectedBoxIdRaw('');
    setItemOwnershipRaw('');
    setStockSourceRaw('GENERAL');
    setTraderIdRaw('');
    setCustomerIdRaw('');
    setTraderCategoryIdRaw('');
    setCustomerCategoryIdRaw('');
    setGradeRaw('');
    setPitamStatusRaw('');
    setQuantity('');
    setNotes('');
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  const handleSave = useCallback(async () => {
    if (!selectedBoxId) { setError(t.validationBoxRequired); return; }
    if (!selectedBox) { setError(t.validationBoxRequired); return; }

    const boxOwnership = selectedBox.ownershipType;
    const isCustomBox = boxOwnership === 'CUSTOM';
    const isUnassignedBox = boxOwnership === 'GENERAL';
    const isSharedCustomItem = boxOwnership === 'SHARED' && itemOwnership === 'CUSTOM';
    const isSharedUnassigned = boxOwnership === 'SHARED' && itemOwnership === 'GENERAL';
    const isCustomFreeText = isCustomBox || isSharedCustomItem;

    // For SHARED boxes, item ownership is required
    if (boxOwnership === 'SHARED' && !itemOwnership) {
      setError(t.validationOwnershipRequired);
      return;
    }

    const resolvedOwnership: ItemOwnership =
      boxOwnership === 'TRADER' ? 'TRADER'
        : boxOwnership === 'CUSTOMER' ? 'CUSTOMER'
          : boxOwnership === 'SHARED' ? (itemOwnership as ItemOwnership)
            : 'GENERAL';

    const resolvedTraderId = effectiveTraderId;
    const resolvedCustomerId = effectiveCustomerId;

    if (!isCustomFreeText) {
      if (resolvedOwnership === 'TRADER') {
        if (!resolvedTraderId) { setError(t.validationTraderRequired); return; }
        if (!traderCategoryId) { setError(t.validationCategoryRequired); return; }
        if (!grade) { setError(t.validationGradeRequired); return; }
      }

      if (resolvedOwnership === 'CUSTOMER') {
        if (!resolvedCustomerId) { setError(t.validationCustomerRequired); return; }
        if (!customerCategoryId) { setError(t.validationCategoryRequired); return; }
      }

      if (isUnassignedBox || isSharedUnassigned) {
        if (!traderCategoryId) { setError(t.validationCategoryRequired); return; }
        if (!grade) { setError(t.validationGradeRequired); return; }
      }
    } else {
      // CUSTOM free-text: only category label is required; grade is optional
      if (!traderCategoryId.trim()) { setError(t.validationCategoryRequired); return; }
    }

    if (!pitamStatus) { setError(t.validationPitamRequired); return; }

    if (!quantity.trim()) { setError(t.validationQuantityRequired); return; }
    const quantityValue = Number(quantity);
    if (!Number.isInteger(quantityValue) || quantityValue <= 0) {
      setError(t.validationQuantityPositive);
      return;
    }
    if (availableQuantity !== null && quantityValue > availableQuantity) {
      setError(t.validationQuantityExceedsAvailable);
      return;
    }
    if (remainingCapacity !== null && quantityValue > remainingCapacity) {
      setError(t.validationQuantityExceedsCapacity);
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        boxId: Number(selectedBoxId),
        pitamStatus,
        quantity: quantityValue,
        ownershipType: boxOwnership === 'SHARED' ? resolvedOwnership : undefined,
        notes: notes.trim() || undefined,
      };

      if (isCustomFreeText) {
        payload.customLabel = traderCategoryId.trim();
        if (grade.trim()) payload.customGrade = grade.trim();
        if (isSharedCustomItem) payload.ownershipType = 'CUSTOM';
      } else if (isUnassignedBox || isSharedUnassigned) {
        payload.traderCategoryId = Number(traderCategoryId);
        payload.grade = grade;
      } else if (resolvedOwnership === 'TRADER') {
        payload.traderId = resolvedTraderId;
        payload.traderCategoryId = Number(traderCategoryId);
        payload.grade = grade;
        payload.isPrivateSelection = stockSource === 'PRIVATE_SELECTION';
      } else if (resolvedOwnership === 'CUSTOMER') {
        payload.customerId = resolvedCustomerId;
        payload.customerCategoryId = Number(customerCategoryId);
      }

      await apiClient('/shipment-items', {
        method: 'POST',
        body: JSON.stringify(payload),
        suppressGlobalFeedback: true,
      });

      resetForm();
      onSuccess();
      onClose();
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      setError(status === 409 ? t.duplicateItemError : t.genericError);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    selectedBoxId,
    selectedBox,
    itemOwnership,
    stockSource,
    effectiveTraderId,
    effectiveCustomerId,
    traderCategoryId,
    grade,
    customerCategoryId,
    pitamStatus,
    quantity,
    availableQuantity,
    remainingCapacity,
    notes,
    t,
    resetForm,
    onSuccess,
    onClose,
  ]);

  return {
    openBoxes,
    traders,
    customers,
    traderInventory,
    customerInventory,
    isLoadingOptions,
    isLoadingInventory,
    selectedBoxId,
    setSelectedBoxId,
    selectedBox,
    itemOwnership,
    setItemOwnership,
    stockSource,
    setStockSource,
    traderId,
    setTraderId,
    customerId,
    setCustomerId,
    traderCategoryId,
    setTraderCategoryId,
    customerCategoryId,
    setCustomerCategoryId,
    grade,
    setGrade,
    pitamStatus,
    setPitamStatus,
    quantity,
    setQuantity,
    notes,
    setNotes,
    availableGrades,
    availablePitamStatuses,
    availableTraderCategories,
    availableCustomerCategories,
    availableQuantity,
    remainingCapacity,
    availableTradersFromInventory,
    availableCustomersFromInventory,
    isSubmitting,
    error,
    handleSave,
    handleClose,
  };
}
