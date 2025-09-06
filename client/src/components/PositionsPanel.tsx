import { useState, useMemo } from 'react';
import { useAppStore, type Position } from '../store/app';
import { XCircle } from 'lucide-react';
import { formatPrice as fmt, formatVolumeLots as volFmt, formatSigned } from '../lib/format';

function SymbolIcon({ symbol }: { symbol: Position['symbol'] }) {
  if (symbol === 'BTCUSDT') return <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold">₿</span>;
  if (symbol === 'ETHUSDT') return <span className="inline-flex h-5 w-5 items-center justify-center rounded-sm bg-purple-600 text-[9px] font-bold">◇</span>;
  return <span className="inline-flex h-5 w-5 items-center justify-center rounded-sm bg-teal-500 text-[9px] font-bold">▌</span>;
}
function symbolLabel(symbol: Position['symbol']) { return symbol.replace('USDT',''); }

export default function PositionsPanel() {
  const positions = useAppStore(s => s.positions);
  const lastPriceBy = useAppStore(s => s.lastPriceBySymbol);
  const closePosition = useAppStore(s => s.closePosition);
  const [tab, setTab] = useState<'OPEN' | 'CLOSED'>('OPEN');

  const openPositions = useMemo(() => positions.filter(p => p.status === 'OPEN'), [positions]);
  const closedPositions = useMemo(() => (
    positions
      .filter(p => p.status === 'CLOSED')
      .sort((a,b) => (b.closedAt ?? 0) - (a.closedAt ?? 0))
      .slice(0,4)
  ), [positions]);
  const shown = tab === 'OPEN' ? openPositions : closedPositions;

  return (
    <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900 p-0 overflow-hidden">
      {/* Tabs */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-1">
        {(['OPEN','CLOSED'] as const).map(k => {
          const active = tab === k;
          return (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`h-8 px-3 rounded-md text-sm border border-slate-800 bg-slate-900 hover:bg-slate-800/40 ${active ? 'bg-slate-800/60' : ''}`}
            >{k === 'OPEN' ? 'Open' : 'Closed'}</button>
          );
        })}
      </div>
      {/* Content */}
      {shown.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <div className="text-3xl mb-2">🧳</div>
          <div className="font-medium">No {tab === 'OPEN' ? 'open' : 'closed'} positions</div>
          <div className="text-sm text-slate-500">Your {tab === 'OPEN' ? 'open' : 'closed'} positions will appear here once available</div>
        </div>
      ) : (
        <div className="mt-1">
          {tab === 'OPEN' ? (
            <table className="w-full text-left">
              <thead className="bg-slate-900/60 text-[12px] uppercase tracking-wide text-slate-400">
                <tr className="h-9">
                  <th className="pl-4 w-[140px]">Symbol</th>
                  <th className="w-[100px]">Type</th>
                  <th className="w-[140px]">Volume, lot</th>
                  <th className="w-[160px]">Open price</th>
                  <th className="w-[160px]">Current price</th>
                  <th className="w-[120px]">P/L, USD</th>
                  <th className="w-[80px] pr-2 text-right" />
                </tr>
              </thead>
              <tbody>
                {openPositions.map(p => {
                  const last = lastPriceBy[p.symbol] ?? p.entry;
                  const pnl = (p.side === 'BUY' ? (last - p.entry) : (p.entry - last)) * p.volume;
                  const pnlCls = pnl > 0 ? 'text-emerald-400' : pnl < 0 ? 'text-rose-400' : 'text-slate-300';
                  const pnlStr = formatSigned(pnl);
                  return (
                    <tr key={p.id} className="h-12 text-sm text-slate-200 hover:bg-slate-800/30 transition border-t border-slate-800 first:border-t-0">
                      <td className="pl-4 w-[140px]">
                        <div className="flex items-center gap-2"><SymbolIcon symbol={p.symbol} /><span>{symbolLabel(p.symbol)}</span></div>
                      </td>
                      <td className="w-[100px]">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${p.side==='BUY' ? 'bg-sky-500' : 'bg-rose-500'}`} />
                          <span>{p.side==='BUY' ? 'Buy' : 'Sell'}</span>
                        </div>
                      </td>
                      <td className="w-[140px]"><span className="inline-block border-b border-dashed border-slate-500/60">{volFmt(p.volume)}</span></td>
                      <td className="w-[160px]">{fmt(p.entry)}</td>
                      <td className="w-[160px]">{fmt(last)}</td>
                      <td className={`w-[120px] ${pnlCls}`}>{pnlStr}</td>
                      <td className="w-[80px] pr-2">
                        <div className="flex justify-end">
                          <button aria-label="Close" className="p-1 text-slate-400 hover:text-rose-400" onClick={() => closePosition(p.id)}>
                            <XCircle className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-900/60 text-[12px] uppercase tracking-wide text-slate-400">
                <tr className="h-9">
                  <th className="pl-4 w-[140px]">Symbol</th>
                  <th className="w-[100px]">Type</th>
                  <th className="w-[140px]">Volume, lot</th>
                  <th className="w-[160px]">Open price</th>
                  <th className="w-[160px]">Close price</th>
                  <th className="w-[120px]">P/L, USD</th>
                  <th className="w-[200px]">Closed at</th>
                </tr>
              </thead>
              <tbody>
                {closedPositions.map(p => {
                  const pnl = p.realizedPnl ?? 0;
                  const pnlCls = pnl > 0 ? 'text-emerald-400' : pnl < 0 ? 'text-rose-400' : 'text-slate-300';
                  return (
                    <tr key={p.id} className="h-12 text-sm text-slate-200 hover:bg-slate-800/30 transition border-t border-slate-800 first:border-t-0">
                      <td className="pl-4 w-[140px]"><div className="flex items-center gap-2"><SymbolIcon symbol={p.symbol} /><span>{symbolLabel(p.symbol)}</span></div></td>
                      <td className="w-[100px]">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${p.side==='BUY' ? 'bg-sky-500' : 'bg-rose-500'}`} />
                          <span>{p.side==='BUY' ? 'Buy' : 'Sell'}</span>
                        </div>
                      </td>
                      <td className="w-[140px]"><span className="inline-block border-b border-dashed border-slate-500/60">{volFmt(p.volume)}</span></td>
                      <td className="w-[160px]">{fmt(p.entry)}</td>
                      <td className="w-[160px]">{fmt(p.closePrice ?? p.entry)}</td>
                      <td className={`w-[120px] ${pnlCls}`}>{formatSigned(p.realizedPnl ?? 0)}</td>
                      <td className="w-[200px]">{p.closedAt ? new Date(p.closedAt).toLocaleString() : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
