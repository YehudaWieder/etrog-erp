export type ShareRow = {
  rowId: number;
  traderId: number | null;
  percent: string;
};

export type ConditionDraft = {
  id?: number;
  name: string;
  startDate: string;
  endDate: string;
  endQuantityThreshold: string;
  endConditionMode: 'EITHER' | 'BOTH';
  // ENDED is read-only, set by the backend once a condition's own end criteria are met — never
  // something the form itself can set. Draft rows in that state are display-only in the UI.
  status: 'ACTIVE' | 'DISABLED' | 'ENDED';
  shares: ShareRow[];
  hasLinkedStock: boolean;
  markedForDeletion: boolean;
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
