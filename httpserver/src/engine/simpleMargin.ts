export type Side = 'buy' | 'sell';

export interface Position {
  id: string;
  symbol: 'BTCUSDT' | 'ETHUSDT' | 'SOLUSDT' | string;
  side: Side;                 // buy=long, sell=short
  entryPrice: number;
  size: number;               // base units
  leverage: 1 | 5 | 10 | 20 | 100 | number;
  notional: number;           // entryPrice * size
  usedMargin: number;         // notional / leverage (locked)
  status: 'open' | 'closed' | 'liquidated';
  openedAt: number;
  closedAt?: number;
  closedPrice?: number;
  realizedPnl?: number;
}

export interface Account {
  id: string;
  balance: number;            // wallet collateral
  equity: number;             // balance + Σ uPnL(open)
  positions: Position[];
}

export const LIQ_THRESHOLD = 0.01; // 1% adverse move

export function unrealizedPnl(p: Position, mark: number): number {
  const diff = p.side === 'buy' ? (mark - p.entryPrice) : (p.entryPrice - mark);
  return diff * p.size;
}

export function freeMargin(acct: Account): number {
  const locked = acct.positions
    .filter(p => p.status === 'open')
    .reduce((s, p) => s + p.usedMargin, 0);
  return Math.max(0, acct.balance - locked);
}

export function computeEquity(acct: Account, prices: Record<string, number>): number {
  const u = acct.positions
    .filter(p => p.status === 'open')
    .reduce((s, p) => {
      const mk = prices[p.symbol];
      if (!Number.isFinite(mk)) return s;
      return s + unrealizedPnl(p, Number(mk));
    }, 0);
  acct.equity = acct.balance + u;
  return acct.equity;
}

export function adverseMovePct(p: Position, mark: number): number {
  const pct = (mark - p.entryPrice) / p.entryPrice;
  return p.side === 'buy' ? Math.max(0, -pct) : Math.max(0, pct);
}

export function maybeLiquidate(acct: Account, p: Position, mark: number) {
  if (p.status !== 'open') return;
  if (adverseMovePct(p, mark) >= LIQ_THRESHOLD) {
    const pnl = unrealizedPnl(p, mark);
    const realized = Math.max(pnl, -p.usedMargin); // cap loss at locked margin
    acct.balance = Math.max(acct.balance + realized, 0);
    p.status = 'liquidated';
    p.closedAt = Date.now();
    p.closedPrice = mark;
    p.realizedPnl = realized;
  }
}

export function onPriceTick(acct: Account, prices: Record<string, number>) {
  computeEquity(acct, prices);
  for (const p of acct.positions) {
    const mark = prices[p.symbol];
    if (!Number.isFinite(mark)) continue;
    maybeLiquidate(acct, p, Number(mark));
  }
  computeEquity(acct, prices);
}

export function openPosition(
  acct: Account,
  { symbol, side, size, leverage, entryPrice }:
  { symbol: Position['symbol'], side: Side, size: number, leverage: Position['leverage'], entryPrice: number }
) {
  const notional = entryPrice * size;
  const usedMargin = notional / (Number(leverage) || 1);
  if (usedMargin > freeMargin(acct)) {
    throw new Error('Insufficient free margin');
  }
  const pos: Position = {
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
    symbol, side, size, leverage, entryPrice,
    notional, usedMargin,
    status: 'open',
    openedAt: Date.now(),
  };
  acct.positions.push(pos);
  return pos;
}

export function closePosition(acct: Account, posId: string, mark: number) {
  const p = acct.positions.find(x => x.id === posId);
  if (!p || p.status !== 'open') return;
  const pnl = unrealizedPnl(p, mark);
  acct.balance = Math.max(acct.balance + pnl, 0);
  p.status = 'closed';
  p.closedAt = Date.now();
  p.closedPrice = mark;
  p.realizedPnl = pnl;
}
