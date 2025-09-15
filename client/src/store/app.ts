import { create } from 'zustand';
import { API_BASE } from '../config';

// Safe UUID generator (fallback if crypto.randomUUID not available in some prod browsers / runtimes)
function safeId(): string {
  try {
    if (typeof crypto !== 'undefined' && (crypto as any).randomUUID) return (crypto as any).randomUUID();
  } catch {}
  // RFC4122-ish fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export type Side = 'BUY' | 'SELL';
export type TF = '1m' | '5m' | '15m';
export type TSymbol = 'BTCUSDT' | 'ETHUSDT' | 'SOLUSDT';
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
  take_profit?: number | null;
  stop_loss?: number | null;
};

// --- Helpers to normalize server orders into our local Position shape ---
type RawServerOrder = any; // (loose) – server shape not strictly typed client-side yet

const normalizeOrderToPosition = (o: RawServerOrder): Position => {
  if (!o) throw new Error('normalizeOrderToPosition: empty order');
  const statusRaw = String(o.status || 'open').toLowerCase();
  const isClosed = statusRaw === 'closed' || statusRaw === 'filled';
  return {
    id: String(o.id),
    symbol: String(o.symbol || '').toUpperCase() as TSymbol,
    side: String(o.side || 'BUY').toUpperCase() === 'SELL' ? 'SELL' : 'BUY',
    volume: Number(o.volume ?? o.size ?? 0),
    entry: Number(o.entry ?? o.entryPrice ?? o.avgPrice ?? o.price ?? 0),
    leverage: Number(o.leverage ?? 1),
    status: isClosed ? 'CLOSED' : 'OPEN',
    take_profit: o.take_profit ?? o.tp ?? null,
    stop_loss: o.stop_loss ?? o.sl ?? null,
  };
};

const upsertById = <T extends { id: string }>(arr: T[] = [], item: T): T[] => {
  const idx = arr.findIndex(x => x.id === item.id);
  if (idx === -1) return [item, ...arr];
  const copy = arr.slice();
  copy[idx] = { ...copy[idx], ...item };
  return copy;
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
  pnlTotal: number; // aggregated unrealized PnL
  lastPriceBySymbol: Record<TSymbol, number>;
  side: Side;
  mode: 'MARKET' | 'LIMIT';
  price: number | null;
  volume: number;
  leverage: number; // 1-100 slider supported
  positions: Position[];
  pendingOrders: {
    id: string;
    symbol: TSymbol;
    side: Side;
    volume: number;
    leverage: number;
    price: number; // limit price
    createdAt: number;
  }[];
  risk: {
    mm: number | null; // backend-reported minimum maintenance margin requirement
    lastFreeMargin: number | null; // backend-reported free margin at rejection
    lastError: string | null; // last backend error code/message
  };
  closePosition(id: string): void;
  updatePosition(id: string, patch: Partial<Position>): void;
  updateSymbolPrice(sym: TSymbol, price: number): void;
  getLastPrice(sym: TSymbol): number;
  setSymbol(s: TSymbol): void;
  setTf(tf: TF): void;
  setSide(x: Side): void;
  setMode(m: 'MARKET' | 'LIMIT'): void;
  setPrice(p: number | null): void;
  setVolume(v: number): void;
  setLeverage(l: number): void;
  placeOrder(): Promise<{ ok: true; data?: any } | { ok: false; error: any }>;
  markConnection(x: AppState['connection']): void;
  recalc(pulsePrice?: number): void;
};

export const useAppStore = create<AppState>((set, get) => ({
  symbol: 'BTCUSDT',
  tf: '1m',
  connection: 'disconnected',
  lastPrice: null,
  lastTickTs: null,
  balance: 5000,
  equity: 5000,
  usedMargin: 0,
  freeMargin: 5000,
  marginLevel: null,
  pnlTotal: 0,
  lastPriceBySymbol: { BTCUSDT: 0, ETHUSDT: 0, SOLUSDT: 0 },
  side: 'BUY',
  mode: 'MARKET',
  price: null,
  volume: 0.01,
  leverage: 1,
  positions: [],
  pendingOrders: [],
  risk: { mm: null, lastFreeMargin: null, lastError: null },
  setSymbol(symbol) { set({ symbol }); },
  setTf(tf) { set({ tf }); },
  setSide(side) { set({ side }); },
  setMode(m) { set({ mode: m, price: m === 'MARKET' ? null : get().price }); },
  setPrice(p) { set({ price: p }); },
  setVolume(v) { set({ volume: v }); },
  setLeverage(l) { if (l < 1) l = 1; if (l > 100) l = 100; set({ leverage: l }); },
  markConnection(x) { set({ connection: x }); },
  updateSymbolPrice(sym: TSymbol, price: number) {
    set((s) => {
      const map = { ...s.lastPriceBySymbol, [sym]: price };
      return { lastPriceBySymbol: map, lastPrice: sym === s.symbol ? price : s.lastPrice };
    });
    // Trigger a full recalc so equity/free margin reflect all open positions even when
    // the active chart symbol differs from the symbol whose price just moved.
    get().recalc();
  },
  async placeOrder() {
    const s = get();
    const payload: any = {
      symbol: s.symbol,
      side: s.side,
      volume: s.volume,
      price: s.mode === 'LIMIT' ? s.price : undefined,
      leverage: s.leverage,
      tp: (s as any).take_profit ?? undefined,
      sl: (s as any).stop_loss ?? undefined,
    };
    console.log('[placeOrder] POST', `${API_BASE}/v1/orders`, payload);
    try {
      const res = await fetch(`${API_BASE}/v1/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      console.log('[placeOrder] status', res.status, json);
      if (res.ok) {
        try {
          const srvOrder = (json as any)?.order;
          if (srvOrder && srvOrder.id) {
            try {
              const pos = normalizeOrderToPosition(srvOrder);
              useAppStore.setState(st => ({ positions: upsertById(st.positions, pos) }));
            } catch (normErr) {
              console.warn('[placeOrder] normalize error', normErr);
            }
          }
          // Fetch updated account snapshot for accurate free/equity
          fetch(`${API_BASE}/v1/account`).then(r => r.json().catch(()=>null)).then(snap => {
            if (snap && typeof snap.balance === 'number') {
              useAppStore.setState(st => ({
                balance: snap.balance,
                equity: snap.equity,
                usedMargin: snap.marginUsed ?? st.usedMargin,
                freeMargin: snap.freeMargin ?? st.freeMargin,
              }));
            }
          }).catch(()=>{});
        } catch (e) { console.warn('[placeOrder] merge error', e); }
        return { ok: true, data: json };
      }
      // Capture backend maintenance margin risk details if provided
      try {
        if (json && (json.code === 'MAINT_MARGIN_AT_RISK' || json.code === 'MAINT_MARGIN' )) {
          const mm = Number(json?.details?.mm);
          const fm = Number(json?.details?.freeMargin ?? json?.details?.free_margin);
          useAppStore.setState(s2 => ({ risk: { mm: Number.isFinite(mm) ? mm : s2.risk.mm, lastFreeMargin: Number.isFinite(fm) ? fm : s2.risk.lastFreeMargin, lastError: json.code || 'MAINT_MARGIN_AT_RISK' } }));
        } else if (json && json.code) {
          useAppStore.setState(s2 => ({ risk: { ...s2.risk, lastError: json.code } }));
        }
      } catch {}
      return { ok: false, error: json };
    } catch (err) {
      console.warn('[placeOrder] network error', err);
      useAppStore.setState(s2 => ({ risk: { ...s2.risk, lastError: 'NETWORK_ERROR' } }));
      return { ok: false, error: 'NETWORK_ERROR' };
    }
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
  recalc(_pulsePrice?: number) {
    set((s) => {
      const map = { ...s.lastPriceBySymbol };
      // Fill limit orders for ANY symbol whose trigger is met.
      let newPositions = s.positions;
      let pending = s.pendingOrders;
      let used = 0;
      let totalPnl = 0;
      const nowTs = Date.now();
      // Execute SL/TP for open positions (client-side simulation)
      newPositions = newPositions.map(p => {
        if (p.status !== 'OPEN') return p;
        const last = map[p.symbol] || p.entry;
        const sl = p.stop_loss;
        const tp = p.take_profit;
        const side = p.side; // BUY|SELL
        const hitTP = tp != null && (side === 'BUY' ? last >= tp : last <= tp);
        const hitSL = sl != null && (side === 'BUY' ? last <= sl : last >= sl);
        if (!hitTP && !hitSL) return p;
        const reason = hitTP ? 'TP' : 'SL'; // TP priority
        const realized = side === 'BUY' ? (last - p.entry) * p.volume : (p.entry - last) * p.volume;
        try { console.log(`[SLTP] closed id=${p.id} reason=${reason} at=${last}`); } catch {}
        return { ...p, status: 'CLOSED', closePrice: last, closedAt: nowTs, realizedPnl: realized };
      });
      for (const p of newPositions) {
        if (p.status !== 'OPEN') continue;
        const last = map[p.symbol] || p.entry;
        const pnl = p.side === 'BUY' ? (last - p.entry) * p.volume : (p.entry - last) * p.volume;
        totalPnl += pnl;
        // Use current price for margin requirement per spec
        used += (last * p.volume) / p.leverage;
      }
      if (pending.length) {
        const remaining: typeof pending = [];
        const filled: Position[] = [];
        for (const o of pending) {
          const lastPx = map[o.symbol];
          if (typeof lastPx !== 'number') { remaining.push(o); continue; }
          const trigger = o.side === 'BUY' ? lastPx <= o.price : lastPx >= o.price;
          if (trigger) {
            const entry = o.price;
            const notional = entry * o.volume;
            const requiredMargin = notional / o.leverage;
            const equityTemp = s.balance + totalPnl;
            const freeTemp = equityTemp - used;
            if (requiredMargin <= freeTemp) {
              const pos: Position = { id: safeId(), symbol: o.symbol, side: o.side, volume: o.volume, entry, leverage: o.leverage, status: 'OPEN' };
              filled.push(pos);
              used += requiredMargin;
            } else {
              remaining.push(o); // keep if not enough margin
            }
          } else {
            remaining.push(o);
          }
        }
        if (filled.length) newPositions = [...filled, ...newPositions];
        pending = remaining;
      }
  const equity = s.balance + totalPnl;
  const free = equity - used;
  const marginLevel = used > 0 ? (equity / used) * 100 : null;
  return { lastPrice: map[s.symbol], lastPriceBySymbol: map, equity, usedMargin: used, freeMargin: free, marginLevel, positions: newPositions, pendingOrders: pending, pnlTotal: totalPnl };
    });
  },
}));

// --- Basic persistence (browser only) ---
if (typeof window !== 'undefined') {
  const PERSIST_KEY = 'app-persist-v1';
  const VALID_SYMBOLS: TSymbol[] = ['BTCUSDT','ETHUSDT','SOLUSDT'];
  const LEGACY_MAP: Record<string, TSymbol> = { BTCUSD: 'BTCUSDT', ETHUSD: 'ETHUSDT', SOLUSD: 'SOLUSDT' };
  // Hydrate once
  try {
    const raw = localStorage.getItem(PERSIST_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        let { positions, balance, equity, usedMargin, freeMargin, symbol } = parsed;
        if (symbol && LEGACY_MAP[symbol]) symbol = LEGACY_MAP[symbol];
        if (!VALID_SYMBOLS.includes(symbol)) symbol = undefined;
        useAppStore.setState((s) => ({
          ...s,
          positions: Array.isArray(positions) ? positions : s.positions,
          balance: typeof balance === 'number' ? balance : s.balance,
          equity: typeof equity === 'number' ? equity : s.equity,
          usedMargin: typeof usedMargin === 'number' ? usedMargin : s.usedMargin,
          freeMargin: typeof freeMargin === 'number' ? freeMargin : s.freeMargin,
          symbol: (symbol as TSymbol) || s.symbol,
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
