import type { Lang, SettingsI18n } from './settingsPage.types';
import { SETTINGS_I18N_EN } from './i18n.en';
import { SETTINGS_I18N_HE } from './i18n.he';

export const SETTINGS_I18N: Record<Lang, SettingsI18n> = {
  he: SETTINGS_I18N_HE,
  en: SETTINGS_I18N_EN,
};

const MANAGER_ROLES = new Set(['manager', 'owner', 'admin']);

export function getSettingsI18n(lang: Lang): SettingsI18n {
  return SETTINGS_I18N[lang];
}

export function isManagerRole(role: string | undefined): boolean {
  return MANAGER_ROLES.has((role || '').trim().toLowerCase());
}

export function getSettingsHeaderActionText(lang: Lang): {
  activate: string;
  remove: string;
  edit: string;
  add: string;
} {
  return {
    activate: lang === 'he' ? 'הגדר כפעילה' : 'Set Active',
    remove: lang === 'he' ? 'מחיקה' : 'Delete',
    edit: lang === 'he' ? 'עריכה' : 'Edit',
    add: lang === 'he' ? 'חדש' : 'New',
  };
}
