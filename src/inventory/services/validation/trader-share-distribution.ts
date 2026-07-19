// Distributes a quantity across traders proportionally to their TraderCategoryShare.percent,
// capped by each trader's actual available stock. Any quantity that cannot be absorbed by any
// trader (all exhausted) is returned as `moduloDeduction` for the caller to decide how to handle.
export function distributeQuantityByTraderSharesCapped(params: {
  quantity: number;
  shares: Array<{ traderId: number; percent: number }>;
  availability: Map<number, number>;
}): {
  traderDeductions: Array<{ traderId: number; quantity: number }>;
  moduloDeduction: number;
} {
  const positiveShares = params.shares.filter((s) => s.percent > 0);
  const totalPercent = positiveShares.reduce((sum, s) => sum + s.percent, 0);

  // Floor-based initial allocation proportional to shares; pool holds the rounding remainder.
  const committed = new Map<number, number>();
  let pool = params.quantity;
  for (const s of positiveShares) {
    const qty = Math.floor((params.quantity * s.percent) / totalPercent);
    committed.set(s.traderId, qty);
    pool -= qty;
  }

  // Traders who still have capacity to absorb more than their current committed amount.
  const active = new Set(positiveShares.map((s) => s.traderId));

  // Distribute the pool proportionally among active traders (floor + round-robin for remainder).
  const distributePool = () => {
    if (pool === 0 || active.size === 0) return;

    const activeShares = positiveShares.filter((s) => active.has(s.traderId));
    const totalActivePercent = activeShares.reduce((sum, s) => sum + s.percent, 0);

    let distributed = 0;
    const extras = new Map<number, number>();
    for (const s of activeShares) {
      const extra = Math.floor((pool * s.percent) / totalActivePercent);
      extras.set(s.traderId, extra);
      distributed += extra;
    }

    // Distribute leftover integers by highest share first.
    let roundingRemainder = pool - distributed;
    const sorted = [...activeShares].sort((a, b) =>
      b.percent !== a.percent ? b.percent - a.percent : a.traderId - b.traderId,
    );
    for (const s of sorted) {
      if (roundingRemainder <= 0) break;
      extras.set(s.traderId, (extras.get(s.traderId) ?? 0) + 1);
      roundingRemainder--;
    }

    for (const [traderId, extra] of extras) {
      committed.set(traderId, (committed.get(traderId) ?? 0) + extra);
    }
    pool = 0;
  };

  // Cap over-allocated traders at their available stock; excess goes back to pool.
  // Exhausted traders are removed from active so subsequent rounds skip them.
  const capAndCollect = (): boolean => {
    let changed = false;
    for (const traderId of [...active]) {
      const avail = params.availability.get(traderId) ?? 0;
      const alloc = committed.get(traderId) ?? 0;
      if (alloc > avail) {
        pool += alloc - avail;
        committed.set(traderId, avail);
        active.delete(traderId);
        changed = true;
      }
    }
    return changed;
  };

  // Iterate: distribute pool → cap → repeat until stable or all traders exhausted.
  // Guaranteed to terminate: each iteration removes at least one trader from `active`.
  for (let i = 0; i <= positiveShares.length; i++) {
    distributePool();
    const changed = capAndCollect();
    if (!changed) break;
  }

  // Anything left in pool after all traders are exhausted falls back to the caller (e.g. modulo).
  const moduloDeduction = pool;

  const traderDeductions = [...committed.entries()]
    .filter(([, qty]) => qty > 0)
    .map(([traderId, quantity]) => ({ traderId, quantity }))
    .sort((a, b) => a.traderId - b.traderId);

  return { traderDeductions, moduloDeduction };
}
