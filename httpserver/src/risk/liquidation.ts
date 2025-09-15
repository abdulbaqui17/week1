/* Strict liquidation logic per spec:
   - For each open position:
     postedMargin = notional / leverage (using current mark)
     pnl = (mark - entry) * sideMult * units
     If pnl <= -postedMargin => liquidate full position.
     On liquidation: balance -= postedMargin; mark position liquidated with closePrice, closedAt.
   - Persist updated balance and orders only if any liquidation occurred.
*/
export async function checkLiquidations(redis: any, prices: Record<string, number>, acct = 'acct:demo') {
  const ordersKey = `${acct}:orders`;
  const balanceKey = `${acct}:balance`;
  const raw = await redis.get(ordersKey);
  if (!raw) return { changed: false };
  let positions: any[] = [];
  try { positions = JSON.parse(raw) || []; } catch { return { changed: false }; }
  if (!Array.isArray(positions) || positions.length === 0) return { changed: false };

  let balance = Number(await redis.get(balanceKey)) || 0;
  let changed = false;
  const now = Date.now();

  for (const p of positions) {
    if (!p || String(p.status || 'open') !== 'open') continue;
    const mark = Number(prices[p.symbol]);
    if (!(mark > 0)) continue;
    const units = Number(p.volume ?? p.units ?? 0);
    if (!(units > 0)) continue;
    const lev = Number(p.leverage || 1) || 1;
    const sideMult = String(p.side).toUpperCase() === 'BUY' ? 1 : -1;
    const entry = Number(p.entry);
    if (!(entry > 0)) continue;
    const pnl = (mark - entry) * sideMult * units;
    const notional = mark * units; // postedMargin is dynamic with current mark per spec statement
    const postedMargin = notional / lev;
    if (pnl <= -postedMargin) {
      p.status = 'liquidated';
      p.closedAt = now;
      p.closePrice = mark;
      // Realized PnL equals -postedMargin OR min(pnl, -postedMargin)?
      // Spec: user loses posted margin (full). So realized = -postedMargin.
      p.pnl = -postedMargin;
      p.realizedPnl = -postedMargin;
      p.closedBy = 'liquidation';
      balance -= postedMargin;
      changed = true;
    }
  }

  if (changed) {
    if (balance < 0) balance = 0; // Clamp to prevent platform loss
    await redis.set(balanceKey, String(balance));
    await redis.set(ordersKey, JSON.stringify(positions));
  }
  return { changed };
}
