import { computeSnapshot } from './snapshot.js';

/*
  Simple liquidation pass:
  - Compute current snapshot (equity, used, maintenance)
  - If equity <= maintenance (or equity <=0 fallback) then:
      * Mark all OPEN positions as liquidated at current mark price
      * Realize PnL into balance (already reflected in equity); new balance becomes max(0, equity)
      * Persist updated orders & balance; recompute snapshot
  - Returns { liquidated: boolean, snapshot }
*/
const MAINT_RATE = Number(process.env.MAINT_MARGIN_RATE ?? 0.005); // 0.5% default

export async function runLiquidations(redis: any, prices: Record<string, number>, acct = 'acct:demo') {
  const keyBal = `${acct}:balance`;
  const keyOrders = `${acct}:orders`;
  const rawOrders = await redis.get(keyOrders);
  const orders: any[] = rawOrders ? JSON.parse(rawOrders) : [];

  // Snapshot first pass
  const snap = await computeSnapshot(redis, prices, acct);
  const { equity, maintenance } = snap;
  const threshold = Math.max(maintenance, 0); // we will treat maintenance as threshold; equity below -> liquidate
  if (equity > threshold && equity > 0) {
    return { liquidated: false, snapshot: snap };
  }

  const nowIso = new Date().toISOString();
  let mutated = false;

  for (let i = 0; i < orders.length; i++) {
    const o = orders[i];
    if (!o || String(o.status ?? 'open') !== 'open') continue;
    const mark = Number(prices[o.symbol] ?? o.entry ?? 0);
    const units = Number(o.volume ?? o.units ?? 0);
    const side = String(o.side).toUpperCase();
    if (!(mark > 0) || !(units > 0)) continue;
    const signedUnits = side === 'BUY' ? units : -units;
    const pnl = (mark - Number(o.entry)) * signedUnits;
    orders[i] = { ...o, status: 'liquidated', exit: mark, pnl, closedAt: nowIso, closedBy: 'liquidation' };
    mutated = true;
  }

  if (!mutated) {
    // Nothing to do; could happen if no open orders but equity negative due to previous logic
    return { liquidated: false, snapshot: snap };
  }

  // Realize equity -> balance (cap at 0)
  const newBalance = Math.max(0, equity);
  await redis.set(keyBal, String(newBalance));
  await redis.set(keyOrders, JSON.stringify(orders));

  // Recompute snapshot after liquidation
  const snap2 = await computeSnapshot(redis, prices, acct);
  return { liquidated: true, snapshot: snap2 };
}
