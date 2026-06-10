import { useCallback, useState } from 'react';
import { ApiError } from '../../../services/apiClient';
import { deleteBox } from '../../../services/boxesApi';
import type { BoxesTableRow } from '../shipments.types';

type DeleteBoxDialogText = {
  conflictError: string;
  genericError: string;
};

type UseDeleteBoxDialogProps = {
  box: BoxesTableRow | null;
  t: DeleteBoxDialogText;
  onSuccess: () => void;
};

type UseDeleteBoxDialogResult = {
  isOpen: boolean;
  isDeleting: boolean;
  error: string | null;
  handleOpen: () => void;
  handleConfirm: () => Promise<void>;
  handleCancel: () => void;
};

export function useDeleteBoxDialog({
  box,
  t,
  onSuccess,
}: UseDeleteBoxDialogProps): UseDeleteBoxDialogResult {
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
    if (!box) return;

    setIsDeleting(true);
    setError(null);

    try {
      await deleteBox(box.id, { suppressGlobalFeedback: true });
      setIsOpen(false);
      onSuccess();
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      setError(status === 409 || status === 400 ? t.conflictError : t.genericError);
    } finally {
      setIsDeleting(false);
    }
  }, [box, onSuccess, t]);

  return { isOpen, isDeleting, error, handleOpen, handleConfirm, handleCancel };
}
