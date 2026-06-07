import type { ShipmentStatus } from '../../services/shipmentsApi';

export type { ShipmentRecord } from '../../services/shipmentsApi';
export type { ShipmentStatus };

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
  statusLabels: Record<ShipmentStatus, string>;
};
