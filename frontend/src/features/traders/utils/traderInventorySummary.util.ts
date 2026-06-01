import type { TraderInventoryPitamStatus, TraderInventorySummaryRow } from '../traderInventory.types';

type TraderInventorySummaryLabels = {
  values: {
    modulo: string;
    traderOwned: string;
    none: string;
    neverUpdated: string;
    pitamStatus: Record<TraderInventoryPitamStatus, string>;
  };
};

export function getTraderInventoryRowKey(row: TraderInventorySummaryRow): string {
  return [
    row.isModulo ? 'modulo' : row.traderId ?? 'trader-none',
    row.traderCategoryId,
    row.grade,
    row.pitamStatus,
  ].join(':');
}

export function getTraderInventoryOwnerTypeLabel(
  row: TraderInventorySummaryRow,
  labels: TraderInventorySummaryLabels,
): string {
  return row.isModulo ? labels.values.modulo : labels.values.traderOwned;
}

export function getTraderInventoryPitamStatusLabel(
  pitamStatus: TraderInventoryPitamStatus,
  labels: TraderInventorySummaryLabels,
): string {
  return labels.values.pitamStatus[pitamStatus];
}

export function getTraderInventoryText(
  value: string | null | undefined,
  fallback: string,
): string {
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}