import type { IsraelSortCategoriesI18n } from './i18n';

export const ISRAEL_SORT_CATEGORIES_I18N_EN: IsraelSortCategoriesI18n = {
  addFailed: 'Failed to add sorting category.',
  emptyName: 'Category name cannot be empty.',
  editFailed: 'Failed to update sorting category.',
  deleteFailed: 'Unable to delete the selected sorting category.',
  newCategoryPlaceholder: 'New sorting category name',
  addCategory: 'Add sorting category',
  loading: 'Loading sorting categories...',
  empty: 'No sorting categories to display yet.',
  categoryId: 'ID',
  deleteTitle: 'Delete sorting category',
  deleteMessage: (name) =>
    `Delete category ${name}? This action cannot be undone.`,
  deleteFallback: 'Delete the selected category?',
  deleteConfirm: 'Delete',
  cancel: 'Cancel',
  editTitle: 'Edit sorting category',
  editMessage: (name) => `Update category name ${name}`,
  editFallback: 'Update selected category',
  editCategoryPlaceholder: 'Category name',
  save: 'Save',
  updating: 'Updating...',
  adding: 'Adding...',
};
