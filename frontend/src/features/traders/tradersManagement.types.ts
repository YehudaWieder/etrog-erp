export type ShareRow = {
  rowId: number;
  traderId: number | null;
  percent: string;
};

export type TradersHeaderState = {
  count: number;
  isEditDisabled: boolean;
  isDeleteDisabled: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

export type TraderCategoriesHeaderState = {
  count: number;
  isAddDisabled: boolean;
  isEditDisabled: boolean;
  isDeleteDisabled: boolean;
  onAdd: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export type DefaultTraderCategoriesHeaderState = {
  count: number;
  isAddDisabled: boolean;
  isEditDisabled: boolean;
  isDeleteDisabled: boolean;
  onAdd: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export type TraderSeasonSettingsHeaderState = {
  count: number;
  isAddDisabled: boolean;
  isEditDisabled: boolean;
  isDeleteDisabled: boolean;
  onAdd: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export type TraderSeasonSettingsFormState = {
  traderId: number | '';
  paymentPercent: string;
  pricePerEtrog: string;
  currency: 'ILS' | 'USD' | 'EUR' | '';
};

export type TradersManagementProps = {
  onHeaderStateChange?: (state: TradersHeaderState | null) => void;
};

export type TraderSeasonSettingsManagementProps = {
  onHeaderStateChange?: (state: TraderSeasonSettingsHeaderState | null) => void;
};

export type TraderCategoriesManagementProps = {
  onHeaderStateChange?: (state: TraderCategoriesHeaderState | null) => void;
};

export type DefaultTraderCategoriesManagementProps = {
  onHeaderStateChange?: (state: DefaultTraderCategoriesHeaderState | null) => void;
};
