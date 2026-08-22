import { useCallback, useState } from 'react';
import { ApiError } from '../../../../services/apiClient';
import { createIsraelShipment } from '../../../../services/israel/israelShipmentsApi';

type NewIsraelShipmentFormText = {
  validationRequired: string;
  validationPositive: string;
  duplicateShipmentNumber: string;
  genericError: string;
};

type UseNewIsraelShipmentFormProps = {
  seasonId: number | null;
  t: NewIsraelShipmentFormText;
  onSuccess: () => void;
  onClose: () => void;
};

type UseNewIsraelShipmentFormResult = {
  shipmentNumber: string;
  setShipmentNumber: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  isSubmitting: boolean;
  error: string | null;
  handleSave: () => Promise<void>;
  handleClose: () => void;
};

export function useNewIsraelShipmentForm({
  seasonId,
  t,
  onSuccess,
  onClose,
}: UseNewIsraelShipmentFormProps): UseNewIsraelShipmentFormResult {
  const [shipmentNumber, setShipmentNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = useCallback(() => {
    setShipmentNumber('');
    setNotes('');
    setError(null);
    onClose();
  }, [onClose]);

  const handleSave = useCallback(async () => {
    if (!seasonId) {
      setError(t.genericError);
      return;
    }

    if (!shipmentNumber.trim()) {
      setError(t.validationRequired);
      return;
    }

    const numValue = Number(shipmentNumber);
    if (!Number.isInteger(numValue) || numValue <= 0) {
      setError(t.validationPositive);
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await createIsraelShipment(
        { seasonId, shipmentNumber: numValue, notes: notes.trim() || undefined },
        { suppressGlobalFeedback: true },
      );
      setShipmentNumber('');
      setNotes('');
      onSuccess();
      onClose();
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      setError(status === 400 ? t.duplicateShipmentNumber : t.genericError);
    } finally {
      setIsSubmitting(false);
    }
  }, [notes, onClose, onSuccess, seasonId, shipmentNumber, t]);

  return {
    shipmentNumber,
    setShipmentNumber,
    notes,
    setNotes,
    isSubmitting,
    error,
    handleSave,
    handleClose,
  };
}
