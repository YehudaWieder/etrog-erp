import { getPreferredLanguage } from '../../utils/locale';
import { SEASONS_I18N_EN } from './i18n.en';
import { SEASONS_I18N_HE } from './i18n.he';

export type AppLang = 'he' | 'en';

export type SeasonsI18n = {
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
  he: SEASONS_I18N_HE,
  en: SEASONS_I18N_EN,
};

function resolveAppLang(): AppLang {
  return getPreferredLanguage('he').toLowerCase().startsWith('en') ? 'en' : 'he';
}

export function getSeasonsI18n() {
  return SEASONS_I18N[resolveAppLang()];
}
