import type { Currency } from '../../services/israelFieldCategoriesApi';

export type IsraelFieldCategoriesHeaderState = {
  count: number;
  isAddDisabled: boolean;
  isEditDisabled: boolean;
  isDeleteDisabled: boolean;
  onAdd: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export type IsraelFieldCategoriesManagementProps = {
  lang: 'he' | 'en';
  onHeaderStateChange?: (
    state: IsraelFieldCategoriesHeaderState | null,
  ) => void;
};

export type IsraelFieldCategoryFormState = {
  fieldId: number | '';
  name: string;
  price: string;
  currency: Currency | '';
};
