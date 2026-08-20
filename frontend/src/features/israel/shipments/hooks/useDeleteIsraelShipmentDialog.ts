import { useCallback, useState } from 'react';
import { ApiError } from '../../../../services/apiClient';
import { deleteIsraelShipment, type IsraelShipmentRecord } from '../../../../services/israelShipmentsApi';

type DeleteIsraelShipmentDialogText = {
  conflictError: string;
  genericError: string;
};

type UseDeleteIsraelShipmentDialogProps = {
  shipment: IsraelShipmentRecord | null;
  t: DeleteIsraelShipmentDialogText;
  onSuccess: () => void;
};

type UseDeleteIsraelShipmentDialogResult = {
  isOpen: boolean;
  isDeleting: boolean;
  error: string | null;
  handleOpen: () => void;
  handleConfirm: () => Promise<void>;
  handleCancel: () => void;
};

export function useDeleteIsraelShipmentDialog({
  shipment,
  t,
  onSuccess,
}: UseDeleteIsraelShipmentDialogProps): UseDeleteIsraelShipmentDialogResult {
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
    if (!shipment) return;

    setIsDeleting(true);
    setError(null);

    try {
      await deleteIsraelShipment(shipment.id, { suppressGlobalFeedback: true });
      setIsOpen(false);
      onSuccess();
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      setError(status === 400 || status === 409 ? t.conflictError : t.genericError);
    } finally {
      setIsDeleting(false);
    }
  }, [onSuccess, shipment, t]);

  return { isOpen, isDeleting, error, handleOpen, handleConfirm, handleCancel };
}
