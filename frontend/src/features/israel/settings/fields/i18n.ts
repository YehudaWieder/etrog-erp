import { ISRAEL_FIELDS_I18N_EN } from './i18n.en';
import { ISRAEL_FIELDS_I18N_HE } from './i18n.he';

export type IsraelFieldsI18n = {
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

const ISRAEL_FIELDS_I18N: Record<'he' | 'en', IsraelFieldsI18n> = {
  he: ISRAEL_FIELDS_I18N_HE,
  en: ISRAEL_FIELDS_I18N_EN,
};

export function getIsraelFieldsI18n(lang: 'he' | 'en') {
  return ISRAEL_FIELDS_I18N[lang];
}
