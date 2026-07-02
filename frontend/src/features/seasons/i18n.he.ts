import type { SeasonsI18n } from './i18n';

export const SEASONS_I18N_HE: SeasonsI18n = {
  addFailed: 'הוספת העונה נכשלה.',
  deleteFailed: 'לא ניתן למחוק את העונה שנבחרה.',
  newSeasonPlaceholder: (minYear, maxYear) => `שנת עונה חדשה (${minYear}-${maxYear})`,
  addSeason: 'הוסף עונה',
  adding: 'מוסיף...',
  loading: 'טוען עונות...',
  yearRangeError: (minYear, maxYear) => `ניתן להוסיף שנה רק בין ${minYear} ל-${maxYear}.`,
  empty: 'אין עונות להצגה כרגע.',
  seasonId: 'מזהה עונה',
  active: 'פעיל',
  inactive: 'לא פעיל',
  activeSeasonSectionTitle: 'עונה פעילה',
  inactiveSeasonsSectionTitle: 'עונות לא פעילות',
  activeSeasonDeleteBlocked: 'לא ניתן למחוק עונה פעילה. יש להפעיל קודם עונה אחרת.',
  deleteTitle: 'מחיקת עונה',
  deleteMessage: (yearName) => `האם למחוק את עונת ${yearName}? פעולה זו לא ניתנת לשחזור.`,
  deleteFallback: 'האם למחוק את העונה שנבחרה?',
  deleteConfirm: 'מחק',
  cancel: 'ביטול',
};