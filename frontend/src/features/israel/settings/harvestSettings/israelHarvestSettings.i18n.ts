export type IsraelHarvestSettingsChildId =
  | 'harvestSellersFields'
  | 'harvestSellerCategories'
  | 'harvestSortingCategories'
  | 'harvestCartonCapacity';

export const ISRAEL_HARVEST_SETTINGS_PATH_SEGMENTS = [
  '/sellers-fields',
  '/seller-categories',
  '/sorting-categories',
  '/carton-capacity',
];

export function getIsraelHarvestSettingsChildId(
  pathname: string,
): IsraelHarvestSettingsChildId {
  const path = pathname.toLowerCase();

  if (path.includes('/seller-categories')) return 'harvestSellerCategories';
  if (path.includes('/sorting-categories')) return 'harvestSortingCategories';
  if (path.includes('/carton-capacity')) return 'harvestCartonCapacity';

  return 'harvestSellersFields';
}

const TITLES: Record<
  'he' | 'en',
  Record<IsraelHarvestSettingsChildId, string>
> = {
  he: {
    harvestSellersFields: 'מוכרים/שדות',
    harvestSellerCategories: 'קטגוריות מוכר',
    harvestSortingCategories: 'קטגוריות מיון',
    harvestCartonCapacity: 'קיבולת קרטון',
  },
  en: {
    harvestSellersFields: 'Sellers/Fields',
    harvestSellerCategories: 'Seller Categories',
    harvestSortingCategories: 'Sorting Categories',
    harvestCartonCapacity: 'Carton Capacity',
  },
};

const DESCRIPTIONS: Record<
  'he' | 'en',
  Record<IsraelHarvestSettingsChildId, string>
> = {
  he: {
    harvestSellersFields: 'נהל את רשימת המוכרים/שדות במערכת, כולל הוספה, עריכה ומחיקה.',
    harvestSellerCategories: 'הגדר וארגן קטגוריות מחיר לכל מוכר/שדה עבור העונה הפעילה.',
    harvestSortingCategories: 'הגדר קטגוריות מיון ודרגות איכות תואמות עבור סיווג היבול.',
    harvestCartonCapacity: 'הגדר את קיבולת הקרטון (כללי, לא תלוי עונה).',
  },
  en: {
    harvestSellersFields: 'Manage the list of sellers/fields in the system, including adding, editing, and deleting.',
    harvestSellerCategories: 'Define and organize price categories per seller/field for the active season.',
    harvestSortingCategories: 'Define sorting categories and matching quality grades for harvest classification.',
    harvestCartonCapacity: 'Set the carton capacity (general setting, not season-specific).',
  },
};

export function getIsraelHarvestSettingsTitle(
  lang: 'he' | 'en',
  childId: IsraelHarvestSettingsChildId,
): string {
  return TITLES[lang][childId];
}

export function getIsraelHarvestSettingsDescription(
  lang: 'he' | 'en',
  childId: IsraelHarvestSettingsChildId,
): string {
  return DESCRIPTIONS[lang][childId];
}
