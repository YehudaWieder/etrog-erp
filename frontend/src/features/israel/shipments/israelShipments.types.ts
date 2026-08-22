export type { IsraelShipmentRecord, IsraelShipmentStatus } from '../../../services/israel/israelShipmentsApi';
export type { IsraelBoxRecord, IsraelBoxStatus } from '../../../services/israel/israelBoxesApi';
export type { IsraelShipmentItemRecord } from '../../../services/israel/israelShipmentItemsApi';
export type { IsraelPitamStatus } from '../../../services/israel/israelClassificationsApi';

export type IsraelAllShipmentsTableLabels = {
  description: string;
  seasonFilterLabel: string;
  statusFilterLabel: string;
  allStatusesOption: string;
  activeSeasonBadge: string;
  noActiveSeason: string;
  colDetails: string;
  colShipmentNumber: string;
  colBoxCount: string;
  colQuantity: string;
  colStatus: string;
  colShippedAt: string;
  detailsButtonAriaLabel: string;
  detailsPanelTitle: (shipmentNumber?: number) => string;
  detailsPanelCloseLabel: string;
  detailsUpdatedByLabel: string;
  detailsNotesLabel: string;
  empty: string;
  loading: string;
  error: string;
  summary: {
    totalShipments: string;
    totalBoxes: string;
    totalQuantity: string;
  };
  statusLabels: Record<import('../../../services/israel/israelShipmentsApi').IsraelShipmentStatus, string>;
};

export type IsraelBoxesTableRow = {
  id: number;
  boxNumber: number;
  shipmentNumber: number | null;
  itemsCount: number;
  status: import('../../../services/israel/israelBoxesApi').IsraelBoxStatus;
  updatedByName: string;
  notes: string | null;
};

export type IsraelAllBoxesTableLabels = {
  description: string;
  seasonFilterLabel: string;
  shipmentNumberFilterLabel: string;
  boxNumberFilterLabel: string;
  boxNumberFilterPlaceholder: string;
  boxStatusFilterLabel: string;
  allShipmentNumbersOption: string;
  unassignedShipmentOption: string;
  allBoxStatusesOption: string;
  activeSeasonBadge: string;
  noActiveSeason: string;
  colDetails: string;
  colBoxNumber: string;
  colShipmentNumber: string;
  colItemsCount: string;
  colStatus: string;
  selectRowAriaLabel: string;
  detailsButtonAriaLabel: string;
  detailsPanelTitle: (boxNumber?: number) => string;
  detailsPanelCloseLabel: string;
  detailsUpdatedByLabel: string;
  detailsNotesLabel: string;
  unassignedShipmentLabel: string;
  empty: string;
  loading: string;
  error: string;
  summary: {
    totalBoxes: string;
    notShipped: string;
    shipped: string;
  };
  statusLabels: Record<import('../../../services/israel/israelBoxesApi').IsraelBoxStatus, string>;
};

export type IsraelShipmentItemsTableRow = {
  id: number;
  boxId: number;
  boxNumber: number;
  shipmentNumber: number | null;
  categoryId: number;
  category: string;
  grade: string;
  pitamStatus: import('../../../services/israel/israelClassificationsApi').IsraelPitamStatus;
  quantity: number;
  notes: string | null;
  updatedByName: string;
};

export type IsraelShipmentItemsTableLabels = {
  description: string;
  seasonFilterLabel: string;
  boxNumberFilterLabel: string;
  shipmentNumberFilterLabel: string;
  allBoxNumbersOption: string;
  allShipmentNumbersOption: string;
  activeSeasonBadge: string;
  noActiveSeason: string;
  colDetails: string;
  colBoxNumber: string;
  colShipmentNumber: string;
  colCategory: string;
  colGrade: string;
  colPitamStatus: string;
  colQuantity: string;
  detailsButtonAriaLabel: string;
  detailsPanelTitle: (id?: number) => string;
  detailsPanelCloseLabel: string;
  detailsUpdatedByLabel: string;
  detailsNotesLabel: string;
  pitamStatusLabels: Record<'WITH_PITAM' | 'WITHOUT_PITAM' | 'MIXED', string>;
  unassignedShipmentLabel: string;
  empty: string;
  loading: string;
  error: string;
  summary: {
    totalItems: string;
    totalQuantity: string;
  };
};
