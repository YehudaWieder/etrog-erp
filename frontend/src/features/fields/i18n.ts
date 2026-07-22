import { getPreferredLanguage } from '../../utils/locale';
import { FIELDS_I18N_EN } from './i18n.en';
import { FIELDS_I18N_HE } from './i18n.he';

export type AppLang = 'he' | 'en';

export type FieldsI18n = {
  addFailed: string;
  emptyName: string;
  editFailed: string;
  deleteFailed: string;
  newFieldPlaceholder: string;
  addField: string;
  loading: string;
  empty: string;
  fieldId: string;
  deleteTitle: string;
  deleteMessage: (name: string) => string;
  deleteFallback: string;
  deleteConfirm: string;
  cancel: string;
  editTitle: string;
  editMessage: (name: string) => string;
  editFallback: string;
  editFieldPlaceholder: string;
  save: string;
  updating: string;
  adding: string;
};

const FIELDS_I18N: Record<AppLang, FieldsI18n> = {
  he: FIELDS_I18N_HE,
  en: FIELDS_I18N_EN,
};

function resolveAppLang(): AppLang {
  return getPreferredLanguage('he').toLowerCase().startsWith('en') ? 'en' : 'he';
}

export function getFieldsI18n() {
  return FIELDS_I18N[resolveAppLang()];
}
