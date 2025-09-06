import { createClient } from 'redis';
import { redis, listOrders, getBalance, setBalance, initDemo } from './index.js';

// SL/TP watcher (precision & canonical symbol aware)
// - Normalizes incoming tick symbol → canonical (e.g. BTC, BTCT, BTCUSD ⇒ BTCUSDT)
// - Scales all numeric comparisons using per-symbol decimals so we never compare floats
// - Uses <= / >= operators per spec (not strict) with TP priority if both crossed
// - Maintains idempotency via Redis SET NX lock (3s TTL)
// NOTE: Current demo storage uses Redis JSON (orders) not a SQL positions table.
//       We mimic the intended single-row UPDATE by reloading the order list and
//       persisting only once. Introducing actual SQL here would exceed scope.

const sub = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
let ready = false;

async function ensureSub() {
  if (!sub.isOpen) {
    await sub.connect();
    ready = true;
  }
}

interface ClosedOrderEvent { event: 'order:closed'; order: any }
interface AlertEvent { userId: string; type: 'TP_HIT' | 'SL_HIT'; symbol: string; positionId: string; price: string; time: number }

// Decimals map (extend as needed). Using 3 decimals for demo (sample shows 110201.79 → 110201790 @ 3dp)
export const DECIMALS: Record<string, number> = {
  BTCUSDT: 3,
  ETHUSDT: 3,
  SOLUSDT: 3,
};

function toCanon(sym: string): string {
  const s = String(sym || '').toUpperCase();
  if (!s) return 'BTCUSDT';
  if (s === 'BTC' || s === 'BTCT' || s === 'BTCUSD') return 'BTCUSDT';
  if (s === 'ETH' || s === 'ETHUSD') return 'ETHUSDT';
  if (s === 'SOL' || s === 'SOLUSD') return 'SOLUSDT';
  if (s.endsWith('USDT')) return s; // already canonical
  if (s.endsWith('USD')) return s.replace(/USD$/, 'USDT');
  return s + 'USDT';
}

function scale(sym: string, priceNum: number): bigint {
  const canon = toCanon(sym);
  const dec = DECIMALS[canon] ?? 3;
  // guard NaN
  if (!Number.isFinite(priceNum)) return 0n;
  const factor = 10 ** dec;
  return BigInt(Math.round(priceNum * factor));
}

function ensureScaled(sym: string, raw: any): bigint | null {
  if (raw == null) return null;
  if (typeof raw === 'bigint') return raw;
  const num = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(num)) return null;
  return scale(sym, num);
}

function tpHit(side: string, lastScaled: bigint, tpScaled: bigint | null) {
  if (tpScaled == null) return false;
  return side === 'BUY' ? lastScaled >= tpScaled : lastScaled <= tpScaled;
}
function slHit(side: string, lastScaled: bigint, slScaled: bigint | null) {
  if (slScaled == null) return false;
  return side === 'BUY' ? lastScaled <= slScaled : lastScaled >= slScaled;
}

async function tryCloseOrder(order: any, lastScaled: bigint, lastUnscaled: number, hit: 'TP_HIT' | 'SL_HIT') {
  const lockKey = `lock:close:${order.id}`;
  try {
    if (!redis.isOpen) await redis.connect();
    const locked = await redis.set(lockKey, '1', { NX: true, EX: 3 });
    if (!locked) { console.log(`[SLTP] lock-skip id=${order.id}`); return; }
  } catch {
    return; // can't lock -> skip
  }
  // Reload orders to ensure latest state & idempotency
  const orders = await listOrders<any>();
  const idx = orders.findIndex((o: any) => String(o?.id) === String(order.id));
  if (idx < 0) return;
  const live = orders[idx];
  if (String(live.status ?? 'open') !== 'open') return; // already closed

  const side = String(live.side || '').toUpperCase();
  const entry = Number(live.entry);
  const vol = Number(live.volume);
  if (!Number.isFinite(entry) || !Number.isFinite(vol) || vol <= 0) return;
  const pnl = (side === 'BUY' ? (lastUnscaled - entry) : (entry - lastUnscaled)) * vol;
  // Realize PnL into balance
  const bal = await getBalance();
  await setBalance(bal + pnl);
  const closedAt = new Date().toISOString();
  const updated = { ...live, status: 'closed', exit: lastUnscaled, pnl, closedAt, closedBy: 'auto' };
  orders[idx] = updated;
  // Persist pruned set (reuse logic from index via direct redis set to avoid circular import)
  try {
    const raw = JSON.stringify(orders);
    await redis.set('acct:demo:orders', raw);
  } catch {}
  // Publish order closure + alert
  try {
    if (!redis.isOpen) await redis.connect();
    const closedMsg: ClosedOrderEvent = { event: 'order:closed', order: updated };
    await redis.publish('orders', JSON.stringify(closedMsg));
    const alert: AlertEvent = { userId: 'demo', type: hit, symbol: toCanon(updated.symbol), positionId: updated.id, price: lastScaled.toString(), time: Date.now() };
    await redis.publish('alerts', JSON.stringify(alert));
  } catch {}
  console.log(`[SLTP] closed id=${order.id} reason=${hit === 'TP_HIT' ? 'TP' : 'SL'} at=${lastScaled}`);
}

async function onTick(rawSymbol: string, priceNum: number) {
  await initDemo();
  const canon = toCanon(rawSymbol);
  const lastScaled = scale(canon, priceNum);
  const lastUnscaled = priceNum; // keep original for PnL & storage
  const orders = await listOrders<any>();
  for (const o of orders) {
    if (!o || String(o.status ?? 'open').toUpperCase() !== 'OPEN') continue;
    const symCanon = toCanon(String(o.symbol || ''));
    if (symCanon !== canon) continue;
    const side = String(o.side || '').toUpperCase();
    const tpScaled = ensureScaled(canon, o.tp);
    const slScaled = ensureScaled(canon, o.sl);
    if (!tpScaled && !slScaled) continue; // ignore if neither set
    const tpTriggered = tpHit(side === 'SELL' ? 'SELL' : 'BUY', lastScaled, tpScaled);
    const slTriggered = slHit(side === 'SELL' ? 'SELL' : 'BUY', lastScaled, slScaled);
    if (!tpTriggered && !slTriggered) continue;
    // TP priority
    const hit: 'TP_HIT' | 'SL_HIT' = tpTriggered ? 'TP_HIT' : 'SL_HIT';
    console.log(`[SLTP] cand id=${o.id} side=${side} last=${lastScaled} sl=${slScaled ?? 'null'} tp=${tpScaled ?? 'null'}`);
    await tryCloseOrder(o, lastScaled, lastUnscaled, hit);
  }
}

export async function startSlTpWatcher() {
  await ensureSub();
  sub.on('error', (e) => console.error('[sl_tp] redis sub error', e));
  await sub.subscribe('trades', async (message) => {
    try {
      const data = JSON.parse(message);
      const asset = data.asset || data.symbol;
      const price = Number(data.price || data.last || data.p);
      if (!asset || !Number.isFinite(price)) return;
      await onTick(String(asset), price);
    } catch {}
  });
  console.log('[sl_tp] watcher subscribed to trades');
}
