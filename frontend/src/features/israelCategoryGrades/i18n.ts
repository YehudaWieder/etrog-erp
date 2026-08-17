import { ISRAEL_CATEGORY_GRADES_I18N_EN } from './i18n.en';
import { ISRAEL_CATEGORY_GRADES_I18N_HE } from './i18n.he';

export type IsraelCategoryGradesI18n = {
  loading: string;
  empty: string;
  noActiveSeason: string;
  categoryLabel: string;
  selectCategory: string;
  gradesLabel: string;
  gradeLinePrefix: string;
  gradeKeyPlaceholder: string;
  gradeValuePlaceholder: string;
  addRow: string;
  removeRow: string;
  addTitle: string;
  addMessage: string;
  editTitle: string;
  editMessage: (name: string) => string;
  addFailed: string;
  editFailed: string;
  deleteFailed: string;
  invalidCategory: string;
  invalidGrades: string;
  deleteTitle: string;
  deleteMessage: (name: string) => string;
  deleteFallback: string;
  deleteConfirm: string;
  cancel: string;
  save: string;
  saving: string;
};

const ISRAEL_CATEGORY_GRADES_I18N: Record<
  'he' | 'en',
  IsraelCategoryGradesI18n
> = {
  he: ISRAEL_CATEGORY_GRADES_I18N_HE,
  en: ISRAEL_CATEGORY_GRADES_I18N_EN,
};

export function getIsraelCategoryGradesI18n(lang: 'he' | 'en') {
  return ISRAEL_CATEGORY_GRADES_I18N[lang];
}
