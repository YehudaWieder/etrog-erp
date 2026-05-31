import { getManagementI18n, resolveAppLang } from '../settings/managementI18n';

export function getSeasonsI18n() {
  return getManagementI18n(resolveAppLang()).seasons;
}

export type SeasonsI18n = ReturnType<typeof getSeasonsI18n>;
