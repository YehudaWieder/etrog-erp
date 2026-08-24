import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../../../../services/apiClient';
import { updateIsraelShipment, type IsraelShipmentRecord, type IsraelShipmentStatus } from '../../../../services/israel/israelShipmentsApi';
import { getIsraelFields, type IsraelField } from '../../../../services/israel/israelFieldsApi';

type EditIsraelShipmentFormText = {
  shipmentNumberRequired: string;
  shipmentNumberInvalid: string;
  validationFieldRequired: string;
  shippedAtRequired: string;
  shippedAtYearMismatch: string;
  duplicateShipmentNumber: string;
  genericError: string;
};

type UseEditIsraelShipmentFormProps = {
  isOpen: boolean;
  shipment: IsraelShipmentRecord | null;
  t: EditIsraelShipmentFormText;
  onSuccess: () => void;
  onClose: () => void;
};

type UseEditIsraelShipmentFormResult = {
  fields: IsraelField[];
  shipmentNumber: string;
  setShipmentNumber: (v: string) => void;
  fieldId: string;
  setFieldId: (v: string) => void;
  isFieldLocked: boolean;
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
  isOpen,
  shipment,
  t,
  onSuccess,
  onClose,
}: UseEditIsraelShipmentFormProps): UseEditIsraelShipmentFormResult {
  const [fields, setFields] = useState<IsraelField[]>([]);
  const [shipmentNumber, setShipmentNumber] = useState('');
  const [fieldId, setFieldId] = useState('');
  const [status, setStatus] = useState<IsraelShipmentStatus>('PREPARING');
  const [shippedAt, setShippedAt] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFieldLocked = (shipment?.totalBoxes ?? 0) > 0;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let isMounted = true;
    getIsraelFields()
      .then((nextFields) => {
        if (isMounted) setFields(nextFields);
      })
      .catch(() => {
        if (isMounted) setFields([]);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  const handleStatusChange = useCallback((v: IsraelShipmentStatus) => {
    setStatus(v);
    if (v === 'PREPARING' || v === 'CANCELLED') setShippedAt('');
  }, []);

  useEffect(() => {
    if (!shipment) return;
    setShipmentNumber(String(shipment.shipmentNumber));
    setFieldId(String(shipment.fieldId));
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

    if (!fieldId) {
      setError(t.validationFieldRequired);
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
          fieldId: !isFieldLocked && Number(fieldId) !== shipment.fieldId ? Number(fieldId) : undefined,
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
  }, [fieldId, isFieldLocked, notes, onClose, onSuccess, shipment, shipmentNumber, shippedAt, status, t]);

  return {
    fields,
    shipmentNumber,
    setShipmentNumber,
    fieldId,
    setFieldId,
    isFieldLocked,
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
