import Header from './components/Header';
import DebugOverlay from './components/DebugOverlay';
import Sidebar from './components/Sidebar';
import OrderPanel from './components/OrderPanel';
import PositionsPanel from './components/PositionsPanel';
import ChartPanel from './components/ChartPanel';
import { useEffect } from 'react';
import { useAlerts } from './lib/alerts';
import { useAppStore } from './store/app';

export default function App() {
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
  // Won't alter layout or styling.
  useAlerts((globalThis as any).__WS__ || null);

  // Poll authoritative server snapshot
  useEffect(() => {
    fetchAccount().catch(()=>{});
    fetchPositions().catch(()=>{});
    const id = setInterval(() => { fetchAccount().catch(()=>{}); }, 1000);
    return () => clearInterval(id);
  }, [fetchAccount, fetchPositions]);

  return (
  <div className="grid h-screen grid-rows-[auto_1fr] grid-cols-1 xl:grid-cols-[18rem_minmax(0,1fr)_20rem] xl:gap-x-2 bg-slate-950 text-slate-200">
      {/* Header spans all columns */}
      <header className="row-[1] col-span-full h-12 border-b border-slate-800 bg-slate-950 flex items-center">
        <Header />
      </header>

      {/* Sidebar fixed (hidden below xl) */}
      <aside className="row-[2] col-[1] hidden xl:block border-r border-slate-800 bg-slate-950 overflow-y-auto">
        <Sidebar />
      </aside>

      {/* Main center area */}
      <main className="row-[2] xl:col-[2] col-span-full min-w-0 overflow-hidden flex flex-col">
        {/* Chart (fixed height inside) */}
        <ChartPanel />
        {/* Scrollable positions area fills remaining space */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3">
          <div className="max-w-[960px] mx-auto">
            <PositionsPanel />
          </div>
        </div>
      </main>

      {/* Order panel fixed width on right (hidden below xl) */}
  <section className="row-[2] xl:col-[3] hidden xl:block bg-slate-950 ">
        <OrderPanel />
      </section>
      <DebugOverlay />
    </div>
  );
}
