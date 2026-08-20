import { useCallback, useState } from 'react';
import { ApiError } from '../../../../services/apiClient';
import { deleteIsraelShipmentItem } from '../../../../services/israelShipmentItemsApi';
import type { IsraelShipmentItemsTableRow } from '../israelShipments.types';

type DeleteIsraelShipmentItemDialogText = {
  conflictError: string;
  genericError: string;
};

type UseDeleteIsraelShipmentItemDialogProps = {
  item: IsraelShipmentItemsTableRow | null;
  t: DeleteIsraelShipmentItemDialogText;
  onSuccess: () => void;
};

type UseDeleteIsraelShipmentItemDialogResult = {
  isOpen: boolean;
  isDeleting: boolean;
  error: string | null;
  handleOpen: () => void;
  handleConfirm: () => Promise<void>;
  handleCancel: () => void;
};

export function useDeleteIsraelShipmentItemDialog({
  item,
  t,
  onSuccess,
}: UseDeleteIsraelShipmentItemDialogProps): UseDeleteIsraelShipmentItemDialogResult {
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
      await deleteIsraelShipmentItem(item.id, { suppressGlobalFeedback: true });
      setIsOpen(false);
      onSuccess();
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      setError(status === 400 ? t.conflictError : t.genericError);
    } finally {
      setIsDeleting(false);
    }
  }, [item, onSuccess, t]);

  return { isOpen, isDeleting, error, handleOpen, handleConfirm, handleCancel };
}
