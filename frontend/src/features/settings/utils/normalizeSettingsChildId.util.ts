import type { SettingsChildKey } from '../settingsPage.types';

export function normalizeSettingsChildId(pathname: string, isManager: boolean): SettingsChildKey {
  const path = pathname.toLowerCase();

  if (path.includes('/site/theme-color')) return 'themeColor';
  if (path.includes('/site/language')) return 'language';
  if (path.includes('/system/seasons')) return isManager ? 'seasons' : 'language';
  if (path.includes('/system/fields')) return isManager ? 'fields' : 'language';
  if (path.includes('/system/cartons')) return isManager ? 'cartons' : 'language';
  if (path.includes('/system/pricing')) return isManager ? 'pricing' : 'language';
  if (path.includes('/system/default-categories')) return isManager ? 'defaultTraderCategories' : 'language';
  if (path.includes('/traders/categories')) return isManager ? 'traderCategories' : 'language';
  if (path.includes('/traders/pricing')) return isManager ? 'traderPricing' : 'language';
  if (path.includes('/traders')) return isManager ? 'traders' : 'language';
  if (path.includes('/customers/categories')) return isManager ? 'customerCategories' : 'language';
  if (path.includes('/customers')) return isManager ? 'customers' : 'language';

  return 'language';
}