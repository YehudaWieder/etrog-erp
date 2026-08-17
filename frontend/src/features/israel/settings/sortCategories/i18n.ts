import { ISRAEL_SORT_CATEGORIES_I18N_EN } from './i18n.en';
import { ISRAEL_SORT_CATEGORIES_I18N_HE } from './i18n.he';

export type IsraelSortCategoriesI18n = {
  addFailed: string;
  emptyName: string;
  editFailed: string;
  deleteFailed: string;
  newCategoryPlaceholder: string;
  addCategory: string;
  loading: string;
  empty: string;
  categoryId: string;
  deleteTitle: string;
  deleteMessage: (name: string) => string;
  deleteFallback: string;
  deleteConfirm: string;
  cancel: string;
  editTitle: string;
  editMessage: (name: string) => string;
  editFallback: string;
  editCategoryPlaceholder: string;
  save: string;
  updating: string;
  adding: string;
};

const ISRAEL_SORT_CATEGORIES_I18N: Record<
  'he' | 'en',
  IsraelSortCategoriesI18n
> = {
  he: ISRAEL_SORT_CATEGORIES_I18N_HE,
  en: ISRAEL_SORT_CATEGORIES_I18N_EN,
};

export function getIsraelSortCategoriesI18n(lang: 'he' | 'en') {
  return ISRAEL_SORT_CATEGORIES_I18N[lang];
}
