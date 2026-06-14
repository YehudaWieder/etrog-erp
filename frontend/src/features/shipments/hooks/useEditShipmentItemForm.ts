import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../../../services/apiClient';
import { getBoxById } from '../../../services/boxesApi';
import { getShipmentItemEditLimits, getShipmentItemsByBox, updateShipmentItem } from '../../../services/shipmentItemsApi';
import type { ShipmentItemsTableRow } from '../shipments.types';

type EditShipmentItemFormText = {
  validationQuantityRequired: string;
  validationQuantityPositive: string;
  validationQuantityExceedsLimit: (max: number) => string;
  errorBoxCapacityExceeded: string;
  errorInsufficientStock: string;
  genericError: string;
};

type UseEditShipmentItemFormProps = {
  itemRow: ShipmentItemsTableRow | null;
  t: EditShipmentItemFormText;
  onSuccess: () => void;
  onClose: () => void;
};

export type UseEditShipmentItemFormResult = {
  quantity: string;
  setQuantity: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  pitamStatus: string;
  grade: string;
  isPrivateSelection: boolean;
  boxType: string;
  boxTotalQuantity: number;
  maxQuantity: number | null;
  inventoryAvailable: number | null;
  boxSpaceFree: number | null;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  handleSave: () => Promise<void>;
  handleClose: () => void;
};

export function useEditShipmentItemForm({
  itemRow,
  t,
  onSuccess,
  onClose,
}: UseEditShipmentItemFormProps): UseEditShipmentItemFormResult {
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [pitamStatus, setPitamStatus] = useState('');
  const [grade, setGrade] = useState('');
  const [isPrivateSelection, setIsPrivateSelection] = useState(false);
  const [boxType, setBoxType] = useState('');
  const [boxTotalQuantity, setBoxTotalQuantity] = useState(0);
  const [maxQuantity, setMaxQuantity] = useState<number | null>(null);
  const [inventoryAvailable, setInventoryAvailable] = useState<number | null>(null);
  const [boxSpaceFree, setBoxCapacityRemaining] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!itemRow) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    Promise.all([
      getBoxById(itemRow.boxId),
      getShipmentItemsByBox(itemRow.boxId),
      getShipmentItemEditLimits(itemRow.id),
    ])
      .then(([box, items, limits]) => {
        if (!isMounted) return;
        setBoxType(box.boxType);
        setBoxTotalQuantity(box.totalQuantity);
        setMaxQuantity(limits.maxQuantity);
        setInventoryAvailable(limits.inventoryAvailable);
        setBoxCapacityRemaining(limits.boxSpaceFree);
        const full = items.find((i) => i.id === itemRow.id);
        if (full) {
          setQuantity(String(full.quantity));
          setNotes(full.notes ?? '');
          setPitamStatus(full.pitamStatus ?? '');
          setGrade(full.customGrade ?? full.grade ?? '');
          setIsPrivateSelection(full.isPrivateSelection);
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setQuantity(String(itemRow.quantity));
        setNotes('');
        setPitamStatus('');
        setGrade(itemRow.customGrade ?? '');
        setIsPrivateSelection(itemRow.isPrivateSelection);
        setBoxType('');
        setBoxTotalQuantity(0);
        setMaxQuantity(null);
        setInventoryAvailable(null);
        setBoxCapacityRemaining(null);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => { isMounted = false; };
  }, [itemRow]);

  const handleClose = useCallback(() => {
    setError(null);
    onClose();
  }, [onClose]);

  const handleSave = useCallback(async () => {
    if (!itemRow) return;

    if (!quantity.trim()) {
      setError(t.validationQuantityRequired);
      return;
    }
    const quantityValue = Number(quantity);
    if (!Number.isInteger(quantityValue) || quantityValue <= 0) {
      setError(t.validationQuantityPositive);
      return;
    }
    if (maxQuantity !== null && quantityValue > maxQuantity) {
      setError(t.validationQuantityExceedsLimit(maxQuantity));
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await updateShipmentItem(
        {
          id: itemRow.id,
          quantity: quantityValue,
          notes: notes.trim() || null,
        },
        { suppressGlobalFeedback: true },
      );

      onSuccess();
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        const msg = err.message.toLowerCase();
        if (msg.includes('capacity')) {
          setError(t.errorBoxCapacityExceeded);
        } else if (msg.includes('insufficient')) {
          setError(t.errorInsufficientStock);
        } else {
          setError(t.genericError);
        }
      } else {
        setError(t.genericError);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [itemRow, quantity, notes, t, onSuccess, onClose]);

  return {
    quantity,
    setQuantity,
    notes,
    setNotes,
    pitamStatus,
    grade,
    isPrivateSelection,
    boxType,
    boxTotalQuantity,
    maxQuantity,
    inventoryAvailable,
    boxSpaceFree,
    isLoading,
    isSubmitting,
    error,
    handleSave,
    handleClose,
  };
}
