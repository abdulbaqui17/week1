import { useEffect, useRef } from 'react';
import { useAppStore, type TSymbol } from '../store/app';

type Tick = { price: number; ts: number }; // ts in ms now

// Simple live trades hook: uses VITE_WS_URL if provided, otherwise simulates ticks.
export function useLiveTrades(symbol: TSymbol, onTrade: (t: Tick) => void) {
  const wsUrl = (import.meta as any)?.env?.VITE_WS_URL as string | undefined;
  const lastPriceRef = useRef<number | undefined>(undefined);
  const markConnection = useAppStore((s) => s.markConnection);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;

    function normalizeToMs(ts: number | undefined): number {
      if (!ts) return Date.now();
      // If already looks like ms (>= ~2001-09-09 in ms), keep; otherwise treat as sec and multiply
      return ts > 1_000_000_000_000 ? ts : ts * 1000;
    }

    function emit(price: number, tsMs: number) {
      lastPriceRef.current = price;
      onTrade({ price, ts: tsMs });
    }

  if (wsUrl) {
      try {
        ws = new WebSocket(wsUrl);
  markConnection('connecting');
  ws.onopen = () => markConnection('connected');
        ws.onmessage = (ev) => {
          try {
            const msg = JSON.parse(typeof ev.data === 'string' ? ev.data : String(ev.data));
            const sym = msg?.symbol as TSymbol | undefined;
            let price = msg?.price as number | undefined;
      let ts = msg?.ts as number | undefined;
            if (!sym || sym !== symbol || typeof price !== 'number') return;
      const tsMs = normalizeToMs(ts);
      emit(price, tsMs);
          } catch {}
        };
      } catch {
        // fallback to timer if WS fails to construct
      }
    }

    if (!ws) {
      timer = setInterval(() => {
    const nowMs = Date.now();
        const last = lastPriceRef.current ?? 30000;
        const pct = (Math.random() - 0.5) * 0.006; // ±0.3%
        const price = Math.max(1, last * (1 + pct));
    emit(price, nowMs);
      }, 800);
    }

    return () => {
      if (timer) clearInterval(timer);
  try { ws?.close(); markConnection('disconnected'); } catch {}
    };
    // re-run on symbol change
  }, [symbol, wsUrl, onTrade]);
}
