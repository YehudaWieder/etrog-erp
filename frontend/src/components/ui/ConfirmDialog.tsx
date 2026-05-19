import { ReactNode } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
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
}: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-dialog">
        <h3 className="modal-title">{title}</h3>
        <div className="modal-message">{message}</div>
        {children}
        <div className="modal-actions">
          <button className="btn btn-danger" onClick={onConfirm} type="button">
            {confirmLabel}
          </button>
          <button className="btn btn-success" onClick={onCancel} type="button">
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
