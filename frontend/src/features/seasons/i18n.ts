import { getPreferredLanguage } from '../../utils/locale';

type AppLang = 'he' | 'en';

type SeasonsI18n = {
  addFailed: string;
  deleteFailed: string;
  newSeasonPlaceholder: (minYear: number, maxYear: number) => string;
  addSeason: string;
  loading: string;
  yearRangeError: (minYear: number, maxYear: number) => string;
  empty: string;
  seasonId: string;
  active: string;
  inactive: string;
  activeSeasonSectionTitle: string;
  inactiveSeasonsSectionTitle: string;
  activeSeasonDeleteBlocked: string;
  deleteTitle: string;
  deleteMessage: (yearName: number) => string;
  deleteFallback: string;
  deleteConfirm: string;
  cancel: string;
};

const SEASONS_I18N: Record<AppLang, SeasonsI18n> = {
  he: {
    addFailed: 'הוספת העונה נכשלה.',
    deleteFailed: 'לא ניתן למחוק את העונה שנבחרה.',
    newSeasonPlaceholder: (minYear, maxYear) => `שנת עונה חדשה (${minYear}-${maxYear})`,
    addSeason: 'הוסף עונה',
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
  },
  en: {
    addFailed: 'Failed to add season.',
    deleteFailed: 'Unable to delete the selected season.',
    newSeasonPlaceholder: (minYear, maxYear) => `New season year (${minYear}-${maxYear})`,
    addSeason: 'Add season',
    loading: 'Loading seasons...',
    yearRangeError: (minYear, maxYear) => `Year must be between ${minYear} and ${maxYear}.`,
    empty: 'No seasons to display yet.',
    seasonId: 'Season ID',
    active: 'Active',
    inactive: 'Inactive',
    activeSeasonSectionTitle: 'Active Season',
    inactiveSeasonsSectionTitle: 'Inactive Seasons',
    activeSeasonDeleteBlocked: 'Cannot delete the active season. Activate a different season first.',
    deleteTitle: 'Delete season',
    deleteMessage: (yearName) => `Delete season ${yearName}? This action cannot be undone.`,
    deleteFallback: 'Delete the selected season?',
    deleteConfirm: 'Delete',
    cancel: 'Cancel',
  },
};

function resolveAppLang(): AppLang {
  return getPreferredLanguage('he').toLowerCase().startsWith('en') ? 'en' : 'he';
}

export function getSeasonsI18n() {
  return SEASONS_I18N[resolveAppLang()];
}

export type { SeasonsI18n };
