import { useAppStore } from '../store/app';
import { Badge } from './ui/Badge';

export default function Header() {
  const symbol = useAppStore((s) => s.symbol);
  const setSymbol = useAppStore((s) => s.setSymbol);
  const connection = useAppStore((s) => s.connection);
  const lastTickTs = useAppStore((s) => s.lastTickTs);
  const equity = useAppStore((s) => s.equity);
  const freeMargin = useAppStore((s) => s.freeMargin);
  const usedMargin = useAppStore((s) => s.usedMargin);
  const marginLevel = useAppStore((s) => s.marginLevel);
  const tabs: { key: 'BTCUSDT' | 'ETHUSDT' | 'SOLUSDT'; label: 'BTC' | 'ETH' | 'SOL' }[] = [
    { key: 'BTCUSDT', label: 'BTC' },
    { key: 'ETHUSDT', label: 'ETH' },
    { key: 'SOLUSDT', label: 'SOL' },
  ];

  return (
  <div className="h-12 border-b border-slate-800 flex items-center justify-between px-4 bg-slate-950">
      {/* Left: App title */}
      <div className="text-sm font-semibold tracking-wide text-slate-200">exness</div>

      {/* Center-left: tabs */}
      <div className="flex items-center gap-2">
        {tabs.map((t) => {
          const active = symbol === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setSymbol(t.key)}
              className={`px-2 py-1 rounded text-sm border border-slate-800 bg-slate-900 hover:bg-slate-800/40 ${active ? 'bg-slate-800/60' : ''}`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Right: badges */}
      <div className="flex items-center gap-2">
        <Badge>Demo / Standard</Badge>
        <Badge>Equity {equity.toFixed(2)}</Badge>
        <Badge>Free {freeMargin.toFixed(2)}</Badge>
        <Badge>Used {usedMargin.toFixed(2)}</Badge>
        <Badge>Level {marginLevel != null ? marginLevel.toFixed(2)+'%' : '—'}</Badge>
  {(() => {
          const now = Date.now();
          const fresh = lastTickTs && now - lastTickTs < 5000; // 5s freshness window
          const cls = fresh
            ? 'bg-green-900/30 border-green-600 text-green-300'
            : connection === 'connecting'
              ? 'bg-amber-900/30 border-amber-600 text-amber-300'
              : 'bg-red-900/40 border-red-700 text-red-300';
          const text = fresh
            ? 'feed: live'
            : connection === 'connecting'
              ? 'feed: connecting…'
              : 'No feed';
          return <Badge className={cls}>{text}</Badge>;
        })()}
      </div>
    </div>
  );
}
