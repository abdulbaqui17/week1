import { redis } from './index.js';

export type Position = {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  volume?: number; // legacy field
  units?: number;  // normalized units
  entry: number;
  leverage: number;
  status: 'open' | 'closed' | string;
};

export type Snapshot = {
  balance: number;
  upnl: number;
  equity: number;
  used: number;
  free: number;
  maintenance: number;
  level: number; // equity/used (ratio) or +Inf when no used
};

const KEY_BAL = 'acct:demo:balance';
const KEY_ORD = 'acct:demo:orders';
const KEY_SNAP = 'acct:demo:snapshot';

// Provide latest prices externally via argument to avoid tight coupling with PG/Redis price lookup here
export async function computeSnapshot(prices: Record<string, number>, accountKeyPrefix='acct:demo'): Promise<Snapshot> {
  const balanceRaw = await redis.get(KEY_BAL);
  const balance = Number(balanceRaw) || 0;
  const raw = await redis.get(KEY_ORD);
  const positions: Position[] = raw ? JSON.parse(raw) : [];
  let upnl = 0, used = 0, maintenance = 0;
  for (const p of positions.filter(p => String(p.status||'open') === 'open')) {
    const markVal = prices[p.symbol];
    const units = Number(p.units ?? p.volume);
    const lev = Number(p.leverage || 1);
    if (!Number.isFinite(markVal) || !Number.isFinite(units) || !Number.isFinite(lev) || units <= 0) continue;
    const mark = Number(markVal);
    const signedUnits = (p.side === 'SELL') ? -units : units;
    const pnl = (mark - p.entry) * signedUnits;
    upnl += pnl;
    const notional = Math.abs(units) * mark;
    used += notional / lev;          // initial margin approximation
    maintenance += notional * 0.05;  // flat 5% maintenance (replace with tiered table if needed)
  }
  const equity = balance + upnl;
  const free = equity - used;
  const level = used > 0 ? (equity / used) : Number.POSITIVE_INFINITY;
  return { balance, upnl, equity, used, free, maintenance, level };
}

export async function enforceLiquidation(prices: Record<string, number>): Promise<Snapshot> {
  let snapshot = await computeSnapshot(prices);
  // Loop while unsafe
  while (snapshot.free < 0 || snapshot.equity <= snapshot.maintenance) {
    const raw = await redis.get(KEY_ORD);
    const positions: Position[] = raw ? JSON.parse(raw) : [];
    const open = positions.filter(p => String(p.status||'open') === 'open');
    if (!open.length) break;
    // Pick largest notional
    const withNotional = open.map(p => ({ p, notional: Math.abs(Number(p.units ?? p.volume) || 0) * (prices[p.symbol] || p.entry) }));
    withNotional.sort((a,b) => b.notional - a.notional);
  const first = withNotional[0];
  if (!first) break;
  const target = first.p;
    const units = Number(target.units ?? target.volume) || 0;
    const mark = prices[target.symbol] || target.entry;
    const signedUnits = target.side === 'SELL' ? -units : units;
    const realized = (mark - target.entry) * signedUnits;
    const balRaw = await redis.get(KEY_BAL);
    const bal = Number(balRaw) || 0;
    await redis.set(KEY_BAL, String(bal + realized));
    // Close target
    const next = positions.map(o => o.id === target.id ? { ...o, status: 'closed', closedAt: new Date().toISOString(), pnl: realized, exit: mark, closedBy: 'auto' } : o);
    await redis.set(KEY_ORD, JSON.stringify(next));
    snapshot = await computeSnapshot(prices);
    if (!(snapshot.free < 0 || snapshot.equity <= snapshot.maintenance)) break;
  }
  // Cache snapshot
  try { await redis.set(KEY_SNAP, JSON.stringify(snapshot)); } catch {}
  return snapshot;
}

export async function getCachedSnapshot(): Promise<Snapshot | null> {
  try {
    const raw = await redis.get(KEY_SNAP);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}
