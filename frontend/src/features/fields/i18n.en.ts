import type { FieldsI18n } from './i18n';

export const FIELDS_I18N_EN: FieldsI18n = {
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
};