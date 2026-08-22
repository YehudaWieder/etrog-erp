import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../../../../services/apiClient';
import { updateIsraelShipment, type IsraelShipmentRecord, type IsraelShipmentStatus } from '../../../../services/israel/israelShipmentsApi';

type EditIsraelShipmentFormText = {
  shipmentNumberRequired: string;
  shipmentNumberInvalid: string;
  shippedAtRequired: string;
  shippedAtYearMismatch: string;
  duplicateShipmentNumber: string;
  genericError: string;
};

type UseEditIsraelShipmentFormProps = {
  shipment: IsraelShipmentRecord | null;
  t: EditIsraelShipmentFormText;
  onSuccess: () => void;
  onClose: () => void;
};

type UseEditIsraelShipmentFormResult = {
  shipmentNumber: string;
  setShipmentNumber: (v: string) => void;
  status: IsraelShipmentStatus;
  handleStatusChange: (v: IsraelShipmentStatus) => void;
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

export function useEditIsraelShipmentForm({
  shipment,
  t,
  onSuccess,
  onClose,
}: UseEditIsraelShipmentFormProps): UseEditIsraelShipmentFormResult {
  const [shipmentNumber, setShipmentNumber] = useState('');
  const [status, setStatus] = useState<IsraelShipmentStatus>('PREPARING');
  const [shippedAt, setShippedAt] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStatusChange = useCallback((v: IsraelShipmentStatus) => {
    setStatus(v);
    if (v === 'PREPARING' || v === 'CANCELLED') setShippedAt('');
  }, []);

  useEffect(() => {
    if (!shipment) return;
    setShipmentNumber(String(shipment.shipmentNumber));
    setStatus(shipment.status);
    setShippedAt(shipment.status === 'PREPARING' || shipment.status === 'CANCELLED' ? '' : toDateInputValue(shipment.shippedAt));
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

    if (status === 'SHIPPED' && !shippedAt) {
      setError(t.shippedAtRequired);
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await updateIsraelShipment(
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
      if (err instanceof ApiError && err.status === 400) {
        if (err.message.startsWith('Shipped date year')) {
          setError(t.shippedAtYearMismatch);
        } else {
          setError(t.duplicateShipmentNumber);
        }
      } else {
        setError(t.genericError);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [notes, onClose, onSuccess, shipment, shipmentNumber, shippedAt, status, t]);

  return {
    shipmentNumber,
    setShipmentNumber,
    status,
    handleStatusChange,
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
