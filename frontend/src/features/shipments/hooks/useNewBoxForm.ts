import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../../../services/apiClient';
import { createBox, type BoxOwnership } from '../../../services/boxesApi';
import { getActiveSeason } from '../../../services/seasonsApi';
import { getShipmentsBySeason, type ShipmentRecord } from '../../../services/shipmentsApi';
import { getTraders, type Trader } from '../../../services/tradersApi';
import { getCustomers, type Customer } from '../../../services/customersApi';

type NewBoxFormText = {
  validationShipmentRequired: string;
  validationBoxNumberRequired: string;
  validationBoxNumberPositive: string;
  validationBoxTypeRequired: string;
  validationOwnershipTypeRequired: string;
  validationTraderRequired: string;
  validationCustomerRequired: string;
  duplicateBoxNumber: string;
  genericError: string;
};

type UseNewBoxFormProps = {
  isOpen: boolean;
  t: NewBoxFormText;
  onSuccess: () => void;
  onClose: () => void;
};

type UseNewBoxFormResult = {
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

  const [selectedShipmentId, setSelectedShipmentId] = useState('');
  const [boxNumber, setBoxNumber] = useState('');
  const [boxType, setBoxType] = useState('');
  const [ownershipType, setOwnershipType] = useState('');
  const [traderId, setTraderId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [notes, setNotes] = useState('');
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

        setShipments(nextShipments);
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
    setSelectedShipmentId('');
    setBoxNumber('');
    setBoxType('');
    setOwnershipType('');
    setTraderId('');
    setCustomerId('');
    setNotes('');
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  const handleSave = useCallback(async () => {
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

  return {
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
    isSubmitting,
    error,
    handleSave,
    handleClose,
  };
}
