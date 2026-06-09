import type { ShipmentStatus } from '../../services/shipmentsApi';
import type { BoxOwnership, BoxStatus } from '../../services/boxesApi';
import type { ItemOwnership } from '../../services/shipmentItemsApi';

export type { ItemOwnership };

export type { ShipmentRecord } from '../../services/shipmentsApi';
export type { ShipmentStatus };

export type BoxesTableRow = {
  id: number;
  boxNumber: number;
  shipmentNumber: number;
  totalQuantity: number;
  status: BoxStatus;
  ownership: string;
};

export type ShipmentItemsTableRow = {
  id: number;
  boxNumber: number;
  shipmentNumber: number;
  category: string;
  quantity: number;
  ownership: string;
  ownershipType: ItemOwnership;
};

export type ShipmentsTableLabels = {
  title: string;
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
  empty: string;
  loading: string;
  error: string;
  summary: {
    totalShipments: string;
    totalBoxes: string;
    totalQuantity: string;
  };
  statusLabels: Record<ShipmentStatus, string>;
};

export type BoxesTableLabels = {
  title: string;
  description: string;
  seasonFilterLabel: string;
  shipmentNumberFilterLabel: string;
  boxStatusFilterLabel: string;
  ownershipFilterLabel: string;
  allShipmentNumbersOption: string;
  allBoxStatusesOption: string;
  allOwnershipOption: string;
  allTradersOption: string;
  allCustomersOption: string;
  activeSeasonBadge: string;
  noActiveSeason: string;
  colDetails: string;
  colBoxNumber: string;
  colShipmentNumber: string;
  colQuantity: string;
  colStatus: string;
  colOwnership: string;
  detailsButtonAriaLabel: string;
  empty: string;
  loading: string;
  error: string;
  summary: {
    totalBoxes: string;
    notShipped: string;
    shipped: string;
  };
  statusLabels: Record<BoxStatus, string>;
  ownershipLabels: Record<BoxOwnership, string>;
};

export type ShipmentItemsTableLabels = {
  title: string;
  description: string;
  seasonFilterLabel: string;
  boxNumberFilterLabel: string;
  shipmentNumberFilterLabel: string;
  ownershipFilterLabel: string;
  allBoxNumbersOption: string;
  allShipmentNumbersOption: string;
  allOwnershipOption: string;
  allTradersOption: string;
  allCustomersOption: string;
  activeSeasonBadge: string;
  noActiveSeason: string;
  colDetails: string;
  colBoxNumber: string;
  colShipmentNumber: string;
  colCategory: string;
  colQuantity: string;
  colOwnership: string;
  detailsButtonAriaLabel: string;
  uncategorized: string;
  empty: string;
  loading: string;
  error: string;
  summary: {
    totalQuantity: string;
    traderAndGeneralQuantity: string;
    customerQuantity: string;
  };
  ownershipLabels: Record<ItemOwnership, string>;
};
