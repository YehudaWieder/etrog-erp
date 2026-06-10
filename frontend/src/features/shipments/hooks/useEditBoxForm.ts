import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../../../services/apiClient';
import { getBoxById, updateBox, type BoxStatus } from '../../../services/boxesApi';
import { getActiveSeason } from '../../../services/seasonsApi';
import { getShipmentsBySeason, type ShipmentRecord } from '../../../services/shipmentsApi';
import { getTraders, type Trader } from '../../../services/tradersApi';
import { getCustomers, type Customer } from '../../../services/customersApi';
import type { BoxesTableRow } from '../shipments.types';

type EditBoxFormText = {
  validationBoxNumberRequired: string;
  validationBoxNumberPositive: string;
  validationTraderRequired: string;
  validationCustomerRequired: string;
  duplicateBoxNumber: string;
  genericError: string;
};

type UseEditBoxFormProps = {
  boxRow: BoxesTableRow | null;
  t: EditBoxFormText;
  onSuccess: () => void;
  onClose: () => void;
};

type UseEditBoxFormResult = {
  shipments: ShipmentRecord[];
  traders: Trader[];
  customers: Customer[];
  isLoadingOptions: boolean;
  selectedShipmentId: string;
  setSelectedShipmentId: (v: string) => void;
  boxNumber: string;
  setBoxNumber: (v: string) => void;
  status: BoxStatus;
  setStatus: (v: BoxStatus) => void;
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
  isShipped: boolean;
  isSubmitting: boolean;
  error: string | null;
  handleSave: () => Promise<void>;
  handleClose: () => void;
};

export function useEditBoxForm({ boxRow, t, onSuccess, onClose }: UseEditBoxFormProps): UseEditBoxFormResult {
  const [shipments, setShipments] = useState<ShipmentRecord[]>([]);
  const [traders, setTraders] = useState<Trader[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);

  const [selectedShipmentId, setSelectedShipmentId] = useState('');
  const [boxNumber, setBoxNumber] = useState('');
  const [status, setStatus] = useState<BoxStatus>('OPEN');
  const [boxType, setBoxType] = useState('');
  const [ownershipType, setOwnershipType] = useState('');
  const [traderId, setTraderId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load options and full box details when a box row is provided
  useEffect(() => {
    if (!boxRow) {
      return;
    }

    let isMounted = true;
    setIsLoadingOptions(true);
    setError(null);

    const load = async () => {
      try {
        const activeSeason = await getActiveSeason();
        const [fullBox, nextShipments, nextTraders, nextCustomers] = await Promise.all([
          getBoxById(boxRow.id),
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

        setSelectedShipmentId(String(fullBox.shipmentId));
        setBoxNumber(String(fullBox.boxNumber));
        setStatus(fullBox.status);
        setBoxType(fullBox.boxType);
        setOwnershipType(fullBox.ownershipType);
        setTraderId(fullBox.traderId !== null && fullBox.traderId !== undefined ? String(fullBox.traderId) : '');
        setCustomerId(fullBox.customerId !== null && fullBox.customerId !== undefined ? String(fullBox.customerId) : '');
        setNotes(fullBox.notes ?? '');
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

    load();

    return () => {
      isMounted = false;
    };
  }, [boxRow]);

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
      await updateBox(
        {
          id: boxRow.id,
          shipmentId: selectedShipmentId ? Number(selectedShipmentId) : undefined,
          boxNumber: boxNumberValue,
          status,
          boxType: boxType as 'SMALL' | 'MEDIUM' | 'LARGE' | 'CUSTOM' | undefined,
          ownershipType: ownershipType as 'TRADER' | 'CUSTOMER' | 'SHARED' | 'UNASSIGNED' | 'CUSTOM' | undefined,
          traderId: ownershipType === 'TRADER' ? Number(traderId) : null,
          customerId: ownershipType === 'CUSTOMER' ? Number(customerId) : null,
          notes: notes.trim() || null,
        },
        { suppressGlobalFeedback: true },
      );

      onSuccess();
      onClose();
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      setError(status === 409 ? t.duplicateBoxNumber : t.genericError);
    } finally {
      setIsSubmitting(false);
    }
  }, [boxNumber, boxRow, boxType, customerId, notes, onClose, onSuccess, ownershipType, selectedShipmentId, status, t, traderId]);

  return {
    shipments,
    traders,
    customers,
    isLoadingOptions,
    selectedShipmentId,
    setSelectedShipmentId,
    boxNumber,
    setBoxNumber,
    status,
    setStatus,
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
    isShipped: status === 'SHIPPED' || status === 'CLOSED',
    isSubmitting,
    error,
    handleSave,
    handleClose,
  };
}
