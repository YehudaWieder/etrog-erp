import { translateApiErrorMessage } from './apiErrorTranslations';

export const API_FEEDBACK_EVENT = 'app:api-feedback';

export type ApiFeedbackVariant = 'success' | 'error';

export type ApiFeedbackDetail = {
  variant: ApiFeedbackVariant;
  message: string;
  timestamp: number;
};

type ResourceLabel = {
  he: string;
  en: string;
};

const RESOURCE_LABELS: Record<string, ResourceLabel> = {
  season: { he: 'העונה', en: 'Season' },
  field: { he: 'השדה', en: 'Field' },
  trader: { he: 'הסוחר', en: 'Trader' },
  traderCategory: { he: 'קטגוריית הסוחר', en: 'Trader category' },
  defaultTraderCategory: { he: 'קטגוריית ברירת המחדל', en: 'Default trader category' },
  customer: { he: 'הלקוח', en: 'Customer' },
  customerCategory: { he: 'קטגוריית הלקוח', en: 'Customer category' },
  message: { he: 'ההודעה', en: 'Message' },
  user: { he: 'המשתמש', en: 'User' },
  shipment: { he: 'המשלוח', en: 'Shipment' },
};

function getCurrentLanguage(): 'he' | 'en' {
  if (typeof window === 'undefined') {
    return 'he';
  }

  const stored = window.localStorage.getItem('app.language');
  return stored === 'en' ? 'en' : 'he';
}

export function dispatchApiFeedback(detail: Omit<ApiFeedbackDetail, 'timestamp'>): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<ApiFeedbackDetail>(API_FEEDBACK_EVENT, {
      detail: {
        ...detail,
        timestamp: Date.now(),
      },
    }),
  );
}

export function shouldNotifySuccess(method: string): boolean {
  return method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';
}

function resolveResourceKey(path: string): keyof typeof RESOURCE_LABELS | null {
  const cleanPath = path.split('?')[0].replace(/^https?:\/\/[^/]+/, '').replace(/^\/+/, '');
  const [first, second] = cleanPath.split('/');

  if (first === 'seasons') return 'season';
  if (first === 'fields') return 'field';
  if (first === 'traders' && second === 'categories') return 'traderCategory';
  if (first === 'traders' && second === 'default-categories') return 'defaultTraderCategory';
  if (first === 'traders') return 'trader';
  if (first === 'customer-categories') return 'customerCategory';
  if (first === 'customers' && second === 'categories') return 'customerCategory';
  if (first === 'customers') return 'customer';
  if (first === 'messages') return 'message';
  if (first === 'users') return 'user';
  if (first === 'shipments') return 'shipment';

  return null;
}

export function buildSuccessMessage(method: string, path: string): string {
  const lang = getCurrentLanguage();
  const resourceKey = resolveResourceKey(path);
  const resourceLabel = resourceKey ? RESOURCE_LABELS[resourceKey] : null;

  if (resourceLabel) {
    if (lang === 'en') {
      if (resourceKey === 'message' && method === 'POST') {
        return 'Message sent successfully.';
      }

      if (method === 'DELETE') {
        return `${resourceLabel.en} deleted successfully.`;
      }

      if (method === 'PUT' || method === 'PATCH') {
        return `${resourceLabel.en} updated successfully.`;
      }

      return `${resourceLabel.en} added successfully.`;
    }

    if (resourceKey === 'message' && method === 'POST') {
      return 'ההודעה נשלחה בהצלחה.';
    }

    if (method === 'DELETE') {
      return `${resourceLabel.he} נמחק בהצלחה.`;
    }

    if (method === 'PUT' || method === 'PATCH') {
      return `${resourceLabel.he} עודכן בהצלחה.`;
    }

    return `${resourceLabel.he} נוסף בהצלחה.`;
  }

  if (lang === 'en') {
    if (method === 'DELETE') {
      return 'Deleted successfully.';
    }

    if (method === 'PUT' || method === 'PATCH') {
      return 'Changes saved successfully.';
    }

    return 'Operation completed successfully.';
  }

  if (method === 'DELETE') {
    return 'הפריט נמחק בהצלחה.';
  }

  if (method === 'PUT' || method === 'PATCH') {
    return 'השינויים נשמרו בהצלחה.';
  }

  return 'הפעולה הושלמה בהצלחה.';
}

export function buildSafeErrorMessage(status: number, serverMessage?: string, explicitMessage?: string, isSessionExpiry?: boolean): string {
  if (explicitMessage && explicitMessage.trim()) {
    return explicitMessage;
  }

  if (status === 400 || status === 422) {
    const lang = getCurrentLanguage();
    const translatedServerMessage = serverMessage ? translateApiErrorMessage(serverMessage, lang) : undefined;
    return translatedServerMessage || (lang === 'en' ? 'Missing or invalid input.' : 'יש נתונים חסרים או לא תקינים.');
  }

  if (status === 401) {
    if (isSessionExpiry) {
      return getCurrentLanguage() === 'en' ? 'Your session expired. Please sign in again.' : 'פג תוקף ההתחברות. התחבר מחדש כדי להמשיך.';
    }
    const lang = getCurrentLanguage();
    const translatedServerMessage = serverMessage ? translateApiErrorMessage(serverMessage, lang) : undefined;
    return translatedServerMessage || (lang === 'en' ? 'Invalid email or password.' : 'האימייל או הסיסמה שגויים.');
  }

  if (status === 403) {
    return getCurrentLanguage() === 'en' ? 'You do not have permission to perform this action.' : 'אין לך הרשאה לבצע פעולה זו.';
  }

  if (status === 404) {
    const lang = getCurrentLanguage();
    const translatedServerMessage = serverMessage ? translateApiErrorMessage(serverMessage, lang) : undefined;
    return translatedServerMessage || (lang === 'en' ? 'Requested resource was not found.' : 'המידע המבוקש לא נמצא.');
  }

  if (status >= 500) {
    return getCurrentLanguage() === 'en'
      ? 'We could not complete the request right now. Please try again.'
      : 'לא הצלחנו להשלים את הבקשה כרגע. נסה שוב.';
  }

  const lang = getCurrentLanguage();
  const translatedServerMessage = serverMessage ? translateApiErrorMessage(serverMessage, lang) : undefined;
  return translatedServerMessage || (lang === 'en' ? 'Operation failed. Please try again.' : 'הפעולה נכשלה. נסה שוב.');
}

export function buildNetworkErrorMessage(explicitMessage?: string): string {
  if (explicitMessage && explicitMessage.trim()) {
    return explicitMessage;
  }

  return getCurrentLanguage() === 'en'
    ? 'No connection to server. Please check your network and try again.'
    : 'אין חיבור לשרת. בדוק את הרשת ונסה שוב.';
}