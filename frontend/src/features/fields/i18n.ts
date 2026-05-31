import { getPreferredLanguage } from '../../utils/locale';

type AppLang = 'he' | 'en';

type FieldsI18n = {
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
};

const FIELDS_I18N: Record<AppLang, FieldsI18n> = {
  he: {
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
  },
  en: {
    addFailed: 'Failed to add field.',
    emptyName: 'Field name cannot be empty.',
    editFailed: 'Failed to update field.',
    deleteFailed: 'Unable to delete the selected field.',
    newFieldPlaceholder: 'New field name',
    addField: 'Add field',
    loading: 'Loading fields...',
    empty: 'No fields to display yet.',
    fieldId: 'Field ID',
    deleteTitle: 'Delete field',
    deleteMessage: (name) => `Delete field ${name}? This action cannot be undone.`,
    deleteFallback: 'Delete the selected field?',
    deleteConfirm: 'Delete',
    cancel: 'Cancel',
    editTitle: 'Edit field',
    editMessage: (name) => `Update field name ${name}`,
    editFallback: 'Update selected field name',
    editFieldPlaceholder: 'Field name',
    save: 'Save',
  },
};

function resolveAppLang(): AppLang {
  return getPreferredLanguage('he').toLowerCase().startsWith('en') ? 'en' : 'he';
}

export function getFieldsI18n() {
  return FIELDS_I18N[resolveAppLang()];
}
