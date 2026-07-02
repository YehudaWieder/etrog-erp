import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../../../services/apiClient';
import { createBox, createBoxesBulk, type BoxOwnership } from '../../../services/boxesApi';
import { getActiveSeason } from '../../../services/seasonsApi';
import { getShipmentsBySeason, type ShipmentRecord } from '../../../services/shipmentsApi';
import { getTraders, type Trader } from '../../../services/tradersApi';
import { getCustomers, type Customer } from '../../../services/customersApi';

export type NewBoxFormMode = 'SINGLE' | 'BULK';

const MAX_BULK_BOX_RANGE = 100;

type NewBoxFormText = {
  validationShipmentRequired: string;
  validationBoxNumberRequired: string;
  validationBoxNumberPositive: string;
  validationBoxTypeRequired: string;
  validationOwnershipTypeRequired: string;
  validationTraderRequired: string;
  validationCustomerRequired: string;
  validationStartNumberRequired: string;
  validationEndNumberRequired: string;
  validationRangeInvalid: string;
  validationRangeTooLarge: (max: number) => string;
  duplicateBoxNumber: string;
  duplicateBoxNumbersInRange: (numbers: string) => string;
  genericError: string;
};

type UseNewBoxFormProps = {
  isOpen: boolean;
  t: NewBoxFormText;
  onSuccess: () => void;
  onClose: () => void;
};

type UseNewBoxFormResult = {
  mode: NewBoxFormMode;
  setMode: (v: NewBoxFormMode) => void;
  shipments: ShipmentRecord[];
  traders: Trader[];
  customers: Customer[];
  isLoadingOptions: boolean;
  selectedShipmentId: string;
  setSelectedShipmentId: (v: string) => void;
  boxNumber: string;
  setBoxNumber: (v: string) => void;
  boxType: string;
  setBoxType: (v: string) => void;
  ownershipType: string;
  setOwnershipType: (v: string) => void;
  traderId: string;
  setTraderId: (v: string) => void;
  customerId: string;
  setCustomerId: (v: string) => void;
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

export function useNewBoxForm({ isOpen, t, onSuccess, onClose }: UseNewBoxFormProps): UseNewBoxFormResult {
  const [shipments, setShipments] = useState<ShipmentRecord[]>([]);
  const [traders, setTraders] = useState<Trader[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);

  const [mode, setMode] = useState<NewBoxFormMode>('SINGLE');
  const [selectedShipmentId, setSelectedShipmentId] = useState('');
  const [boxNumber, setBoxNumber] = useState('');
  const [boxType, setBoxType] = useState('');
  const [ownershipType, setOwnershipType] = useState('');
  const [traderId, setTraderId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [notes, setNotes] = useState('');
  const [startNumber, setStartNumber] = useState('');
  const [endNumber, setEndNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let isMounted = true;
    setIsLoadingOptions(true);

    const loadOptions = async () => {
      try {
        const activeSeason = await getActiveSeason();
        const [nextShipments, nextTraders, nextCustomers] = await Promise.all([
          getShipmentsBySeason(activeSeason.id),
          getTraders(),
          getCustomers(),
        ]);

        if (!isMounted) {
          return;
        }

        setShipments(nextShipments.filter((s) => s.status !== 'SHIPPED' && s.status !== 'DELIVERED'));
        setTraders(nextTraders);
        setCustomers(nextCustomers);
      } catch {
        if (!isMounted) {
          return;
        }

        setShipments([]);
        setTraders([]);
        setCustomers([]);
      } finally {
        if (isMounted) {
          setIsLoadingOptions(false);
        }
      }
    };

    loadOptions();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  const resetForm = useCallback(() => {
    setMode('SINGLE');
    setSelectedShipmentId('');
    setBoxNumber('');
    setBoxType('');
    setOwnershipType('');
    setTraderId('');
    setCustomerId('');
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
    if (!selectedShipmentId) {
      setError(t.validationShipmentRequired);
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
      await createBoxesBulk(
        {
          shipmentId: Number(selectedShipmentId),
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
  }, [endNumber, onClose, onSuccess, resetForm, selectedShipmentId, startNumber, t]);

  const handleSaveSingle = useCallback(async () => {
    if (!selectedShipmentId) {
      setError(t.validationShipmentRequired);
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

    if (!boxType) {
      setError(t.validationBoxTypeRequired);
      return;
    }

    if (!ownershipType) {
      setError(t.validationOwnershipTypeRequired);
      return;
    }

    if (ownershipType === 'TRADER' && !traderId) {
      setError(t.validationTraderRequired);
      return;
    }

    if (ownershipType === 'CUSTOMER' && !customerId) {
      setError(t.validationCustomerRequired);
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await createBox(
        {
          shipmentId: Number(selectedShipmentId),
          boxNumber: boxNumberValue,
          boxType: boxType as 'SMALL' | 'MEDIUM' | 'LARGE' | 'CUSTOM',
          ownershipType: ownershipType as BoxOwnership,
          traderId: ownershipType === 'TRADER' ? Number(traderId) : undefined,
          customerId: ownershipType === 'CUSTOMER' ? Number(customerId) : undefined,
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
  }, [boxNumber, boxType, customerId, notes, onClose, onSuccess, ownershipType, resetForm, selectedShipmentId, t, traderId]);

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
    traders,
    customers,
    isLoadingOptions,
    selectedShipmentId,
    setSelectedShipmentId,
    boxNumber,
    setBoxNumber,
    boxType,
    setBoxType,
    ownershipType,
    setOwnershipType,
    traderId,
    setTraderId,
    customerId,
    setCustomerId,
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
