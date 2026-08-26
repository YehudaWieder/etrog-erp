import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError } from '../../../../services/apiClient';
import {
  packIsraelShipmentItems,
  getIsraelShipmentItemsByBox,
  updateIsraelShipmentItem,
  deleteIsraelShipmentItem,
  type IsraelShipmentItemRecord,
} from '../../../../services/israel/israelShipmentItemsApi';
import {
  getIsraelBoxesBySeason,
  updateIsraelBox,
  type IsraelBoxRecord,
  type IsraelBoxStatus,
} from '../../../../services/israel/israelBoxesApi';
import { getIsraelShipmentsBySeason, type IsraelShipmentRecord } from '../../../../services/israel/israelShipmentsApi';
import { getIsraelSortCategories, type IsraelSortCategory } from '../../../../services/israel/israelSortCategoriesApi';
import { getIsraelStockBySeason, type IsraelStockRecord } from '../../../../services/israel/israelStockApi';
import { getIsraelSettings } from '../../../../services/israel/israelSettingsApi';
import type { IsraelPitamStatus } from '../../../../services/israel/israelClassificationsApi';

const PITAM_STATUSES: IsraelPitamStatus[] = ['WITH_PITAM', 'WITHOUT_PITAM', 'MIXED'];

export type PackIsraelShipmentItemRowDraft = {
  id: string;
  categoryId: string;
  notes: string;
  quantities: Record<string, string>; // key: `${grade}|${pitamStatus}`
};

type PackIsraelShipmentItemsFormText = {
  validationBoxRequired: string;
  validationRowsRequired: string;
  boxOverCapacityHint: (entered: number, remaining: number) => string;
  boxFullHint: string;
  boxNotOpenError: string;
  genericError: string;
};

type UsePackIsraelShipmentItemsFormProps = {
  isOpen: boolean;
  seasonId: number | null;
  initialBoxId?: number | null;
  t: PackIsraelShipmentItemsFormText;
  onSuccess: () => void;
  onClose: () => void;
};

function cellKey(grade: string, pitamStatus: IsraelPitamStatus): string {
  return `${grade}|${pitamStatus}`;
}

let rowIdCounter = 0;
function nextRowId(): string {
  rowIdCounter += 1;
  return `row-${rowIdCounter}`;
}

export function usePackIsraelShipmentItemsForm({
  isOpen,
  seasonId,
  initialBoxId,
  t,
  onSuccess,
  onClose,
}: UsePackIsraelShipmentItemsFormProps) {
  const [boxes, setBoxes] = useState<IsraelBoxRecord[]>([]);
  const [shipments, setShipments] = useState<IsraelShipmentRecord[]>([]);
  const [sortCategories, setSortCategories] = useState<IsraelSortCategory[]>([]);
  const [stockRows, setStockRows] = useState<IsraelStockRecord[]>([]);
  const [cartonCapacity, setCartonCapacity] = useState<number | null>(null);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);

  const [boxId, setBoxId] = useState('');
  const [rows, setRows] = useState<PackIsraelShipmentItemRowDraft[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [boxNotesDraft, setBoxNotesDraft] = useState('');
  const [existingItems, setExistingItems] = useState<IsraelShipmentItemRecord[]>([]);
  const [pendingExistingItemEdits, setPendingExistingItemEdits] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!isOpen || !seasonId) {
      return;
    }

    let isMounted = true;
    setIsLoadingOptions(true);

    Promise.all([
      getIsraelBoxesBySeason(seasonId),
      getIsraelShipmentsBySeason(seasonId),
      getIsraelSortCategories(),
      getIsraelStockBySeason(seasonId),
      getIsraelSettings(),
    ])
      .then(([nextBoxes, nextShipments, nextCategories, nextStock, settings]) => {
        if (!isMounted) return;
        setBoxes(nextBoxes);
        setShipments(nextShipments);
        setSortCategories(nextCategories);
        setStockRows(nextStock);
        setCartonCapacity(settings.cartonCapacity);
        if (initialBoxId) {
          setBoxId(String(initialBoxId));
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setBoxes([]);
        setShipments([]);
        setSortCategories([]);
        setStockRows([]);
        setCartonCapacity(null);
      })
      .finally(() => {
        if (isMounted) setIsLoadingOptions(false);
      });

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, seasonId]);

  const selectedBox = useMemo(() => boxes.find((box) => String(box.id) === boxId) ?? null, [boxes, boxId]);

  // The box picker (typeahead) only lists OPEN boxes, mirroring the Italy packing form's
  // boxOptions — mixing in closed/shipped/delivered boxes there would let a fresh "pack items"
  // entry (from the items page/summary/dashboard) target a box that can't actually be packed.
  // `boxes` itself stays unfiltered so a box preselected directly from the boxes page (initialBoxId,
  // any status) still resolves correctly above.
  const openBoxOptions = useMemo(() => boxes.filter((box) => box.status === 'OPEN'), [boxes]);

  useEffect(() => {
    setBoxNotesDraft(selectedBox?.notes ?? '');
  }, [selectedBox]);

  useEffect(() => {
    if (!boxId) {
      setExistingItems([]);
      return;
    }

    let isMounted = true;
    getIsraelShipmentItemsByBox(Number(boxId))
      .then((items) => {
        if (!isMounted) return;
        setExistingItems(items);
        const distinctCategoryIds = [...new Set(items.map((item) => item.categoryId))];
        if (distinctCategoryIds.length > 0) {
          setRows(distinctCategoryIds.map((categoryId) => ({ id: nextRowId(), categoryId: String(categoryId), notes: '', quantities: {} })));
        }
      })
      .catch(() => {
        if (isMounted) setExistingItems([]);
      });

    return () => {
      isMounted = false;
    };
  }, [boxId]);

  const existingItemFor = useCallback(
    (categoryId: number, grade: string, pitamStatus: IsraelPitamStatus) =>
      existingItems.find(
        (item) => item.categoryId === categoryId && item.grade === grade && item.pitamStatus === pitamStatus,
      ) ?? null,
    [existingItems],
  );

  const pooledQuantityFor = useCallback(
    (categoryId: number, grade: string, pitamStatus: IsraelPitamStatus) =>
      stockRows.reduce((sum, row) => {
        if (
          row.categoryId === categoryId &&
          row.grade === grade &&
          row.pitamStatus === pitamStatus &&
          row.fieldId === selectedBox?.fieldId
        ) {
          return sum + row.quantity;
        }
        return sum;
      }, 0),
    [stockRows, selectedBox],
  );

  const stagedQuantityFor = useCallback(
    (categoryId: number, grade: string, pitamStatus: IsraelPitamStatus) => {
      const key = cellKey(grade, pitamStatus);
      return rows.reduce((sum, row) => {
        if (row.categoryId !== String(categoryId)) return sum;
        const value = Number(row.quantities[key]);
        return sum + (Number.isFinite(value) ? value : 0);
      }, 0);
    },
    [rows],
  );

  const availableFor = useCallback(
    (categoryId: number, grade: string, pitamStatus: IsraelPitamStatus) =>
      pooledQuantityFor(categoryId, grade, pitamStatus) - stagedQuantityFor(categoryId, grade, pitamStatus),
    [pooledQuantityFor, stagedQuantityFor],
  );

  // Only categories that actually have field-scoped stock left (or are already chosen in an
  // in-progress row) are selectable — this is what keeps packing scoped to the box's field.
  const availableCategoriesForBox = useMemo(() => {
    const selectedCategoryIds = new Set(rows.map((row) => row.categoryId).filter(Boolean));
    return sortCategories.filter(
      (category) =>
        selectedCategoryIds.has(String(category.id)) ||
        PITAM_STATUSES.some((pitam) => category.supportedGrades.some((grade) => pooledQuantityFor(category.id, grade, pitam) > 0)),
    );
  }, [sortCategories, rows, pooledQuantityFor]);

  const totalPackedQuantity = useMemo(
    () =>
      rows.reduce((sum, row) => {
        const rowTotal = Object.values(row.quantities).reduce((cellSum, value) => {
          const parsed = Number(value);
          return cellSum + (Number.isFinite(parsed) && parsed > 0 ? parsed : 0);
        }, 0);
        return sum + rowTotal;
      }, 0),
    [rows],
  );

  // Net change to the box's already-packed count from pending edits made via the existing-item
  // add/subtract popup — folded into the capacity math below so lowering an existing item's
  // quantity is reflected immediately, instead of only new-row quantities counting toward capacity.
  const pendingEditsQuantityDelta = useMemo(() => {
    let delta = 0;
    for (const [itemIdStr, rawValue] of Object.entries(pendingExistingItemEdits)) {
      const item = existingItems.find((row) => row.id === Number(itemIdStr));
      if (!item) continue;
      const nextQuantity = Number(rawValue);
      if (Number.isFinite(nextQuantity)) delta += nextQuantity - item.quantity;
    }
    return delta;
  }, [pendingExistingItemEdits, existingItems]);

  const effectiveExistingQuantity = (selectedBox?.itemsCount ?? 0) + pendingEditsQuantityDelta;

  const grandTotalPackedQuantity = effectiveExistingQuantity + totalPackedQuantity;

  const remainingCapacity = useMemo(() => {
    if (cartonCapacity === null || !selectedBox) return null;
    return Math.max(0, cartonCapacity - effectiveExistingQuantity - totalPackedQuantity);
  }, [cartonCapacity, selectedBox, effectiveExistingQuantity, totalPackedQuantity]);

  const isBoxOverCapacity = Boolean(
    cartonCapacity !== null && selectedBox && effectiveExistingQuantity + totalPackedQuantity > cartonCapacity,
  );

  const isBoxFull = Boolean(
    cartonCapacity !== null && selectedBox && effectiveExistingQuantity + totalPackedQuantity >= cartonCapacity,
  );

  const boxCapacityRemainingBeforeThisPacking = useMemo(() => {
    if (cartonCapacity === null || !selectedBox) return null;
    return Math.max(0, cartonCapacity - effectiveExistingQuantity);
  }, [cartonCapacity, selectedBox, effectiveExistingQuantity]);

  const boxOverCapacityMessage = useMemo(() => {
    if (isBoxOverCapacity) return t.boxOverCapacityHint(totalPackedQuantity, boxCapacityRemainingBeforeThisPacking ?? 0);
    if (isBoxFull) return t.boxFullHint;
    return null;
  }, [isBoxOverCapacity, isBoxFull, t, totalPackedQuantity, boxCapacityRemainingBeforeThisPacking]);

  const resetForm = useCallback(() => {
    setBoxId('');
    setRows([]);
    setError(null);
    setExistingItems([]);
    setPendingExistingItemEdits({});
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  const handleBoxIdChange = useCallback((value: string) => {
    setBoxId(value);
    setRows([]);
    setError(null);
    setPendingExistingItemEdits({});
  }, []);

  const handleStageExistingItemEdit = useCallback((itemId: number, value: string | null) => {
    setPendingExistingItemEdits((current) => {
      if (value === null) {
        if (!(itemId in current)) return current;
        const rest = { ...current };
        delete rest[itemId];
        return rest;
      }
      return { ...current, [itemId]: value };
    });
  }, []);

  const handleBoxStatusChange = useCallback(
    async (status: IsraelBoxStatus) => {
      if (!selectedBox || status === selectedBox.status) return;
      try {
        const updated = await updateIsraelBox({ id: selectedBox.id, status });
        setBoxes((current) => current.map((box) => (box.id === updated.id ? updated : box)));
      } catch {
        setError(t.genericError);
      }
    },
    [selectedBox, t.genericError],
  );

  const handleBoxShipmentChange = useCallback(
    async (shipmentId: string) => {
      if (!selectedBox) return;
      const nextShipmentId = shipmentId ? Number(shipmentId) : null;
      if (nextShipmentId === (selectedBox.shipment?.id ?? null)) return;
      try {
        const updated = await updateIsraelBox({ id: selectedBox.id, shipmentId: nextShipmentId });
        setBoxes((current) => current.map((box) => (box.id === updated.id ? updated : box)));
      } catch {
        setError(t.genericError);
      }
    },
    [selectedBox, t.genericError],
  );

  const handleBoxNotesChange = useCallback((value: string) => {
    setBoxNotesDraft(value);
  }, []);

  const handleBoxNotesBlur = useCallback(async () => {
    if (!selectedBox || boxNotesDraft === (selectedBox.notes ?? '')) return;
    try {
      const updated = await updateIsraelBox({ id: selectedBox.id, notes: boxNotesDraft || null });
      setBoxes((current) => current.map((box) => (box.id === updated.id ? updated : box)));
    } catch {
      setError(t.genericError);
    }
  }, [selectedBox, boxNotesDraft, t.genericError]);

  const handleAddRow = useCallback(() => {
    setRows((current) => [...current, { id: nextRowId(), categoryId: '', notes: '', quantities: {} }]);
  }, []);

  const handleRemoveRow = useCallback((rowId: string) => {
    setRows((current) => current.filter((row) => row.id !== rowId));
  }, []);

  const handleRowCategoryChange = useCallback((rowId: string, categoryId: string) => {
    setRows((current) => current.map((row) => (row.id === rowId ? { ...row, categoryId, quantities: {} } : row)));
  }, []);

  const handleRowNotesChange = useCallback((rowId: string, notes: string) => {
    setRows((current) => current.map((row) => (row.id === rowId ? { ...row, notes } : row)));
  }, []);

  const handleCellQuantityChange = useCallback((rowId: string, grade: string, pitamStatus: IsraelPitamStatus, value: string) => {
    setRows((current) =>
      current.map((row) =>
        row.id === rowId ? { ...row, quantities: { ...row.quantities, [cellKey(grade, pitamStatus)]: value } } : row,
      ),
    );
  }, []);

  const handleSave = useCallback(async () => {
    if (!boxId) {
      setError(t.validationBoxRequired);
      return;
    }

    if (isBoxOverCapacity) {
      setError(boxOverCapacityMessage);
      return;
    }

    const items = rows.flatMap((row) => {
      if (!row.categoryId) return [];
      const categoryId = Number(row.categoryId);
      return Object.entries(row.quantities).flatMap(([key, rawValue]) => {
        const quantity = Number(rawValue);
        if (!Number.isFinite(quantity) || quantity <= 0) return [];
        const [grade, pitamStatus] = key.split('|') as [string, IsraelPitamStatus];
        return [{ categoryId, grade, pitamStatus, quantity, notes: row.notes.trim() || undefined }];
      });
    });

    const existingItemEdits: { itemId: number; quantity: number }[] = [];
    for (const [itemIdStr, rawValue] of Object.entries(pendingExistingItemEdits)) {
      const quantity = Number(rawValue);
      // 0 is valid here — it means "remove this item" and is routed to a delete instead of an update.
      if (!Number.isInteger(quantity) || quantity < 0) {
        setError(t.genericError);
        return;
      }
      existingItemEdits.push({ itemId: Number(itemIdStr), quantity });
    }

    if (items.length === 0 && existingItemEdits.length === 0) {
      setError(t.validationRowsRequired);
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      // Edits to already-packed items and creation of new ones are applied sequentially — the
      // Israel pack endpoint doesn't support bundling both in a single transaction like the export side.
      if (items.length > 0) {
        await packIsraelShipmentItems({ boxId: Number(boxId), items }, { suppressGlobalFeedback: true });
      }
      for (const edit of existingItemEdits) {
        if (edit.quantity === 0) {
          await deleteIsraelShipmentItem(edit.itemId, { suppressGlobalFeedback: true });
        } else {
          await updateIsraelShipmentItem({ id: edit.itemId, quantity: edit.quantity }, { suppressGlobalFeedback: true });
        }
      }

      resetForm();
      onSuccess();
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.status === 400 && err.message.toLowerCase().includes('not open')) {
        setError(t.boxNotOpenError);
      } else {
        setError(t.genericError);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [boxId, boxOverCapacityMessage, isBoxOverCapacity, onClose, onSuccess, pendingExistingItemEdits, resetForm, rows, t]);

  return {
    boxes: openBoxOptions,
    shipments,
    sortCategories: availableCategoriesForBox,
    isLoadingOptions,
    boxId,
    onBoxIdChange: handleBoxIdChange,
    selectedBox,
    onBoxStatusChange: handleBoxStatusChange,
    onBoxShipmentChange: handleBoxShipmentChange,
    boxNotesDraft,
    onBoxNotesChange: handleBoxNotesChange,
    onBoxNotesBlur: handleBoxNotesBlur,
    rows,
    onAddRow: handleAddRow,
    onRemoveRow: handleRemoveRow,
    onRowCategoryChange: handleRowCategoryChange,
    onRowNotesChange: handleRowNotesChange,
    onCellQuantityChange: handleCellQuantityChange,
    availableFor,
    existingItemFor,
    pendingExistingItemEdits,
    onStageExistingItemEdit: handleStageExistingItemEdit,
    totalPackedQuantity: grandTotalPackedQuantity,
    remainingCapacity,
    isBoxOverCapacity,
    boxOverCapacityMessage,
    isSubmitting,
    error,
    handleSave,
    handleClose,
  };
}
