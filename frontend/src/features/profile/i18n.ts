import type { SidebarSection, NavItem } from '../../types/navigation';

type EmptyStateContent = {
  title: string;
  description: string;
};

type ProfileI18n = {
  topNav: NavItem[];
  sidebar: SidebarSection[];
  pageTitle: string;
  settings: string;
  emptyState: Record<string, EmptyStateContent>;
  editProfile: {
    title: string;
    description: string;
    permissionsHint: string;
    cannotEditRoleStatus: string;
    fields: {
      name: string;
      email: string;
      phone: string;
      currentPassword: string;
      newPassword: string;
    };
    placeholders: {
      name: string;
      email: string;
      phone: string;
      currentPassword: string;
      newPassword: string;
    };
    actions: {
      update: string;
      deleting: string;
      delete: string;
      updating: string;
    };
    messages: {
      noChanges: string;
      updateSuccess: string;
      updateFailed: string;
      passwordNeedsCurrent: string;
      deleteConfirm: string;
      cannotDeleteWithDependencies: string;
      deleteFailed: string;
    };
  };
  profileCard: {
    title: string;
    description: string;
    personalSectionTitle: string;
    accountSectionTitle: string;
    systemSectionTitle: string;
    avatarFallback: string;
    loading: string;
    fallbackError: string;
    fields: {
      id: string;
      name: string;
      email: string;
      phone: string;
      role: string;
      status: string;
      slug: string;
      createdAt: string;
      updatedAt: string;
    };
    active: string;
    inactive: string;
    emptyValue: string;
  };
};

export const PROFILE_I18N: Record<'he' | 'en', ProfileI18n> = {
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
        id: 'my-profile',
        title: 'הפרופיל שלי',
        href: '/profile/my-profile',
        icon: 'fa-id-card',
        items: [
          { id: 'edit-my-profile', label: 'עריכת פרופיל שלי', href: '/profile/edit-my-profile', icon: 'fa-user-pen' },
        ],
      },
      {
        id: 'all-profiles',
        title: 'כל הפרופילים',
        href: '/profile/all-profiles',
        icon: 'fa-users',
        items: [
          { id: 'active-profiles', label: 'פרופילים פעילים', href: '/profile/active-profiles', icon: 'fa-user-check' },
          { id: 'inactive-profiles', label: 'פרופילים לא פעילים', href: '/profile/inactive-profiles', icon: 'fa-user-slash' },
        ],
      },
    ],
    pageTitle: 'הפרופיל שלי',
    settings: 'הגדרות',
    editProfile: {
      title: 'עריכת פרופיל',
      description: 'ניתן לערוך כל שדה בנפרד. בעדכון נשלחים לשרת רק הערכים שהשתנו.',
      permissionsHint: 'הרשאות העריכה נאכפות בשרת לפי רמת המשתמש.',
      cannotEditRoleStatus: 'תפקיד וסטטוס מנוהלים לפי כללי מערכת ולכן אינם ניתנים לעריכה עצמית.',
      fields: {
        name: 'שם',
        email: 'אימייל',
        phone: 'טלפון',
        currentPassword: 'סיסמה נוכחית',
        newPassword: 'סיסמה חדשה',
      },
      placeholders: {
        name: 'הזן שם משתמש',
        email: 'הזן כתובת אימייל',
        phone: 'הזן טלפון (אופציונלי)',
        currentPassword: 'נדרש רק אם משנים סיסמה',
        newPassword: 'לפחות 8 תווים עם אותיות ומספרים',
      },
      actions: {
        update: 'עדכון',
        updating: 'מעדכן...',
        delete: 'מחיקה',
        deleting: 'מוחק...',
      },
      messages: {
        noChanges: 'לא זוהו שינויים לעדכון.',
        updateSuccess: 'הפרופיל עודכן בהצלחה.',
        updateFailed: 'לא ניתן היה לעדכן את הפרופיל. נסה שוב או פנה למנהל.',
        passwordNeedsCurrent: 'כדי לשנות סיסמה יש להזין גם סיסמה נוכחית.',
        deleteConfirm: 'האם למחוק את המשתמש? פעולה זו אינה הפיכה.',
        cannotDeleteWithDependencies: 'לא ניתן למחוק משתמש עם רשומות תלויות במערכת.',
        deleteFailed: 'לא ניתן היה למחוק את המשתמש. נסה שוב או פנה למנהל.',
      },
    },
    profileCard: {
      title: 'פרטי המשתמש שלי',
      description: 'הנתונים נטענים מהשרת עבור המשתמש המחובר כעת.',
      personalSectionTitle: 'פרטים אישיים',
      accountSectionTitle: 'פרטי חשבון',
      systemSectionTitle: 'פרטי מערכת',
      avatarFallback: 'משתמש',
      loading: 'טוען את פרטי המשתמש...',
      fallbackError: 'לא הצלחנו לטעון פרטים מעודכנים מהשרת. מוצגים הנתונים האחרונים שנשמרו.',
      fields: {
        id: 'מזהה משתמש',
        name: 'שם',
        email: 'אימייל',
        phone: 'טלפון',
        role: 'תפקיד',
        status: 'סטטוס',
        slug: 'Slug',
        createdAt: 'נוצר בתאריך',
        updatedAt: 'עודכן בתאריך',
      },
      active: 'פעיל',
      inactive: 'לא פעיל',
      emptyValue: 'אין נתון',
    },
    emptyState: {
      'my-profile': {
        title: 'פרטי הפרופיל שלי יוצגו כאן',
        description: 'בחר עריכה כדי לעדכן את פרטי המשתמש שלך.',
      },
      'edit-my-profile': {
        title: 'עריכת פרופיל',
        description: 'כאן יופיע טופס העריכה של פרטי המשתמש שלך.',
      },
      'all-profiles': {
        title: 'כל הפרופילים יוצגו כאן',
        description: 'ניתן לעבור לרשימת הפרופילים הפעילים או הלא פעילים.',
      },
      'active-profiles': {
        title: 'פרופילים פעילים',
        description: 'כאן תופיע רשימת כל הפרופילים הפעילים במערכת.',
      },
      'inactive-profiles': {
        title: 'פרופילים לא פעילים',
        description: 'כאן תופיע רשימת כל הפרופילים הלא פעילים במערכת.',
      },
      default: {
        title: 'אין נתונים להצגה',
        description: 'בחר פריט מהסרגל הצידי כדי לראות את אזור הפרופיל הרלוונטי.',
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
        id: 'my-profile',
        title: 'My Profile',
        href: '/profile/my-profile',
        icon: 'fa-id-card',
        items: [
          { id: 'edit-my-profile', label: 'Edit My Profile', href: '/profile/edit-my-profile', icon: 'fa-user-pen' },
        ],
      },
      {
        id: 'all-profiles',
        title: 'All Profiles',
        href: '/profile/all-profiles',
        icon: 'fa-users',
        items: [
          { id: 'active-profiles', label: 'Active Profiles', href: '/profile/active-profiles', icon: 'fa-user-check' },
          { id: 'inactive-profiles', label: 'Inactive Profiles', href: '/profile/inactive-profiles', icon: 'fa-user-slash' },
        ],
      },
    ],
    pageTitle: 'My Profile',
    settings: 'Settings',
    editProfile: {
      title: 'Edit Profile',
      description: 'You can edit each field separately. Update sends only changed values to the server.',
      permissionsHint: 'Edit permissions are enforced by the server according to user role.',
      cannotEditRoleStatus: 'Role and status are managed by system policy and cannot be self-edited.',
      fields: {
        name: 'Name',
        email: 'Email',
        phone: 'Phone',
        currentPassword: 'Current Password',
        newPassword: 'New Password',
      },
      placeholders: {
        name: 'Enter display name',
        email: 'Enter email address',
        phone: 'Enter phone (optional)',
        currentPassword: 'Required only for password change',
        newPassword: 'At least 8 chars with letters and numbers',
      },
      actions: {
        update: 'Update',
        updating: 'Updating...',
        delete: 'Delete',
        deleting: 'Deleting...',
      },
      messages: {
        noChanges: 'No changes detected to update.',
        updateSuccess: 'Profile updated successfully.',
        updateFailed: 'Could not update profile. Please try again or contact admin.',
        passwordNeedsCurrent: 'Current password is required to change password.',
        deleteConfirm: 'Delete this user? This action cannot be undone.',
        cannotDeleteWithDependencies: 'Cannot delete a user that still has related records in the system.',
        deleteFailed: 'Could not delete user. Please try again or contact admin.',
      },
    },
    profileCard: {
      title: 'My User Details',
      description: 'These values are loaded from the server for the currently authenticated user.',
      personalSectionTitle: 'Personal Details',
      accountSectionTitle: 'Account Details',
      systemSectionTitle: 'System Details',
      avatarFallback: 'User',
      loading: 'Loading user details...',
      fallbackError: 'Unable to load the latest details from the server. Showing the most recently saved data.',
      fields: {
        id: 'User ID',
        name: 'Name',
        email: 'Email',
        phone: 'Phone',
        role: 'Role',
        status: 'Status',
        slug: 'Slug',
        createdAt: 'Created At',
        updatedAt: 'Updated At',
      },
      active: 'Active',
      inactive: 'Inactive',
      emptyValue: 'No data',
    },
    emptyState: {
      'my-profile': {
        title: 'My profile details will appear here',
        description: 'Choose edit to update your user details.',
      },
      'edit-my-profile': {
        title: 'Edit profile',
        description: 'The form for updating your user details will appear here.',
      },
      'all-profiles': {
        title: 'All profiles will appear here',
        description: 'You can move between the active and inactive profile lists.',
      },
      'active-profiles': {
        title: 'Active profiles',
        description: 'The list of all active system profiles will appear here.',
      },
      'inactive-profiles': {
        title: 'Inactive profiles',
        description: 'The list of all inactive system profiles will appear here.',
      },
      default: {
        title: 'No data to display',
        description: 'Select a sidebar item to see the relevant profile area.',
      },
    },
  },
};
