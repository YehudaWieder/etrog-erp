type Lang = 'he' | 'en';

export type AppI18n = {
  sessionExpiryTitle: string;
  sessionExpiryMessage: string;
  sessionExpiryExtend: string;
  sessionExpiryExtending: string;
  sessionExpiryDismiss: string;
};

import { APP_I18N_EN } from './i18n.en';
import { APP_I18N_HE } from './i18n.he';

export const APP_I18N: Record<Lang, AppI18n> = {
  he: APP_I18N_HE,
  en: APP_I18N_EN,
};
