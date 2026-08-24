import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError } from '../../../../services/apiClient';
import { getIsraelBoxById, updateIsraelBox, type IsraelBoxStatus } from '../../../../services/israel/israelBoxesApi';
import { getIsraelShipmentsBySeason, type IsraelShipmentRecord } from '../../../../services/israel/israelShipmentsApi';
import { getIsraelFields, type IsraelField } from '../../../../services/israel/israelFieldsApi';
import type { IsraelBoxesTableRow } from '../israelShipments.types';

type EditIsraelBoxFormText = {
  validationBoxNumberRequired: string;
  validationBoxNumberPositive: string;
  validationFieldRequired: string;
  duplicateBoxNumber: string;
  genericError: string;
};

type UseEditIsraelBoxFormProps = {
  boxRow: IsraelBoxesTableRow | null;
  seasonId: number | null;
  t: EditIsraelBoxFormText;
  onSuccess: () => void;
  onClose: () => void;
};

type UseEditIsraelBoxFormResult = {
  fields: IsraelField[];
  fieldId: string;
  onFieldIdChange: (v: string) => void;
  isFieldLocked: boolean;
  shipments: IsraelShipmentRecord[];
  isLoadingOptions: boolean;
  selectedShipmentId: string;
  onShipmentIdChange: (v: string) => void;
  boxNumber: string;
  setBoxNumber: (v: string) => void;
  status: IsraelBoxStatus;
  setStatus: (v: IsraelBoxStatus) => void;
  notes: string;
  setNotes: (v: string) => void;
  isSubmitting: boolean;
  error: string | null;
  handleSave: () => Promise<void>;
  handleClose: () => void;
};

export function useEditIsraelBoxForm({ boxRow, seasonId, t, onSuccess, onClose }: UseEditIsraelBoxFormProps): UseEditIsraelBoxFormResult {
  const [allFields, setAllFields] = useState<IsraelField[]>([]);
  const [allShipments, setAllShipments] = useState<IsraelShipmentRecord[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);

  const [fieldId, setFieldId] = useState('');
  const [selectedShipmentId, setSelectedShipmentId] = useState('');
  const [boxNumber, setBoxNumber] = useState('');
  const [status, setStatus] = useState<IsraelBoxStatus>('OPEN');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFieldLocked = (boxRow?.itemsCount ?? 0) > 0;

  useEffect(() => {
    if (!boxRow || !seasonId) {
      return;
    }

    let isMounted = true;
    setIsLoadingOptions(true);
    setError(null);

    Promise.all([getIsraelShipmentsBySeason(seasonId), getIsraelFields(), getIsraelBoxById(boxRow.id)])
      .then(([nextShipments, nextFields, fullBox]) => {
        if (!isMounted) return;
        setAllShipments(nextShipments);
        setAllFields(nextFields);
        setSelectedShipmentId(fullBox.shipmentId !== null ? String(fullBox.shipmentId) : '');
        setFieldId(String(fullBox.fieldId));
      })
      .catch(() => {
        if (isMounted) {
          setAllShipments([]);
          setAllFields([]);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoadingOptions(false);
      });

    setBoxNumber(String(boxRow.boxNumber));
    setStatus(boxRow.status);
    setNotes(boxRow.notes ?? '');

    return () => {
      isMounted = false;
    };
  }, [boxRow, seasonId]);

  const shipments = useMemo(
    () => (fieldId ? allShipments.filter((s) => s.fieldId === Number(fieldId)) : allShipments),
    [allShipments, fieldId],
  );

  const handleFieldIdChange = useCallback((value: string) => {
    setFieldId(value);
  }, []);

  const handleShipmentIdChange = useCallback(
    (value: string) => {
      setSelectedShipmentId(value);
      if (value) {
        const shipment = allShipments.find((s) => String(s.id) === value);
        if (shipment) {
          setFieldId(String(shipment.fieldId));
        }
      }
    },
    [allShipments],
  );

  const handleClose = useCallback(() => {
    setError(null);
    onClose();
  }, [onClose]);

  const handleSave = useCallback(async () => {
    if (!boxRow) {
      return;
    }

    if (!boxNumber.trim()) {
      setError(t.validationBoxNumberRequired);
      return;
    }

    const boxNumberValue = Number(boxNumber);
    if (!Number.isInteger(boxNumberValue) || boxNumberValue <= 0) {
      setError(t.validationBoxNumberPositive);
      return;
    }

    if (!fieldId) {
      setError(t.validationFieldRequired);
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await updateIsraelBox(
        {
          id: boxRow.id,
          boxNumber: boxNumberValue,
          fieldId: !isFieldLocked && Number(fieldId) !== boxRow.fieldId ? Number(fieldId) : undefined,
          shipmentId: selectedShipmentId ? Number(selectedShipmentId) : null,
          status,
          notes: notes.trim() || null,
        },
        { suppressGlobalFeedback: true },
      );

      onSuccess();
      onClose();
    } catch (err) {
      const apiStatus = err instanceof ApiError ? err.status : 0;
      setError(apiStatus === 409 ? t.duplicateBoxNumber : t.genericError);
    } finally {
      setIsSubmitting(false);
    }
  }, [boxNumber, boxRow, fieldId, isFieldLocked, notes, onClose, onSuccess, selectedShipmentId, status, t]);

  return {
    fields: allFields,
    fieldId,
    onFieldIdChange: handleFieldIdChange,
    isFieldLocked,
    shipments,
    isLoadingOptions,
    selectedShipmentId,
    onShipmentIdChange: handleShipmentIdChange,
    boxNumber,
    setBoxNumber,
    status,
    setStatus,
    notes,
    setNotes,
    isSubmitting,
    error,
    handleSave,
    handleClose,
  };
}
