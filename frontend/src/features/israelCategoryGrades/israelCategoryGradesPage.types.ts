export type IsraelCategoryGradesHeaderState = {
  count: number;
  isAddDisabled: boolean;
  isEditDisabled: boolean;
  isDeleteDisabled: boolean;
  onAdd: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export type IsraelCategoryGradesManagementProps = {
  lang: 'he' | 'en';
  onHeaderStateChange?: (state: IsraelCategoryGradesHeaderState | null) => void;
};

export type GradeRow = {
  key: string;
  value: string;
};

export type IsraelCategoryGradeFormState = {
  categoryId: number | '';
  rows: GradeRow[];
};
