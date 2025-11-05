// Live trades hook that prefers backend wsserver (authoritative) and falls back to Binance
import { useEffect, useRef } from 'react';
import { useAppStore, type TSymbol } from '../store/app';

export type Tick = { price: number; ts: number };

const BINANCE_STREAM_URL = 'wss://stream.binance.com:9443/stream?streams=btcusdt@trade/ethusdt@trade/solusdt@trade';

type Sub = (t: Tick) => void;
const subs: Record<TSymbol, Set<Sub>> = { BTCUSDT: new Set(), ETHUSDT: new Set(), SOLUSDT: new Set() };
let socket: WebSocket | null = null; // backend wsserver socket
let connecting = false;
let binanceSocket: WebSocket | null = null;

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

function resolveBackendWsUrl(): string | null {
  const env = (import.meta as any)?.env?.VITE_WS_URL as string | undefined;
  if (env && typeof env === 'string') return env;
  if (typeof window === 'undefined') return null;
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const origin = window.location.host; // host:port
  return `${proto}://${origin}/ws/`;
}

function startBackendWs(mark: (c: any) => void) {
  if (socket || connecting) return;
  const url = resolveBackendWsUrl();
  if (!url) { startBinanceWs(mark); return; }
  connecting = true;
  mark('connecting');
  try {
    socket = new WebSocket(url);
  } catch {
    connecting = false;
    startBinanceWs(mark);
    return;
  }
  socket.onopen = () => { connecting = false; mark('connected'); };
  socket.onclose = () => {
    mark('disconnected');
    socket = null;
    setTimeout(() => startBackendWs(mark), 1500);
  };
  socket.onerror = () => { try { socket?.close(); } catch {} };
  socket.onmessage = (ev) => {
    try {
      const msg = JSON.parse(typeof ev.data === 'string' ? ev.data : String(ev.data));
      // Expect poller -> redis -> wsserver broadcast format: { timestamp, asset, price, quantity }
      const symRaw = (msg?.asset || msg?.symbol || msg?.s) as string | undefined;
      if (!symRaw) return;
      const sym = symRaw.toUpperCase();
      if (sym !== 'BTCUSDT' && sym !== 'ETHUSDT' && sym !== 'SOLUSDT') return;
      const priceNum = Number(msg?.price ?? msg?.p ?? NaN);
      if (!isFinite(priceNum)) return;
      let ts = Number(msg?.timestamp ?? msg?.ts ?? Date.now());
      if (!ts || !isFinite(ts)) ts = Date.now();
      // normalize sec -> ms
      if (ts < 1_000_000_000_000) ts *= 1000;
      latest[sym as TSymbol] = { price: priceNum, ts };
      scheduleFlush();
    } catch {}
  };
}

function startBinanceWs(mark: (c: any) => void) {
  try { if (binanceSocket) return; } catch {}
  try { if (socket) return; } catch {}
  try {
    binanceSocket = new WebSocket(BINANCE_STREAM_URL);
  } catch {
    return;
  }
  mark('connecting');
  binanceSocket.onopen = () => { mark('connected'); };
  binanceSocket.onclose = () => { mark('disconnected'); binanceSocket = null; setTimeout(() => startBinanceWs(mark), 1500); };
  binanceSocket.onerror = () => { try { binanceSocket?.close(); } catch {} };
  binanceSocket.onmessage = (ev) => {
    try {
      const msg = JSON.parse(typeof ev.data === 'string' ? ev.data : String(ev.data));
      const d = msg?.data; if (!d) return;
      const sym = (d.s as string | undefined)?.toUpperCase();
      const pStr = d.p as string | undefined; const t = typeof d.T === 'number' ? d.T : Date.now();
      if (!sym || !pStr) return; if (sym !== 'BTCUSDT' && sym !== 'ETHUSDT' && sym !== 'SOLUSDT') return;
      const price = Number(pStr); if (!isFinite(price)) return;
      latest[sym as TSymbol] = { price, ts: t };
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

  useEffect(() => { startBackendWs(markConnection); ensureFallbackPoller(); }, [markConnection]);

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

  // Subscribe to ALL symbols to keep positions updated regardless of active chart
  useEffect(() => {
    const handlers: Map<TSymbol, Sub> = new Map();
    
    // Subscribe to all symbols
    (['BTCUSDT', 'ETHUSDT', 'SOLUSDT'] as TSymbol[]).forEach(sym => {
      const handler: Sub = (t) => { 
        updateSymbolPrice(sym, t.price);
        // Only call onTrade callback for the active symbol
        if (sym === symbol) {
          onTrade(t);
        }
      };
      subs[sym]?.add(handler);
      handlers.set(sym, handler);
    });

    // Cleanup: unsubscribe from all
    return () => {
      handlers.forEach((handler, sym) => {
        subs[sym]?.delete(handler);
      });
    };
  }, [symbol, onTrade, updateSymbolPrice]);
}
