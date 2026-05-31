import {
  createDefaultTraderCategoryShare,
  deleteDefaultTraderCategoryShare,
  updateDefaultTraderCategoryShare,
} from '../../../services/defaultTraderCategoriesApi';
import type { ShareRow } from '../tradersManagement.types';

type ExistingShare = {
  traderId: number;
  percent: number;
};

export async function syncDefaultTraderCategoryShares(
  defaultTraderCategoryId: number,
  currentShares: ExistingShare[],
  nextShareRows: ShareRow[],
): Promise<void> {
  const currentByTrader = new Map(currentShares.map((share) => [share.traderId, Number(share.percent)]));
  const nextByTrader = new Map(nextShareRows.map((shareRow) => [shareRow.traderId as number, Number(shareRow.percent)]));

  const deletedTraderIds = [...currentByTrader.keys()].filter((traderId) => !nextByTrader.has(traderId));
  for (const traderId of deletedTraderIds) {
    await deleteDefaultTraderCategoryShare(defaultTraderCategoryId, traderId);
  }

  const decreasedTraderIds = [...currentByTrader.keys()].filter((traderId) => {
    const nextPercent = nextByTrader.get(traderId);
    return typeof nextPercent === 'number' && nextPercent < (currentByTrader.get(traderId) ?? 0);
  });
  for (const traderId of decreasedTraderIds) {
    await updateDefaultTraderCategoryShare({
      defaultTraderCategoryId,
      traderId,
      percent: nextByTrader.get(traderId) as number,
    });
  }

  const createdTraderIds = [...nextByTrader.keys()].filter((traderId) => !currentByTrader.has(traderId));
  for (const traderId of createdTraderIds) {
    await createDefaultTraderCategoryShare({
      defaultTraderCategoryId,
      traderId,
      percent: nextByTrader.get(traderId) as number,
    });
  }

  const increasedTraderIds = [...currentByTrader.keys()].filter((traderId) => {
    const nextPercent = nextByTrader.get(traderId);
    return typeof nextPercent === 'number' && nextPercent > (currentByTrader.get(traderId) ?? 0);
  });
  for (const traderId of increasedTraderIds) {
    await updateDefaultTraderCategoryShare({
      defaultTraderCategoryId,
      traderId,
      percent: nextByTrader.get(traderId) as number,
    });
  }
}
