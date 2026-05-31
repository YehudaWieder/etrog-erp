import { getPreferredLanguage } from '../../utils/locale';

type AppLang = 'he' | 'en';

type CustomersI18n = {
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
};

type CustomerCategoriesI18n = {
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
};

const CUSTOMERS_I18N: Record<AppLang, CustomersI18n> = {
  he: {
    emptyName: 'שם הלקוח לא יכול להיות ריק.',
    invalidEmail: 'כתובת אימייל לא תקינה.',
    invalidPhone: 'מספר טלפון לא תקין. יש להזין בין 7 ל-15 ספרות (אפשר עם + בתחילה).',
    addFailed: 'הוספת הלקוח נכשלה.',
    editFailed: 'עדכון הלקוח נכשל.',
    deleteFailed: 'לא ניתן למחוק את הלקוח שנבחר.',
    newCustomerPlaceholder: 'שם לקוח חדש',
    optionalEmailPlaceholder: 'אימייל (לא חובה)',
    optionalPhonePlaceholder: 'טלפון (לא חובה)',
    addCustomer: 'הוסף לקוח',
    loading: 'טוען לקוחות...',
    empty: 'אין לקוחות להצגה כרגע.',
    customerId: 'מזהה לקוח',
    email: 'אימייל',
    phone: 'טלפון',
    deleteTitle: 'מחיקת לקוח',
    deleteMessage: (name) => `האם למחוק את הלקוח ${name}? פעולה זו לא ניתנת לשחזור.`,
    deleteFallback: 'האם למחוק את הלקוח שנבחר?',
    deleteConfirm: 'מחק',
    cancel: 'ביטול',
    editTitle: 'עריכת לקוח',
    editMessage: (name) => `עדכון פרטי הלקוח ${name}`,
    editFallback: 'עדכון פרטי לקוח נבחר',
    customerPlaceholder: 'שם לקוח',
    save: 'שמור',
  },
  en: {
    emptyName: 'Customer name cannot be empty.',
    invalidEmail: 'Invalid email address.',
    invalidPhone: 'Invalid phone number. Enter 7 to 15 digits (optional + at start).',
    addFailed: 'Failed to add customer.',
    editFailed: 'Failed to update customer.',
    deleteFailed: 'Unable to delete the selected customer.',
    newCustomerPlaceholder: 'New customer name',
    optionalEmailPlaceholder: 'Email (optional)',
    optionalPhonePlaceholder: 'Phone (optional)',
    addCustomer: 'Add customer',
    loading: 'Loading customers...',
    empty: 'No customers to display yet.',
    customerId: 'Customer ID',
    email: 'Email',
    phone: 'Phone',
    deleteTitle: 'Delete customer',
    deleteMessage: (name) => `Delete customer ${name}? This action cannot be undone.`,
    deleteFallback: 'Delete the selected customer?',
    deleteConfirm: 'Delete',
    cancel: 'Cancel',
    editTitle: 'Edit customer',
    editMessage: (name) => `Update customer details for ${name}`,
    editFallback: 'Update selected customer details',
    customerPlaceholder: 'Customer name',
    save: 'Save',
  },
};

const CUSTOMER_CATEGORIES_I18N: Record<AppLang, CustomerCategoriesI18n> = {
  he: {
    activeSeason: (yearName) => `עונה פעילה: ${yearName}`,
    activeSeasonBadge: 'פעילה',
    noActiveSeason: 'אין עונה פעילה כרגע',
    loading: 'טוען קטגוריות לקוחות...',
    seasonFilterLabel: 'סינון לפי עונה',
    customerFilterLabel: 'סינון לפי לקוח',
    allCustomersOption: 'כל הלקוחות',
    noActiveSeasonForAdd: 'לא נמצאה עונה פעילה. יש להגדיר עונה פעילה לפני הוספת קטגוריות.',
    noCustomers: 'אין לקוחות במערכת. יש להוסיף לקוח לפני הגדרת קטגוריה.',
    selectCustomer: 'יש לבחור לקוח.',
    selectGrade: 'יש לבחור דרגה.',
    selectCurrency: 'יש לבחור מטבע.',
    emptyName: 'שם הקטגוריה לא יכול להיות ריק.',
    invalidPrice: 'המחיר חייב להיות מספר חוקי גדול או שווה ל-0.',
    addFailed: 'הוספת קטגוריית הלקוח נכשלה.',
    editFailed: 'עדכון קטגוריית הלקוח נכשל.',
    deleteFailed: 'לא ניתן למחוק את קטגוריית הלקוח שנבחרה.',
    empty: 'לא נמצאה עונה פעילה. הגדר עונה פעילה ואז הוסף קטגוריות לקוחות.',
    categoryForSeasonEmpty: 'אין קטגוריות לקוחות להצגה בעונה הפעילה.',
    customer: 'לקוח',
    grade: 'דרגה',
    price: 'מחיר',
    categoryId: 'מזהה קטגוריה',
    deleteTitle: 'מחיקת קטגוריית לקוח',
    deleteMessage: (name, grade, customerName) => `האם למחוק את הקטגוריה ${name} (דרגה ${grade}) עבור הלקוח ${customerName}?`,
    deleteFallback: 'האם למחוק את קטגוריית הלקוח שנבחרה?',
    deleteConfirm: 'מחק',
    cancel: 'ביטול',
    addTitle: 'הוספת קטגוריית לקוח',
    editTitle: 'עריכת קטגוריית לקוח',
    addMessage: 'הזן את פרטי הקטגוריה לעונה הפעילה.',
    editMessage: (name) => `עדכון פרטי הקטגוריה ${name}`,
    customerLabel: 'לקוח',
    categoryNameLabel: 'שם קטגוריה',
    categoryNamePlaceholder: 'לדוגמה: מהדרין',
    gradeLabel: 'דרגה',
    gradePlaceholder: 'לדוגמה: א, א+, פרימיום',
    priceLabel: 'מחיר',
    pricePlaceholder: 'הזן מחיר',
    currencyLabel: 'מטבע',
    save: 'שמור',
  },
  en: {
    activeSeason: (yearName) => `Active season: ${yearName}`,
    activeSeasonBadge: 'Active',
    noActiveSeason: 'No active season right now',
    loading: 'Loading customer categories...',
    seasonFilterLabel: 'Filter by season',
    customerFilterLabel: 'Filter by customer',
    allCustomersOption: 'All customers',
    noActiveSeasonForAdd: 'No active season found. Set an active season before adding categories.',
    noCustomers: 'No customers found. Add a customer before creating a category.',
    selectCustomer: 'Please select a customer.',
    selectGrade: 'Please select a grade.',
    selectCurrency: 'Please select a currency.',
    emptyName: 'Category name cannot be empty.',
    invalidPrice: 'Price must be a valid number greater than or equal to 0.',
    addFailed: 'Failed to add customer category.',
    editFailed: 'Failed to update customer category.',
    deleteFailed: 'Unable to delete the selected customer category.',
    empty: 'No active season found. Set an active season and then add customer categories.',
    categoryForSeasonEmpty: 'No customer categories to display for the active season.',
    customer: 'Customer',
    grade: 'Grade',
    price: 'Price',
    categoryId: 'Category ID',
    deleteTitle: 'Delete customer category',
    deleteMessage: (name, grade, customerName) => `Delete category ${name} (grade ${grade}) for customer ${customerName}?`,
    deleteFallback: 'Delete the selected customer category?',
    deleteConfirm: 'Delete',
    cancel: 'Cancel',
    addTitle: 'Add customer category',
    editTitle: 'Edit customer category',
    addMessage: 'Enter category details for the active season.',
    editMessage: (name) => `Update category details for ${name}`,
    customerLabel: 'Customer',
    categoryNameLabel: 'Category name',
    categoryNamePlaceholder: 'For example: Mehadrin',
    gradeLabel: 'Grade',
    gradePlaceholder: 'For example: A, A+, Premium',
    priceLabel: 'Price',
    pricePlaceholder: 'Enter price',
    currencyLabel: 'Currency',
    save: 'Save',
  },
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
