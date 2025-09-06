// Clean implementation of Binance live trades hook
import { useEffect, useRef } from 'react';
import { useAppStore, type TSymbol } from '../store/app';

export type Tick = { price: number; ts: number };

const BINANCE_STREAM_URL = 'wss://stream.binance.com:9443/stream?streams=btcusdt@trade/ethusdt@trade/solusdt@trade';

type Sub = (t: Tick) => void;
const subs: Record<TSymbol, Set<Sub>> = { BTCUSDT: new Set(), ETHUSDT: new Set(), SOLUSDT: new Set() };
let socket: WebSocket | null = null;
let connecting = false;

// Throttled (100ms) latest-tick dispatch per symbol
const THROTTLE_MS = 100;
const latest: Record<TSymbol, Tick | null> = { BTCUSDT: null, ETHUSDT: null, SOLUSDT: null };
const lastTickMs: Record<TSymbol, number> = { BTCUSDT: 0, ETHUSDT: 0, SOLUSDT: 0 };
let flushScheduled = false;
let lastFlushAt = 0;
let backupTimer: ReturnType<typeof setTimeout> | null = null;
function flushNow() {
  (Object.keys(latest) as TSymbol[]).forEach(sym => {
    const t = latest[sym];
    if (t) {
      subs[sym].forEach(cb => cb(t));
      latest[sym] = null;
      lastTickMs[sym] = t.ts;
    }
  });
  lastFlushAt = Date.now();
}
function scheduleFlush() {
  if (flushScheduled) return;
  const elapsed = Date.now() - lastFlushAt;
  const wait = elapsed >= THROTTLE_MS ? 0 : THROTTLE_MS - elapsed;
  flushScheduled = true;
  if (backupTimer) { clearTimeout(backupTimer); backupTimer = null; }
  backupTimer = setTimeout(() => { // backup if rAF skipped
    flushScheduled = false;
    flushNow();
  }, Math.max(wait + 120, 200));
  setTimeout(() => {
    requestAnimationFrame(() => {
      flushScheduled = false;
      if (backupTimer) { clearTimeout(backupTimer); backupTimer = null; }
      flushNow();
    });
  }, wait);
}

function initSocket(mark: (c: any) => void) {
  if (socket || connecting) return;
  connecting = true;
  mark('connecting');
  socket = new WebSocket(BINANCE_STREAM_URL);
  socket.onopen = () => { connecting = false; mark('connected'); };
  socket.onclose = () => { mark('disconnected'); socket = null; setTimeout(() => initSocket(mark), 1000); };
  socket.onerror = () => { try { socket?.close(); } catch {} };
  socket.onmessage = (ev) => {
    try {
      const msg = JSON.parse(typeof ev.data === 'string' ? ev.data : String(ev.data));
      const d = msg?.data; if (!d) return;
      const sym = (d.s as string | undefined)?.toUpperCase();
      const pStr = d.p as string | undefined; const ts = typeof d.T === 'number' ? d.T : Date.now();
      if (!sym || !pStr) return; if (sym !== 'BTCUSDT' && sym !== 'ETHUSDT' && sym !== 'SOLUSDT') return;
  const price = Number(pStr); if (!isFinite(price)) return;
  latest[sym as TSymbol] = { price, ts };
  scheduleFlush();
    } catch {}
  };
}

// Global fallback polling (Binance REST) if no WS ticks for >3s
let fallbackInterval: ReturnType<typeof setInterval> | null = null;
function ensureFallbackPoller() {
  if (fallbackInterval) return;
  fallbackInterval = setInterval(async () => {
    const now = Date.now();
    const stale = (Object.values(lastTickMs).every(ts => now - ts > 3000));
    if (!stale) return;
    try {
      const resp = await fetch('https://api.binance.com/api/v3/ticker/price?symbols=%5B%22BTCUSDT%22,%22ETHUSDT%22,%22SOLUSDT%22%5D');
      if (!resp.ok) return;
      const arr: { symbol: string; price: string }[] = await resp.json();
      arr.forEach(r => {
        const u = r.symbol.toUpperCase();
        if (u === 'BTCUSDT' || u === 'ETHUSDT' || u === 'SOLUSDT') {
          const price = Number(r.price); if (!isFinite(price)) return;
          latest[u as TSymbol] = { price, ts: Date.now() };
        }
      });
      scheduleFlush();
    } catch {}
  }, 2000);
}

export function useLiveTrades(symbol: TSymbol, onTrade: (t: Tick) => void) {
  const markConnection = useAppStore(s => s.markConnection);
  const updateSymbolPrice = useAppStore(s => s.updateSymbolPrice);
  const hydrated = useRef(false);

  useEffect(() => { initSocket(markConnection); ensureFallbackPoller(); }, [markConnection]);

  useEffect(() => {
    if (hydrated.current) return; hydrated.current = true;
    (async () => {
      try {
        const resp = await fetch('https://api.binance.com/api/v3/ticker/price?symbols=%5B%22BTCUSDT%22,%22ETHUSDT%22,%22SOLUSDT%22%5D');
        if (!resp.ok) return;
        const arr: { symbol: string; price: string }[] = await resp.json();
        arr.forEach(r => { const u = r.symbol.toUpperCase(); if (u === 'BTCUSDT' || u === 'ETHUSDT' || u === 'SOLUSDT') { const num = Number(r.price); if (isFinite(num)) updateSymbolPrice(u as TSymbol, num); } });
      } catch {}
    })();
  }, [updateSymbolPrice]);

  useEffect(() => {
    const setRef = subs[symbol];
    if (!setRef) { console.warn('[useLiveTrades] Attempted subscribe to unknown symbol', symbol); return; }
    const handler: Sub = (t) => { updateSymbolPrice(symbol, t.price); onTrade(t); };
    setRef.add(handler);
    return () => { setRef.delete(handler); };
  }, [symbol, onTrade, updateSymbolPrice]);
}
