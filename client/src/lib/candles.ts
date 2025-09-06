// Candle utilities for 1m data handling & aggregation
// All candle.time values are in SECONDS (unix, start-of-minute)

export type Candle = {
  time: number; // seconds, start-of-minute
  open: number;
  high: number;
  low: number;
  close: number;
};

// Convert a millisecond timestamp to start-of-minute (seconds)
export function toMinute(tsMs: number): number {
  return Math.floor(tsMs / 60000) * 60;
}

// Upsert (update or insert) the current 1m candle given a price tick in ms.
// Returns the candle that was inserted/updated.
export function upsert1m(arr: Candle[], price: number, tsMs: number): Candle {
  const bucket = toMinute(tsMs);
  const last = arr[arr.length - 1];
  if (!last || last.time !== bucket) {
    const c: Candle = { time: bucket, open: price, high: price, low: price, close: price };
    arr.push(c);
    return c;
  }
  // update existing minute
  if (price > last.high) last.high = price;
  if (price < last.low) last.low = price;
  last.close = price;
  return last;
}

// Aggregate 1m candles into 5m / 15m groups.
export function aggregateN(arr: Candle[], n: 5 | 15): Candle[] {
  if (!arr.length) return [];
  const out: Candle[] = [];
  for (let i = 0; i < arr.length; i += n) {
    const group = arr.slice(i, i + n);
    if (!group.length) continue;
    const first = group[0];
    const last = group[group.length - 1];
    let high = first.high;
    let low = first.low;
    for (let j = 1; j < group.length; j++) {
      const c = group[j];
      if (c.high > high) high = c.high;
      if (c.low < low) low = c.low;
    }
    out.push({ time: first.time, open: first.open, high, low, close: last.close });
  }
  return out;
}

// Deterministic-ish pseudo random generator (mulberry32)
function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function () {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// Seed a history of 1m candles with small price drift.
// startPrice acts as part of the seed so symbols can have stable patterns.
export function seedCandles(startPrice: number, count = 120): Candle[] {
  const rand = mulberry32(Math.floor(startPrice) ^ count ^ 0x9e3779b1);
  const nowSec = Math.floor(Date.now() / 1000);
  // align end at start-of-minute (exclude current forming minute for stability)
  const endBucket = toMinute(nowSec * 1000) - 60;
  const firstBucket = endBucket - (count - 1) * 60;
  const out: Candle[] = [];
  let price = startPrice;
  for (let i = 0; i < count; i++) {
    const t = firstBucket + i * 60;
    // random small drift ±0.2% max
    const driftPct = (rand() - 0.5) * 0.004; // ±0.2%
    const open = price;
    price = Math.max(0.0001, price * (1 + driftPct));
    const close = price;
    const high = Math.max(open, close) * (1 + rand() * 0.001);
    const low = Math.min(open, close) * (1 - rand() * 0.001);
    out.push({ time: t, open, high, low, close });
  }
  return out;
}

// Re-export in a convenient bundle if desired by consumers
export default {
  toMinute,
  upsert1m,
  aggregateN,
  seedCandles,
};