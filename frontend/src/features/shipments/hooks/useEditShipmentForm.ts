import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../../../services/apiClient';
import { updateShipment, type ShipmentRecord, type ShipmentStatus } from '../../../services/shipmentsApi';

type EditShipmentFormText = {
  shipmentNumberRequired: string;
  shipmentNumberInvalid: string;
  duplicateShipmentNumber: string;
  genericError: string;
};

type UseEditShipmentFormProps = {
  shipment: ShipmentRecord | null;
  t: EditShipmentFormText;
  onSuccess: () => void;
  onClose: () => void;
};

type UseEditShipmentFormResult = {
  shipmentNumber: string;
  setShipmentNumber: (v: string) => void;
  status: ShipmentStatus;
  setStatus: (v: ShipmentStatus) => void;
  shippedAt: string;
  setShippedAt: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  isSubmitting: boolean;
  error: string | null;
  handleSave: () => Promise<void>;
  handleClose: () => void;
};

function toDateInputValue(iso: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

export function useEditShipmentForm({
  shipment,
  t,
  onSuccess,
  onClose,
}: UseEditShipmentFormProps): UseEditShipmentFormResult {
  const [shipmentNumber, setShipmentNumber] = useState('');
  const [status, setStatus] = useState<ShipmentStatus>('PREPARING');
  const [shippedAt, setShippedAt] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shipment) return;
    setShipmentNumber(String(shipment.shipmentNumber));
    setStatus(shipment.status);
    setShippedAt(toDateInputValue(shipment.shippedAt));
    setNotes(shipment.notes ?? '');
    setError(null);
  }, [shipment]);

  const handleClose = useCallback(() => {
    setError(null);
    onClose();
  }, [onClose]);

  const handleSave = useCallback(async () => {
    if (!shipment) return;

    if (!shipmentNumber.trim()) {
      setError(t.shipmentNumberRequired);
      return;
    }

    const numValue = Number(shipmentNumber);
    if (!Number.isInteger(numValue) || numValue <= 0) {
      setError(t.shipmentNumberInvalid);
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await updateShipment(
        {
          id: shipment.id,
          shipmentNumber: numValue !== shipment.shipmentNumber ? numValue : undefined,
          status,
          shippedAt: shippedAt ? new Date(shippedAt).toISOString() : null,
          notes: notes.trim() || null,
        },
        { suppressGlobalFeedback: true },
      );
      onSuccess();
      onClose();
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      setError(status === 400 ? t.duplicateShipmentNumber : t.genericError);
    } finally {
      setIsSubmitting(false);
    }
  }, [notes, onClose, onSuccess, shipment, shipmentNumber, shippedAt, status, t]);

  return {
    shipmentNumber,
    setShipmentNumber,
    status,
    setStatus,
    shippedAt,
    setShippedAt,
    notes,
    setNotes,
    isSubmitting,
    error,
    handleSave,
    handleClose,
  };
}
