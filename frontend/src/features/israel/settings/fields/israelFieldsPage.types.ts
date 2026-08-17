export type IsraelFieldsHeaderState = {
  count: number;
  isEditDisabled: boolean;
  isDeleteDisabled: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

export type IsraelFieldsManagementProps = {
  lang: 'he' | 'en';
  onHeaderStateChange?: (state: IsraelFieldsHeaderState | null) => void;
};
