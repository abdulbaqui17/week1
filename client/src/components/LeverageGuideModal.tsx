import { useEffect, useState } from 'react';

type Props = {
  symbol: string;
  qty: number;
  price: number;
  leverage: number;
  equity: number;
  used: number;
  onClose(): void;
  onConfirm(): void; // simplified, always enable
};

export function LeverageGuideModal({ symbol, qty, price, leverage, equity, used, onClose, onConfirm }: Props) {
  const [ack, setAck] = useState(false);
  const notional = price * qty;
  const posted = leverage > 0 ? notional / leverage : notional;
  const liqDist = leverage > 0 ? (100 / leverage) : 0;
  const freeAfter = equity - (used + posted);
  const PROFIT_CUT_BPS = Number((globalThis as any).process?.env?.PROFIT_CUT_BPS ?? 0);
  const exampleProfit = notional * 0.01;
  const profitCut = exampleProfit * PROFIT_CUT_BPS / 10000;
  useEffect(()=>{
    function onEsc(e: KeyboardEvent){ if(e.key==='Escape') onClose(); }
    window.addEventListener('keydown', onEsc); return ()=> window.removeEventListener('keydown', onEsc);
  },[onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-6 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 shadow-xl p-5 text-[12px] leading-snug overflow-y-auto max-h-[90vh]">
        <div className="flex items-start justify-between mb-3">
          <h2 className="text-sm font-semibold tracking-tight text-slate-100">Leverage Guide</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-xs">✕</button>
        </div>
        <div className="space-y-3 text-slate-300">
          <p className="text-slate-300">Leverage lets you control a larger position with a small posted margin. Losses can exceed posted margin.</p>
          <p className="text-slate-400">Positions may be liquidated if Margin Level falls below maintenance. Approx. liq distance is ~1/L adverse move.</p>
          <p className="text-slate-400">This platform charges trading fees; realized profits may have an additional platform cut if configured.</p>
          <div className="rounded-md border border-slate-700 bg-slate-800/50 p-3">
            <div className="font-medium text-slate-200 mb-1">Example ({symbol})</div>
            <ul className="space-y-0.5 text-slate-300">
              <li>Qty: {qty}</li>
              <li>Price: ${price.toFixed(2)}</li>
              <li>Notional = price × qty = ${notional.toFixed(2)}</li>
              <li>Posted Margin = Notional ÷ L = ${posted.toFixed(2)}</li>
              <li>Est. liq distance ≈ ~{liqDist.toFixed(0)}% adverse move</li>
              <li>Free after placing ≈ ${freeAfter.toFixed(2)}</li>
            </ul>
          </div>
          <div className="rounded-md border border-slate-700 bg-slate-800/50 p-3">
            <div className="font-medium text-slate-200 mb-1">Fees & Cuts</div>
            <ul className="space-y-0.5 text-slate-300">
              <li>Trading fee preview (maker/taker) shown in ticket.</li>
              {PROFIT_CUT_BPS > 0 && <li>Platform takes {(PROFIT_CUT_BPS/100).toFixed(2)}% of realized profits. (+1% PnL example: cut ${profitCut.toFixed(2)})</li>}
              {PROFIT_CUT_BPS <= 0 && <li>No profit cut configured.</li>}
              <li>Financing / funding: —</li>
            </ul>
          </div>
          <label className="flex items-center gap-2 text-slate-200 mt-2">
            <input type="checkbox" checked={ack} onChange={e=>setAck(e.target.checked)} className="h-4 w-4" />
            <span>I understand leverage and the risks</span>
          </label>
          {/* Removed 'Don’t show this again for ≤5×' per updated requirement */}
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-3 h-8 rounded-md bg-slate-800 text-slate-300 text-xs hover:bg-slate-700">Cancel</button>
          <button disabled={!ack} onClick={()=> onConfirm()} className={`px-3 h-8 rounded-md text-xs font-medium ${ack ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-slate-700 text-slate-400 cursor-not-allowed'}`}>Continue</button>
        </div>
      </div>
    </div>
  );
}
