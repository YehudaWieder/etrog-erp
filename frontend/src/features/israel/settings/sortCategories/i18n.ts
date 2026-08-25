import { ISRAEL_SORT_CATEGORIES_I18N_EN } from './i18n.en';
import { ISRAEL_SORT_CATEGORIES_I18N_HE } from './i18n.he';

export type IsraelSortCategoriesI18n = {
  loading: string;
  empty: string;
  categoryId: string;
  addTitle: string;
  addMessage: string;
  editTitle: string;
  editMessage: (name: string) => string;
  categoryNameLabel: string;
  categoryNamePlaceholder: string;
  notesLabel: string;
  notesPlaceholder: string;
  addFailed: string;
  emptyName: string;
  editFailed: string;
  deleteFailed: string;
  deleteTitle: string;
  deleteMessage: (name: string) => string;
  deleteFallback: string;
  deleteConfirm: string;
  cancel: string;
  save: string;
  saving: string;
  supportedGradesLabel: string;
  gradeGroupsLabel: string;
  addGroupLabel: string;
  removeGroupLabel: string;
  groupNamePlaceholder: string;
  priorityLabel: string;
  dragHandleLabel: string;
  customGradesLabel: string;
  customGradePlaceholder: string;
  addCustomGradeLabel: string;
  removeCustomGradeLabel: string;
  emptyCustomGradeError: string;
  duplicateCustomGradeError: string;
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
