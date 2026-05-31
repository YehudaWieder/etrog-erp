import type { ShareRow } from '../tradersManagement.types';
import { isShareRowComplete } from '../utils/traderShares.util';

type AddRowBlockReasonParams = {
  shareRows: ShareRow[];
  isHebrew: boolean;
  isTotalAtLeastHundred: boolean;
  hasAvailableTraders: boolean;
};

export function getAddShareRowBlockReason({
  shareRows,
  isHebrew,
  isTotalAtLeastHundred,
  hasAvailableTraders,
}: AddRowBlockReasonParams): string | null {
  if (shareRows.length === 0) {
    return null;
  }

  const lastRow = shareRows[shareRows.length - 1];

  if (!isShareRowComplete(lastRow)) {
    return isHebrew
      ? 'לא ניתן להוסיף שורה חדשה לפני השלמת השורה האחרונה (סוחר ואחוז תקין).'
      : 'Complete the previous row (trader and valid percent) before adding a new one.';
  }

  if (isTotalAtLeastHundred) {
    return isHebrew
      ? 'לא ניתן להוסיף שורה נוספת כי הסכום הכולל כבר הגיע ל-100%.'
      : 'Cannot add another row because total percent already reached 100%.';
  }

  if (!hasAvailableTraders) {
    return isHebrew
      ? 'לא ניתן להוסיף שורה נוספת כי כל הסוחרים כבר נבחרו.'
      : 'Cannot add another row because all traders are already selected.';
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
