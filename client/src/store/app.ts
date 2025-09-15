import { create } from 'zustand';
import { API_BASE } from '../config';

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
  status: 'OPEN' | 'CLOSED' | 'LIQUIDATED';
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
  const isLiq = statusRaw === 'liquidated';
  const closedAtTs = o.closedAt ? (typeof o.closedAt === 'number' ? o.closedAt : Date.parse(o.closedAt)) : undefined;
  return {
    id: String(o.id),
    symbol: String(o.symbol || '').toUpperCase() as TSymbol,
    side: String(o.side || 'BUY').toUpperCase() === 'SELL' ? 'SELL' : 'BUY',
    volume: Number(o.volume ?? o.size ?? 0),
    entry: Number(o.entry ?? o.entryPrice ?? o.avgPrice ?? o.price ?? 0),
    leverage: Number(o.leverage ?? 1),
    status: isLiq ? 'LIQUIDATED' : (isClosed ? 'CLOSED' : 'OPEN'),
    closePrice: Number(o.closePrice ?? o.exit ?? (isClosed || isLiq ? o.entry : undefined)) || undefined,
    closedAt: closedAtTs,
    realizedPnl: Number(o.realizedPnl ?? o.pnl ?? (isLiq ? -Math.abs(Number(o.requiredMargin || 0)) : undefined)) || undefined,
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
  // Legacy fields (will be mirrored from account snapshot for UI compatibility until fully removed)
  balance: number;
  equity: number;
  usedMargin: number;
  freeMargin: number;
  marginLevel: number | null;
  pnlTotal: number; // aggregated unrealized PnL (deprecated)
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
  // Server authoritative account snapshot only source of truth
  account: { equity: number; used: number; free: number; maintenance: number | null; upnl: number; level: number };
  isPlacing: boolean;
  fetchAccount(): Promise<void>;
  fetchPositions(): Promise<void>;
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
  placeOrder(p: { symbol: TSymbol; side: Side; qtyUnits: number; leverage: number; tp?: number | null; sl?: number | null }): Promise<{ ok: true; data?: any } | { ok: false; error: any }>;
  markConnection(x: AppState['connection']): void;
  recalc(pulsePrice?: number): void; // deprecated local margin math (no longer used for UI)
};

export const useAppStore = create<AppState>((set, get) => ({
  symbol: 'BTCUSDT',
  tf: '1m',
  connection: 'disconnected',
  lastPrice: null,
  lastTickTs: null,
  balance: 0,
  equity: 0,
  usedMargin: 0,
  freeMargin: 0,
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
  account: { equity: 0, used: 0, free: 0, maintenance: null, upnl: 0, level: Infinity },
  isPlacing: false,
  async fetchAccount() {
    try {
      const res = await fetch(`${API_BASE}/v1/account`);
      if (!res.ok) return;
      const j = await res.json().catch(()=>({}));
      const equity = Number(j.equity || 0);
      const used = Number(j.used || 0);
      const free = Number(j.free || 0);
      const maintenance = j.maintenance != null ? Number(j.maintenance) : null;
      const upnl = Number(j.upnl || 0);
      const level = j.level != null ? Number(j.level) : Infinity;
      set({
        account: { equity, used, free, maintenance, upnl, level },
        // mirror for legacy components
        balance: Number(j.balance || 0),
        equity,
        usedMargin: used,
        freeMargin: free,
        marginLevel: used > 0 ? (equity / used) * 100 : null,
        pnlTotal: upnl,
      });
    } catch {}
  },
  async fetchPositions() {
    try {
      const res = await fetch(`${API_BASE}/v1/positions`);
      if (!res.ok) return;
      const j = await res.json().catch(()=>([]));
      const arr = Array.isArray(j) ? j : [];
      const mapped: Position[] = arr.map((o: any) => { try { return normalizeOrderToPosition(o); } catch { return null as any; } }).filter(Boolean);
      set({ positions: mapped });
    } catch {}
  },
  setSymbol(symbol) { set({ symbol }); },
  setTf(tf) { set({ tf }); },
  setSide(side) { set({ side }); },
  setMode(m) { set({ mode: m, price: m === 'MARKET' ? null : get().price }); },
  setPrice(p) { set({ price: p }); },
  setVolume(v) { set({ volume: v }); },
  setLeverage(l) { if (l < 1) l = 1; if (l > 100) l = 100; set({ leverage: l }); },
  markConnection(x) { set({ connection: x }); },
  updateSymbolPrice(sym: TSymbol, price: number) {
    set((s) => ({ lastPriceBySymbol: { ...s.lastPriceBySymbol, [sym]: price }, lastPrice: sym === s.symbol ? price : s.lastPrice }));
  },
  async placeOrder(p) {
    const s = get();
    if (get().isPlacing) return { ok: false, error: 'BUSY' };
    const symbol = p.symbol;
    const side = p.side;
    const qtyUnits = Number(p.qtyUnits);
    const L = Number(p.leverage);
    if (!(qtyUnits > 0)) return { ok: false, error: 'INVALID_QTY' };
    if (!(L > 0)) return { ok: false, error: 'BAD_LEVERAGE' };
    const mark = s.lastPriceBySymbol[symbol] ?? 0;
    const free = s.account.free;
    try { console.debug('[placeOrder] request', { mode: 'UNITS', qtyUnits, mark, free, leverage: L, notional: qtyUnits * mark, initMargin: (qtyUnits * mark) / L }); } catch {}
    const payload: any = {
      symbol,
      side,
      mode: 'UNITS',
      qtyUnits,
      leverage: L,
      tp: p.tp ?? (s as any).take_profit ?? undefined,
      sl: p.sl ?? (s as any).stop_loss ?? undefined,
    };
    set({ isPlacing: true });
    try {
      const res = await fetch(`${API_BASE}/v1/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      console.log('[placeOrder] status', res.status, json);
      if (res.ok) {
        // Merge order quickly (optimistic) then authoritative refresh will correct if needed
        try {
          const srvOrder = (json as any)?.order;
          if (srvOrder && srvOrder.id) {
            const pos = normalizeOrderToPosition(srvOrder);
            useAppStore.setState(st => ({ positions: upsertById(st.positions, pos) }));
          }
        } catch (e) { console.warn('[placeOrder] merge error', e); }
        // Clear last error on success
        useAppStore.setState(st => ({ risk: { ...st.risk, lastError: null } }));
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
  const errMsg = json?.error || json?.message || json?.code || 'Order failed';
      return { ok: false, error: errMsg };
    } catch (err) {
      console.warn('[placeOrder] network error', err);
      useAppStore.setState(s2 => ({ risk: { ...s2.risk, lastError: 'NETWORK_ERROR' } }));
      return { ok: false, error: 'NETWORK_ERROR' };
    }
    finally {
      set({ isPlacing: false });
      // Always refresh both account & positions for canonical state
      try { await get().fetchAccount(); } catch {}
      try { await get().fetchPositions(); } catch {}
    }
  },
  closePosition(id) {
    // Use server endpoint for authoritative close
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/v1/orders/${id}/close`, { method: 'POST' });
        const j = await res.json().catch(()=>({}));
        if (res.ok) {
          // Refresh account & positions
          await get().fetchAccount();
          await get().fetchPositions();
        } else {
          console.warn('[closePosition] server error', j);
        }
      } catch (e) { console.warn('[closePosition] network error', e); }
    })();
  },
  updatePosition(id, patch) {
    set({ positions: get().positions.map(p => p.id === id ? { ...p, ...patch } : p) });
  },
  getLastPrice(sym) { return get().lastPriceBySymbol[sym]; },
  recalc(_pulsePrice?: number) { /* deprecated no-op for server-authoritative model */ },
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
