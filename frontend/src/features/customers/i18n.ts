import { getManagementI18n, resolveAppLang } from '../settings/managementI18n';

export function getCustomersI18n() {
  return getManagementI18n(resolveAppLang()).customers;
}

export function getCustomerCategoriesI18n() {
  return getManagementI18n(resolveAppLang()).customerCategories;
}
