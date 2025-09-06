import { useAppStore } from '../store/app';
import { useState } from 'react';

export default function OrderPanel() {
  const symbol = useAppStore(s => s.symbol);
  const side = useAppStore(s => s.side);
  const setSide = useAppStore(s => s.setSide);
  const mode = useAppStore(s => s.mode); // still used for order logic
  const price = useAppStore(s => s.price);
  const volume = useAppStore(s => s.volume);
  const setVolume = useAppStore(s => s.setVolume);
  const leverage = useAppStore(s => s.leverage);
  const setLeverage = useAppStore(s => s.setLeverage);
  const freeMargin = useAppStore(s => s.freeMargin);
  const usedMargin = useAppStore(s => s.usedMargin);
  const equity = useAppStore(s => s.equity);
  const lastPriceBySymbol = useAppStore(s => s.lastPriceBySymbol);
  const placeOrderStore = useAppStore(s => s.placeOrder);
  const pendingOrders = useAppStore(s => s.pendingOrders).filter(o => o.symbol === symbol);

  const lastPrice = lastPriceBySymbol[symbol] ?? 0;
  const tradePrice = mode === 'MARKET' ? lastPrice : (price ?? lastPrice);
  const notional = tradePrice * volume;
  const required = notional / leverage;
  const posted = required;
  const effective = notional;
  const invalid = volume <= 0 || Number.isNaN(tradePrice) || (mode === 'LIMIT' && (price == null || price <= 0)) || required > freeMargin;
  const [tpOpen, setTpOpen] = useState(false);
  const [slOpen, setSlOpen] = useState(false);

  function submit(chosen: 'BUY' | 'SELL') {
    setSide(chosen);
    if (invalid) return;
    const res = placeOrderStore();
    if (!res.ok) {
      // eslint-disable-next-line no-alert
      alert(res.reason);
    }
  }

  return (
  <aside className="w-[20rem] p-3 border-l border-slate-800 bg-slate-950 flex flex-col text-[13px] leading-snug">
      {/* Title */}
      <div className="text-base font-semibold mb-2 tracking-tight">{symbol.replace('USD','')}</div>

      {/* Top BUY/SELL segmented */}
    <div className="grid grid-cols-2 gap-2 mb-2">
        <button
          type="button"
          onClick={() => submit('SELL')}
          disabled={invalid}
          aria-label="Place SELL order"
      className={`h-10 rounded-lg font-medium text-white text-sm w-full bg-rose-500 hover:bg-rose-600 transition-colors ${side==='SELL' ? 'ring-2 ring-white/10' : ''} ${invalid ? 'opacity-50 cursor-not-allowed' : ''}`}
        >SELL</button>
        <button
          type="button"
          onClick={() => submit('BUY')}
          disabled={invalid}
          aria-label="Place BUY order"
      className={`h-10 rounded-lg font-medium text-white text-sm w-full bg-emerald-500 hover:bg-emerald-600 transition-colors ${side==='BUY' ? 'ring-2 ring-white/10' : ''} ${invalid ? 'opacity-50 cursor-not-allowed' : ''}`}
        >BUY</button>
      </div>

  {/* Removed Mode & Price section per request */}

      {/* Volume */}
    <div className="mb-2">
        <label htmlFor="order-volume" className="text-[11px] text-slate-400 block mb-1">Volume</label>
        <input
          id="order-volume"
          name="volume"
          type="number"
          step="0.01"
          min="0"
          value={volume}
          onChange={(e)=> setVolume(Number(e.target.value))}
          aria-label="Volume"
      className="h-9 w-full rounded-md bg-slate-900 border border-slate-700 px-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
        {volume <= 0 && <div className="text-xs text-rose-400 mt-1">Volume must be greater than 0</div>}
      </div>

      {/* Margin warning */}
  {required > freeMargin && (
        <div className="mt-1 rounded-md border border-rose-700/60 bg-rose-950/60 p-2 text-[11px] mb-2">
      <div className="text-rose-300 mb-0.5">Insufficient Margin</div>
      <div className="text-slate-400">Required: ${required.toFixed(2)} | Available: ${freeMargin.toFixed(2)}</div>
          <div className="text-slate-500">Hint: Reduce size or increase leverage (higher risk).</div>
        </div>
      )}

      {/* TP / SL */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <button
          onClick={()=> setTpOpen(v=>!v)}
          className="h-9 flex-1 rounded-md bg-slate-900 border border-slate-800 px-3 text-[11px] text-slate-300 hover:bg-slate-800/60 transition-colors"
        >Take Profit: {tpOpen? 'Set' : 'Not set'}</button>
        <button
          onClick={()=> setSlOpen(v=>!v)}
          className="h-9 flex-1 rounded-md bg-slate-900 border border-slate-800 px-3 text-[11px] text-slate-300 hover:bg-slate-800/60 transition-colors"
        >Stop Loss: {slOpen? 'Set' : 'Not set'}</button>
      </div>
      {(tpOpen || slOpen) && (
        <div className="grid grid-cols-2 gap-2 mb-2">
          {tpOpen && <input type="number" step="0.01" placeholder="TP price" aria-label="TP price" className="h-9 w-full rounded-md bg-slate-900 border border-slate-700 px-3 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-500" />}
          {slOpen && <input type="number" step="0.01" placeholder="SL price" aria-label="SL price" className="h-9 w-full rounded-md bg-slate-900 border border-slate-700 px-3 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-500" />}
        </div>
      )}

      {/* Leverage */}
    <div className="mb-2">
        <label className="text-[11px] text-slate-400 block mb-1">Leverage</label>
        <select
          value={leverage}
          onChange={(e)=> setLeverage(Number(e.target.value) as any)}
          aria-label="Leverage"
      className="h-9 w-full rounded-md bg-slate-900 border border-slate-700 px-3 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-500"
        >
          {[5,10,20,100].map(l => <option key={l} value={l}>{l}x</option>)}
        </select>
      </div>

      {/* Order Size */}
  <div className="mt-2 rounded-md border border-slate-800 bg-slate-900 p-3 mb-3">
        <div className="text-[11px] text-slate-400 mb-0.5">Order Size (Leveraged)</div>
  <div className="text-xl font-semibold tracking-tight">{effective.toFixed(2)} USD</div>
	<div className="text-[11px] text-slate-500 mt-1">Posted: ${posted.toFixed(2)} | Eff: ${effective.toFixed(2)}</div>
  <div className="text-[11px] text-slate-500 mt-1">Eq: ${equity.toFixed(2)} | Used: ${usedMargin.toFixed(2)} | Free: ${freeMargin.toFixed(2)}</div>
        {pendingOrders.length > 0 && (
          <div className="mt-2 text-[11px] text-slate-400">
            <div className="font-semibold text-slate-300 mb-1 text-xs">Pending Limit Orders</div>
            <ul className="space-y-1 max-h-24 overflow-auto pr-1">
              {pendingOrders.map(o => (
                <li key={o.id} className="flex justify-between text-[10px] bg-slate-800/40 rounded px-2 py-1">
                  <span>{o.side} {o.volume} @ {o.price}</span>
                  <span className="text-slate-500">{o.createdAt ? new Date(o.createdAt).toLocaleTimeString() : ''}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </aside>
  );
}
