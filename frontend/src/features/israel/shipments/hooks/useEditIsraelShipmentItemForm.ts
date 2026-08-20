import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError } from '../../../../services/apiClient';
import { updateIsraelShipmentItem } from '../../../../services/israelShipmentItemsApi';
import { getIsraelStockBySeason, type IsraelStockRecord } from '../../../../services/israelStockApi';
import type { IsraelShipmentItemsTableRow } from '../israelShipments.types';

type EditIsraelShipmentItemFormText = {
  validationQuantityRequired: string;
  validationQuantityPositive: string;
  validationQuantityExceedsAvailable: string;
  boxNotOpenError: string;
  genericError: string;
};

type UseEditIsraelShipmentItemFormProps = {
  item: IsraelShipmentItemsTableRow | null;
  seasonId: number | null;
  t: EditIsraelShipmentItemFormText;
  onSuccess: () => void;
  onClose: () => void;
};

export function useEditIsraelShipmentItemForm({
  item,
  seasonId,
  t,
  onSuccess,
  onClose,
}: UseEditIsraelShipmentItemFormProps) {
  const [stockRows, setStockRows] = useState<IsraelStockRecord[]>([]);
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!item || !seasonId) {
      return;
    }

    setQuantity(String(item.quantity));
    setNotes(item.notes ?? '');
    setError(null);

    let isMounted = true;
    getIsraelStockBySeason(seasonId)
      .then((rows) => {
        if (isMounted) setStockRows(rows);
      })
      .catch(() => {
        if (isMounted) setStockRows([]);
      });

    return () => {
      isMounted = false;
    };
  }, [item, seasonId]);

  const availableQuantity = useMemo(() => {
    if (!item) {
      return null;
    }

    const pooled = stockRows.reduce((sum, row) => {
      if (row.categoryId === item.categoryId && row.grade === item.grade && row.pitamStatus === item.pitamStatus) {
        return sum + row.quantity;
      }
      return sum;
    }, 0);

    return pooled + item.quantity;
  }, [item, stockRows]);

  const handleClose = useCallback(() => {
    setError(null);
    onClose();
  }, [onClose]);

  const handleSave = useCallback(async () => {
    if (!item) {
      return;
    }

    if (!quantity.trim()) {
      setError(t.validationQuantityRequired);
      return;
    }

    const quantityValue = Number(quantity);
    if (!Number.isInteger(quantityValue) || quantityValue <= 0) {
      setError(t.validationQuantityPositive);
      return;
    }

    if (availableQuantity !== null && quantityValue > availableQuantity) {
      setError(t.validationQuantityExceedsAvailable);
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await updateIsraelShipmentItem(
        {
          id: item.id,
          quantity: quantityValue !== item.quantity ? quantityValue : undefined,
          notes: notes.trim() || null,
        },
        { suppressGlobalFeedback: true },
      );

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
  }, [availableQuantity, item, notes, onClose, onSuccess, quantity, t]);

  return {
    quantity,
    setQuantity,
    availableQuantity,
    notes,
    setNotes,
    isSubmitting,
    error,
    handleSave,
    handleClose,
  };
}
