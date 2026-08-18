import { ISRAEL_FIELD_CATEGORIES_I18N_EN } from './i18n.en';
import { ISRAEL_FIELD_CATEGORIES_I18N_HE } from './i18n.he';

export type IsraelFieldCategoriesI18n = {
  loading: string;
  empty: string;
  noActiveSeason: string;
  fieldFilterLabel: string;
  allFieldsOption: string;
  fieldLabel: string;
  selectField: string;
  nameLabel: string;
  namePlaceholder: string;
  priceLabel: string;
  pricePlaceholder: string;
  currencyLabel: string;
  selectCurrency: string;
  addTitle: string;
  addMessage: string;
  editTitle: string;
  editMessage: (name: string) => string;
  addFailed: string;
  editFailed: string;
  deleteFailed: string;
  invalidName: string;
  invalidPrice: string;
  deleteTitle: string;
  deleteMessage: (name: string) => string;
  deleteFallback: string;
  deleteConfirm: string;
  cancel: string;
  save: string;
  saving: string;
};

const ISRAEL_FIELD_CATEGORIES_I18N: Record<
  'he' | 'en',
  IsraelFieldCategoriesI18n
> = {
  he: ISRAEL_FIELD_CATEGORIES_I18N_HE,
  en: ISRAEL_FIELD_CATEGORIES_I18N_EN,
};

export function getIsraelFieldCategoriesI18n(lang: 'he' | 'en') {
  return ISRAEL_FIELD_CATEGORIES_I18N[lang];
}
