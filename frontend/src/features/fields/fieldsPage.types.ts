export type FieldsHeaderState = {
  count: number;
  isEditDisabled: boolean;
  isDeleteDisabled: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

export type FieldsManagementProps = {
  onHeaderStateChange?: (state: FieldsHeaderState | null) => void;
};
