import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../../../../services/apiClient';
import { createIsraelBox, createIsraelBoxesBulk } from '../../../../services/israelBoxesApi';
import { getIsraelShipmentsBySeason, type IsraelShipmentRecord } from '../../../../services/israelShipmentsApi';

export type NewIsraelBoxFormMode = 'SINGLE' | 'BULK';

const MAX_BULK_BOX_RANGE = 100;

type NewIsraelBoxFormText = {
  validationBoxNumberRequired: string;
  validationBoxNumberPositive: string;
  validationStartNumberRequired: string;
  validationEndNumberRequired: string;
  validationRangeInvalid: string;
  validationRangeTooLarge: (max: number) => string;
  duplicateBoxNumber: string;
  duplicateBoxNumbersInRange: (numbers: string) => string;
  genericError: string;
};

type UseNewIsraelBoxFormProps = {
  isOpen: boolean;
  seasonId: number | null;
  t: NewIsraelBoxFormText;
  onSuccess: () => void;
  onClose: () => void;
};

type UseNewIsraelBoxFormResult = {
  mode: NewIsraelBoxFormMode;
  setMode: (v: NewIsraelBoxFormMode) => void;
  shipments: IsraelShipmentRecord[];
  isLoadingOptions: boolean;
  selectedShipmentId: string;
  setSelectedShipmentId: (v: string) => void;
  boxNumber: string;
  setBoxNumber: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  startNumber: string;
  setStartNumber: (v: string) => void;
  endNumber: string;
  setEndNumber: (v: string) => void;
  isSubmitting: boolean;
  error: string | null;
  handleSave: () => Promise<void>;
  handleClose: () => void;
};

export function useNewIsraelBoxForm({ isOpen, seasonId, t, onSuccess, onClose }: UseNewIsraelBoxFormProps): UseNewIsraelBoxFormResult {
  const [shipments, setShipments] = useState<IsraelShipmentRecord[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);

  const [mode, setMode] = useState<NewIsraelBoxFormMode>('SINGLE');
  const [selectedShipmentId, setSelectedShipmentId] = useState('');
  const [boxNumber, setBoxNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [startNumber, setStartNumber] = useState('');
  const [endNumber, setEndNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !seasonId) {
      return;
    }

    let isMounted = true;
    setIsLoadingOptions(true);

    getIsraelShipmentsBySeason(seasonId)
      .then((nextShipments) => {
        if (isMounted) {
          setShipments(nextShipments.filter((s) => s.status !== 'SHIPPED' && s.status !== 'DELIVERED'));
        }
      })
      .catch(() => {
        if (isMounted) {
          setShipments([]);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingOptions(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, seasonId]);

  const resetForm = useCallback(() => {
    setMode('SINGLE');
    setSelectedShipmentId('');
    setBoxNumber('');
    setNotes('');
    setStartNumber('');
    setEndNumber('');
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  const handleSaveBulk = useCallback(async () => {
    if (!seasonId) {
      setError(t.genericError);
      return;
    }

    if (!startNumber.trim()) {
      setError(t.validationStartNumberRequired);
      return;
    }

    if (!endNumber.trim()) {
      setError(t.validationEndNumberRequired);
      return;
    }

    const startNumberValue = Number(startNumber);
    const endNumberValue = Number(endNumber);
    if (
      !Number.isInteger(startNumberValue) ||
      startNumberValue <= 0 ||
      !Number.isInteger(endNumberValue) ||
      endNumberValue < startNumberValue
    ) {
      setError(t.validationRangeInvalid);
      return;
    }

    if (endNumberValue - startNumberValue + 1 > MAX_BULK_BOX_RANGE) {
      setError(t.validationRangeTooLarge(MAX_BULK_BOX_RANGE));
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await createIsraelBoxesBulk(
        {
          seasonId,
          shipmentId: selectedShipmentId ? Number(selectedShipmentId) : undefined,
          startNumber: startNumberValue,
          endNumber: endNumberValue,
        },
        { suppressGlobalFeedback: true },
      );

      resetForm();
      onSuccess();
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && err.serverMessage) {
        const numbersMatch = err.serverMessage.match(/:\s*([\d,\s]+)$/);
        setError(numbersMatch ? t.duplicateBoxNumbersInRange(numbersMatch[1].trim()) : t.duplicateBoxNumber);
      } else {
        setError(t.genericError);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [endNumber, onClose, onSuccess, resetForm, seasonId, selectedShipmentId, startNumber, t]);

  const handleSaveSingle = useCallback(async () => {
    if (!seasonId) {
      setError(t.genericError);
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
      await createIsraelBox(
        {
          seasonId,
          boxNumber: boxNumberValue,
          shipmentId: selectedShipmentId ? Number(selectedShipmentId) : undefined,
          notes: notes.trim() || undefined,
        },
        { suppressGlobalFeedback: true },
      );

      resetForm();
      onSuccess();
      onClose();
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      setError(status === 409 ? t.duplicateBoxNumber : t.genericError);
    } finally {
      setIsSubmitting(false);
    }
  }, [boxNumber, notes, onClose, onSuccess, resetForm, seasonId, selectedShipmentId, t]);

  const handleSave = useCallback(async () => {
    if (mode === 'BULK') {
      await handleSaveBulk();
    } else {
      await handleSaveSingle();
    }
  }, [handleSaveBulk, handleSaveSingle, mode]);

  return {
    mode,
    setMode,
    shipments,
    isLoadingOptions,
    selectedShipmentId,
    setSelectedShipmentId,
    boxNumber,
    setBoxNumber,
    notes,
    setNotes,
    startNumber,
    setStartNumber,
    endNumber,
    setEndNumber,
    isSubmitting,
    error,
    handleSave,
    handleClose,
  };
}
