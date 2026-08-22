import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../../../../services/apiClient';
import { getIsraelBoxById, updateIsraelBox, type IsraelBoxStatus } from '../../../../services/israel/israelBoxesApi';
import { getIsraelShipmentsBySeason, type IsraelShipmentRecord } from '../../../../services/israel/israelShipmentsApi';
import type { IsraelBoxesTableRow } from '../israelShipments.types';

type EditIsraelBoxFormText = {
  validationBoxNumberRequired: string;
  validationBoxNumberPositive: string;
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
  shipments: IsraelShipmentRecord[];
  isLoadingOptions: boolean;
  selectedShipmentId: string;
  setSelectedShipmentId: (v: string) => void;
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
  const [shipments, setShipments] = useState<IsraelShipmentRecord[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);

  const [selectedShipmentId, setSelectedShipmentId] = useState('');
  const [boxNumber, setBoxNumber] = useState('');
  const [status, setStatus] = useState<IsraelBoxStatus>('OPEN');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!boxRow || !seasonId) {
      return;
    }

    let isMounted = true;
    setIsLoadingOptions(true);
    setError(null);

    Promise.all([getIsraelShipmentsBySeason(seasonId), getIsraelBoxById(boxRow.id)])
      .then(([nextShipments, fullBox]) => {
        if (!isMounted) return;
        setShipments(nextShipments);
        setSelectedShipmentId(fullBox.shipmentId !== null ? String(fullBox.shipmentId) : '');
      })
      .catch(() => {
        if (isMounted) setShipments([]);
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

    setError(null);
    setIsSubmitting(true);

    try {
      await updateIsraelBox(
        {
          id: boxRow.id,
          boxNumber: boxNumberValue,
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
  }, [boxNumber, boxRow, notes, onClose, onSuccess, selectedShipmentId, status, t]);

  return {
    shipments,
    isLoadingOptions,
    selectedShipmentId,
    setSelectedShipmentId,
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
