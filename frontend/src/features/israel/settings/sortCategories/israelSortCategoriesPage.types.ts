export type { GradeGroup } from '../../../../services/traderCategoriesApi';

export type IsraelSortCategoriesHeaderState = {
  count: number;
  isEditDisabled: boolean;
  isDeleteDisabled: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

export type IsraelSortCategoriesManagementProps = {
  lang: 'he' | 'en';
  onHeaderStateChange?: (state: IsraelSortCategoriesHeaderState | null) => void;
};
