import { useMemo } from 'react';
import { useApiFeedbackToasts } from '../../hooks/useApiFeedbackToasts';

export function GlobalApiFeedback(): JSX.Element {
  const { toasts, dismissToast } = useApiFeedbackToasts();

  const renderedToasts = useMemo(
    () =>
      toasts.map((toast) => (
        <div key={toast.id} className={`global-api-toast global-api-toast--${toast.variant}`} role="status" aria-live="polite">
          <span className="global-api-toast__message">{toast.message}</span>
          <button
            type="button"
            className="global-api-toast__close"
            onClick={() => dismissToast(toast.id)}
            aria-label="Close notification"
          >
            ×
          </button>
        </div>
      )),
    [toasts],
  );

  return <div className="global-api-toast-stack">{renderedToasts}</div>;
}
