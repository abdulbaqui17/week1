import { useAppStore } from '../store/app';

type Row = { name: string; ticker: 'BTCUSDT' | 'ETHUSDT' | 'SOLUSDT' };

const ROWS: Row[] = [
  { name: 'BTC/USDT', ticker: 'BTCUSDT' },
  { name: 'ETH/USDT', ticker: 'ETHUSDT' },
  { name: 'SOL/USDT', ticker: 'SOLUSDT' },
];

export default function Sidebar() {
  const symbol = useAppStore((s) => s.symbol);
  const setSymbol = useAppStore((s) => s.setSymbol);
  const account = useAppStore(s => s.account);
  const equity = account.equity;
  const freeMargin = account.free;
  const usedMargin = account.used;
  const marginLevel = usedMargin > 0 ? (equity / usedMargin) * 100 : null;
  const leverage = useAppStore((s) => s.leverage);
  const lastPriceBy = useAppStore((s) => s.lastPriceBySymbol);
  const price = lastPriceBy[symbol] || 0;

  return (
    <aside className="w-72 border-r border-slate-800 bg-slate-950 p-3 flex flex-col">
      {/* Title */}
      <div className="text-xs uppercase text-slate-400 mb-2">INSTRUMENTS</div>

  {/* Section label */}
  <div className="text-[10px] tracking-wide text-slate-500 mt-1 mb-1">ALL INSTRUMENTS</div>

      {/* Instruments list */}
      <div className="flex flex-col gap-1">
        {ROWS.map((row) => {
          const active = symbol === row.ticker;
          return (
            <button
              key={row.ticker}
              onClick={() => setSymbol(row.ticker)}
              className={`w-full flex items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-slate-800/40 ${active ? 'bg-slate-800/60' : ''}`}
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-slate-400/60" aria-hidden />
                <div className="flex flex-col leading-tight">
                  <span className="text-slate-200">{row.name}</span>
                  <span className="text-[11px] text-slate-400">{row.ticker}</span>
                </div>
              </div>
              <div className="w-2 h-2 rounded-full bg-green-500" aria-label="status" />
            </button>
          );
        })}
      </div>

      {/* Stats block */}
      <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900 p-3 space-y-1 text-xs text-slate-400">
        <div className="flex items-center justify-between"><span className="text-slate-300">Equity</span><span className="text-slate-400">{equity.toFixed(2)}</span></div>
        <div className="flex items-center justify-between"><span className="text-slate-300">Can buy 1 {symbol.replace('USDT','')} (no lev)</span><span className="text-slate-500">{price ? (equity >= price ? 'Yes' : 'No') : '—'}</span></div>
        <div className="flex items-center justify-between"><span className="text-slate-300">{symbol.replace('USDT','')} no leverage</span><span className="text-slate-500">{price ? (Math.floor((equity / price) * 1000) / 1000).toFixed(3) : '—'}</span></div>
        <div className="flex items-center justify-between"><span className="text-slate-300">{symbol.replace('USDT','')} with leverage</span><span className="text-slate-500">{price ? (Math.floor(((equity * leverage) / price) * 1000) / 1000).toFixed(3) : '—'}</span></div>
        <div className="flex items-center justify-between"><span className="text-slate-300">Account Margin</span><span className="text-slate-400">{usedMargin.toFixed(2)}</span></div>
        <div className="flex items-center justify-between"><span className="text-slate-300">Free Margin</span><span className="text-slate-400">{freeMargin.toFixed(2)}</span></div>
        <div className="flex items-center justify-between"><span className="text-slate-300">Used Margin</span><span className="text-slate-400">{usedMargin.toFixed(2)}</span></div>
        <div className="flex items-center justify-between"><span className="text-slate-300">Margin Level</span><span className="text-slate-500">{marginLevel != null ? marginLevel.toFixed(2)+'%' : '—'}</span></div>
      </div>
    </aside>
  );
}
