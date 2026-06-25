import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../../../services/apiClient';
import { getBoxById, updateBox, type BoxStatus } from '../../../services/boxesApi';
import { getActiveSeason } from '../../../services/seasonsApi';
import { getShipmentsBySeason, type ShipmentRecord } from '../../../services/shipmentsApi';
import { getSystemConfig, type SystemConfig } from '../../../services/systemConfigApi';
import { getShipmentItemsByBox } from '../../../services/shipmentItemsApi';
import { getTraders, type Trader } from '../../../services/tradersApi';
import { getCustomers, type Customer } from '../../../services/customersApi';
import type { BoxesTableRow } from '../shipments.types';

type EditBoxFormText = {
  validationBoxNumberRequired: string;
  validationBoxNumberPositive: string;
  validationTraderRequired: string;
  validationCustomerRequired: string;
  duplicateBoxNumber: string;
  errorOwnershipLocked: string;
  errorBoxTypeCapacity: (quantity: number, capacity: number) => string;
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
  hasItems: boolean;
  isShipmentFrozen: boolean;
  isShipmentShipped: boolean;
  isChangingShipment: boolean;
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

  const [originalShipmentId, setOriginalShipmentId] = useState('');
  const [selectedShipmentId, setSelectedShipmentId] = useState('');
  const [boxNumber, setBoxNumber] = useState('');
  const [status, setStatus] = useState<BoxStatus>('OPEN');
  const [boxType, setBoxType] = useState('');
  const [ownershipType, setOwnershipType] = useState('');
  const [traderId, setTraderId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [notes, setNotes] = useState('');
  const [hasItems, setHasItems] = useState(false);
  const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);
  const [boxTotalQuantity, setBoxTotalQuantity] = useState(0);
  const [isShipmentFrozen, setIsShipmentFrozen] = useState(false);
  const [isShipmentShipped, setIsShipmentShipped] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load options and full box details when a box row is provided
  useEffect(() => {
    if (!boxRow) {
      return;
    }

    let isMounted = true;
    setIsLoadingOptions(true);
    setHasItems(false);
    setIsShipmentFrozen(false);
    setError(null);

    const load = async () => {
      try {
        const activeSeason = await getActiveSeason();
        const [fullBox, boxItems, nextShipments, nextTraders, nextCustomers, nextSystemConfig] = await Promise.all([
          getBoxById(boxRow.id),
          getShipmentItemsByBox(boxRow.id),
          getShipmentsBySeason(activeSeason.id),
          getTraders(),
          getCustomers(),
          getSystemConfig(activeSeason.id),
        ]);

        if (!isMounted) {
          return;
        }

        setShipments(nextShipments);
        setTraders(nextTraders);
        setCustomers(nextCustomers);
        setSystemConfig(nextSystemConfig);
        setHasItems(boxItems.length > 0);
        setBoxTotalQuantity(fullBox.totalQuantity);

        const boxShipment = nextShipments.find((s) => s.id === fullBox.shipmentId);
        setIsShipmentFrozen(boxShipment?.status === 'DELIVERED');
        setIsShipmentShipped(boxShipment?.status === 'SHIPPED');

        setOriginalShipmentId(String(fullBox.shipmentId));
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

    if (boxType && boxType !== 'CUSTOM' && systemConfig) {
      const capacityMap: Record<string, number | null> = {
        SMALL: systemConfig.smallBoxCapacity,
        MEDIUM: systemConfig.mediumBoxCapacity,
        LARGE: systemConfig.largeBoxCapacity,
      };
      const capacity = capacityMap[boxType] ?? null;
      if (capacity !== null && boxTotalQuantity > capacity) {
        setError(t.errorBoxTypeCapacity(boxTotalQuantity, capacity));
        return;
      }
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
          ownershipType: ownershipType as 'TRADER' | 'CUSTOMER' | 'SHARED' | 'GENERAL' | 'CUSTOM' | undefined,
          traderId: ownershipType === 'TRADER' ? Number(traderId) : null,
          customerId: ownershipType === 'CUSTOMER' ? Number(customerId) : null,
          notes: notes.trim() || null,
        },
        { suppressGlobalFeedback: true },
      );

      onSuccess();
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setError(t.duplicateBoxNumber);
        } else if (err.status === 400 && err.message.toLowerCase().includes('ownership')) {
          setError(t.errorOwnershipLocked);
        } else {
          setError(t.genericError);
        }
      } else {
        setError(t.genericError);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [boxNumber, boxRow, boxType, boxTotalQuantity, customerId, notes, onClose, onSuccess, ownershipType, selectedShipmentId, status, systemConfig, t, traderId]);

  return {
    shipments,
    traders,
    customers,
    isLoadingOptions,
    hasItems,
    isShipmentFrozen,
    isShipmentShipped,
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
    isChangingShipment: selectedShipmentId !== originalShipmentId,
    isShipped: status === 'SHIPPED' || status === 'CLOSED' || status === 'DELIVERED',
    isSubmitting,
    error,
    handleSave,
    handleClose,
  };
}
