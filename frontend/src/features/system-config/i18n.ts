import type { Lang } from '../settings/settingsPage.types';
import { SYSTEM_CONFIG_I18N_EN } from './i18n.en';
import { SYSTEM_CONFIG_I18N_HE } from './i18n.he';

const SYSTEM_CONFIG_I18N = { he: SYSTEM_CONFIG_I18N_HE, en: SYSTEM_CONFIG_I18N_EN };

export function getSystemConfigI18n(lang: Lang) {
  return SYSTEM_CONFIG_I18N[lang];
}
