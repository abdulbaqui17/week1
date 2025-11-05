import Header from '../components/Header';
import DebugOverlay from '../components/DebugOverlay';
import Sidebar from '../components/Sidebar';
import OrderPanel from '../components/OrderPanel';
import PositionsPanel from '../components/PositionsPanel';
import ChartPanel from '../components/ChartPanel';
import { useEffect } from 'react';
import { useAlerts } from '../lib/alerts';
import { useAppStore } from '../store/app';

export default function Dashboard() {
  const setSymbol = useAppStore((s) => s.setSymbol);
  const setMode = useAppStore((s) => s.setMode);
  const setVolume = useAppStore((s) => s.setVolume);
  const setLeverage = useAppStore((s) => s.setLeverage);
  const mode = useAppStore((s) => s.mode);
  const volume = useAppStore((s) => s.volume);
  const fetchAccount = useAppStore(s => s.fetchAccount);
  const fetchPositions = useAppStore(s => s.fetchPositions);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target && (e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.key === '1') setSymbol('BTCUSDT');
      if (e.key === '2') setSymbol('ETHUSDT');
      if (e.key === '3') setSymbol('SOLUSDT');
      if (e.key.toLowerCase() === 'm') setMode(mode === 'MARKET' ? 'LIMIT' : 'MARKET');
      if (e.key === '+') setVolume(Number((volume + 0.01).toFixed(2)));
      if (e.key === '-') setVolume(Math.max(0, Number((volume - 0.01).toFixed(2))));
      if (e.key.toLowerCase() === 'l') setLeverage(100);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setSymbol, setMode, setVolume, setLeverage, mode, volume]);

  // Hook alerts (assumes global singleton WS if provided through window.__WS__ else none)
  useAlerts((globalThis as any).__WS__ || null);

  // Poll authoritative server snapshot
  useEffect(() => {
    fetchAccount().catch(()=>{});
    fetchPositions().catch(()=>{});
    const id = setInterval(() => { fetchAccount().catch(()=>{}); }, 1000);
    return () => clearInterval(id);
  }, [fetchAccount, fetchPositions]);

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-200">
      {/* Header */}
      <Header />

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar (desktop only) */}
        <aside className="hidden xl:block w-72 border-r border-slate-800 overflow-y-auto">
          <Sidebar />
        </aside>

        {/* Main Content Area - Chart and Positions */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Chart Area */}
          <div className="flex-shrink-0">
            <ChartPanel />
          </div>

          {/* Positions Panel Below Chart */}
          <div className="flex-1 overflow-y-auto border-t border-slate-800 p-3">
            <PositionsPanel />
          </div>
        </main>

        {/* Right Sidebar - Order Panel */}
        <aside className="hidden xl:block w-80 border-l border-slate-800 overflow-y-auto">
          <OrderPanel />
        </aside>
      </div>

      {/* Floating DebugOverlay (optional) */}
      <DebugOverlay />
    </div>
  );
}
