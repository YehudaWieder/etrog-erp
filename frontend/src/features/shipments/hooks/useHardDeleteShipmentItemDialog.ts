import { useCallback, useState } from 'react';
import { ApiError } from '../../../services/apiClient';
import { hardDeleteShipmentItem } from '../../../services/shipmentItemsApi';
import type { ShipmentItemsTableRow } from '../shipments.types';

type DialogText = { conflictError: string; genericError: string };

type Props = { item: ShipmentItemsTableRow | null; t: DialogText; onSuccess: () => void };
type Result = { isOpen: boolean; isLoading: boolean; error: string | null; handleOpen: () => void; handleConfirm: () => Promise<void>; handleCancel: () => void };

export function useHardDeleteShipmentItemDialog({ item, t, onSuccess }: Props): Result {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpen = useCallback(() => { setError(null); setIsOpen(true); }, []);
  const handleCancel = useCallback(() => { setError(null); setIsOpen(false); }, []);

  const handleConfirm = useCallback(async () => {
    if (!item) return;
    setIsLoading(true);
    setError(null);
    try {
      await hardDeleteShipmentItem(item.id, { suppressGlobalFeedback: true });
      setIsOpen(false);
      onSuccess();
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      setError(status === 409 || status === 400 ? t.conflictError : t.genericError);
    } finally {
      setIsLoading(false);
    }
  }, [item, onSuccess, t]);

  return { isOpen, isLoading, error, handleOpen, handleConfirm, handleCancel };
}
