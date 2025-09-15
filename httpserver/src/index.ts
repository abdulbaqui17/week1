import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import { fmtUSD, MONEY_SCALE, scaleMoney, formatMoneyScaled } from './lib/money.js';
import { validateOrderRisk } from './lib/risk.js';
import type { Account as MAccount, Position as MPosition, Side as MSide } from './engine/margin.js';
import { onPriceTick as mOnPriceTick } from './engine/margin.js';
import type { Account as LiqAccount, Position as LiqPosition } from './lib/liquidation.js';
import {
  computeEquity as liqComputeEquity,
  shouldLiquidate as liqShouldLiquidate,
  liquidateAll as liqLiquidateAll,
  getMMR as liqGetMMR,
} from './lib/liquidation.js';
import { createClient } from 'redis';
import { startSlTpWatcher } from './sl_tp_watcher.js';
// Legacy riskEngine kept temporarily; new snapshot logic below centralizes account state
import { computeSnapshot as reCompute, enforceLiquidation as reEnforce } from './riskEngine.js';
import { computeSnapshot } from './risk/snapshot.js';
import { checkLiquidations } from './risk/liquidation.js';

const PORT = parseInt(process.env.API_PORT ?? '8081', 10);
const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/xness';

const pool = new Pool({ connectionString: DATABASE_URL });
const app = express();
app.use(cors());
app.use(express.json());

// --- Redis (for demo account state) ---
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
export const redis = createClient({ url: REDIS_URL });

// Keys for demo account state
const KEY_BALANCE = 'acct:demo:balance';
const KEY_LEVERAGE = 'acct:demo:leverage';
const KEY_ORDERS = 'acct:demo:orders';
const KEY_SNAPSHOT = 'acct:demo:snapshot';

// Helper functions
export async function initDemo() {
  // Connect if not connected
  if (!redis.isOpen) {
    await redis.connect();
  }
  // Seed defaults if absent
  const seedBal = Number(process.env.DEMO_BALANCE_USD ?? 5000);
  await redis.set(KEY_BALANCE, String(seedBal), { NX: true });
  await redis.set(KEY_LEVERAGE, String(100), { NX: true });
  await redis.set(KEY_ORDERS, JSON.stringify([]), { NX: true });
}

export async function getBalance(): Promise<number> {
  const val = await redis.get(KEY_BALANCE);
  return val ? Number(val) : 0;
}

export async function setBalance(value: number): Promise<void> {
  await redis.set(KEY_BALANCE, String(fmtUSD(value)));
}

export async function getLeverage(): Promise<number> {
  const val = await redis.get(KEY_LEVERAGE);
  return val ? Number(val) : 0;
}

export async function setLeverage(value: number): Promise<void> {
  await redis.set(KEY_LEVERAGE, String(value));
}

export async function listOrders<T = any>(): Promise<T[]> {
  const raw = await redis.get(KEY_ORDERS);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as T[]) : [];
  } catch {
    return [];
  }
}

export async function pushOrder<T = any>(order: T): Promise<void> {
  const arr = await listOrders<T>();
  arr.push(order);
  await redis.set(KEY_ORDERS, JSON.stringify(arr));
}

function normalizeAsset(a: string) {
  const up = a.toUpperCase();
  
  return up.endsWith('USDT') ? up : `${up}USDT`;
}

function toDateFromUnix(x?: string | string[]) {
  if (!x) return undefined;
  const n = Number(Array.isArray(x) ? x[0] : x);
  if (!Number.isFinite(n)) return undefined;
  const ms = n > 1_000_000_000_000 ? n : n * 1000; // accept sec or ms
  return new Date(ms);
}

function defaultLookbackMs(tf: string) {
  if (tf === '1d') return 180 * 24 * 60 * 60 * 1000; // ~6 months
  if (tf === '1w') return 365 * 24 * 60 * 60 * 1000; // ~1 year
  if (tf === '1h') return 14 * 24 * 60 * 60 * 1000;  // ~14 days
  if (tf === '4h') return 90 * 24 * 60 * 60 * 1000;  // ~3 months
  if (tf === '15m') return 30 * 24 * 60 * 60 * 1000; // ~30 days
  if (tf === '5m') return 7 * 24 * 60 * 60 * 1000; // ~7 days
  return 7 * 24 * 60 * 60 * 1000; // default 1w for 1m to ensure data coverage
}

// Keep all open orders but cap closed orders to the latest N by closedAt timestamp
function pruneClosedOrders<T extends { status?: string; closedAt?: string; createdAt?: string }>(orders: T[], maxClosed = 5): T[] {
  const open = orders.filter((o) => String(o?.status ?? 'open') === 'open');
  const ts = (o: any) => {
    const c = o?.closedAt ? Date.parse(o.closedAt) : undefined;
    const d = Number.isFinite(c as number) ? (c as number) : (o?.createdAt ? Date.parse(o.createdAt) : 0);
    return Number.isFinite(d) ? d : 0;
  };
  const closed = orders
    .filter((o) => String(o?.status ?? 'open') !== 'open')
    .sort((a, b) => ts(b) - ts(a))
    .slice(0, maxClosed);
  return [...open, ...closed];
}

app.get('/api/v1/candles', async (req, res) => {
  try {
    const tf = String(req.query.ts ?? '1m');                  // '1m' | '5m' | '15m' | '1d' | '1w'
    const asset = normalizeAsset(String(req.query.asset ?? 'BTC'));

    const end = toDateFromUnix(req.query.endTime as string | string[] | undefined) ?? new Date();
    const start =
      toDateFromUnix(req.query.startTime as string | string[] | undefined) ??
      new Date(end.getTime() - defaultLookbackMs(tf));

    if (!(start instanceof Date) || !(end instanceof Date) || start >= end) {
      return res.status(400).json({ error: 'invalid_time_range' });
    }

    // Roll up raw trades into OHLCV buckets on the fly using time_bucket over trades.
    // We avoid relying on a prebuilt trades_1m table so the API works out-of-the-box.
    let interval: string;
    if (tf === '1m') interval = '1 minute';
    else if (tf === '5m') interval = '5 minutes';
    else if (tf === '15m') interval = '15 minutes';
    else if (tf === '1h') interval = '1 hour';
    else if (tf === '4h') interval = '4 hours';
    else if (tf === '1d') interval = '1 day';
    else if (tf === '1w') interval = '1 week';
    else return res.status(400).json({ error: 'invalid_timeframe' });

    const q = `
      SELECT
        time_bucket($4::interval, "time") AS bkt,
        (array_agg(price ORDER BY "time" ASC))[1]   AS open,
        max(price)                                  AS high,
        min(price)                                  AS low,
        (array_agg(price ORDER BY "time" DESC))[1]  AS close,
        sum(quantity)::float8                       AS volume
      FROM trades
      WHERE asset = $1
        AND "time" >= $2
        AND "time" <  $3
      GROUP BY bkt
      ORDER BY bkt;
    `;
    const { rows } = await pool.query(q, [asset, start, end, interval]);
    return res.json({
      candles: rows.map((r: any) => ({
        timestamp: Math.floor(new Date(r.bkt).getTime() / 1000),
        open: Number(r.open),
        close: Number(r.close),
        high: Number(r.high),
        low: Number(r.low),
        decimal: 4,
      })),
    });
  } catch (e) {
    console.error('[api] /api/v1/candles error:', e);
    res.status(500).json({ error: 'internal_error' });
  }
});

app.get('/api/v1/last', async (_req, res) => {
  try {
    const q = `
      SELECT DISTINCT ON (asset)
             asset, "time" AS ts, price, quantity
      FROM trades
      ORDER BY asset, "time" DESC;
    `;
    const { rows } = await pool.query(q);
    res.json(rows);
  } catch (e) {
    console.error('[api] /api/v1/last error:', e);
    res.status(500).json({ error: 'internal_error' });
  }
});

// Utility to normalize symbol toward USDT-based symbols
function ensureUsdt(sym: string): string {
  const s = String(sym || '').toUpperCase();
  if (!s) return 'BTCUSDT';
  if (s.endsWith('USDT')) return s;
  if (s.endsWith('USD')) return s.replace(/USD$/, 'USDT');
  // raw asset like 'BTC' -> 'BTCUSDT'
  return `${s}USDT`;
}

async function getLatestPriceForSymbol(symbol: string): Promise<number | undefined> {
  const sym = ensureUsdt(symbol);
  // Try Redis first: price:last:<SYMBOL>
  try {
    if (!redis.isOpen) {
      await redis.connect();
    }
    const key = `price:last:${sym}`;
    const val = await redis.get(key);
    if (val != null) {
      const p = Number(val);
      if (Number.isFinite(p)) return p;
    }
  } catch (e) {
    // ignore and fallback to PG
  }

  // Fallback to Postgres: latest trade price
  try {
    const q = `SELECT price FROM trades WHERE asset = $1 ORDER BY "time" DESC LIMIT 1`;
    const { rows } = await pool.query(q, [sym]);
    if (rows && rows[0] && rows[0].price != null) {
      const p = Number(rows[0].price);
      if (Number.isFinite(p)) return p;
    }
  } catch (e) {
    console.error('[api] getLatestPriceForSymbol PG error:', e);
  }
  return undefined;
}

// Legacy snapshot (kept for leverage endpoint only) – new risk engine provides authoritative metrics
async function computeAccountSnapshot() {
  // Ensure demo state exists
  await initDemo();

  const [balanceRaw, leverage, orders] = await Promise.all([
    getBalance(),
    getLeverage(),
    listOrders<any>(),
  ]);

  // Cache latest prices per symbol to minimize lookups
  const priceCache = new Map<string, number>();
  let unrealized = 0;
  let marginUsed = 0;

  for (const raw of orders) {
    if (!raw || typeof raw !== 'object') continue;
    if (String(raw.status ?? 'open') !== 'open') continue; // only open orders affect unrealized/margin
    const sym = ensureUsdt(
      (raw.asset ?? raw.symbol ?? raw.pair ?? raw.ticker ?? raw.instrument ?? 'BTC') as string
    );
    // Side
    const sideRaw = String(raw.side ?? raw.type ?? '').toUpperCase();
    const isBuy = sideRaw === 'BUY' || sideRaw === 'LONG' || sideRaw === 'B';
    const isSell = sideRaw === 'SELL' || sideRaw === 'SHORT' || sideRaw === 'S';
    if (!isBuy && !isSell) continue; // skip unknown

    // Entry price and volume
    const entry = Number(raw.entry ?? raw.entryPrice ?? raw.price);
    const volume = Number(raw.volume ?? raw.qty ?? raw.quantity);
    if (!Number.isFinite(entry) || !Number.isFinite(volume)) continue;

    // Latest price
    let last = priceCache.get(sym);
    if (last == null) {
      const p = await getLatestPriceForSymbol(sym);
      if (p != null) {
        last = p;
        priceCache.set(sym, p);
      }
    }
    if (last == null) continue; // skip if no price

    // PnL
    const pnl = (isBuy ? (last - entry) : (entry - last)) * volume;
    unrealized += pnl;

    // Margin used for this order
    let m = raw.requiredMargin;
    let mNum = Number(m);
    if (!Number.isFinite(mNum)) {
      // Fallback: not provided -> approximate using leverage
      const lev = leverage || 1;
      mNum = (entry * volume) / lev;
    }
    if (Number.isFinite(mNum)) marginUsed += mNum;
  }

  const equity = fmtUSD(balanceRaw + unrealized);
  const freeMargin = fmtUSD(balanceRaw - marginUsed);
  const marginLevelPct = marginUsed > 0 ? (equity / marginUsed) * 100 : null;

  const balance = fmtUSD(balanceRaw);
  return { balance, equity, freeMargin, marginUsed: fmtUSD(marginUsed), marginLevelPct, leverage };
}

app.get('/api/v1/account', async (_req, res) => {
  try {
    await initDemo();
    const prices = await gatherPrices();
    const snap = await computeSnapshot(redis, prices);
    await redis.set(KEY_SNAPSHOT, JSON.stringify(snap));
    return res.json(snap);
  } catch (e) {
    console.error('[api] /api/v1/account error:', e);
    return res.status(500).json({ error: 'internal_error' });
  }
});
// Helper: gather latest prices for all open symbols
async function gatherPrices(): Promise<Record<string, number>> {
  await initDemo();
  const orders = await listOrders<any>();
  const symbols = new Set<string>();
  for (const o of orders) if (o && String(o.status ?? 'open') === 'open') symbols.add(ensureUsdt(String(o.symbol)));
  const prices: Record<string, number> = {};
  for (const s of symbols) {
    const p = await getLatestPriceForSymbol(s);
    if (Number.isFinite(p as number)) prices[s] = Number(p);
  }
  return prices;
}

app.get('/api/v1/positions', async (_req, res) => {
  try {
    await initDemo();
    const orders = await listOrders<any>();
    return res.json(orders);
  } catch (e) {
    console.error('[api] /api/v1/positions error:', e);
    return res.status(500).json({ error: 'internal_error' });
  }
});

app.post('/api/v1/reset-demo', async (_req, res) => {
  try {
    await initDemo();
    const startBal = Number(process.env.DEMO_BALANCE_USD ?? 5000);
    await redis.set(KEY_BALANCE, String(startBal));
    await redis.set(KEY_ORDERS, JSON.stringify([]));
    const prices = await gatherPrices();
    const snap = await computeSnapshot(redis, prices);
    await redis.set(KEY_SNAPSHOT, JSON.stringify(snap));
    return res.json({ ok: true, balance: startBal, snapshot: snap });
  } catch (e) {
    console.error('[api] /api/v1/reset-demo error:', e);
    return res.status(500).json({ error: 'internal_error' });
  }
});

app.post('/api/v1/leverage', async (req, res) => {
  try {
  const allowed = new Set([5, 10, 20, 25, 50, 100]);
    const body = req.body ?? {};
    const levNum = Number(body.leverage);
    if (!Number.isFinite(levNum) || !allowed.has(levNum)) {
      return res.status(400).json({ error: 'invalid_leverage', allowed: Array.from(allowed) });
    }
    await initDemo();
    await setLeverage(levNum);
    const snapshot = await computeAccountSnapshot();
    return res.json(snapshot);
  } catch (e) {
    console.error('[api] /api/v1/leverage error:', e);
    return res.status(500).json({ error: 'internal_error' });
  }
});

// --- Orders ---
app.get('/api/v1/orders', async (_req, res) => {
  try {
    await initDemo();
    const orders = await listOrders<any>();
    const pruned = pruneClosedOrders(orders, 5);
    // Persist pruned list so storage doesn't grow with old closed orders
    if (JSON.stringify(pruned) !== JSON.stringify(orders)) {
      await redis.set(KEY_ORDERS, JSON.stringify(pruned));
    }
    return res.json({ orders: pruned });
  } catch (e) {
    console.error('[api] /api/v1/orders GET error:', e);
    return res.status(500).json({ error: 'internal_error' });
  }
});

app.post('/api/v1/orders', async (req, res) => {
  try {
    await initDemo();
    const body = req.body as any || {};
    // Contract validation
    const rawSymbol = String(body.symbol || '').trim();
    const rawSide = String(body.side || '').toUpperCase();
    const mode = body.mode as string;
    if (!rawSymbol) return res.status(422).json({ error: 'MISSING_SYMBOL' });
    if (!(rawSide === 'BUY' || rawSide === 'SELL')) return res.status(422).json({ error: 'BAD_SIDE' });
    if (!mode || !['UNITS','NOTIONAL'].includes(mode)) return res.status(422).json({ error: 'BAD_MODE' });
    if ('volume' in body) return res.status(422).json({ error: 'VOLUME_DEPRECATED_USE_MODE' });
    const Lraw = Number(body.leverage);
    if (!Number.isFinite(Lraw) || Lraw <= 0) return res.status(422).json({ error: 'LEVERAGE_REQUIRED' });
    const L = Math.max(1, Math.min(100, Math.floor(Lraw)));
    if (mode === 'UNITS' && !(Number(body.qtyUnits) > 0)) return res.status(422).json({ error: 'QTY_UNITS_REQUIRED' });
    if (mode === 'NOTIONAL' && !(Number(body.notionalUsd) > 0)) return res.status(422).json({ error: 'NOTIONAL_REQUIRED' });
    if (mode === 'UNITS' && Number(body.qtyUnits) > 0 && Number(body.notionalUsd) > 0) {
      // Consistency check if both provided
      // Will recompute notional from mark and compare
    }
    const symbol = ensureUsdt(rawSymbol);
    const mark = await getLatestPriceForSymbol(symbol);
    if (!Number.isFinite(mark as number) || !(mark as number > 0)) return res.status(503).json({ error: 'PRICE_UNAVAILABLE', symbol });
    const qtyUnits = mode === 'UNITS' ? Number(body.qtyUnits) : (Number(body.notionalUsd) / (mark as number));
    if (!(qtyUnits > 0)) return res.status(422).json({ error: 'UNITS_COMPUTE_FAILED' });
    // Optional consistency if both present
    if (mode === 'UNITS' && Number(body.notionalUsd) > 0) {
      const diff = Math.abs((Number(body.notionalUsd) / (mark as number)) - qtyUnits);
      if (diff / qtyUnits > 0.001) return res.status(422).json({ error: 'CONFLICTING_FIELDS' });
    }
    const notional = Math.abs(qtyUnits) * (mark as number);
    const initMargin = notional / L;
    // Current free from snapshot
    const prices = await gatherPrices();
    const snapBefore = await computeSnapshot(redis, prices);
    const freeBefore = snapBefore.free;
    if (freeBefore < initMargin) {
      return res.status(400).json({ error: 'INSUFFICIENT_FREE_MARGIN', free: Number(freeBefore.toFixed(2)), required: Number(initMargin.toFixed(2)), details: { notional: Number(notional.toFixed(2)), leverage: L, units: Number(qtyUnits.toFixed(8)), mark } });
    }
    const tpRaw = body.tp; const slRaw = body.sl;
    const tp = tpRaw != null && tpRaw !== '' ? Number(tpRaw) : undefined;
    const sl = slRaw != null && slRaw !== '' ? Number(slRaw) : undefined;
    const order = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      createdAt: new Date().toISOString(),
      symbol,
      side: rawSide,
      type: 'market' as const,
      volume: qtyUnits, // store exact user units
      entry: mark,
      requiredMargin: initMargin,
      leverage: L,
      status: 'open' as const,
      tp: Number.isFinite(tp as number) ? tp : undefined,
      sl: Number.isFinite(sl as number) ? sl : undefined,
      take_profit: Number.isFinite(tp as number) ? tp : undefined,
      stop_loss: Number.isFinite(sl as number) ? sl : undefined,
      mode,
    };
  await pushOrder(order);
  // After placing order run strict liquidation then snapshot
  const pricesAfter = await gatherPrices();
  await checkLiquidations(redis, pricesAfter);
  const snapAfter = await computeSnapshot(redis, pricesAfter);
  await redis.set(KEY_SNAPSHOT, JSON.stringify(snapAfter));
    try { console.log('[placeOrder]', { mode, units: qtyUnits, notional, leverage: L, initMargin, freeBefore, mark, id: order.id }); } catch {}
    try { if (!redis.isOpen) await redis.connect(); await redis.publish('orders', JSON.stringify({ event: 'order:placed', order })); } catch {}
    return res.json({ ok: true, order, account: snapAfter });
  } catch (e) {
    console.error('[api] /api/v1/orders POST error:', e);
    return res.status(500).json({ error: 'internal_error' });
  }
});

// Start SL/TP watcher (event-driven on trade ticks)
startSlTpWatcher().catch(e => console.error('[api] sl/tp watcher start error', e));

// (Removed old simple liquidation loop) strict liquidation enforced in snapshot loop below.

// Close an open order: realize PnL into balance and mark as closed
app.post('/api/v1/orders/:id/close', async (req, res) => {
  try {
    await initDemo();
    const id = String(req.params.id || '');
    if (!id) return res.status(400).json({ error: 'missing_id' });

    // Load all orders
    const orders = await listOrders<any>();
    const idx = orders.findIndex((o: any) => String(o?.id) === id);
    if (idx < 0) return res.status(404).json({ error: 'order_not_found' });
    const o = orders[idx];
    if (String(o.status ?? 'open') !== 'open') return res.status(409).json({ error: 'not_open' });

    const symbol = ensureUsdt(String(o.symbol || o.asset || 'BTCUSDT'));
    const entry = Number(o.entry);
    const volume = Number(o.volume);
    const side = String(o.side || '').toUpperCase();
    if (!Number.isFinite(entry) || !Number.isFinite(volume)) return res.status(400).json({ error: 'invalid_order_values' });

    const last = await getLatestPriceForSymbol(symbol);
    if (!Number.isFinite(last as number)) return res.status(503).json({ error: 'price_unavailable', symbol });

    const pnl = (side === 'BUY' ? ((last as number) - entry) : (entry - (last as number))) * volume;

    // Update balance: realize PnL
    const bal = await getBalance();
    await setBalance(bal + pnl);

    // Mark order closed
    const closedAt = new Date().toISOString();
  const updated = { ...o, status: 'closed', exit: Number(last), pnl, closedAt, closedBy: 'manual' };
  orders[idx] = updated;
  const persisted = pruneClosedOrders(orders, 5);
  await redis.set(KEY_ORDERS, JSON.stringify(persisted));

    // Publish event
    try {
      if (!redis.isOpen) await redis.connect();
      await redis.publish('orders', JSON.stringify({ event: 'order:closed', order: updated }));
    } catch (e) {
      console.error('[api] publish order close error:', e);
    }

    // Return new account snapshot and updated order
    // Enforce after close for updated snapshot
  const prices = await gatherPrices();
  await checkLiquidations(redis, prices);
  const snap = await computeSnapshot(redis, prices);
  await redis.set(KEY_SNAPSHOT, JSON.stringify(snap));
  return res.json({ ok: true, order: updated, account: snap });
  } catch (e) {
    console.error('[api] /api/v1/orders/:id/close error:', e);
    return res.status(500).json({ error: 'internal_error' });
  }
});

// Reset demo account state
app.post('/api/v1/reset', async (_req, res) => {
  try {
    await initDemo();
    if (!redis.isOpen) await redis.connect();
    return res.json({ ok: true });
  } catch (e) {
    console.error('[api] /api/v1/reset error:', e);
    return res.status(500).json({ error: 'internal_error' });
  }
});

// Periodic enforcement loop (authoritative snapshot maintenance)
setInterval(async () => {
  try {
    await initDemo();
    const prices = await gatherPrices();
    await checkLiquidations(redis, prices);
    const snap = await computeSnapshot(redis, prices);
    await redis.set(KEY_SNAPSHOT, JSON.stringify(snap));
  } catch {/* ignore */}
}, 1000);

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
