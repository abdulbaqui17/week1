import { useAppStore } from '../store/app';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { Badge } from './ui/Badge';

export default function Header() {
  const symbol = useAppStore((s) => s.symbol);
  const setSymbol = useAppStore((s) => s.setSymbol);
  const connection = useAppStore((s) => s.connection);
  const lastTickTs = useAppStore((s) => s.lastTickTs);
  const account = useAppStore(s => s.account);
  const user = useAppStore(s => s.user);
  const signout = useAppStore(s => s.signout);
  const navigate = useNavigate();
  
  const equity = account.equity;
  const freeMargin = account.free;
  const usedMargin = account.used;
  const pnlTotal = account.upnl;
  const marginLevel = usedMargin > 0 ? (equity / usedMargin) * 100 : null;
  const tabs: { key: 'BTCUSDT' | 'ETHUSDT' | 'SOLUSDT'; label: 'BTC' | 'ETH' | 'SOL' }[] = [
    { key: 'BTCUSDT', label: 'BTC' },
    { key: 'ETHUSDT', label: 'ETH' },
    { key: 'SOLUSDT', label: 'SOL' },
  ];

  const handleLogout = () => {
    signout();
    navigate('/signin');
  };

  return (
  <div className="h-12 border-b border-slate-800 flex items-center justify-between px-4 bg-slate-950">
      {/* Left: App title + connection status */}
      <div className="flex items-center gap-3">
        <div className="text-sm font-semibold tracking-wide text-slate-200">exness</div>
        {user && (
          <div className="text-xs text-slate-400">
            {user.email}
          </div>
        )}
        {connection === 'connected' && (
          <div className="flex items-center gap-1.5 text-[10px] text-emerald-500">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Live</span>
          </div>
        )}
        {connection === 'connecting' && (
          <div className="flex items-center gap-1.5 text-[10px] text-amber-500">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
            <span>Connecting...</span>
          </div>
        )}
        {connection === 'disconnected' && (
          <div className="flex items-center gap-1.5 text-[10px] text-rose-500">
            <span className="h-2 w-2 rounded-full bg-rose-500"></span>
            <span>Disconnected</span>
          </div>
        )}
      </div>

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

      {/* Right: badges + logout */}
      <div className="flex items-center gap-2">
        <Badge>Demo / Standard</Badge>
  <Badge className={pnlTotal > 0 ? 'bg-emerald-900/30 border-emerald-600 text-emerald-300' : pnlTotal < 0 ? 'bg-rose-900/30 border-rose-600 text-rose-300' : ''}>Equity {equity.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</Badge>
  <Badge>Free {freeMargin.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</Badge>
  <Badge>Used {usedMargin.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</Badge>
  <Badge>Level {marginLevel != null ? marginLevel.toFixed(2)+'%' : '—'}</Badge>
        <button
          onClick={handleLogout}
          className="ml-2 p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition-colors"
          title="Logout"
        >
          <LogOut className="w-4 h-4" />
        </button>
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
