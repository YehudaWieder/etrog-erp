import type { GradeGroupRow } from '../../../traders/utils/traderCategoryGradeGroups.util';

export type { GradeGroup } from '../../../../services/traderCategoriesApi';

export type IsraelSortCategoriesHeaderState = {
  count: number;
  isAddDisabled: boolean;
  isEditDisabled: boolean;
  isDeleteDisabled: boolean;
  onAdd: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export type IsraelSortCategoriesManagementProps = {
  lang: 'he' | 'en';
  onHeaderStateChange?: (state: IsraelSortCategoriesHeaderState | null) => void;
};

export type IsraelSortCategoryFormState = {
  name: string;
  notes: string;
  supportedGrades: string[];
  gradeGroupRows: GradeGroupRow[];
};
