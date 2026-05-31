import { getManagementI18n, resolveAppLang } from '../settings/managementI18n';

export function getFieldsI18n() {
  return getManagementI18n(resolveAppLang()).fields;
}
