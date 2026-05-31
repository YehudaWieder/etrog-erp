type DailySummarySourceRow = {
  quantity: number;
  traderId: number | null;
  customerId: number | null;
  traderCategoryId: number | null;
  customerCategoryId: number | null;
  trader: { name: string } | null;
  customer: { customerName: string } | null;
  traderCategory: { name: string } | null;
  customerCategory: { name: string } | null;
  fieldHarvest: {
    id: number;
    fieldId: number;
    dateGregorian: Date;
    dateHebrew: string;
    field: { name: string } | null;
  } | null;
};

type DailySummaryRow = {
  harvestId: number;
  fieldId: number;
  fieldName: string;
  dateGregorian: Date;
  dateHebrew: string;
  totalSorted: number;
  categoryTotals: Record<string, number>;
};

type DailySummaryCategory = {
  key: string;
  label: string;
  ownerType: 'GENERAL' | 'TRADER' | 'CUSTOMER';
  ownerName: string | null;
  categoryName: string;
  total: number;
};

export function buildClassificationDailySummary(records: DailySummarySourceRow[]) {
  const rowsByHarvest = new Map<number, DailySummaryRow>();
  const categoriesByKey = new Map<string, DailySummaryCategory>();

  for (const record of records) {
    const harvest = record.fieldHarvest;
    if (!harvest) {
      continue;
    }

    if (!rowsByHarvest.has(harvest.id)) {
      rowsByHarvest.set(harvest.id, {
        harvestId: harvest.id,
        fieldId: harvest.fieldId,
        fieldName: harvest.field?.name ?? '-',
        dateGregorian: harvest.dateGregorian,
        dateHebrew: harvest.dateHebrew,
        totalSorted: 0,
        categoryTotals: {},
      });
    }

    const quantity = Number(record.quantity) || 0;
    if (quantity <= 0) {
      continue;
    }

    const traderName = record.trader?.name?.trim() ?? '';
    const customerName = record.customer?.customerName?.trim() ?? '';
    const owner = traderName
      ? {
          type: 'TRADER' as const,
          key: `trader:${record.traderId}`,
          name: traderName,
        }
      : customerName
        ? {
            type: 'CUSTOMER' as const,
            key: `customer:${record.customerId}`,
            name: customerName,
          }
        : {
            type: 'GENERAL' as const,
            key: 'general',
            name: null,
          };

    const categoryKeyBase = record.customerCategoryId
      ? `customer:${record.customerCategoryId}`
      : record.traderCategoryId
        ? `trader:${record.traderCategoryId}`
        : null;
    const categoryLabel = record.customerCategory?.name ?? record.traderCategory?.name ?? null;

    if (!categoryKeyBase || !categoryLabel) {
      continue;
    }

    const categoryName = categoryLabel.trim();
    if (!categoryName) {
      continue;
    }

    const ownerLabel = owner.name ?? 'כללי';
    const categoryKey = `${owner.key}|${categoryKeyBase}`;

    const row = rowsByHarvest.get(harvest.id)!;
    row.categoryTotals[categoryKey] = (row.categoryTotals[categoryKey] ?? 0) + quantity;
    row.totalSorted += quantity;

    const category = categoriesByKey.get(categoryKey);
    if (!category) {
      categoriesByKey.set(categoryKey, {
        key: categoryKey,
        label: `${ownerLabel} | ${categoryName}`,
        ownerType: owner.type,
        ownerName: owner.name,
        categoryName,
        total: quantity,
      });
    } else {
      category.total += quantity;
    }
  }

  const categories = Array.from(categoriesByKey.values())
    .filter((item) => item.total > 0)
    .sort((a, b) => {
      if (b.total !== a.total) {
        return b.total - a.total;
      }

      return a.label.localeCompare(b.label, 'he', {
        sensitivity: 'base',
        numeric: true,
      });
    });

  const rows = Array.from(rowsByHarvest.values())
    .filter((row) => row.totalSorted > 0)
    .map((row) => {
      const categoryTotals: Record<string, number> = {};
      for (const category of categories) {
        const value = row.categoryTotals[category.key] ?? 0;
        if (value > 0) {
          categoryTotals[category.key] = value;
        }
      }

      return {
        ...row,
        categoryTotals,
      };
    })
    .sort((a, b) => {
      const dateDiff = b.dateGregorian.getTime() - a.dateGregorian.getTime();
      if (dateDiff !== 0) {
        return dateDiff;
      }

      if (a.fieldName !== b.fieldName) {
        return a.fieldName.localeCompare(b.fieldName, 'he', {
          sensitivity: 'base',
          numeric: true,
        });
      }

      return b.harvestId - a.harvestId;
    });

  return {
    categories,
    rows,
  };
}
