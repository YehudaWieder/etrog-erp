import type { ShareRow } from '../tradersManagement.types';

export const DEFAULT_PERCENT_STEP = 0.01;
export const TOTAL_EPSILON = 0.001;

export const createEmptyShareRow = (rowId: number): ShareRow => ({
  rowId,
  traderId: null,
  percent: '',
});

export const isValidSharePercent = (value: string): boolean => {
  if (value.trim() === '') {
    return false;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue > 0 && parsedValue <= 100;
};

export const isShareRowComplete = (row: ShareRow): boolean => {
  return row.traderId !== null && isValidSharePercent(row.percent);
};

export const getNextShareRowId = (rows: ShareRow[]): number => {
  return rows.reduce((maxId, row) => Math.max(maxId, row.rowId), 0) + 1;
};

export const calculateTotalPercent = (rows: ShareRow[]): number => {
  return rows.reduce((acc, row) => acc + (Number(row.percent) || 0), 0);
};
