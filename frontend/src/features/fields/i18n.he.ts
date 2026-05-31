import type { FieldsI18n } from './i18n';

export const FIELDS_I18N_HE: FieldsI18n = {
  addFailed: 'הוספת השדה נכשלה.',
  emptyName: 'שם השדה לא יכול להיות ריק.',
  editFailed: 'עדכון השדה נכשל.',
  deleteFailed: 'לא ניתן למחוק את השדה שנבחר.',
  newFieldPlaceholder: 'שם שדה חדש',
  addField: 'הוסף שדה',
  loading: 'טוען שדות...',
  empty: 'אין שדות להצגה כרגע.',
  fieldId: 'מזהה שדה',
  deleteTitle: 'מחיקת שדה',
  deleteMessage: (name) => `האם למחוק את השדה ${name}? פעולה זו לא ניתנת לשחזור.`,
  deleteFallback: 'האם למחוק את השדה שנבחר?',
  deleteConfirm: 'מחק',
  cancel: 'ביטול',
  editTitle: 'עריכת שדה',
  editMessage: (name) => `עדכון שם השדה ${name}`,
  editFallback: 'עדכון שם שדה נבחר',
  editFieldPlaceholder: 'שם שדה',
  save: 'שמור',
};