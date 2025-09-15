"use client";

import { useEffect, useRef } from 'react';
import { createChart, LineStyle, CandlestickSeries, type ISeriesApi, type IChartApi, type CandlestickData, type UTCTimestamp, type IPriceLine } from 'lightweight-charts';
import { useAppStore } from '../store/app';
import type { TSymbol } from '../store/app';
import { setLastPrice } from '../lib/ws';
import { useLiveTrades } from '../hooks/useLiveTrades';

type Candle = CandlestickData<UTCTimestamp>;

// --- Historical (Binance) hydration ---
// We pull last 500 1m klines for each symbol lazily (on first view) to avoid random seed artifacts.
type BinanceKline = [ number, string, string, string, string, string, number, string, number, string, string, string ];
const HIST_LIMIT = 500;

export default function ChartPanel() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const priceLineRef = useRef<IPriceLine | null>(null);
  const didInitRef = useRef(false); // guard against React StrictMode double-mount
  const dataBySymbol = useRef<Map<TSymbol, Candle[]>>(new Map());
  const loadingSymbols = useRef<Set<TSymbol>>(new Set());
  const hydratedSymbols = useRef<Set<TSymbol>>(new Set());
  const isAtRightEdgeRef = useRef(true);
  const symbol = useAppStore((s) => s.symbol);
  const tf = useAppStore((s) => s.tf);
  const connection = useAppStore((s) => s.connection);
  const markConnection = useAppStore((s) => s.markConnection);
  const setLastTickTs = (ts: number) => useAppStore.setState({ lastTickTs: ts });

  // Aggregate base 1m candles into 5m/15m
  function aggregate(candles1m: Candle[], size: 5 | 15): Candle[] {
    if (!candles1m?.length) return [];
    const out: Candle[] = [];
    for (let i = 0; i < candles1m.length; i += size) {
      const group = candles1m.slice(i, i + size);
      const first = group[0];
      const last = group[group.length - 1];
      let high = first.high;
      let low = first.low;
      for (let j = 1; j < group.length; j++) {
        if (group[j].high > high) high = group[j].high;
        if (group[j].low < low) low = group[j].low;
      }
      out.push({ time: first.time, open: first.open, high, low, close: last.close });
    }
    return out;
  }

  function setSeriesDataFromTf(sym: TSymbol, timeframe: '1m' | '5m' | '15m') {
    const s = seriesRef.current;
    if (!s) return;
    const base = (dataBySymbol.current.get(sym) ?? []) as Candle[];
    const data = timeframe === '1m' ? base : aggregate(base, timeframe === '5m' ? 5 : 15);
    s.setData(data as any);
    if (data.length && priceLineRef.current) {
      priceLineRef.current.applyOptions({ price: data[data.length - 1].close });
    }
  }

  // Recompute and update only the last aggregated bar (for smoother live updates)
  function updateAggregatedLast(sym: TSymbol, timeframe: '1m' | '5m' | '15m') {
    if (timeframe === '1m') return; // for 1m, callers should use series.update on the 1m candle directly
    const s = seriesRef.current;
    if (!s) return;
    const base = (dataBySymbol.current.get(sym) ?? []) as Candle[];
    const agg = aggregate(base, timeframe === '5m' ? 5 : 15);
    if (!agg.length) return;
    const last = agg[agg.length - 1];
    s.update(last as any);
    if (priceLineRef.current) priceLineRef.current.applyOptions({ price: last.close });
  }

  // Hydrate current symbol historical candles from Binance if not yet.
  useEffect(() => {
    async function hydrate(sym: TSymbol) {
      if (hydratedSymbols.current.has(sym) || loadingSymbols.current.has(sym)) return;
      loadingSymbols.current.add(sym);
      try {
        const resp = await fetch(`https://api.binance.com/api/v3/klines?symbol=${sym}&interval=1m&limit=${HIST_LIMIT}`);
        if (!resp.ok) throw new Error('Failed kline fetch');
        const raw: BinanceKline[] = await resp.json();
        const candles: Candle[] = raw.map(k => ({
          time: Math.floor(k[0] / 1000) as UTCTimestamp,
          open: Number(k[1]),
          high: Number(k[2]),
          low: Number(k[3]),
          close: Number(k[4]),
        })).filter(c => isFinite(c.open) && isFinite(c.high) && isFinite(c.low) && isFinite(c.close));
        candles.sort((a,b) => (a.time as number) - (b.time as number));
        dataBySymbol.current.set(sym, candles);
        hydratedSymbols.current.add(sym);
        if (seriesRef.current && sym === symbol) {
          setSeriesDataFromTf(sym, tf);
          const last = candles[candles.length - 1];
          priceLineRef.current?.applyOptions({ price: last.close });
          chartRef.current?.timeScale().scrollToRealTime();
        }
      } catch (e) {
        console.warn('[ChartPanel] hydrate failed', e);
      } finally {
        loadingSymbols.current.delete(sym);
      }
    }
    hydrate(symbol);
    // Prefetch others in background after a small delay
    const id = setTimeout(() => {
      (['BTCUSDT','ETHUSDT','SOLUSDT'] as TSymbol[]).forEach(s => { if (s !== symbol) hydrate(s); });
    }, 1500);
    return () => clearTimeout(id);
  }, [symbol, tf]);

  // create chart
  useEffect(() => {
    const el = containerRef.current;
    if (!el || chartRef.current || didInitRef.current) return;
    didInitRef.current = true;
    const chart = createChart(el, {
      layout: { background: { color: 'transparent' }, textColor: '#94a3b8' },
      grid: { vertLines: { color: 'rgba(71,85,105,0.25)' }, horzLines: { color: 'rgba(71,85,105,0.25)' } },
      rightPriceScale: { borderColor: 'rgba(51,65,85,0.6)' },
      timeScale: { borderColor: 'rgba(51,65,85,0.6)', rightOffset: 2 },
      crosshair: { mode: 1 },
      width: el.clientWidth,
      height: el.clientHeight,
    });
    chartRef.current = chart;
    const seriesOptions = {
      upColor: '#22c55e', downColor: '#ef4444', wickUpColor: '#22c55e', wickDownColor: '#ef4444', borderVisible: false,
    } as const;
    let s: ISeriesApi<'Candlestick'> | null = null;
    const anyChart = chart as any;
    if (typeof anyChart.addSeries === 'function' && typeof CandlestickSeries !== 'undefined') {
      s = anyChart.addSeries(CandlestickSeries, seriesOptions as any) as ISeriesApi<'Candlestick'>;
    } else if (typeof anyChart.addCandlestickSeries === 'function') {
      s = anyChart.addCandlestickSeries(seriesOptions as any) as ISeriesApi<'Candlestick'>;
    }
    if (!s) return;
    seriesRef.current = s;
    priceLineRef.current = s.createPriceLine({ price: 0, title: 'Live', lineWidth: 2, lineStyle: LineStyle.Solid });

  // initial (may be empty until hydration completes)
  // Only setData once on mount; subsequent symbol/timeframe changes call setSeriesDataFromTf elsewhere
  setSeriesDataFromTf(useAppStore.getState().symbol, useAppStore.getState().tf);
  chart.timeScale().scrollToRealTime();

    // Track if user is at right edge to decide autoscroll behaviour
    const updateEdge = () => {
      if (!chartRef.current) return;
      const sp = chartRef.current.timeScale().scrollPosition();
      // near zero => right edge
      isAtRightEdgeRef.current = Math.abs(sp) < 0.5;
    };
    // Lightweight-charts doesn't expose direct subscription in type; cast to any
    (chart.timeScale() as any).subscribeVisibleTimeRangeChange(updateEdge);

    const ro = new ResizeObserver(() => {
      if (!containerRef.current || !chartRef.current) return;
      chartRef.current.applyOptions({ width: containerRef.current.clientWidth, height: containerRef.current.clientHeight });
    });
    ro.observe(el);

    return () => {
      try { ro.disconnect(); } catch {}
      try { (chart.timeScale() as any).unsubscribeVisibleTimeRangeChange(updateEdge); } catch {}
      try { chart.remove(); } catch {}
      chartRef.current = null;
      seriesRef.current = null;
      priceLineRef.current = null;
      // Allow re-init in React 18 StrictMode dev double mount
      didInitRef.current = false;
    };
  }, []);

  // Switch data when timeframe changes
  useEffect(() => {
    if (!seriesRef.current || !chartRef.current) return;
    const wasAtRight = isAtRightEdgeRef.current;
    setSeriesDataFromTf(symbol, tf);
    if (wasAtRight) chartRef.current.timeScale().scrollToRealTime();
  }, [tf]);

  // Symbol change: swap data without recreating chart
  useEffect(() => {
    if (!seriesRef.current || !chartRef.current) return;
    const wasAtRight = isAtRightEdgeRef.current;
    setSeriesDataFromTf(symbol, tf);
    if (wasAtRight) chartRef.current.timeScale().scrollToRealTime();
  }, [symbol]);

  // Upsert helper (1m candles) using ms timestamp input
  function upsert1m(sym: TSymbol, price: number, tsMs: number) {
    const tsSec = Math.floor(tsMs / 1000);
    const bucket = Math.floor(tsSec / 60) * 60; // start of minute seconds
    const base = (dataBySymbol.current.get(sym) ?? []) as Candle[];
    if (!base.length) {
      // ignore ticks until hydration; alternatively start building fresh if hydration failed
      const c: Candle = { time: bucket as UTCTimestamp, open: price, high: price, low: price, close: price };
      dataBySymbol.current.set(sym, [c]);
      return c;
    }
    const last = base[base.length - 1];
    if (last.time === bucket) {
      // replace with a new object to ensure chart lib processes update
      const updated: Candle = {
        time: last.time,
        open: last.open,
        high: Math.max(last.high, price),
        low: Math.min(last.low, price),
        close: price,
      };
      base[base.length - 1] = updated;
      return updated;
    }
    if ((last.time as number) < bucket) {
      const c: Candle = { time: bucket as UTCTimestamp, open: price, high: price, low: price, close: price };
      base.push(c);
      return c;
    }
    return last; // out-of-order (ignore)
  }

  // Hook up live trades (WS or simulator)
  useLiveTrades(symbol, ({ price, ts }) => {
    const updated = upsert1m(symbol, price, ts);
    // Update pricing / metrics even if chart series not yet ready
  setLastPrice(symbol, updated.close);
    setLastTickTs(Date.now());
    if (connection !== 'connected') markConnection('connected');
    const s = seriesRef.current;
    if (!s) return;
    if (tf === '1m') {
      s.update(updated as any);
      priceLineRef.current?.applyOptions({ price: updated.close });
    } else {
      updateAggregatedLast(symbol, tf);
    }
    if (isAtRightEdgeRef.current) chartRef.current?.timeScale().scrollToRealTime();
  });

  // removed redundant symbol effect (handled above)

  // UI
  return (
    <div className="p-3">
      {/* Timeframe pills */}
      <div className="mb-2 flex items-center gap-2">
    {(['1m','5m','15m'] as const).map(k => {
          const active = tf === k;
          return (
            <button
              key={k}
      onClick={() => useAppStore.getState().setTf(k)}
              className={`h-8 px-3 rounded-md text-sm border transition-colors ${active ? 'bg-slate-800/60 border-slate-700 text-slate-200' : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800/40'}`}
              aria-pressed={active}
            >
              {k}
            </button>
          );
        })}
      </div>
      <div className="relative">
        {!dataBySymbol.current.get(symbol)?.length && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400 text-sm z-10 pointer-events-none">
            <span>Loading {symbol} history…</span>
            <span className="animate-pulse">Fetching Binance klines</span>
          </div>
        )}
  <div ref={containerRef} className="h-[360px] w-full rounded-lg border border-slate-800 bg-slate-900" />
      </div>
    </div>
  );
}
