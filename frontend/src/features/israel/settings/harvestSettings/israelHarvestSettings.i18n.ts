export type IsraelHarvestSettingsChildId =
  | 'harvestSellersFields'
  | 'harvestSellerCategories'
  | 'harvestSortingCategories';

export const ISRAEL_HARVEST_SETTINGS_PATH_SEGMENTS = [
  '/sellers-fields',
  '/seller-categories',
  '/sorting-categories',
];

export function getIsraelHarvestSettingsChildId(
  pathname: string,
): IsraelHarvestSettingsChildId {
  const path = pathname.toLowerCase();

  if (path.includes('/seller-categories')) return 'harvestSellerCategories';
  if (path.includes('/sorting-categories')) return 'harvestSortingCategories';

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
  },
  en: {
    harvestSellersFields: 'Sellers/Fields',
    harvestSellerCategories: 'Seller Categories',
    harvestSortingCategories: 'Sorting Categories',
  },
};

export function getIsraelHarvestSettingsTitle(
  lang: 'he' | 'en',
  childId: IsraelHarvestSettingsChildId,
): string {
  return TITLES[lang][childId];
}
