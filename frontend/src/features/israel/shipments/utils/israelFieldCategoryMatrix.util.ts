import type { IsraelShipmentItemRecord } from '../../../../services/israel/israelShipmentItemsApi';
import type { IsraelField } from '../../../../services/israel/israelFieldsApi';

export type IsraelFieldCategoryMatrixRow = {
  fieldId: number;
  fieldName: string;
  categoryQuantities: Record<string, number>;
  totalQuantity: number;
  totalBoxes: number;
};

export function buildIsraelFieldCategoryMatrix(
  items: IsraelShipmentItemRecord[],
  fields: IsraelField[],
  shipmentNumber: 'all' | number,
): IsraelFieldCategoryMatrixRow[] {
  const fieldNameById = new Map(fields.map((field) => [field.id, field.name]));
  const rowsByField = new Map<number, { categoryQuantities: Record<string, number>; totalQuantity: number; boxIds: Set<number> }>();

  for (const item of items) {
    const fieldId = item.box?.fieldId;
    if (fieldId == null) continue;

    const itemShipmentNumber = item.box?.shipment?.shipmentNumber ?? null;
    if (shipmentNumber !== 'all' && itemShipmentNumber !== shipmentNumber) continue;

    let row = rowsByField.get(fieldId);
    if (!row) {
      row = { categoryQuantities: {}, totalQuantity: 0, boxIds: new Set() };
      rowsByField.set(fieldId, row);
    }

    const categoryKey = String(item.categoryId);
    row.categoryQuantities[categoryKey] = (row.categoryQuantities[categoryKey] ?? 0) + item.quantity;
    row.totalQuantity += item.quantity;
    row.boxIds.add(item.boxId);
  }

  return Array.from(rowsByField.entries())
    .map(([fieldId, row]) => ({
      fieldId,
      fieldName: fieldNameById.get(fieldId) ?? String(fieldId),
      categoryQuantities: row.categoryQuantities,
      totalQuantity: row.totalQuantity,
      totalBoxes: row.boxIds.size,
    }))
    .sort((a, b) => a.fieldName.localeCompare(b.fieldName, undefined, { sensitivity: 'base' }));
}
