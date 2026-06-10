import type { Lang } from '../settings/settingsPage.types';
import { PRICING_I18N_EN } from './i18n.pricing.en';
import { PRICING_I18N_HE } from './i18n.pricing.he';

const PRICING_I18N = { he: PRICING_I18N_HE, en: PRICING_I18N_EN };

export function getPricingI18n(lang: Lang) {
  return PRICING_I18N[lang];
}
