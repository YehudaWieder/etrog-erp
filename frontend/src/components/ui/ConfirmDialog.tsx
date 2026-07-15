import { ReactNode } from 'react';
import { SubmitButton } from './SubmitButton';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
  isConfirming?: boolean;
  confirmingLabel?: string;
  dialogClassName?: string;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  children,
  isConfirming = false,
  confirmingLabel,
  dialogClassName,
}: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div className="modal-overlay">
      <div className={`modal-dialog${dialogClassName ? ` ${dialogClassName}` : ''}`}>
        <h3 className="modal-title">{title}</h3>
        <div className="modal-message">{message}</div>
        {children}
        <div className="modal-actions">
          <SubmitButton
            className="btn btn-danger"
            onClick={onConfirm}
            isLoading={isConfirming}
            loadingText={confirmingLabel ?? confirmLabel}
          >
            {confirmLabel}
          </SubmitButton>
          <button className="btn btn-success" onClick={onCancel} type="button" disabled={isConfirming}>
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
