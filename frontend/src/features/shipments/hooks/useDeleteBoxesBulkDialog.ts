import { useCallback, useState } from 'react';
import { ApiError } from '../../../services/apiClient';
import { deleteBoxesBulk } from '../../../services/boxesApi';
import type { BoxesTableRow } from '../shipments.types';

type DeleteBoxesBulkDialogText = {
  conflictError: string;
  genericError: string;
};

type UseDeleteBoxesBulkDialogProps = {
  boxes: BoxesTableRow[];
  t: DeleteBoxesBulkDialogText;
  onSuccess: () => void;
};

type UseDeleteBoxesBulkDialogResult = {
  isOpen: boolean;
  isDeleting: boolean;
  error: string | null;
  handleOpen: () => void;
  handleConfirm: () => Promise<void>;
  handleCancel: () => void;
};

export function useDeleteBoxesBulkDialog({
  boxes,
  t,
  onSuccess,
}: UseDeleteBoxesBulkDialogProps): UseDeleteBoxesBulkDialogResult {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpen = useCallback(() => {
    setError(null);
    setIsOpen(true);
  }, []);

  const handleCancel = useCallback(() => {
    setError(null);
    setIsOpen(false);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (boxes.length === 0) return;

    setIsDeleting(true);
    setError(null);

    try {
      await deleteBoxesBulk(
        boxes.map((box) => box.id),
        { suppressGlobalFeedback: true },
      );
      setIsOpen(false);
      onSuccess();
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      setError(status === 409 || status === 400 ? t.conflictError : t.genericError);
    } finally {
      setIsDeleting(false);
    }
  }, [boxes, onSuccess, t]);

  return { isOpen, isDeleting, error, handleOpen, handleConfirm, handleCancel };
}
