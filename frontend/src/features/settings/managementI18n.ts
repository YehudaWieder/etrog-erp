import { getPreferredLanguage } from '../../utils/locale';

export type AppLang = 'he' | 'en';

export function resolveAppLang(): AppLang {
  return getPreferredLanguage('he').toLowerCase().startsWith('en') ? 'en' : 'he';
}

type ManagementI18n = {
  seasons: {
    addFailed: string;
    deleteFailed: string;
    newSeasonPlaceholder: (minYear: number, maxYear: number) => string;
    addSeason: string;
    loading: string;
    yearRangeError: (minYear: number, maxYear: number) => string;
    empty: string;
    seasonId: string;
    active: string;
    inactive: string;
    activeSeasonSectionTitle: string;
    inactiveSeasonsSectionTitle: string;
    activeSeasonDeleteBlocked: string;
    deleteTitle: string;
    deleteMessage: (yearName: number) => string;
    deleteFallback: string;
    deleteConfirm: string;
    cancel: string;
  };
  fields: {
    addFailed: string;
    emptyName: string;
    editFailed: string;
    deleteFailed: string;
    newFieldPlaceholder: string;
    addField: string;
    loading: string;
    empty: string;
    fieldId: string;
    deleteTitle: string;
    deleteMessage: (name: string) => string;
    deleteFallback: string;
    deleteConfirm: string;
    cancel: string;
    editTitle: string;
    editMessage: (name: string) => string;
    editFallback: string;
    editFieldPlaceholder: string;
    save: string;
  };
  traders: {
    paymentRequired: string;
    addFailed: string;
    emptyName: string;
    invalidPercent: string;
    editFailed: string;
    deleteFailed: string;
    newTraderPlaceholder: string;
    paymentPlaceholder: string;
    addTrader: string;
    loading: string;
    empty: string;
    traderId: string;
    paymentPercentLabel: string;
    deleteTitle: string;
    deleteMessage: (name: string) => string;
    deleteFallback: string;
    deleteConfirm: string;
    cancel: string;
    editTitle: string;
    editMessage: (name: string) => string;
    editFallback: string;
    traderPlaceholder: string;
    save: string;
  };
  traderCategories: {
    seasonFilterLabel: string;
    traderFilterLabel: string;
    activeSeasonBadge: string;
    allTradersOption: string;
    noActiveSeason: string;
    noSeasonSelected: string;
    addTitle: string;
    editTitle: string;
    addMessage: string;
    editMessage: (name: string) => string;
    categoryNameLabel: string;
    categoryNamePlaceholder: string;
    notesLabel: string;
    notesPlaceholder: string;
    allocationSectionTitle: string;
    categoryId: string;
    sharesDetailsTitle: string;
    selectTraderOption: string;
    percentPlaceholder: (index: number) => string;
    addRow: string;
    removeRow: string;
    totalPercentLabel: string;
    totalMustBeHundred: string;
    loading: string;
    noTraders: string;
    loadFailed: string;
    addFailed: string;
    editFailed: string;
    deleteFailed: string;
    emptyName: string;
    atLeastOneShare: string;
    selectTrader: string;
    uniqueTraders: string;
    invalidPercent: string;
    empty: string;
    deleteTitle: string;
    deleteMessage: (name: string) => string;
    deleteFallback: string;
    deleteConfirm: string;
    cancel: string;
    save: string;
  };
  customers: {
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
  customerCategories: {
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
    priceLabel: string;
    pricePlaceholder: string;
    currencyLabel: string;
    save: string;
  };
  defaultTraderCategories: {
    addTitle: string;
    editTitle: string;
    addMessage: string;
    editMessage: (name: string) => string;
    categoryNameLabel: string;
    categoryNamePlaceholder: string;
    notesLabel: string;
    notesPlaceholder: string;
    allocationSectionTitle: string;
    categoryId: string;
    sharesDetailsTitle: string;
    selectTraderOption: string;
    percentPlaceholder: (index: number) => string;
    addRow: string;
    removeRow: string;
    totalPercentLabel: string;
    totalMustBeHundred: string;
    createCategory: string;
    deleteCategory: string;
    loading: string;
    noTraders: string;
    loadFailed: string;
    addFailed: string;
    deleteFailed: string;
    emptyName: string;
    atLeastOneShare: string;
    selectTrader: string;
    uniqueTraders: string;
    invalidPercent: string;
    empty: string;
    sharesCount: (count: number) => string;
    deleteTitle: string;
    deleteMessage: (name: string) => string;
    deleteFallback: string;
    deleteConfirm: string;
    cancel: string;
    editFailed: string;
    save: string;
  };
};

const MANAGEMENT_I18N: Record<AppLang, ManagementI18n> = {
  he: {
    seasons: {
      addFailed: 'הוספת העונה נכשלה.',
      deleteFailed: 'לא ניתן למחוק את העונה שנבחרה.',
      newSeasonPlaceholder: (minYear, maxYear) => `שנת עונה חדשה (${minYear}-${maxYear})`,
      addSeason: 'הוסף עונה',
      loading: 'טוען עונות...',
      yearRangeError: (minYear, maxYear) => `ניתן להוסיף שנה רק בין ${minYear} ל-${maxYear}.`,
      empty: 'אין עונות להצגה כרגע.',
      seasonId: 'מזהה עונה',
      active: 'פעיל',
      inactive: 'לא פעיל',
      activeSeasonSectionTitle: 'עונה פעילה',
      inactiveSeasonsSectionTitle: 'עונות לא פעילות',
      activeSeasonDeleteBlocked: 'לא ניתן למחוק עונה פעילה. יש להפעיל קודם עונה אחרת.',
      deleteTitle: 'מחיקת עונה',
      deleteMessage: (yearName) => `האם למחוק את עונת ${yearName}? פעולה זו לא ניתנת לשחזור.`,
      deleteFallback: 'האם למחוק את העונה שנבחרה?',
      deleteConfirm: 'מחק',
      cancel: 'ביטול',
    },
    fields: {
      addFailed: 'הוספת השדה נכשלה.',
      emptyName: 'שם השדה לא יכול להיות ריק.',
      editFailed: 'עדכון השדה נכשל.',
      deleteFailed: 'לא ניתן למחוק את השדה שנבחר.',
      newFieldPlaceholder: 'שם שדה חדש',
      addField: 'הוסף שדה',
      loading: 'טוען שדות...',
      empty: 'אין שדות להצגה כרגע.',
      fieldId: 'מזהה שדה',
      deleteTitle: 'מחיקת שדה',
      deleteMessage: (name) => `האם למחוק את השדה ${name}? פעולה זו לא ניתנת לשחזור.`,
      deleteFallback: 'האם למחוק את השדה שנבחר?',
      deleteConfirm: 'מחק',
      cancel: 'ביטול',
      editTitle: 'עריכת שדה',
      editMessage: (name) => `עדכון שם השדה ${name}`,
      editFallback: 'עדכון שם שדה נבחר',
      editFieldPlaceholder: 'שם שדה',
      save: 'שמור',
    },
    traders: {
      paymentRequired: 'אחוז התשלום הוא שדה חובה.',
      addFailed: 'הוספת הסוחר נכשלה.',
      emptyName: 'שם הסוחר לא יכול להיות ריק.',
      invalidPercent: 'אחוז התשלום חייב להיות בין 0 ל-100.',
      editFailed: 'עדכון הסוחר נכשל.',
      deleteFailed: 'לא ניתן למחוק את הסוחר שנבחר.',
      newTraderPlaceholder: 'שם סוחר חדש',
      paymentPlaceholder: 'אחוז תשלום בהוצאות',
      addTrader: 'הוסף סוחר',
      loading: 'טוען סוחרים...',
      empty: 'אין סוחרים להצגה כרגע.',
      traderId: 'מזהה סוחר',
      paymentPercentLabel: 'אחוז תשלום',
      deleteTitle: 'מחיקת סוחר',
      deleteMessage: (name) => `האם למחוק את הסוחר ${name}? פעולה זו לא ניתנת לשחזור.`,
      deleteFallback: 'האם למחוק את הסוחר שנבחר?',
      deleteConfirm: 'מחק',
      cancel: 'ביטול',
      editTitle: 'עריכת סוחר',
      editMessage: (name) => `עדכון פרטי הסוחר ${name}`,
      editFallback: 'עדכון פרטי סוחר נבחר',
      traderPlaceholder: 'שם סוחר',
      save: 'שמור',
    },
    traderCategories: {
      seasonFilterLabel: 'סינון לפי עונה',
      traderFilterLabel: 'סינון לפי סוחר',
      activeSeasonBadge: 'פעילה',
      allTradersOption: 'כל הסוחרים',
      noActiveSeason: 'אין עונה פעילה כרגע',
      noSeasonSelected: 'יש לבחור עונה כדי לנהל קטגוריות סוחרים.',
      addTitle: 'הוספת קטגוריית סוחרים',
      editTitle: 'עריכת קטגוריית סוחרים',
      addMessage: 'צור קטגוריה עונתית עם חלוקת אחוזים בין סוחרים. סכום השורות חייב להיות 100%.',
      editMessage: (name) => `עדכון קטגוריית הסוחרים ${name}`,
      categoryNameLabel: 'שם קטגוריה',
      categoryNamePlaceholder: 'שם קטגוריה (לדוגמה: חזו"א)',
      notesLabel: 'הערות',
      notesPlaceholder: 'הערות (לא חובה)',
      allocationSectionTitle: 'פירוט חלוקת הקטגוריה באחוזים',
      categoryId: 'מזהה קטגוריה',
      sharesDetailsTitle: 'פירוט חלוקה',
      selectTraderOption: 'בחר סוחר',
      percentPlaceholder: (_index) => 'אחוז מהקטגוריה',
      addRow: 'הוסף שורה',
      removeRow: 'הסר שורה',
      totalPercentLabel: 'סה"כ אחוזים',
      totalMustBeHundred: 'סך האחוזים חייב להיות בדיוק 100%.',
      loading: 'טוען קטגוריות סוחרים...',
      noTraders: 'לא נמצאו סוחרים. יש להוסיף סוחר לפני יצירת קטגוריה.',
      loadFailed: 'טעינת קטגוריות הסוחרים נכשלה.',
      addFailed: 'יצירת קטגוריית הסוחרים נכשלה.',
      editFailed: 'עדכון קטגוריית הסוחרים נכשל.',
      deleteFailed: 'מחיקת קטגוריית הסוחרים נכשלה.',
      emptyName: 'שם הקטגוריה לא יכול להיות ריק.',
      atLeastOneShare: 'יש להוסיף לפחות שורת חלוקה אחת.',
      selectTrader: 'יש לבחור סוחר בכל השורות.',
      uniqueTraders: 'לא ניתן לבחור אותו סוחר יותר מפעם אחת.',
      invalidPercent: 'האחוז בכל שורה חייב להיות גדול מ-0 ועד 100.',
      empty: 'אין קטגוריות סוחרים להצגה בעונה הנבחרת.',
      deleteTitle: 'מחיקת קטגוריית סוחרים',
      deleteMessage: (name) => `האם למחוק את קטגוריית הסוחרים ${name}?`,
      deleteFallback: 'האם למחוק את קטגוריית הסוחרים שנבחרה?',
      deleteConfirm: 'מחק',
      cancel: 'ביטול',
      save: 'שמור',
    },
    customers: {
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
    customerCategories: {
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
      priceLabel: 'מחיר',
      pricePlaceholder: 'הזן מחיר',
      currencyLabel: 'מטבע',
      save: 'שמור',
    },
    defaultTraderCategories: {
      addTitle: 'הוספת קטגוריית סוחרים ברירת מחדל',
      editTitle: 'עריכת קטגוריית סוחרים ברירת מחדל',
      addMessage: 'צור קטגוריה עם חלוקת אחוזים בין סוחרים. סכום כל השורות חייב להיות 100%.',
      editMessage: (name) => `עדכון קטגוריית ברירת המחדל ${name}`,
      categoryNameLabel: 'שם קטגוריה',
      categoryNamePlaceholder: 'שם קטגוריה (לדוגמה: יאנעווע)',
      notesLabel: 'הערות',
      notesPlaceholder: 'הערות (לא חובה)',
      allocationSectionTitle: 'פירוט חלוקת הקטגוריה באחוזים',
      categoryId: 'מזהה קטגוריה',
      sharesDetailsTitle: 'פירוט חלוקה',
      selectTraderOption: 'בחר סוחר',
      percentPlaceholder: (_index) => 'אחוז מהקטגוריה',
      addRow: 'הוסף שורה',
      removeRow: 'הסר שורה',
      totalPercentLabel: 'סה"כ אחוזים',
      totalMustBeHundred: 'סך האחוזים חייב להיות בדיוק 100%.',
      createCategory: 'צור קטגוריה',
      deleteCategory: 'מחק קטגוריה נבחרת',
      loading: 'טוען קטגוריות ברירת מחדל...',
      noTraders: 'לא נמצאו סוחרים. יש להוסיף סוחר לפני יצירת קטגוריה.',
      loadFailed: 'טעינת קטגוריות ברירת המחדל נכשלה.',
      addFailed: 'יצירת הקטגוריה נכשלה.',
      editFailed: 'עדכון הקטגוריה נכשל.',
      deleteFailed: 'מחיקת הקטגוריה נכשלה.',
      emptyName: 'שם הקטגוריה לא יכול להיות ריק.',
      atLeastOneShare: 'יש להוסיף לפחות שורת חלוקה אחת.',
      selectTrader: 'יש לבחור סוחר בכל השורות.',
      uniqueTraders: 'לא ניתן לבחור אותו סוחר יותר מפעם אחת.',
      invalidPercent: 'האחוז בכל שורה חייב להיות גדול מ-0 ועד 100.',
      empty: 'אין קטגוריות סוחרים ברירת מחדל להצגה כרגע.',
      sharesCount: (count) => `${count} שורות חלוקה`,
      deleteTitle: 'מחיקת קטגוריית ברירת מחדל',
      deleteMessage: (name) => `האם למחוק את קטגוריית ברירת המחדל ${name}?`,
      deleteFallback: 'האם למחוק את קטגוריית ברירת המחדל שנבחרה?',
      deleteConfirm: 'מחק',
      cancel: 'ביטול',
      save: 'שמור',
    },
  },
  en: {
    seasons: {
      addFailed: 'Failed to add season.',
      deleteFailed: 'Unable to delete the selected season.',
      newSeasonPlaceholder: (minYear, maxYear) => `New season year (${minYear}-${maxYear})`,
      addSeason: 'Add season',
      loading: 'Loading seasons...',
      yearRangeError: (minYear, maxYear) => `Year must be between ${minYear} and ${maxYear}.`,
      empty: 'No seasons to display yet.',
      seasonId: 'Season ID',
      active: 'Active',
      inactive: 'Inactive',
      activeSeasonSectionTitle: 'Active Season',
      inactiveSeasonsSectionTitle: 'Inactive Seasons',
      activeSeasonDeleteBlocked: 'Cannot delete the active season. Activate a different season first.',
      deleteTitle: 'Delete season',
      deleteMessage: (yearName) => `Delete season ${yearName}? This action cannot be undone.`,
      deleteFallback: 'Delete the selected season?',
      deleteConfirm: 'Delete',
      cancel: 'Cancel',
    },
    fields: {
      addFailed: 'Failed to add field.',
      emptyName: 'Field name cannot be empty.',
      editFailed: 'Failed to update field.',
      deleteFailed: 'Unable to delete the selected field.',
      newFieldPlaceholder: 'New field name',
      addField: 'Add field',
      loading: 'Loading fields...',
      empty: 'No fields to display yet.',
      fieldId: 'Field ID',
      deleteTitle: 'Delete field',
      deleteMessage: (name) => `Delete field ${name}? This action cannot be undone.`,
      deleteFallback: 'Delete the selected field?',
      deleteConfirm: 'Delete',
      cancel: 'Cancel',
      editTitle: 'Edit field',
      editMessage: (name) => `Update field name ${name}`,
      editFallback: 'Update selected field name',
      editFieldPlaceholder: 'Field name',
      save: 'Save',
    },
    traders: {
      paymentRequired: 'Payment percent is required.',
      addFailed: 'Failed to add trader.',
      emptyName: 'Trader name cannot be empty.',
      invalidPercent: 'Payment percent must be between 0 and 100.',
      editFailed: 'Failed to update trader.',
      deleteFailed: 'Unable to delete the selected trader.',
      newTraderPlaceholder: 'New trader name',
      paymentPlaceholder: 'Expense payment percent',
      addTrader: 'Add trader',
      loading: 'Loading traders...',
      empty: 'No traders to display yet.',
      traderId: 'Trader ID',
      paymentPercentLabel: 'Payment percent',
      deleteTitle: 'Delete trader',
      deleteMessage: (name) => `Delete trader ${name}? This action cannot be undone.`,
      deleteFallback: 'Delete the selected trader?',
      deleteConfirm: 'Delete',
      cancel: 'Cancel',
      editTitle: 'Edit trader',
      editMessage: (name) => `Update trader details for ${name}`,
      editFallback: 'Update selected trader details',
      traderPlaceholder: 'Trader name',
      save: 'Save',
    },
    traderCategories: {
      seasonFilterLabel: 'Filter by season',
      traderFilterLabel: 'Filter by trader',
      activeSeasonBadge: 'Active',
      allTradersOption: 'All traders',
      noActiveSeason: 'No active season right now',
      noSeasonSelected: 'Select a season to manage trader categories.',
      addTitle: 'Add trader category',
      editTitle: 'Edit trader category',
      addMessage: 'Create a seasonal category with trader allocation rows. Total of all rows must be 100%.',
      editMessage: (name) => `Update trader category ${name}`,
      categoryNameLabel: 'Category name',
      categoryNamePlaceholder: 'Category name (for example: Chazon Ish)',
      notesLabel: 'Notes',
      notesPlaceholder: 'Notes (optional)',
      allocationSectionTitle: 'Category allocation breakdown (%)',
      categoryId: 'Category ID',
      sharesDetailsTitle: 'Distribution details',
      selectTraderOption: 'Select trader',
      percentPlaceholder: (index) => `Row ${index} percent`,
      addRow: 'Add row',
      removeRow: 'Remove row',
      totalPercentLabel: 'Total percent',
      totalMustBeHundred: 'Total percent must be exactly 100%.',
      loading: 'Loading trader categories...',
      noTraders: 'No traders found. Add at least one trader before creating a category.',
      loadFailed: 'Failed to load trader categories.',
      addFailed: 'Failed to create trader category.',
      editFailed: 'Failed to update trader category.',
      deleteFailed: 'Failed to delete trader category.',
      emptyName: 'Category name cannot be empty.',
      atLeastOneShare: 'At least one share row is required.',
      selectTrader: 'Please select a trader in each row.',
      uniqueTraders: 'Each trader can appear only once in the category.',
      invalidPercent: 'Each share percent must be greater than 0 and up to 100.',
      empty: 'No trader categories to display for the selected season.',
      deleteTitle: 'Delete trader category',
      deleteMessage: (name) => `Delete trader category ${name}?`,
      deleteFallback: 'Delete the selected trader category?',
      deleteConfirm: 'Delete',
      cancel: 'Cancel',
      save: 'Save',
    },
    customers: {
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
    customerCategories: {
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
      priceLabel: 'Price',
      pricePlaceholder: 'Enter price',
      currencyLabel: 'Currency',
      save: 'Save',
    },
    defaultTraderCategories: {
      addTitle: 'Add default trader category',
      editTitle: 'Edit default trader category',
      addMessage: 'Create a category with trader allocation rows. Total of all rows must be 100%.',
      editMessage: (name) => `Update default category ${name}`,
      categoryNameLabel: 'Category name',
      categoryNamePlaceholder: 'Category name (for example: Yanover)',
      notesLabel: 'Notes',
      notesPlaceholder: 'Notes (optional)',
      allocationSectionTitle: 'Category allocation breakdown (%)',
      categoryId: 'Category ID',
      sharesDetailsTitle: 'Distribution details',
      selectTraderOption: 'Select trader',
      percentPlaceholder: (index) => `Row ${index} percent`,
      addRow: 'Add row',
      removeRow: 'Remove row',
      totalPercentLabel: 'Total percent',
      totalMustBeHundred: 'Total percent must be exactly 100%.',
      createCategory: 'Create category',
      deleteCategory: 'Delete selected category',
      loading: 'Loading default trader categories...',
      noTraders: 'No traders found. Add at least one trader before creating a category.',
      loadFailed: 'Failed to load default trader categories.',
      addFailed: 'Failed to create default trader category.',
      editFailed: 'Failed to update default trader category.',
      deleteFailed: 'Failed to delete default trader category.',
      emptyName: 'Category name cannot be empty.',
      atLeastOneShare: 'At least one share row is required.',
      selectTrader: 'Please select a trader in each row.',
      uniqueTraders: 'Each trader can appear only once in the category.',
      invalidPercent: 'Each share percent must be greater than 0 and up to 100.',
      empty: 'No default trader categories to display yet.',
      sharesCount: (count) => `${count} share rows`,
      deleteTitle: 'Delete default trader category',
      deleteMessage: (name) => `Delete default category ${name}?`,
      deleteFallback: 'Delete the selected default category?',
      deleteConfirm: 'Delete',
      cancel: 'Cancel',
      save: 'Save',
    },
  },
};

export function getManagementI18n(lang: AppLang): ManagementI18n {
  return MANAGEMENT_I18N[lang];
}