import type { IsraelHarvestI18n } from './i18n';

export const ISRAEL_HARVEST_I18N_HE: IsraelHarvestI18n = {
  pageTitle: 'קטיף א"י',
  settings: 'הגדרות',
  sidebar: [
    {
      id: 'summaries',
      title: 'סיכום',
      href: '/harvest/harvest-summary',
      icon: 'fa-chart-bar',
      items: [
        {
          id: 'harvest-summary',
          label: 'סיכום קטיף (לפי שדות)',
          href: '/harvest/harvest-summary',
          icon: 'fa-lemon',
        },
        {
          id: 'sorting-summary',
          label: 'סיכום מיונים',
          href: '/harvest/sorting-summary',
          icon: 'fa-grip',
        },
      ],
    },
    {
      id: 'harvests',
      title: 'קטיפים',
      href: '/harvest/harvest-daily-details',
      icon: 'fa-lemon',
      items: [
        {
          id: 'harvest-daily-details',
          label: 'פירוט לפי ימים',
          href: '/harvest/harvest-daily-details',
          icon: 'fa-calendar',
        },
      ],
    },
    {
      id: 'sortings',
      title: 'מיונים',
      href: '/harvest/sorting-list',
      icon: 'fa-grip',
      items: [
        {
          id: 'sorting-list',
          label: 'רשימת מיונים',
          href: '/harvest/sorting-list',
          icon: 'fa-list',
        },
      ],
    },
  ],
  pageControls: {
    addHarvest: 'הוסף קטיף',
    addSorting: 'הוסף מיון',
  },
  sortingForm: {
    ariaLabel: 'טופס מיון',
    closeLabel: 'סגירה',
    title: 'הוספת מיון',
    instructions: 'בטופס זה יוצרים רשומת מיון עבור קטיף קיים.',
    harvestLabel: 'קטיף מקושר',
    harvestPlaceholder: 'בחר קטיף',
    dateGregorianLabel: 'תאריך לועזי',
    dateHebrewLabel: 'תאריך עברי',
    quantityLabel: 'סה"כ נקטף',
    classifiedTotalLabel: 'סה"כ מוין',
    remainingLabel: 'נותר למיון',
    selectHarvestHint: 'יש לבחור קטיף כדי להמשיך.',
    loadingExistingClassifications: 'טוען מיונים קיימים...',
    alreadyFullySortedMessage: 'הקטיף הזה כבר מוין במלואו.',
    harvestRequiredError: 'יש לבחור את הקטיף שאליו המיון שייך.',
    save: 'שמירת מיון',
    saving: 'שומר...',
    saveFailedError: 'שמירת המיון נכשלה. נסה שוב.',
  },
  harvestForm: {
    ariaLabel: 'טופס קטיף',
    closeLabel: 'סגירה',
    title: 'הוספת קטיף ומיון',
    instructions:
      'בטופס זה מזינים נתוני קטיף, וניתן להוסיף גם שורות מיון לפי הצורך.',
    fieldLabel: 'שדה',
    fieldPlaceholder: 'בחר שדה',
    gregorianDateLabel: 'תאריך לועזי',
    hebrewDateLabel: 'תאריך עברי',
    quantityLabel: 'כמות',
    quantityPlaceholder: 'כמות',
    notesLabel: 'הערות',
    notesPlaceholder: 'הערות קטיף',
    classificationModeLabel: 'סוג מיון',
    classificationModeHint:
      'בחר סוג מיון: מיון מלא אם כל הכמות שנקטפה מוינה ומעודכנת בטופס הזה, או מיון חלקי לפי נתונים זמינים.',
    fullSorting: 'מיון מלא',
    partialSorting: 'מיון חלקי',
    sortingRowsTitle: 'שורות מיון',
    addSortingRow: 'הוספת שורת מיון',
    removeSortingRow: 'מחיקה',
    sortingRowPrefix: (index) => `מיון ${index + 1}`,
    fieldCategoryLabel: 'קטגוריית מוכר',
    fieldCategoryPlaceholder: 'בחר קטגוריית מוכר',
    categoryLabel: 'קטגוריית מיון',
    categoryPlaceholder: 'בחר קטגוריה',
    pitamStatusLabel: 'פיטם',
    pitamOptions: {
      withPitam: 'פיטם',
      withoutPitam: 'בל"פ',
      mixed: 'מעורב',
    },
    quantityMatrixQuantityHeader: 'כמות',
    selectFieldCategoryFirstHint: 'יש לבחור קטגוריית מוכר תחילה.',
    selectCategoryForQuantitiesHint:
      'יש לבחור קטגוריית מיון כדי למלא כמויות לפי דרגה.',
    sortingNotesLabel: 'הערות מיון',
    sortingNotesPlaceholder: 'הערות מיון',
    sortingTotalQuantityLabel: 'סך הכל כמות מיון',
    fullSortingRequiredHint: (requiredTotal) =>
      `למיון מלא נדרשת כמות של ${requiredTotal}.`,
    fullSortingReduceHint: (amount) =>
      `מילאת יותר מהנדרש - יש להוריד ${amount}.`,
    fullSortingIncreaseHint: (amount) =>
      `מילאת פחות מהנדרש - יש להוסיף ${amount}.`,
    fullSortingMatchHint: 'הכמות שמולאה תואמת למיון מלא.',
    duplicateSortingRowError: 'קטגוריה זו כבר נבחרה בשורת מיון קודמת.',
    addSortingRowBlockedError:
      'יש למלא את שורת המיון האחרונה לפני הוספת שורה חדשה.',
    cancel: 'ביטול',
    save: 'שמירת קטיף',
    saving: 'שומר...',
    fieldRequiredError: 'יש לבחור שדה.',
    gregorianDateRequiredError: 'יש להזין תאריך לועזי תקין.',
    quantityRequiredError: 'יש להזין כמות גדולה מאפס.',
    sortingTotalMustMatchAvailableForFullSorting: (requiredTotal) =>
      `במיון מלא סכום כמויות המיון חייב להיות בדיוק ${requiredTotal}. ניתן לעבור למיון חלקי ולשמור.`,
    sortingTotalMustBeLessForPartialSorting: (requiredTotal) =>
      `במיון חלקי סכום כמויות המיון חייב להיות קטן מ-${requiredTotal}.`,
    saveFailedError: 'שמירת הקטיף נכשלה. נסה שוב.',
    sortingSaveFailedError:
      'הקטיף נשמר, אך שמירת חלק מהמיונים נכשלה. ניתן להוסיף אותם דרך "הוסף מיון".',
  },
  fieldReport: {
    description: 'ריכוז כל רשומות הקטיף לפי שדות, לעונה הנבחרת.',
    loading: 'טוען נתוני קטיף...',
    loadError: 'לא ניתן היה לטעון את נתוני הקטיף כעת.',
    empty: 'לא נמצאו רשומות קטיף להצגה לעונה הנבחרת.',
    tableActionsLabel: 'פעולות טבלה',
    printTitle: 'הדפסה',
    printAriaLabel: 'הדפסת דוח השדות',
    exportTitle: 'ייצוא לאקסל',
    exportAriaLabel: 'ייצוא דוח השדות לאקסל',
    exportError: 'לא ניתן לייצא כרגע לאקסל.',
    printWindowTitle: 'דוח קטיפים לפי שדה',
    sheetName: 'דוח שדות',
    seasonFilterLabel: 'סינון לפי עונה',
    summary: {
      totalQuantity: 'סה"כ קטיף',
      totalRecordCount: 'סה"כ קטיפים',
      totalFields: 'סה"כ שדות',
      avgQuantityPerHarvest: 'ממוצע לקטיף',
    },
    columns: {
      fieldName: 'שדה',
      recordCount: 'קטיפים',
      totalQuantity: 'סה"כ קטיף',
      avgQuantityPerHarvest: 'ממוצע לקטיף',
    },
  },
  emptyState: {
    'harvest-summary': {
      title: 'סיכום קטיף יוצג כאן',
      description: 'כאן יוצג סיכום כלל הקטיפים לפי שדות לעונה הנבחרת.',
    },
    'sorting-summary': {
      title: 'סיכום מיונים יוצג כאן',
      description: 'כאן יוצג סיכום כלל המיונים לפי קטגוריות ועונות.',
    },
    'harvest-daily-details': {
      title: 'פירוט קטיפים לפי ימים יוצג כאן',
      description: 'כאן יוצגו נתוני הקטיף היומיים לעונה הנבחרת.',
    },
    'sorting-list': {
      title: 'רשימת מיונים תוצג כאן',
      description: 'כאן תוצג רשימה מלאה של כל רשומות המיון לעונה הנבחרת.',
    },
    default: {
      title: 'אין נתונים להצגה',
      description: 'בחר פריט מהסרגל הצידי כדי לצפות במידע רלוונטי.',
    },
  },
};
