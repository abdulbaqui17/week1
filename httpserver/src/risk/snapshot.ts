export type Snapshot = {
  balance: number;
  upnl: number;
  equity: number;
  used: number;
  free: number;
  maintenance: number;
  level: number;
};

export async function computeSnapshot(redis: any, prices: Record<string, number>, acct = 'acct:demo'): Promise<Snapshot> {
  const balance = Number(await redis.get(`${acct}:balance`)) || 0;
  const raw = await redis.get(`${acct}:orders`);
  const positions: any[] = raw ? JSON.parse(raw) : [];
  let upnl = 0;
  let used = 0;
  let maintenance = 0;

  const maintRate = Number(process.env.MAINT_MARGIN_RATE ?? 0.005); // default 0.5%
  for (const p of positions.filter(x => String(x.status || 'open') === 'open')) {
    const mark = Number(prices[p.symbol] ?? p.entry ?? 0);
    const units = Number(p.units ?? p.volume ?? 0);
    const lev = Number(p.leverage ?? 1) || 1;
    if (!(mark > 0) || !(units > 0)) continue;
    const signedUnits = String(p.side).toUpperCase() === 'BUY' ? units : -units;
    const notional = Math.abs(units) * mark;
    const entryPrice = Number(p.entry ?? mark);
    const pnl = (mark - entryPrice) * signedUnits;
    upnl += pnl;
    used += notional / lev;
  maintenance += notional * maintRate;
  }

  const equity = balance + upnl;
  const free = equity - used;
  const level = used > 0 ? equity / used : Infinity;
  return { balance, upnl, equity, used, free, maintenance, level };
}
