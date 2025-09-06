import { create } from 'zustand';
import { getLastPrice } from '../lib/ws';

export type Side = 'BUY' | 'SELL';
export type TF = '1m' | '5m' | '15m';
export type TSymbol = 'BTCUSD' | 'ETHUSD' | 'SOLUSD';
export type Position = {
  id: string;
  symbol: TSymbol;
  side: Side;
  volume: number; // lots
  entry: number;  // entry price
  leverage: number;
  status: 'OPEN' | 'CLOSED';
  closePrice?: number;
  closedAt?: number; // ms ts
  realizedPnl?: number; // final realized PnL
};

type AppState = {
  symbol: TSymbol;
  tf: TF;
  connection: 'connecting' | 'connected' | 'disconnected';
  lastPrice: number | null;
  lastTickTs: number | null; // ms timestamp of most recent trade tick
  balance: number;
  equity: number;
  usedMargin: number;
  freeMargin: number;
  marginLevel: number | null;
  lastPriceBySymbol: Record<TSymbol, number>;
  side: Side;
  mode: 'MARKET' | 'LIMIT';
  price: number | null;
  volume: number;
  leverage: 5 | 10 | 20 | 100;
  positions: Position[];
  closePosition(id: string): void;
  updatePosition(id: string, patch: Partial<Position>): void;
  getLastPrice(sym: TSymbol): number;
  setSymbol(s: TSymbol): void;
  setTf(tf: TF): void;
  setSide(x: Side): void;
  setMode(m: 'MARKET' | 'LIMIT'): void;
  setPrice(p: number | null): void;
  setVolume(v: number): void;
  setLeverage(l: 5 | 10 | 20 | 100): void;
  placeOrder(): { ok: true } | { ok: false; reason: string };
  markConnection(x: AppState['connection']): void;
  recalc(pulsePrice?: number): void;
};

export const useAppStore = create<AppState>((set, get) => ({
  symbol: 'BTCUSD',
  tf: '1m',
  connection: 'disconnected',
  lastPrice: null,
  lastTickTs: null,
  balance: 5000,
  equity: 5000,
  usedMargin: 0,
  freeMargin: 5000,
  marginLevel: null,
  lastPriceBySymbol: { BTCUSD: 0, ETHUSD: 0, SOLUSD: 0 },
  side: 'BUY',
  mode: 'MARKET',
  price: null,
  volume: 0.01,
  leverage: 100,
  positions: [],
  setSymbol(symbol) { set({ symbol }); },
  setTf(tf) { set({ tf }); },
  setSide(side) { set({ side }); },
  setMode(m) { set({ mode: m, price: m === 'MARKET' ? null : get().price }); },
  setPrice(p) { set({ price: p }); },
  setVolume(v) { set({ volume: v }); },
  setLeverage(l) { set({ leverage: l }); },
  markConnection(x) { set({ connection: x }); },
  placeOrder() {
    const s = get();
    const last = getLastPrice(s.symbol) ?? s.price;
    const tradePrice = s.mode === 'MARKET' ? last : s.price;
    if (tradePrice == null) return { ok: false, reason: 'No price' } as const;
    if (s.volume <= 0) return { ok: false, reason: 'Invalid volume' } as const;
    const notional = tradePrice * s.volume;
    const requiredMargin = notional / s.leverage;
    if (requiredMargin > s.freeMargin) return { ok: false, reason: 'Insufficient margin' } as const;
    const pos: Position = { id: crypto.randomUUID(), symbol: s.symbol, side: s.side, volume: s.volume, entry: tradePrice, leverage: s.leverage, status: 'OPEN' };
    set({ positions: [pos, ...s.positions], usedMargin: s.usedMargin + requiredMargin, freeMargin: s.freeMargin - requiredMargin });
    return { ok: true } as const;
  },
  closePosition(id) {
    const s = get();
    const target = s.positions.find(p => p.id === id && p.status === 'OPEN');
    if (!target) return;
    const last = s.lastPriceBySymbol[target.symbol] ?? target.entry;
    const realized = target.side === 'BUY' ? (last - target.entry) * target.volume : (target.entry - last) * target.volume;
    const release = (target.entry * target.volume) / target.leverage;
  const updated = s.positions.map(p => p.id === id ? { ...p, status: 'CLOSED' as const, closePrice: last, closedAt: Date.now(), realizedPnl: realized } : p);
    const balance = s.balance + realized;
    const usedMargin = s.usedMargin - release;
    set({ positions: updated, balance, usedMargin });
  get().recalc();
  },
  updatePosition(id, patch) {
    set({ positions: get().positions.map(p => p.id === id ? { ...p, ...patch } : p) });
  },
  getLastPrice(sym) { return get().lastPriceBySymbol[sym]; },
  recalc(pulsePrice?: number) {
    const s = get();
    const map = { ...s.lastPriceBySymbol };
    if (typeof pulsePrice === 'number') map[s.symbol] = pulsePrice;
    let totalPnl = 0;
    let used = 0;
    for (const p of s.positions) {
      if (p.status !== 'OPEN') continue;
      const last = map[p.symbol] || p.entry;
      const pnl = p.side === 'BUY' ? (last - p.entry) * p.volume : (p.entry - last) * p.volume;
      totalPnl += pnl;
      used += (p.entry * p.volume) / p.leverage; // entry-based margin
    }
    const equity = s.balance + totalPnl;
    const free = equity - used;
    const marginLevel = used > 0 ? (equity / used) * 100 : null;
    set({ lastPrice: pulsePrice ?? s.lastPrice, lastPriceBySymbol: map, equity, usedMargin: used, freeMargin: free, marginLevel });
  },
}));

// --- Basic persistence (browser only) ---
if (typeof window !== 'undefined') {
  const PERSIST_KEY = 'app-persist-v1';
  // Hydrate once
  try {
    const raw = localStorage.getItem(PERSIST_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        const { positions, balance, equity, usedMargin, freeMargin, symbol } = parsed;
        useAppStore.setState((s) => ({
          ...s,
          positions: Array.isArray(positions) ? positions : s.positions,
          balance: typeof balance === 'number' ? balance : s.balance,
          equity: typeof equity === 'number' ? equity : s.equity,
          usedMargin: typeof usedMargin === 'number' ? usedMargin : s.usedMargin,
          freeMargin: typeof freeMargin === 'number' ? freeMargin : s.freeMargin,
          symbol: symbol || s.symbol,
        }));
      }
    }
  } catch {}
  // Subscribe & persist subset
  useAppStore.subscribe((state) => {
    try {
      const subset = {
        positions: state.positions,
        balance: state.balance,
        equity: state.equity,
        usedMargin: state.usedMargin,
        freeMargin: state.freeMargin,
        symbol: state.symbol,
      };
      localStorage.setItem(PERSIST_KEY, JSON.stringify(subset));
    } catch {}
  });
}
