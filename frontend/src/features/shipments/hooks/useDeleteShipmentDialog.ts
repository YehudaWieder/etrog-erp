import { useCallback, useState } from 'react';
import { ApiError } from '../../../services/apiClient';
import { deleteShipment, type ShipmentRecord } from '../../../services/shipmentsApi';

type DeleteShipmentDialogText = {
  conflictError: string;
  genericError: string;
};

type UseDeleteShipmentDialogProps = {
  shipment: ShipmentRecord | null;
  t: DeleteShipmentDialogText;
  onSuccess: () => void;
};

type UseDeleteShipmentDialogResult = {
  isOpen: boolean;
  isDeleting: boolean;
  error: string | null;
  handleOpen: () => void;
  handleConfirm: () => Promise<void>;
  handleCancel: () => void;
};

export function useDeleteShipmentDialog({
  shipment,
  t,
  onSuccess,
}: UseDeleteShipmentDialogProps): UseDeleteShipmentDialogResult {
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
      await deleteShipment(shipment.id, { suppressGlobalFeedback: true });
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
