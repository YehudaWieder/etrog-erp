import { getPreferredLanguage } from '../../utils/locale';
import { CUSTOMER_CATEGORIES_I18N_EN, CUSTOMERS_I18N_EN } from './i18n.en';
import { CUSTOMER_CATEGORIES_I18N_HE, CUSTOMERS_I18N_HE } from './i18n.he';

export type AppLang = 'he' | 'en';

export type CustomersI18n = {
  emptyName: string;
  invalidEmail: string;
  invalidPhone: string;
  addFailed: string;
  editFailed: string;
  deleteFailed: string;
  newCustomerPlaceholder: string;
  optionalEmailPlaceholder: string;
  optionalPhonePlaceholder: string;
  addCustomer: string;
  loading: string;
  empty: string;
  customerId: string;
  email: string;
  phone: string;
  deleteTitle: string;
  deleteMessage: (name: string) => string;
  deleteFallback: string;
  deleteConfirm: string;
  cancel: string;
  editTitle: string;
  editMessage: (name: string) => string;
  editFallback: string;
  customerPlaceholder: string;
  save: string;
  saving: string;
  adding: string;
};

export type CustomerCategoriesI18n = {
  activeSeason: (yearName: number) => string;
  activeSeasonBadge: string;
  noActiveSeason: string;
  loading: string;
  seasonFilterLabel: string;
  customerFilterLabel: string;
  allCustomersOption: string;
  noActiveSeasonForAdd: string;
  noCustomers: string;
  selectCustomer: string;
  selectGrade: string;
  selectCurrency: string;
  emptyName: string;
  invalidPrice: string;
  addFailed: string;
  editFailed: string;
  deleteFailed: string;
  empty: string;
  categoryForSeasonEmpty: string;
  customer: string;
  grade: string;
  price: string;
  categoryId: string;
  deleteTitle: string;
  deleteMessage: (name: string, grade: string, customerName: string) => string;
  deleteFallback: string;
  deleteConfirm: string;
  cancel: string;
  addTitle: string;
  editTitle: string;
  addMessage: string;
  editMessage: (name: string) => string;
  customerLabel: string;
  categoryNameLabel: string;
  categoryNamePlaceholder: string;
  gradeLabel: string;
  gradePlaceholder: string;
  priceLabel: string;
  pricePlaceholder: string;
  currencyLabel: string;
  save: string;
  saving: string;
};

const CUSTOMERS_I18N: Record<AppLang, CustomersI18n> = {
  he: CUSTOMERS_I18N_HE,
  en: CUSTOMERS_I18N_EN,
};

const CUSTOMER_CATEGORIES_I18N: Record<AppLang, CustomerCategoriesI18n> = {
  he: CUSTOMER_CATEGORIES_I18N_HE,
  en: CUSTOMER_CATEGORIES_I18N_EN,
};

function resolveAppLang(): AppLang {
  return getPreferredLanguage('he').toLowerCase().startsWith('en') ? 'en' : 'he';
}

export function getCustomersI18n() {
  return CUSTOMERS_I18N[resolveAppLang()];
}

export function getCustomerCategoriesI18n() {
  return CUSTOMER_CATEGORIES_I18N[resolveAppLang()];
}
