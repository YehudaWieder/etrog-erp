import { useCallback, useState } from 'react';
import { ApiError } from '../../../../services/apiClient';
import { deleteIsraelBox } from '../../../../services/israel/israelBoxesApi';
import type { IsraelBoxesTableRow } from '../israelShipments.types';

type DeleteIsraelBoxDialogText = {
  conflictError: string;
  genericError: string;
};

type UseDeleteIsraelBoxDialogProps = {
  box: IsraelBoxesTableRow | null;
  t: DeleteIsraelBoxDialogText;
  onSuccess: () => void;
};

type UseDeleteIsraelBoxDialogResult = {
  isOpen: boolean;
  isDeleting: boolean;
  error: string | null;
  handleOpen: () => void;
  handleConfirm: () => Promise<void>;
  handleCancel: () => void;
};

export function useDeleteIsraelBoxDialog({
  box,
  t,
  onSuccess,
}: UseDeleteIsraelBoxDialogProps): UseDeleteIsraelBoxDialogResult {
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
      await deleteIsraelBox(box.id, { suppressGlobalFeedback: true });
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
