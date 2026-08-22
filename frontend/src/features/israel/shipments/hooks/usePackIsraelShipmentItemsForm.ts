import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError } from '../../../../services/apiClient';
import { packIsraelShipmentItems } from '../../../../services/israel/israelShipmentItemsApi';
import { getIsraelBoxesBySeason, type IsraelBoxRecord } from '../../../../services/israel/israelBoxesApi';
import { getIsraelSortCategories, type IsraelSortCategory } from '../../../../services/israel/israelSortCategoriesApi';
import { getIsraelStockBySeason, type IsraelStockRecord } from '../../../../services/israel/israelStockApi';
import type { IsraelPitamStatus } from '../../../../services/israel/israelClassificationsApi';

const PITAM_STATUSES: IsraelPitamStatus[] = ['WITH_PITAM', 'WITHOUT_PITAM', 'MIXED'];

export type PackIsraelShipmentItemRowDraft = {
  id: string;
  categoryId: string;
  notes: string;
  quantities: Record<string, string>; // key: `${grade}|${pitamStatus}`
};

type PackIsraelShipmentItemsFormText = {
  validationBoxRequired: string;
  validationRowsRequired: string;
  boxNotOpenError: string;
  genericError: string;
};

type UsePackIsraelShipmentItemsFormProps = {
  isOpen: boolean;
  seasonId: number | null;
  initialBoxId?: number | null;
  t: PackIsraelShipmentItemsFormText;
  onSuccess: () => void;
  onClose: () => void;
};

function cellKey(grade: string, pitamStatus: IsraelPitamStatus): string {
  return `${grade}|${pitamStatus}`;
}

let rowIdCounter = 0;
function nextRowId(): string {
  rowIdCounter += 1;
  return `row-${rowIdCounter}`;
}

export function usePackIsraelShipmentItemsForm({
  isOpen,
  seasonId,
  initialBoxId,
  t,
  onSuccess,
  onClose,
}: UsePackIsraelShipmentItemsFormProps) {
  const [boxes, setBoxes] = useState<IsraelBoxRecord[]>([]);
  const [sortCategories, setSortCategories] = useState<IsraelSortCategory[]>([]);
  const [stockRows, setStockRows] = useState<IsraelStockRecord[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);

  const [boxId, setBoxId] = useState('');
  const [rows, setRows] = useState<PackIsraelShipmentItemRowDraft[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !seasonId) {
      return;
    }

    let isMounted = true;
    setIsLoadingOptions(true);

    Promise.all([getIsraelBoxesBySeason(seasonId), getIsraelSortCategories(), getIsraelStockBySeason(seasonId)])
      .then(([nextBoxes, nextCategories, nextStock]) => {
        if (!isMounted) return;
        setBoxes(nextBoxes.filter((b) => b.status === 'OPEN'));
        setSortCategories(nextCategories);
        setStockRows(nextStock);
        if (initialBoxId) {
          setBoxId(String(initialBoxId));
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setBoxes([]);
        setSortCategories([]);
        setStockRows([]);
      })
      .finally(() => {
        if (isMounted) setIsLoadingOptions(false);
      });

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, seasonId]);

  const selectedBox = useMemo(() => boxes.find((box) => String(box.id) === boxId) ?? null, [boxes, boxId]);

  const pooledQuantityFor = useCallback(
    (categoryId: number, grade: string, pitamStatus: IsraelPitamStatus) =>
      stockRows.reduce((sum, row) => {
        if (row.categoryId === categoryId && row.grade === grade && row.pitamStatus === pitamStatus) {
          return sum + row.quantity;
        }
        return sum;
      }, 0),
    [stockRows],
  );

  const stagedQuantityFor = useCallback(
    (categoryId: number, grade: string, pitamStatus: IsraelPitamStatus) => {
      const key = cellKey(grade, pitamStatus);
      return rows.reduce((sum, row) => {
        if (row.categoryId !== String(categoryId)) return sum;
        const value = Number(row.quantities[key]);
        return sum + (Number.isFinite(value) ? value : 0);
      }, 0);
    },
    [rows],
  );

  const availableFor = useCallback(
    (categoryId: number, grade: string, pitamStatus: IsraelPitamStatus) =>
      pooledQuantityFor(categoryId, grade, pitamStatus) - stagedQuantityFor(categoryId, grade, pitamStatus),
    [pooledQuantityFor, stagedQuantityFor],
  );

  const totalPackedQuantity = useMemo(
    () =>
      rows.reduce((sum, row) => {
        const rowTotal = Object.values(row.quantities).reduce((cellSum, value) => {
          const parsed = Number(value);
          return cellSum + (Number.isFinite(parsed) && parsed > 0 ? parsed : 0);
        }, 0);
        return sum + rowTotal;
      }, 0),
    [rows],
  );

  const resetForm = useCallback(() => {
    setBoxId('');
    setRows([]);
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  const handleBoxIdChange = useCallback((value: string) => {
    setBoxId(value);
    setRows([]);
    setError(null);
  }, []);

  const handleAddRow = useCallback(() => {
    setRows((current) => [...current, { id: nextRowId(), categoryId: '', notes: '', quantities: {} }]);
  }, []);

  const handleRemoveRow = useCallback((rowId: string) => {
    setRows((current) => current.filter((row) => row.id !== rowId));
  }, []);

  const handleRowCategoryChange = useCallback((rowId: string, categoryId: string) => {
    setRows((current) => current.map((row) => (row.id === rowId ? { ...row, categoryId, quantities: {} } : row)));
  }, []);

  const handleRowNotesChange = useCallback((rowId: string, notes: string) => {
    setRows((current) => current.map((row) => (row.id === rowId ? { ...row, notes } : row)));
  }, []);

  const handleCellQuantityChange = useCallback((rowId: string, grade: string, pitamStatus: IsraelPitamStatus, value: string) => {
    setRows((current) =>
      current.map((row) =>
        row.id === rowId ? { ...row, quantities: { ...row.quantities, [cellKey(grade, pitamStatus)]: value } } : row,
      ),
    );
  }, []);

  const handleSave = useCallback(async () => {
    if (!boxId) {
      setError(t.validationBoxRequired);
      return;
    }

    const items = rows.flatMap((row) => {
      if (!row.categoryId) return [];
      const categoryId = Number(row.categoryId);
      return Object.entries(row.quantities).flatMap(([key, rawValue]) => {
        const quantity = Number(rawValue);
        if (!Number.isFinite(quantity) || quantity <= 0) return [];
        const [grade, pitamStatus] = key.split('|') as [string, IsraelPitamStatus];
        return [{ categoryId, grade, pitamStatus, quantity, notes: row.notes.trim() || undefined }];
      });
    });

    if (items.length === 0) {
      setError(t.validationRowsRequired);
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await packIsraelShipmentItems({ boxId: Number(boxId), items }, { suppressGlobalFeedback: true });

      resetForm();
      onSuccess();
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.status === 400 && err.message.toLowerCase().includes('not open')) {
        setError(t.boxNotOpenError);
      } else {
        setError(t.genericError);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [boxId, onClose, onSuccess, resetForm, rows, t]);

  return {
    boxes,
    sortCategories,
    isLoadingOptions,
    boxId,
    onBoxIdChange: handleBoxIdChange,
    selectedBox,
    rows,
    onAddRow: handleAddRow,
    onRemoveRow: handleRemoveRow,
    onRowCategoryChange: handleRowCategoryChange,
    onRowNotesChange: handleRowNotesChange,
    onCellQuantityChange: handleCellQuantityChange,
    availableFor,
    totalPackedQuantity,
    isSubmitting,
    error,
    handleSave,
    handleClose,
  };
}
