import type { ShareRow } from '../tradersManagement.types';
import { isShareRowComplete } from '../utils/traderShares.util';

type AddRowBlockReasonParams = {
  shareRows: ShareRow[];
  isHebrew: boolean;
  isTotalAtLeastHundred: boolean;
  hasAvailableTraders: boolean;
  labels: {
    incompleteLastRow: string;
    totalReachedHundred: string;
    allTradersSelected: string;
  };
};

export function getAddShareRowBlockReason({
  shareRows,
  isHebrew,
  isTotalAtLeastHundred,
  hasAvailableTraders,
  labels,
}: AddRowBlockReasonParams): string | null {
  if (shareRows.length === 0) {
    return null;
  }

  const lastRow = shareRows[shareRows.length - 1];

  if (!isShareRowComplete(lastRow)) {
    return labels.incompleteLastRow;
  }

  if (isTotalAtLeastHundred) {
    return labels.totalReachedHundred;
  }

  if (!hasAvailableTraders) {
    return labels.allTradersSelected;
  }

  return null;
}

export function getAvailableTradersForRow<T extends { id: number }>(
  shareRows: ShareRow[],
  rowId: number,
  traders: T[],
  currentTraderId: number | null,
): T[] {
  const selectedTraderIdsInOtherRows = new Set(
    shareRows
      .filter((shareRow) => shareRow.rowId !== rowId && shareRow.traderId !== null)
      .map((shareRow) => shareRow.traderId as number),
  );

  return traders.filter((trader) => trader.id === currentTraderId || !selectedTraderIdsInOtherRows.has(trader.id));
}
