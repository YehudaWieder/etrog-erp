import type { IsraelShipmentItemRecord } from '../../../../services/israel/israelShipmentItemsApi';
import type { IsraelAllShipmentsTableLabels } from '../israelShipments.types';

export type IsraelShipmentItemDetailRow = {
  id: number;
  boxNumber: number;
  category: string;
  grade: string;
  pitamStatus: string;
  quantity: number;
  notes: string;
};

export function buildIsraelShipmentItemDetailRows(
  items: IsraelShipmentItemRecord[],
  labels: IsraelAllShipmentsTableLabels['detailsItemsTable'],
): IsraelShipmentItemDetailRow[] {
  const rows = items.map((item) => ({
    id: item.id,
    boxNumber: item.box?.boxNumber ?? 0,
    category: item.category?.name ?? labels.uncategorized,
    grade: item.grade || labels.noGrade,
    pitamStatus: labels.pitamStatusLabels[item.pitamStatus] ?? item.pitamStatus,
    quantity: item.quantity,
    notes: item.notes?.trim() ?? '',
  }));

  return rows.sort((a, b) => {
    if (a.boxNumber !== b.boxNumber) return a.boxNumber - b.boxNumber;
    const categoryCompare = a.category.localeCompare(b.category);
    if (categoryCompare !== 0) return categoryCompare;
    return a.grade.localeCompare(b.grade);
  });
}
