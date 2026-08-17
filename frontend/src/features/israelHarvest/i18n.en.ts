import type { IsraelHarvestI18n } from './i18n';

export const ISRAEL_HARVEST_I18N_EN: IsraelHarvestI18n = {
  pageTitle: 'Israel Harvest',
  settings: 'Settings',
  sidebar: [
    {
      id: 'summaries',
      title: 'Summary',
      href: '/harvest/harvest-summary',
      icon: 'fa-chart-bar',
      items: [
        {
          id: 'harvest-summary',
          label: 'Harvest Summary (by fields)',
          href: '/harvest/harvest-summary',
          icon: 'fa-lemon',
        },
        {
          id: 'sorting-summary',
          label: 'Sorting Summary',
          href: '/harvest/sorting-summary',
          icon: 'fa-grip',
        },
      ],
    },
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
      ],
    },
    {
      id: 'sortings',
      title: 'Sortings',
      href: '/harvest/sorting-list',
      icon: 'fa-grip',
      items: [
        {
          id: 'sorting-list',
          label: 'Sorting List',
          href: '/harvest/sorting-list',
          icon: 'fa-list',
        },
      ],
    },
  ],
  emptyState: {
    'harvest-summary': {
      title: 'Harvest summary will appear here',
      description: 'A summary of all harvests by field for the selected season will be shown here.',
    },
    'sorting-summary': {
      title: 'Sorting summary will appear here',
      description: 'An overview of all sortings by category and season will be shown here.',
    },
    'harvest-daily-details': {
      title: 'Daily harvest breakdown will appear here',
      description: 'Daily harvest data for the selected season will be shown here.',
    },
    'sorting-list': {
      title: 'Sorting list will appear here',
      description: 'A full list of all sorting records for the selected season will be shown here.',
    },
    default: {
      title: 'No data to display',
      description: 'Select a sidebar item to view relevant information.',
    },
  },
};
