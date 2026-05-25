import { useEffect, useMemo, useRef, useState } from 'react';
import {
  API_FEEDBACK_EVENT,
  type ApiFeedbackDetail,
  type ApiFeedbackVariant,
} from '../../services/apiClient';

type ToastItem = {
  id: number;
  message: string;
  variant: ApiFeedbackVariant;
  createdAt: number;
};

const TOAST_TTL_MS = 4500;
const DEDUPE_WINDOW_MS = 1200;

export function GlobalApiFeedback(): JSX.Element {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextIdRef = useRef(1);

  useEffect(() => {
    const handleFeedback = (event: Event) => {
      const customEvent = event as CustomEvent<ApiFeedbackDetail>;
      const payload = customEvent.detail;

      if (!payload?.message) {
        return;
      }

      setToasts((previous) => {
        const now = Date.now();
        const hasRecentDuplicate = previous.some(
          (toast) =>
            toast.message === payload.message
            && toast.variant === payload.variant
            && now - toast.createdAt < DEDUPE_WINDOW_MS,
        );

        if (hasRecentDuplicate) {
          return previous;
        }

        const nextToast: ToastItem = {
          id: nextIdRef.current++,
          message: payload.message,
          variant: payload.variant,
          createdAt: now,
        };

        return [...previous.slice(-3), nextToast];
      });
    };

    window.addEventListener(API_FEEDBACK_EVENT, handleFeedback);

    return () => {
      window.removeEventListener(API_FEEDBACK_EVENT, handleFeedback);
    };
  }, []);

  useEffect(() => {
    if (toasts.length === 0) {
      return;
    }

    const timers = toasts.map((toast) =>
      window.setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== toast.id));
      }, TOAST_TTL_MS),
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [toasts]);

  const renderedToasts = useMemo(
    () =>
      toasts.map((toast) => (
        <div key={toast.id} className={`global-api-toast global-api-toast--${toast.variant}`} role="status" aria-live="polite">
          <span className="global-api-toast__message">{toast.message}</span>
          <button
            type="button"
            className="global-api-toast__close"
            onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}
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
