import type { Currency, Grade } from '../../services/customerCategoriesApi';

export type CustomersHeaderState = {
  count: number;
  isEditDisabled: boolean;
  isDeleteDisabled: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

export type CustomersManagementProps = {
  onHeaderStateChange?: (state: CustomersHeaderState | null) => void;
};

export type CategoryFormState = {
  customerId: number | '';
  name: string;
  grade: Grade | '';
  price: string;
  currency: Currency | '';
};

export type CustomerCategoriesHeaderState = {
  count: number;
  isAddDisabled: boolean;
  isEditDisabled: boolean;
  isDeleteDisabled: boolean;
  onAdd: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export type CustomerCategoriesManagementProps = {
  onHeaderStateChange?: (state: CustomerCategoriesHeaderState | null) => void;
};

export type CustomerCategoriesFilterText = {
  seasonFilterLabel: string;
  customerFilterLabel: string;
  activeSeasonBadge: string;
  allCustomersOption: string;
  noActiveSeason: string;
};
