import type { IsraelCategoryGradesI18n } from './i18n';

export const ISRAEL_CATEGORY_GRADES_I18N_HE: IsraelCategoryGradesI18n = {
  loading: 'טוען דרגות לקטגוריות...',
  empty: 'אין דרגות מוגדרות לקטגוריות בעונה הפעילה.',
  noActiveSeason:
    'אין עונה פעילה. יש להגדיר עונה פעילה כדי לנהל דרגות לקטגוריות.',
  categoryLabel: 'קטגוריית מיון',
  selectCategory: 'בחר קטגוריית מיון',
  gradesLabel: 'דרגות',
  gradeLinePrefix: 'דרגה',
  gradeKeyPlaceholder: 'דרגה, לדוגמה: א',
  gradeValuePlaceholder: 'דרגה לתצוגה, לדוגמה: ש',
  addRow: 'הוסף דרגה',
  removeRow: 'הסר',
  addTitle: 'דרגות חדשות לקטגוריה',
  addMessage: 'הגדרת דרגות לקטגוריית מיון בעונה הפעילה',
  editTitle: 'עריכת דרגות לקטגוריה',
  editMessage: (name) => `עדכון דרגות עבור "${name}"`,
  addFailed: 'שמירת הדרגות נכשלה.',
  editFailed: 'עדכון הדרגות נכשל.',
  deleteFailed: 'לא ניתן למחוק את הדרגות שנבחרו.',
  invalidCategory: 'יש לבחור קטגוריית מיון.',
  invalidGrades: 'יש להזין לפחות דרגה אחת תקינה, ללא מפתחות כפולים.',
  deleteTitle: 'מחיקת דרגות לקטגוריה',
  deleteMessage: (name) =>
    `האם למחוק את הדרגות של "${name}"? פעולה זו לא ניתנת לשחזור.`,
  deleteFallback: 'האם למחוק את הדרגות שנבחרו?',
  deleteConfirm: 'מחק',
  cancel: 'ביטול',
  save: 'שמור',
  saving: 'שומר...',
};
