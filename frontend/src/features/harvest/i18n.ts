import type { NavItem, SidebarSection } from '../../types/navigation';

type EmptyStateContent = {
  title: string;
  description: string;
};

export type HarvestI18n = {
  topNav: NavItem[];
  sidebar: SidebarSection[];
  pageTitle: string;
  settings: string;
  dailyDetails: {
    description: string;
    loading: string;
    loadError: string;
    empty: string;
    activeSeason: (yearName: string) => string;
    filters: {
      seasonFilterLabel: string;
      fieldFilterLabel: string;
      activeSeasonBadge: string;
      noActiveSeason: string;
      allFieldsOption: string;
    };
    selection: {
      selectedCells: (count: number) => string;
      total: (value: string) => string;
      clear: string;
    };
    detailsPanel: {
      openDetails: string;
      title: string;
      empty: string;
      close: string;
      print: string;
      relatedSortings: {
        title: string;
        loading: string;
        empty: string;
        loadError: string;
        columns: {
          assignmentType: string;
          target: string;
          category: string;
            grade: string;
          pitamStatus: string;
          quantity: string;
          updatedBy: string;
            notes: string;
        };
        assignmentTypes: {
          general: string;
          trader: string;
          customer: string;
        };
        pitamValues: {
          withPitam: string;
          withoutPitam: string;
        };
      };
      fields: {
        id: string;
        season: string;
        harvestNumber: string;
        field: string;
        dateGregorian: string;
        dateHebrew: string;
        totalHarvested: string;
        totalRejected: string;
        totalAfterRejected: string;
        ownerHarvested: string;
        ownerRejected: string;
        ownerAfterRejected: string;
        classifiedTotal: string;
        rejectionRate: string;
        ownerRejectionRate: string;
        classificationStatus: string;
        updatedBy: string;
        updatedAt: string;
        notes: string;
      };
      values: {
        partial: string;
        final: string;
        none: string;
        statusPrefix: string;
        rowType: string;
        generalRow: string;
        ownerRow: string;
        differenceRow: string;
      };
    };
    partial: string;
    final: string;
    columns: {
      dateGregorian: string;
      dateHebrew: string;
      fieldName: string;
      totalHarvested: string;
      totalRejected: string;
      netHarvest: string;
      classifiedTotal: string;
      mode: string;
      updatedBy: string;
      notes: string;
    };
  };
  sortingDailyDetails: {
    description: string;
    loading: string;
    loadError: string;
    empty: string;
    filters: {
      fieldFilterLabel: string;
      assignmentFilterLabel: string;
      allFieldsOption: string;
      assignmentOptions: {
        all: string;
        trader: string;
        customer: string;
        traderPrefix: string;
        customerPrefix: string;
      };
    };
    columns: {
      dateGregorian: string;
      dateHebrew: string;
      fieldName: string;
      categoriesGroup: string;
      totalSorted: string;
    };
  };
  emptyState: Record<string, EmptyStateContent>;
};

export const HARVEST_I18N: Record<'he' | 'en', HarvestI18n> = {
  he: {
    topNav: [
      { id: 'harvest', label: 'קטיף ומיון', icon: 'fa-leaf' },
      { id: 'shipments', label: 'משלוחים', icon: 'fa-truck' },
      { id: 'partners', label: 'סוחרים', icon: 'fa-handshake' },
      { id: 'customers', label: 'לקוחות', icon: 'fa-users' },
      { id: 'workers', label: 'עובדים', icon: 'fa-person' },
      { id: 'payments', label: 'הוצאות ותשלומים', icon: 'fa-money-bill' },
    ],
    sidebar: [
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
          {
            id: 'harvest-field-report',
            label: 'דוח קטיפים לפי שדה',
            href: '/harvest/harvest-field-report',
            icon: 'fa-bookmark',
          },
        ],
      },
      {
        id: 'sortings',
        title: 'מיונים',
        href: '/harvest/sorting-daily-details',
        icon: 'fa-grip',
        items: [
          {
            id: 'sorting-daily-details',
            label: 'פירוט לפי ימים',
            href: '/harvest/sorting-daily-details',
            icon: 'fa-calendar',
          },
        ],
      },
    ],
    pageTitle: 'קטיף ומיון',
    settings: 'הגדרות',
    dailyDetails: {
      description: 'ריכוז כל רשומות הקטיף לפי ימים, ישירות מנתוני המערכת לעונה הפעילה.',
      loading: 'טוען נתוני קטיף...',
      loadError: 'לא ניתן היה לטעון את נתוני הקטיף כעת.',
      empty: 'לא נמצאו רשומות קטיף להצגה לעונה הפעילה.',
      activeSeason: (yearName) => `עונה פעילה: ${yearName}`,
      filters: {
        seasonFilterLabel: 'סינון לפי עונה',
        fieldFilterLabel: 'סינון לפי שדה',
        activeSeasonBadge: 'פעילה',
        noActiveSeason: 'אין עונה פעילה כרגע',
        allFieldsOption: 'כל השדות',
      },
      selection: {
        selectedCells: (count) => `נבחרו ${count} משבצות`,
        total: (value) => `סה"כ: ${value}`,
        clear: 'נקה בחירה',
      },
      detailsPanel: {
        openDetails: 'הצגת פרטים מלאים',
        title: 'פרטי קטיף מלאים',
        empty: 'בחר רשומה כדי לצפות בכל פרטי הקטיף.',
        close: 'סגירת פרטי קטיף',
        print: 'הדפסה',
        relatedSortings: {
          title: 'מיונים לקטיף זה',
          loading: 'טוען מיונים קשורים...',
          empty: 'אין מיונים קשורים לקטיף זה.',
          loadError: 'לא ניתן לטעון את המיונים הקשורים כרגע.',
          columns: {
            assignmentType: 'סוג שיוך',
            target: 'שיוך',
            category: 'קטגוריה',
            grade: 'דרגה',
            pitamStatus: 'פיטם',
            quantity: 'כמות',
            updatedBy: 'עודכן על ידי',
            notes: 'הערות',
          },
          assignmentTypes: {
            general: 'כללי',
            trader: 'סוחר',
            customer: 'לקוח',
          },
          pitamValues: {
            withPitam: 'פיטם',
            withoutPitam: 'בל"פ',
          },
        },
        fields: {
          id: 'מזהה רשומה',
          season: 'עונה',
          harvestNumber: 'קטיף מספר',
          field: 'שדה',
          dateGregorian: 'תאריך לועזי',
          dateHebrew: 'תאריך עברי',
          totalHarvested: 'סה"כ קטיף',
          totalRejected: 'סה"כ יורדים',
          totalAfterRejected: 'סה"כ נטו',
          ownerHarvested: 'קטיף בעלים',
          ownerRejected: 'פסולי בעלים',
          ownerAfterRejected: 'נטו בעלים',
          classifiedTotal: 'סה"כ מוין',
          rejectionRate: 'אחוז פסילה',
          ownerRejectionRate: 'אחוז פסילת בעלים',
          classificationStatus: 'סטטוס מיון',
          updatedBy: 'עודכן על ידי',
          updatedAt: 'עודכן בתאריך',
          notes: 'הערות',
        },
        values: {
          partial: 'חלקי',
          final: 'סופי',
          none: '-',
          statusPrefix: 'מיון',
          rowType: 'שורה',
          generalRow: 'לשיטתנו',
          ownerRow: 'לשיטת פרנקו',
          differenceRow: 'סה"כ הפרש',
        },
      },
      partial: 'חלקי',
      final: 'סופי',
      columns: {
        dateGregorian: 'תאריך לועזי',
        dateHebrew: 'תאריך עברי',
        fieldName: 'שדה',
        totalHarvested: 'סה"כ קטיף',
        totalRejected: 'יורדים',
        netHarvest: 'נטו לאחר פסילה',
        classifiedTotal: 'סה"כ מוין',
        mode: 'מצב מיון',
        updatedBy: 'עודכן על ידי',
        notes: 'הערות',
      },
    },
    sortingDailyDetails: {
      description: 'ריכוז מיון יומי לפי תאריך קטיף ושדה. כל עמודת קטגוריה מוצגת רק אם קיימים בה מיונים מעל 0.',
      loading: 'טוען נתוני מיון יומיים...',
      loadError: 'טעינת נתוני המיון היומיים נכשלה.',
      empty: 'לא נמצאו נתוני מיון להצגה עבור העונה הנבחרת.',
      filters: {
        fieldFilterLabel: 'סינון לפי שדה',
        assignmentFilterLabel: 'סוג שיוך',
        allFieldsOption: 'כל השדות',
        assignmentOptions: {
          all: 'הכל',
          trader: 'סוחרים',
          customer: 'לקוחות',
          traderPrefix: 'סוחר:',
          customerPrefix: 'לקוח:',
        },
      },
      columns: {
        dateGregorian: 'תאריך קטיף לועזי',
        dateHebrew: 'תאריך קטיף עברי',
        fieldName: 'שדה',
        categoriesGroup: 'קטגוריות שמיינו',
        totalSorted: 'סה"כ',
      },
    },
    emptyState: {
      'harvest-daily-details': {
        title: 'פירוט קטיפים לפי ימים יוצג כאן',
        description: 'בחר טווח תאריכים כדי לצפות בנתוני הקטיף היומיים.',
      },
      'harvest-field-report': {
        title: 'דוח קטיפים לפי שדה יוצג כאן',
        description: 'כאן תוכל לראות פילוח ביצועי קטיף לפי שדות.',
      },
      'sorting-daily-details': {
        title: 'פירוט מיונים לפי ימים יוצג כאן',
        description: 'כאן יוצגו נתוני מיון יומיים לפי תאריך ותפוקה.',
      },
      default: {
        title: 'אין נתונים להצגה',
        description: 'בחר פריט מהסרגל הצידי כדי לצפות במידע רלוונטי.',
      },
    },
  },
  en: {
    topNav: [
      { id: 'harvest', label: 'Harvest & Sorting' },
      { id: 'shipments', label: 'Shipments' },
      { id: 'partners', label: 'Partners' },
      { id: 'customers', label: 'Customers' },
      { id: 'workers', label: 'Workers' },
      { id: 'payments', label: 'Expenses & Payments' },
    ],
    sidebar: [
      {
        id: 'harvests',
        title: 'Harvests',
        href: '/harvest/harvest-daily-details',
        icon: 'fa-lemon',
        items: [
          {
            id: 'harvest-daily-details',
            label: 'Daily Breakdown',
            href: '/harvest/harvest-daily-details',
            icon: 'fa-calendar',
          },
          {
            id: 'harvest-field-report',
            label: 'Harvest Report By Field',
            href: '/harvest/harvest-field-report',
            icon: 'fa-bookmark',
          },
        ],
      },
      {
        id: 'sortings',
        title: 'Sortings',
        href: '/harvest/sorting-daily-details',
        icon: 'fa-grip',
        items: [
          {
            id: 'sorting-daily-details',
            label: 'Daily Breakdown',
            href: '/harvest/sorting-daily-details',
            icon: 'fa-calendar',
          },
        ],
      },
    ],
    pageTitle: 'Harvest & Sorting',
    settings: 'Settings',
    dailyDetails: {
      description: 'Centralized daily harvest rows loaded directly from the active season data.',
      loading: 'Loading harvest data...',
      loadError: 'Failed to load harvest data right now.',
      empty: 'No harvest records found for the active season.',
      activeSeason: (yearName) => `Active season: ${yearName}`,
      filters: {
        seasonFilterLabel: 'Filter by season',
        fieldFilterLabel: 'Filter by field',
        activeSeasonBadge: 'Active',
        noActiveSeason: 'No active season right now',
        allFieldsOption: 'All fields',
      },
      selection: {
        selectedCells: (count) => `${count} cells selected`,
        total: (value) => `Total: ${value}`,
        clear: 'Clear selection',
      },
      detailsPanel: {
        openDetails: 'Show full details',
        title: 'Full Harvest Details',
        empty: 'Select a row to view full harvest details.',
        close: 'Close harvest details',
        print: 'Print',
        relatedSortings: {
          title: 'Related Sortings For This Harvest',
          loading: 'Loading related sortings...',
          empty: 'No related sortings for this harvest.',
          loadError: 'Unable to load related sortings right now.',
          columns: {
            assignmentType: 'Type',
            target: 'Assignment',
            category: 'Category',
            grade: 'Grade',
            pitamStatus: 'Pitam',
            quantity: 'Quantity',
            updatedBy: 'Updated By',
            notes: 'Notes',
          },
          assignmentTypes: {
            general: 'General',
            trader: 'Trader',
            customer: 'Customer',
          },
          pitamValues: {
            withPitam: 'פיטם',
            withoutPitam: 'בל"פ',
          },
        },
        fields: {
          id: 'Record ID',
          season: 'Season',
          harvestNumber: 'Harvest Number',
          field: 'Field',
          dateGregorian: 'Gregorian Date',
          dateHebrew: 'Hebrew Date',
          totalHarvested: 'Harvest',
          totalRejected: 'Rejected',
          totalAfterRejected: 'Net',
          ownerHarvested: 'Owner Harvested',
          ownerRejected: 'Owner Rejected',
          ownerAfterRejected: 'Owner Net',
          classifiedTotal: 'Classified',
          rejectionRate: 'Reject %',
          ownerRejectionRate: 'Owner Rejection Rate',
          classificationStatus: 'Classification Status',
          updatedBy: 'Updated By',
          updatedAt: 'Updated At',
          notes: 'Notes',
        },
        values: {
          partial: 'Partial',
          final: 'Final',
          none: '-',
          statusPrefix: 'Classification',
          rowType: 'Row',
          generalRow: 'General',
          ownerRow: 'Owner',
          differenceRow: 'Total Difference',
        },
      },
      partial: 'Partial',
      final: 'Final',
      columns: {
        dateGregorian: 'Gregorian Date',
        dateHebrew: 'Hebrew Date',
        fieldName: 'Field',
        totalHarvested: 'Total Harvested',
        totalRejected: 'Rejected',
        netHarvest: 'Net After Rejection',
        classifiedTotal: 'Classified Total',
        mode: 'Mode',
        updatedBy: 'Updated By',
        notes: 'Notes',
      },
    },
    sortingDailyDetails: {
      description: 'Daily sorting summary grouped by harvest date and field. Category columns are shown only when totals are above 0.',
      loading: 'Loading daily sorting data...',
      loadError: 'Failed to load daily sorting data right now.',
      empty: 'No sorting records found for the selected season.',
      filters: {
        fieldFilterLabel: 'Filter by field',
        assignmentFilterLabel: 'Assignment type',
        allFieldsOption: 'All fields',
        assignmentOptions: {
          all: 'All',
          trader: 'Traders',
          customer: 'Customers',
          traderPrefix: 'Trader:',
          customerPrefix: 'Customer:',
        },
      },
      columns: {
        dateGregorian: 'Harvest Gregorian Date',
        dateHebrew: 'Harvest Hebrew Date',
        fieldName: 'Field',
        categoriesGroup: 'Sorted Categories',
        totalSorted: 'Total',
      },
    },
    emptyState: {
      'harvest-daily-details': {
        title: 'Daily harvest breakdown will appear here',
        description: 'Select a date range to view daily harvest activity.',
      },
      'harvest-field-report': {
        title: 'Harvest report by field will appear here',
        description: 'Use this view to compare harvest performance across fields.',
      },
      'sorting-daily-details': {
        title: 'Daily sorting breakdown will appear here',
        description: 'Daily sorting output and status will be shown here.',
      },
      default: {
        title: 'No data to display',
        description: 'Select a sidebar item to view relevant information.',
      },
    },
  },
};
