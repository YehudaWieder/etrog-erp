import { ISRAEL_CARTON_CAPACITY_I18N_EN } from './i18n.en';
import { ISRAEL_CARTON_CAPACITY_I18N_HE } from './i18n.he';

export type IsraelCartonCapacityI18n = {
  loading: string;
  loadError: string;
  cardTitle: string;
  unitsLabel: string;
  editTitle: string;
  cartonCapacityLabel: string;
  cartonCapacityPlaceholder: string;
  invalidValue: string;
  cancel: string;
  save: string;
  saving: string;
  saved: string;
  saveError: string;
};

const ISRAEL_CARTON_CAPACITY_I18N: Record<'he' | 'en', IsraelCartonCapacityI18n> = {
  he: ISRAEL_CARTON_CAPACITY_I18N_HE,
  en: ISRAEL_CARTON_CAPACITY_I18N_EN,
};

export function getIsraelCartonCapacityI18n(lang: 'he' | 'en') {
  return ISRAEL_CARTON_CAPACITY_I18N[lang];
}
