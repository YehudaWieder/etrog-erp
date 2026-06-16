import type { BoxRecord } from '../../../services/boxesApi';
import type { ShipmentItemRecord } from '../../../services/shipmentItemsApi';
import type { ShipmentsTableLabels } from '../shipments.types';

export type ShipmentItemDetailRow = {
  id: number;
  boxNumber: number;
  ownership: string;
  stockSource: string;
  category: string;
  grade: string;
  quantity: number;
  notes: string;
};

export function buildShipmentItemsDetailRows(
  items: ShipmentItemRecord[],
  boxes: BoxRecord[],
  labels: ShipmentsTableLabels['detailsItemsTable'],
): ShipmentItemDetailRow[] {
  const boxNumberById = new Map<number, number>();
  for (const box of boxes) {
    boxNumberById.set(box.id, box.boxNumber);
  }

  const rows = items.map((item) => {
    const ownership = item.ownershipType === 'TRADER'
      ? item.trader?.name || labels.ownershipLabels.TRADER
      : item.ownershipType === 'CUSTOMER'
        ? item.customer?.customerName || labels.ownershipLabels.CUSTOMER
        : labels.ownershipLabels[item.ownershipType];

    const category = item.traderCategory?.name
      ?? item.customerCategory?.name
      ?? item.customLabel
      ?? labels.uncategorized;

    const grade = item.customGrade ?? item.grade ?? labels.noGrade;

    const stockSource = item.ownershipType === 'TRADER'
      ? (item.isPrivateSelection ? labels.stockSourceLabels.PRIVATE_SELECTION : labels.stockSourceLabels.GENERAL)
      : '—';

    return {
      id: item.id,
      boxNumber: boxNumberById.get(item.boxId) ?? 0,
      ownership,
      stockSource,
      category,
      grade,
      quantity: item.quantity,
      notes: item.notes?.trim() ?? '',
    };
  });

  return rows.sort((a, b) => a.boxNumber - b.boxNumber);
}

export function buildBoxItemsDetailRows(
  items: ShipmentItemRecord[],
  boxNumber: number,
  labels: ShipmentsTableLabels['detailsItemsTable'],
): ShipmentItemDetailRow[] {
  return items.map((item) => {
    const ownership = item.ownershipType === 'TRADER'
      ? item.trader?.name || labels.ownershipLabels.TRADER
      : item.ownershipType === 'CUSTOMER'
        ? item.customer?.customerName || labels.ownershipLabels.CUSTOMER
        : labels.ownershipLabels[item.ownershipType];

    const category = item.traderCategory?.name
      ?? item.customerCategory?.name
      ?? item.customLabel
      ?? labels.uncategorized;

    const grade = item.customGrade ?? item.grade ?? labels.noGrade;

    const stockSource = item.ownershipType === 'TRADER'
      ? (item.isPrivateSelection ? labels.stockSourceLabels.PRIVATE_SELECTION : labels.stockSourceLabels.GENERAL)
      : '—';

    return {
      id: item.id,
      boxNumber,
      ownership,
      stockSource,
      category,
      grade,
      quantity: item.quantity,
      notes: item.notes?.trim() ?? '',
    };
  });
}
