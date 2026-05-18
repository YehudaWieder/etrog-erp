import type { SidebarSection, NavItem } from '../../types/navigation';

type EmptyStateContent = {
  title: string;
  description: string;
};

type ProfileI18n = {
  topNav: NavItem[];
  sidebar: SidebarSection[];
  pageTitle: string;
  emptyState: Record<string, EmptyStateContent>;
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
        items: [
          { id: 'edit-my-profile', label: 'עריכת פרופיל שלי', href: '/profile/edit-my-profile' },
        ],
      },
      {
        id: 'all-profiles',
        title: 'כל הפרופילים',
        href: '/profile/all-profiles',
        items: [
          { id: 'active-profiles', label: 'פרופילים פעילים', href: '/profile/active-profiles' },
          { id: 'inactive-profiles', label: 'פרופילים לא פעילים', href: '/profile/inactive-profiles' },
        ],
      },
    ],
    pageTitle: 'הפרופיל שלי',
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
        items: [
          { id: 'edit-my-profile', label: 'Edit My Profile', href: '/profile/edit-my-profile' },
        ],
      },
      {
        id: 'all-profiles',
        title: 'All Profiles',
        href: '/profile/all-profiles',
        items: [
          { id: 'active-profiles', label: 'Active Profiles', href: '/profile/active-profiles' },
          { id: 'inactive-profiles', label: 'Inactive Profiles', href: '/profile/inactive-profiles' },
        ],
      },
    ],
    pageTitle: 'My Profile',
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
