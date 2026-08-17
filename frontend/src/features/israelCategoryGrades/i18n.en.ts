import type { IsraelCategoryGradesI18n } from './i18n';

export const ISRAEL_CATEGORY_GRADES_I18N_EN: IsraelCategoryGradesI18n = {
  loading: 'Loading category grades...',
  empty: 'No category grades configured for the active season.',
  noActiveSeason:
    'No active season. Set an active season to manage category grades.',
  categoryLabel: 'Sorting category',
  selectCategory: 'Select sorting category',
  gradesLabel: 'Grades',
  gradeLinePrefix: 'Grade',
  gradeKeyPlaceholder: 'Grade, e.g. A',
  gradeValuePlaceholder: 'Display grade, e.g. B',
  addRow: 'Add grade',
  removeRow: 'Remove',
  addTitle: 'New category grades',
  addMessage: 'Configure grades for a sorting category in the active season',
  editTitle: 'Edit category grades',
  editMessage: (name) => `Update grades for "${name}"`,
  addFailed: 'Failed to save grades.',
  editFailed: 'Failed to update grades.',
  deleteFailed: 'Unable to delete the selected grades.',
  invalidCategory: 'Please select a sorting category.',
  invalidGrades:
    'Please enter at least one valid grade, with no duplicate keys.',
  deleteTitle: 'Delete category grades',
  deleteMessage: (name) =>
    `Delete the grades for "${name}"? This action cannot be undone.`,
  deleteFallback: 'Delete the selected grades?',
  deleteConfirm: 'Delete',
  cancel: 'Cancel',
  save: 'Save',
  saving: 'Saving...',
};
