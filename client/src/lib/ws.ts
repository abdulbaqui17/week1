import { BehaviorSubject } from 'rxjs';
import type { SymbolKey } from '../types/market';

// Public symbol type alias per contract
export type TSymbol = 'BTCUSDT' | 'ETHUSDT' | 'SOLUSDT';

// Tick contract (ts in ms)
export type Tick = { symbol: TSymbol; price: number; ts: number };

// Internal last price map (also exported helpers for existing code)
const lastPriceMap = new Map<SymbolKey, number>();

export function setLastPrice(symbol: SymbolKey, price: number) {
  lastPriceMap.set(symbol, price);
}

export function getLastPrice(symbol: SymbolKey): number | null {
  return lastPriceMap.get(symbol) ?? null;
}

export type ConnectionState = 'connecting' | 'connected' | 'disconnected';

interface SubscriptionHandle {
  close: () => void;
  status$: BehaviorSubject<ConnectionState>;
}

/** Random helper for simulator */
function randomNudge(base: number): number {
  // magnitude between 0.02% and 0.15%
  const mag = 0.0002 + Math.random() * (0.0015 - 0.0002);
  const dir = Math.random() > 0.5 ? 1 : -1;
  const next = base * (1 + dir * mag);
  return Math.max(0.0001, next);
}

const BASE_PRICES: Record<TSymbol, number> = {
  BTCUSDT: 30000,
  ETHUSDT: 2000,
  SOLUSDT: 100,
};

/** Starts a price simulator for one symbol */
function startSimulator(symbol: TSymbol, onTick: (t: Tick) => void, status$: BehaviorSubject<ConnectionState>): () => void {
  status$.next('connected');
  let last = getLastPrice(symbol) ?? BASE_PRICES[symbol];
  const timer = setInterval(() => {
    last = randomNudge(last);
    const tick: Tick = { symbol, price: last, ts: Date.now() };
    setLastPrice(symbol, tick.price);
    onTick(tick);
  }, 800);
  return () => {
    clearInterval(timer);
    status$.next('disconnected');
  };
}

/** Subscribe to live trades for a symbol via WS or simulator fallback */
export function subscribeTrades(symbol: TSymbol, onTick: (t: Tick) => void): SubscriptionHandle {
  const status$ = new BehaviorSubject<ConnectionState>('connecting');
  const wsUrl = (import.meta as any)?.env?.VITE_WS_URL as string | undefined;
  let closed = false;
  let cleanup: (() => void) | null = null;
  let ws: WebSocket | null = null;

  function fallback() {
    if (closed) return;
    if (cleanup) cleanup();
    cleanup = startSimulator(symbol, onTick, status$);
  }

  if (wsUrl) {
    try {
      ws = new WebSocket(wsUrl);
      ws.onopen = () => { if (!closed) status$.next('connected'); };
      ws.onerror = () => { if (!closed) fallback(); };
      ws.onclose = () => { if (!closed && status$.value !== 'disconnected') status$.next('disconnected'); };
      ws.onmessage = (ev) => {
        if (closed) return;
        try {
          const raw = JSON.parse(typeof ev.data === 'string' ? ev.data : String(ev.data));
          // Normalize fields possibly in alternative shapes
          const rawSym: any = raw.symbol ?? raw.sym ?? raw.s;
          const rawPrice: any = raw.price ?? raw.p ?? raw.last ?? raw.l;
            const rawTs: any = raw.ts ?? raw.time ?? raw.t;
          if (!rawSym || rawSym !== symbol) return;
          const price = typeof rawPrice === 'number' ? rawPrice : Number(rawPrice);
          if (!isFinite(price)) return;
          let ts = typeof rawTs === 'number' ? rawTs : Number(rawTs);
          if (!ts || !isFinite(ts)) ts = Date.now();
          // normalize to ms
          if (ts < 1_000_000_000_000) ts = ts * 1000;
          const tick: Tick = { symbol, price, ts };
          setLastPrice(symbol, price);
          onTick(tick);
        } catch { /* ignore malformed */ }
      };
      cleanup = () => {
        try { ws?.close(); } catch {}
        status$.next('disconnected');
      };
    } catch {
      fallback();
    }
  } else {
    fallback();
  }

  return {
    status$,
    close() {
      if (closed) return;
      closed = true;
      try { ws?.close(); } catch {}
      if (cleanup) cleanup();
      status$.next('disconnected');
    },
  };
}
