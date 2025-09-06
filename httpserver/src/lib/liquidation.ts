// Minimal, framework-agnostic liquidation engine for demo accounts
export type Side = "long" | "short";

export interface Position {
  id: string;
  symbol: "BTCUSDT" | "ETHUSDT" | "SOLUSDT" | string;
  side: Side;
  entryPrice: number;
  size: number; // base units
  leverage: 5 | 10 | 20 | 100 | number;
  notional: number; // entryPrice * size
  usedMargin: number; // notional / leverage
  status: "open" | "closed" | "liquidated";
  openedAt: number; // ms
  closedAt?: number; // ms
  closedPrice?: number;
  realizedPnl?: number;
}

export interface Account {
  id: string;
  balance: number;
  equity: number;
  positions: Position[];
}

export function getMMR(leverage: number): number {
  if (leverage >= 100) return 0.01;
  if (leverage >= 20) return 0.009;
  if (leverage >= 10) return 0.007;
  return 0.005; // 5x default
}

export function unrealizedPnl(pos: Position, markPrice: number): number {
  const diff = pos.side === "long" ? markPrice - pos.entryPrice : pos.entryPrice - markPrice;
  return diff * pos.size;
}

export function computeEquity(acct: Account, priceMap: Record<string, number>): number {
  let uPnl = 0;
  for (const p of acct.positions) {
    if (p.status !== "open") continue;
    const mk = priceMap[p.symbol];
    if (!Number.isFinite(mk)) continue;
    const mark = Number(mk);
    uPnl += unrealizedPnl(p, mark);
  }
  acct.equity = acct.balance + uPnl;
  return acct.equity;
}

export function shouldLiquidate(acct: Account, priceMap: Record<string, number>, buffer = 0): boolean {
  let maint = 0;
  for (const p of acct.positions) {
    if (p.status !== "open") continue;
    maint += p.usedMargin * getMMR(p.leverage);
  }
  const equity = computeEquity(acct, priceMap);
  return equity <= maint + buffer;
}

export function liquidateAll(
  acct: Account,
  priceMap: Record<string, number>,
  feeRate = 0
): { realizedTotal: number; liquidated: Position[] } {
  let realizedTotal = 0;
  const liq: Position[] = [];
  for (const p of acct.positions) {
    if (p.status !== "open") continue;
  const mk = priceMap[p.symbol];
  if (!Number.isFinite(mk)) continue;
  const mark = Number(mk);
  const pnl = unrealizedPnl(p, mark);
    const fee = p.notional * feeRate;
    const realized = Math.max(pnl - fee, -p.usedMargin); // cap loss at posted margin
    realizedTotal += realized;

    p.status = "liquidated";
    p.closedAt = Date.now();
  p.closedPrice = mark;
    p.realizedPnl = realized;
    liq.push(p);
  }
  // Prevent negative balance (demo safety)
  acct.balance = Math.max(acct.balance + realizedTotal, 0);
  computeEquity(acct, priceMap);
  return { realizedTotal, liquidated: liq };
}

// Optional: indicative liquidation price (no fees/slippage)
export function getIndicativeLiqPrice(pos: Position): number | undefined {
  const L = Number(pos.leverage) || 1;
  const mmr = getMMR(L);
  if (pos.side === "long") return pos.entryPrice * (1 - (1 / L - mmr));
  return pos.entryPrice * (1 + (1 / L - mmr));
}
