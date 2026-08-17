import type { IsraelFieldCategoriesI18n } from './i18n';

export const ISRAEL_FIELD_CATEGORIES_I18N_HE: IsraelFieldCategoriesI18n = {
  loading: 'טוען קטגוריות מוכר...',
  empty: 'אין קטגוריות מוכר להצגה בעונה הפעילה.',
  noActiveSeason:
    'אין עונה פעילה. יש להגדיר עונה פעילה כדי לנהל קטגוריות מוכר.',
  fieldLabel: 'מוכר/שדה',
  selectField: 'בחר מוכר/שדה',
  nameLabel: 'שם קטגוריה',
  namePlaceholder: 'שם קטגוריה',
  priceLabel: 'מחיר',
  pricePlaceholder: 'מחיר',
  currencyLabel: 'מטבע',
  selectCurrency: 'בחר מטבע',
  addTitle: 'קטגוריית מוכר חדשה',
  addMessage: 'הוספת קטגוריית מוכר לעונה הפעילה',
  editTitle: 'עריכת קטגוריית מוכר',
  editMessage: (name) => `עדכון קטגוריית "${name}"`,
  addFailed: 'הוספת הקטגוריה נכשלה.',
  editFailed: 'עדכון הקטגוריה נכשל.',
  deleteFailed: 'לא ניתן למחוק את הקטגוריה שנבחרה.',
  invalidName: 'שם הקטגוריה לא יכול להיות ריק.',
  invalidPrice: 'יש להזין מחיר תקין.',
  deleteTitle: 'מחיקת קטגוריית מוכר',
  deleteMessage: (name) =>
    `האם למחוק את הקטגוריה "${name}"? פעולה זו לא ניתנת לשחזור.`,
  deleteFallback: 'האם למחוק את הקטגוריה שנבחרה?',
  deleteConfirm: 'מחק',
  cancel: 'ביטול',
  save: 'שמור',
  saving: 'שומר...',
};
