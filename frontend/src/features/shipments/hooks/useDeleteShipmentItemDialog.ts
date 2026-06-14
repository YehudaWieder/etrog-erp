import { useCallback, useState } from 'react';
import { ApiError } from '../../../services/apiClient';
import { deleteShipmentItem } from '../../../services/shipmentItemsApi';
import type { ShipmentItemsTableRow } from '../shipments.types';

type DeleteShipmentItemDialogText = {
  conflictError: string;
  genericError: string;
};

type UseDeleteShipmentItemDialogProps = {
  item: ShipmentItemsTableRow | null;
  t: DeleteShipmentItemDialogText;
  onSuccess: () => void;
};

type UseDeleteShipmentItemDialogResult = {
  isOpen: boolean;
  isDeleting: boolean;
  error: string | null;
  handleOpen: () => void;
  handleConfirm: () => Promise<void>;
  handleCancel: () => void;
};

export function useDeleteShipmentItemDialog({
  item,
  t,
  onSuccess,
}: UseDeleteShipmentItemDialogProps): UseDeleteShipmentItemDialogResult {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpen = useCallback(() => {
    setError(null);
    setIsOpen(true);
  }, []);

  const handleCancel = useCallback(() => {
    setError(null);
    setIsOpen(false);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!item) return;

    setIsDeleting(true);
    setError(null);

    try {
      await deleteShipmentItem(item.id, { suppressGlobalFeedback: true });
      setIsOpen(false);
      onSuccess();
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      setError(status === 409 || status === 400 ? t.conflictError : t.genericError);
    } finally {
      setIsDeleting(false);
    }
  }, [item, onSuccess, t]);

  return { isOpen, isDeleting, error, handleOpen, handleConfirm, handleCancel };
}
