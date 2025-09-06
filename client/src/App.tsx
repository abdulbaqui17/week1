import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ChartPanel from './components/ChartPanel';
import OrderPanel from './components/OrderPanel';
import PositionsPanel from './components/PositionsPanel';
import { useEffect } from 'react';
import { useAppStore } from './store/app';

export default function App() {
  const setSymbol = useAppStore((s) => s.setSymbol);
  const setMode = useAppStore((s) => s.setMode);
  const setVolume = useAppStore((s) => s.setVolume);
  const setLeverage = useAppStore((s) => s.setLeverage);
  const mode = useAppStore((s) => s.mode);
  const volume = useAppStore((s) => s.volume);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target && (e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.key === '1') setSymbol('BTCUSD');
      if (e.key === '2') setSymbol('ETHUSD');
      if (e.key === '3') setSymbol('SOLUSD');
  if (e.key.toLowerCase() === 'm') setMode(mode === 'MARKET' ? 'LIMIT' : 'MARKET');
  if (e.key === '+') setVolume(Number((volume + 0.01).toFixed(2)));
  if (e.key === '-') setVolume(Math.max(0, Number((volume - 0.01).toFixed(2))));
      if (e.key.toLowerCase() === 'l') setLeverage(100);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setSymbol, setMode, setVolume, setLeverage, mode, volume]);

  return (
    <div className="flex flex-col h-screen">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex-1 flex flex-col p-3">
          <ChartPanel />
          <PositionsPanel />
        </div>
        <OrderPanel />
      </div>
    </div>
  );
}
