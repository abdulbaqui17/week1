import { useAppStore } from '../store/app';

export function LeverageCard({ slMissing, onChange }: { slMissing: boolean; onChange(newLev: number): void; }) {
  const leverage = useAppStore(s=>s.leverage);
  const volume = useAppStore(s=>s.volume);
  const equity = useAppStore(s=>s.equity);
  const used = useAppStore(s=>s.usedMargin);
  const free = useAppStore(s=>s.freeMargin);
  const lastPrice = useAppStore(s=> s.lastPriceBySymbol[s.symbol]);
  const notional = (lastPrice || 0) * volume;
  const posted = leverage > 0 ? notional / leverage : notional;
  const freeAfter = equity - (used + posted);
  const liqHint = leverage > 0 ? `${(100/leverage).toFixed(0)}%` : '—';
  const quick = [5,25,50,75,100];
  return (
    <div className="mb-3 rounded-md border border-slate-800 bg-slate-900 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] text-slate-400">Leverage</div>
        <div className="text-xs font-medium text-slate-200">{leverage}×</div>
      </div>
  <input type="range" min={1} max={100} step={1} value={leverage} onChange={e=> onChange(Number(e.target.value))} className="w-full" />
      <div className="flex flex-wrap gap-1 mt-2">
        {quick.map(q => (
          <button key={q} type="button" onClick={()=> onChange(q)} className={`px-2 h-6 rounded-md text-[10px] border ${leverage===q?'bg-slate-700 border-slate-600 text-slate-100':'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}>{q}×</button>
        ))}
      </div>
      <div className="mt-3 text-[11px] space-y-0.5 text-slate-300">
        <div>Unleveraged Notional: ${notional.toFixed(2)}</div>
        <div>Posted Margin: ${posted.toFixed(2)}</div>
        <div>Eq: ${equity.toFixed(2)} | Used: ${used.toFixed(2)} | Free: ${free.toFixed(2)}</div>
        <div>Free After: ${freeAfter.toFixed(2)}</div>
        <div className="text-slate-400">Est. liq distance: ~{liqHint} adverse move</div>
  {leverage >= 20 && slMissing && <div className="text-amber-400">Warning: High leverage without Stop-Loss</div>}
      </div>
      <div className="mt-2 text-[10px] text-slate-500">Posted margin is locked per position; you can open more trades as long as Free ≥ required.</div>
    </div>
  );
}
