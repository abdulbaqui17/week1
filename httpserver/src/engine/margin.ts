// Margin engine implementing:
// - usedMargin locking: usedMargin = notional / leverage
// - freeMargin = balance - sum(usedMargin)
// - liquidation when adverse move >= 1/leverage (loss capped at locked margin)
// - special 100x rule: lock entire free balance as used margin and scale size

import { randomUUID } from 'crypto';

export type Side = 'buy' | 'sell';
export type Sym = 'BTCUSDT' | 'ETHUSDT' | 'SOLUSDT';

export interface Position {
  id: string;
  symbol: Sym;
  side: Side;                // buy=long, sell=short
  entryPrice: number;
  size: number;              // base units (e.g., 0.05 BTC)
  leverage: 1 | 5 | 10 | 20 | 100;
  notional: number;          // entryPrice * size
  usedMargin: number;        // locked margin
  status: 'open' | 'closed' | 'liquidated';
  openedAt: number;
  closedAt?: number;
  closedPrice?: number;
  realizedPnl?: number;
}

export interface Account {
  id: string;
  balance: number;           // wallet collateral
  equity: number;            // balance + Σ uPnL(open)
  positions: Position[];
}

export const CONFIG = {
  REQUIRE_FULL_BALANCE_ON_100X: true,  // ensures balance hits 0 on 1% loss
  FEE_RATE: 0,                         // 0 for now
};

export function unrealizedPnl(p: Position, mark: number): number {
  const d = p.side === 'buy' ? (mark - p.entryPrice) : (p.entryPrice - mark);
  return d * p.size;
}

export function lockedMargin(acct: Account): number {
  return acct.positions
    .filter(p => p.status === 'open')
    .reduce((s, p) => s + p.usedMargin, 0);
}

export function freeMargin(acct: Account): number {
  return Math.max(0, acct.balance - lockedMargin(acct));
}

export function computeEquity(acct: Account, prices: Record<Sym, number>): number {
  const u = acct.positions
    .filter(p => p.status === 'open')
    .reduce((s, p) => s + unrealizedPnl(p, prices[p.symbol]), 0);
  acct.equity = acct.balance + u;
  return acct.equity;
}

/** Adverse move (always positive when adverse) */
export function adverseMovePct(p: Position, mark: number): number {
  const pct = (mark - p.entryPrice) / p.entryPrice;
  return p.side === 'buy' ? Math.max(0, -pct) : Math.max(0, pct);
}

/** Force-close + realize loss (capped at locked margin). */
export function liquidatePosition(acct: Account, p: Position, mark: number) {
  if (p.status !== 'open') return;

  const pnl = unrealizedPnl(p, mark);
  const fee = p.notional * CONFIG.FEE_RATE;
  const realized = Math.max(pnl - fee, -p.usedMargin); // can’t lose > locked

  acct.balance = Math.max(0, acct.balance + realized); // deduct loss
  p.status = 'liquidated';
  p.closedAt = Date.now();
  p.closedPrice = mark;
  p.realizedPnl = realized;

  // TODO: persist + emit events if needed
}

/** Price tick: liquidate when adverse >= 1/leverage. */
export function onPriceTick(acct: Account, prices: Record<Sym, number>) {
  computeEquity(acct, prices);

  for (const p of acct.positions) {
    if (p.status !== 'open') continue;
    const mark = prices[p.symbol];
    if (typeof mark !== 'number' || !Number.isFinite(mark)) continue;
    const threshold = 1 / p.leverage; // e.g., 100× → 0.01
    if (adverseMovePct(p, mark) >= threshold) {
      liquidatePosition(acct, p, mark);
    }
  }

  computeEquity(acct, prices);
}

/**
 * Open position with margin locking.
 * For 100× and CONFIG.REQUIRE_FULL_BALANCE_ON_100X=true:
 * - Post the ENTIRE free balance as usedMargin.
 * - Auto-scale size to match usedMargin (= freeBalance), so a 1% loss wipes it to 0.
 */
export function openPosition(
  acct: Account,
  { symbol, side, leverage, entryPrice, size }:
  { symbol: Sym; side: Side; leverage: Position['leverage']; entryPrice: number; size: number; }
): Position {
  let notional = entryPrice * size;
  let usedMargin = notional / leverage;

  if (leverage === 100 && CONFIG.REQUIRE_FULL_BALANCE_ON_100X) {
    // Force full-balance margin posting for 100×
    const fm = freeMargin(acct);
    if (fm <= 0) throw new Error('No free margin');
    usedMargin = fm;                       // lock ALL free margin
    notional = usedMargin * leverage;      // exposure
    size = notional / entryPrice;          // scale size accordingly
  } else {
    if (usedMargin > freeMargin(acct)) {
      throw new Error('Insufficient free margin');
    }
  }

  const pos: Position = {
    id: randomUUID(),
    symbol, side, size, leverage, entryPrice,
    notional, usedMargin,
    status: 'open',
    openedAt: Date.now(),
  };

  acct.positions.push(pos); // locking is implicit via freeMargin()
  return pos;
}

/** Manual close (non-liquidation) */
export function closePosition(acct: Account, posId: string, mark: number) {
  const p = acct.positions.find(x => x.id === posId);
  if (!p || p.status !== 'open') return;
  const pnl = unrealizedPnl(p, mark);
  acct.balance = Math.max(0, acct.balance + pnl);
  p.status = 'closed';
  p.closedAt = Date.now();
  p.closedPrice = mark;
  p.realizedPnl = pnl;
}
