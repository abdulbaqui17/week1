import { useAppStore } from '../store/app';
import { useEffect, useState } from 'react';

export default function DebugOverlay() {
  const lastPriceBy = useAppStore(s => s.lastPriceBySymbol);
  const connection = useAppStore(s => s.connection);
  const lastTickTs = useAppStore(s => s.lastTickTs);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(()=> setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  return (
    <div style={{ position:'fixed', bottom:8, right:8, fontSize:11, fontFamily:'monospace', background:'rgba(15,23,42,0.85)', color:'#cbd5e1', padding:'6px 8px', border:'1px solid #334155', borderRadius:6, zIndex:9999 }}>
      <div>conn: {connection}</div>
      <div>last tick age: {lastTickTs ? (now - lastTickTs) + 'ms' : '—'}</div>
      <div>BTC: {lastPriceBy.BTCUSDT?.toFixed(2)}</div>
      <div>ETH: {lastPriceBy.ETHUSDT?.toFixed(2)}</div>
      <div>SOL: {lastPriceBy.SOLUSDT?.toFixed(2)}</div>
    </div>
  );
}
