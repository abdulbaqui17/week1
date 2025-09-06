"use client";

import { useEffect, useRef } from 'react';
import { createChart, LineStyle, CandlestickSeries, type ISeriesApi, type IChartApi, type CandlestickData, type UTCTimestamp, type IPriceLine } from 'lightweight-charts';
import { useAppStore } from '../store/app';
import type { TSymbol } from '../store/app';
import { setLastPrice } from '../lib/ws';
import { useLiveTrades } from '../hooks/useLiveTrades';

type Candle = CandlestickData<UTCTimestamp>;

function seededRand(seed: number) {
  let s = seed >>> 0;
  return () => {
    // xorshift32
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) / 0xffffffff);
  };
}

function genSeededCandles(seed: number, n: number, start = Math.floor(Date.now() / 1000) - n * 60): Candle[] {
  const rand = seededRand(seed);
  const arr: Candle[] = [];
  let price = 30000 + Math.floor(rand() * 10000);
  for (let i = 0; i < n; i++) {
    const t = start + i * 60;
    const drift = Math.floor((rand() - 0.5) * 120);
    const o = price;
    const c = Math.max(100, o + drift);
    const hi = Math.max(o, c) + Math.floor(rand() * 80);
    const lo = Math.min(o, c) - Math.floor(rand() * 80);
  arr.push({ time: t as UTCTimestamp, open: o, high: hi, low: lo, close: c });
    price = c;
  }
  return arr;
}

export default function ChartPanel() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const priceLineRef = useRef<IPriceLine | null>(null);
  const dataBySymbol = useRef<Map<TSymbol, Candle[]>>(new Map());
  const symbol = useAppStore((s) => s.symbol);
  const tf = useAppStore((s) => s.tf);
  const connection = useAppStore((s) => s.connection);
  const markConnection = useAppStore((s) => s.markConnection);
  const recalc = useAppStore((s) => s.recalc);
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

  // ensure cache seeded per symbol
  useEffect(() => {
  const seeds: Record<TSymbol, number> = { BTCUSD: 1, ETHUSD: 2, SOLUSD: 3 };
  (Object.keys(seeds) as TSymbol[]).forEach((s) => {
      if (!dataBySymbol.current.has(s)) {
        dataBySymbol.current.set(s, genSeededCandles(seeds[s], 100));
      }
    });
  }, []);

  // create chart
  useEffect(() => {
    const el = containerRef.current;
    if (!el || chartRef.current) return;
    const chart = createChart(el, {
      layout: { background: { color: 'transparent' }, textColor: '#94a3b8' },
      grid: {
        vertLines: { color: 'rgba(71,85,105,0.25)' }, // slate-600/25
        horzLines: { color: 'rgba(71,85,105,0.25)' },
      },
      rightPriceScale: { borderColor: 'rgba(51,65,85,0.6)' },
      timeScale: { borderColor: 'rgba(51,65,85,0.6)', rightOffset: 2 },
      crosshair: { mode: 1 },
      width: el.clientWidth,
      height: el.clientHeight,
    });
    chartRef.current = chart;

    const seriesOptions = {
      upColor: '#22c55e',
      downColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
      borderVisible: false,
    } as const;
    // Use preferred API with fallback
    let s: ISeriesApi<'Candlestick'> | null = null;
    const anyChart = chart as any;
    if (typeof anyChart.addSeries === 'function' && typeof CandlestickSeries !== 'undefined') {
      s = anyChart.addSeries(CandlestickSeries, seriesOptions as any) as ISeriesApi<'Candlestick'>;
    } else if (typeof anyChart.addCandlestickSeries === 'function') {
      s = anyChart.addCandlestickSeries(seriesOptions as any) as ISeriesApi<'Candlestick'>;
    }
    if (!s) return;
    seriesRef.current = s;
    const priceLine = s.createPriceLine({ price: 0, title: 'Live', lineWidth: 2, lineStyle: LineStyle.Solid });
    priceLineRef.current = priceLine;

  // seed data for current symbol and timeframe
  setSeriesDataFromTf(symbol, tf);

    // Resize handling
    const ro = new ResizeObserver(() => {
      if (!containerRef.current || !chartRef.current) return;
      chartRef.current.applyOptions({ width: containerRef.current.clientWidth, height: containerRef.current.clientHeight });
    });
    ro.observe(el);

    return () => {
      try { ro.disconnect(); } catch {}
  try { chart.remove(); } catch {}
      chartRef.current = null;
      seriesRef.current = null;
  priceLineRef.current = null;
    };
  }, [symbol]);

  // Switch data when timeframe changes
  useEffect(() => {
    if (!seriesRef.current) return;
    setSeriesDataFromTf(symbol, tf);
  }, [tf, symbol]);

  // Upsert helper (1m candles) using ms timestamp input
  function upsert1m(sym: TSymbol, price: number, tsMs: number) {
    const tsSec = Math.floor(tsMs / 1000);
    const bucket = Math.floor(tsSec / 60) * 60; // start of minute seconds
    const base = (dataBySymbol.current.get(sym) ?? []) as Candle[];
    if (!base.length) {
      const c: Candle = { time: bucket as UTCTimestamp, open: price, high: price, low: price, close: price };
      dataBySymbol.current.set(sym, [c]);
      return c;
    }
    const last = base[base.length - 1];
    if (last.time === bucket) {
      // update existing
      last.high = Math.max(last.high, price);
      last.low = Math.min(last.low, price);
      last.close = price;
      return last;
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
    const s = seriesRef.current;
    if (!s) return;
    const updated = upsert1m(symbol, price, ts);
    if (tf === '1m') {
      s.update(updated as any);
      priceLineRef.current?.applyOptions({ price: updated.close });
    } else {
      updateAggregatedLast(symbol, tf);
    }
    chartRef.current?.timeScale().applyOptions({ rightOffset: 2 });
  setLastPrice(symbol, updated.close);
  recalc(updated.close);
  setLastTickTs(Date.now());
  if (connection !== 'connected') markConnection('connected');
  });

  // respond to symbol change by swapping series data instantly
  useEffect(() => {
    const s = seriesRef.current;
    if (!s) return;
  setSeriesDataFromTf(symbol, tf);
  }, [symbol]);

  // UI
  return (
    <div className="flex-1 p-3">
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
          <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm z-10 pointer-events-none">
            No data yet — Waiting for live trades…
          </div>
        )}
        <div ref={containerRef} className="h-[520px] w-full rounded-lg border border-slate-800 bg-slate-900" />
      </div>
    </div>
  );
}
