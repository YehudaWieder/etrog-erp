export type IsraelHarvestSettingsChildId =
  | 'harvestSellersFields'
  | 'harvestSellerCategories'
  | 'harvestSortingCategories'
  | 'harvestCategoryGrades';

export const ISRAEL_HARVEST_SETTINGS_PATH_SEGMENTS = [
  '/sellers-fields',
  '/seller-categories',
  '/sorting-categories',
  '/grades',
];

export function getIsraelHarvestSettingsChildId(pathname: string): IsraelHarvestSettingsChildId {
  const path = pathname.toLowerCase();

  if (path.includes('/seller-categories')) return 'harvestSellerCategories';
  if (path.includes('/sorting-categories')) return 'harvestSortingCategories';
  if (path.includes('/grades')) return 'harvestCategoryGrades';

  return 'harvestSellersFields';
}

const TITLES: Record<'he' | 'en', Record<IsraelHarvestSettingsChildId, string>> = {
  he: {
    harvestSellersFields: 'מוכרים/שדות',
    harvestSellerCategories: 'קטגוריות מוכר',
    harvestSortingCategories: 'קטגוריות מיון',
    harvestCategoryGrades: 'דרגות לקטגוריות',
  },
  en: {
    harvestSellersFields: 'Sellers/Fields',
    harvestSellerCategories: 'Seller Categories',
    harvestSortingCategories: 'Sorting Categories',
    harvestCategoryGrades: 'Category Grades',
  },
};

export function getIsraelHarvestSettingsTitle(lang: 'he' | 'en', childId: IsraelHarvestSettingsChildId): string {
  return TITLES[lang][childId];
}
