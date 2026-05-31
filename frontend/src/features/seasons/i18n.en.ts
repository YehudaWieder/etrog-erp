import type { SeasonsI18n } from './i18n';

export const SEASONS_I18N_EN: SeasonsI18n = {
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
};