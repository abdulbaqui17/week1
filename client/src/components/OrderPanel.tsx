import { useAppStore } from '../store/app';
import { useState, useEffect, useRef } from 'react';
import { LeverageGateBanner } from './LeverageGateBanner';
import { LeverageGuideModal } from './LeverageGuideModal';
import { LeverageCard } from './LeverageCard';
import { API_BASE } from '../config';

export default function OrderPanel() {
  const symbol = useAppStore(s => s.symbol);
  const side = useAppStore(s => s.side);
  const setSide = useAppStore(s => s.setSide);
  const mode = useAppStore(s => s.mode); // still used for order logic
  const price = useAppStore(s => s.price);
  const volume = useAppStore(s => s.volume);
  const setVolume = useAppStore(s => s.setVolume);
  const leverage = useAppStore(s => s.leverage);
  const freeMargin = useAppStore(s => s.freeMargin);
  const usedMargin = useAppStore(s => s.usedMargin);
  const equity = useAppStore(s => s.equity);
  const lastPriceBySymbol = useAppStore(s => s.lastPriceBySymbol);
  const placeOrderStore = useAppStore(s => s.placeOrder);
  const isPlacing = useAppStore(s => s.isPlacing);
  const fetchAccount = useAppStore(s => s.fetchAccount);
  const pendingOrders = useAppStore(s => s.pendingOrders).filter(o => o.symbol === symbol);
  const risk = useAppStore(s => s.risk);

  const lastPrice = lastPriceBySymbol[symbol] ?? 0;
  const tradePrice = mode === 'MARKET' ? lastPrice : (price ?? lastPrice);
  const notional = tradePrice * volume;
  const required = notional / leverage;
  const posted = required;
  const effective = notional;
  const insufficientFree = required > freeMargin; // now non-blocking
  const invalid = volume <= 0 || Number.isNaN(tradePrice) || (mode === 'LIMIT' && (price == null || price <= 0)); // margin no longer blocks
  const [tpOpen, setTpOpen] = useState(false);
  const [slOpen, setSlOpen] = useState(false);
  const [tpVal, setTpVal] = useState<string>('');
  const [slVal, setSlVal] = useState<string>('');
  // Volume text state for better UX while typing transitional values
  const QTY_STEP = 0.01; // fallback step (no existing per-symbol map present)
  const QTY_DECIMALS = 2; // fallback precision
  const [volumeText, setVolumeText] = useState<string>(() => volume.toFixed(QTY_DECIMALS));
  const [volErr, setVolErr] = useState<string | null>(null);

  function sanitizeVolumeInput(raw: string): string {
    let s = raw.replace(/[^0-9.]/g, '');
    const firstDot = s.indexOf('.');
    if (firstDot !== -1) {
      s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, '');
    }
    return s;
  }
  function quantizeToStep(x: number, step: number) {
    return Math.floor(x / step) * step;
  }
  function commitVolume() {
    const txt = volumeText.trim();
    if (txt === '' || txt === '.' || txt === '0' || txt === '0.' ) {
      setVolErr('Volume must be greater than 0');
      return false;
    }
    const parsed = Number(txt);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setVolErr('Volume must be greater than 0');
      return false;
    }
    const quant = Math.max(QTY_STEP, quantizeToStep(parsed, QTY_STEP));
    setVolume(quant);
    setVolumeText(quant.toFixed(QTY_DECIMALS));
    setVolErr(null);
    return true;
  }

  // New leverage enable + acknowledgment persistence
  const [showLevModal, setShowLevModal] = useState(false);
  const [levEnabled, setLevEnabled] = useState(false);
  const [ackMax, setAckMax] = useState(5);
  useEffect(()=> {
    if (typeof window === 'undefined') return;
    try {
      setLevEnabled(localStorage.getItem('lev_enabled') === '1');
      const v = parseInt(localStorage.getItem('lev_ack_max') ?? '5',10);
      if (Number.isFinite(v)) setAckMax(v);
    } catch {}
  }, []);
  function enableLeverage(nextAckMax?: number) {
    setLevEnabled(true);
    try {
      localStorage.setItem('lev_enabled','1');
      if (Number.isFinite(nextAckMax as number)) {
        localStorage.setItem('lev_ack_max', String(nextAckMax));
        setAckMax(nextAckMax as number);
      }
    } catch {}
  }
  function handleLeverageChange(next: number) {
    if (next < 1) next = 1; if (next > 100) next = 100;
    // Only reopen if user has not globally acknowledged (ackMax < 100)
    if (levEnabled && ackMax < 100 && next > ackMax) setShowLevModal(true);
    useAppStore.setState({ leverage: next });
  }
  function maybeGate() { return false; } // gating disabled for prod debug
  useEffect(() => { fetchAccount().catch(()=>{}); }, [fetchAccount]);
  const clickGuard = useRef(0);
  async function submit(chosen: 'BUY' | 'SELL') {
    const now = Date.now();
    if (now - clickGuard.current < 400) return; // debounce 400ms
    clickGuard.current = now;
    if (isPlacing) return;
  const payloadPreview = { symbol, side: chosen, mode: 'UNITS', qtyUnits: volume, leverage };
    try { console.debug('[OrderPanel] submit', chosen, 'API_BASE=', API_BASE, 'payload=', payloadPreview); } catch {}
    setSide(chosen);
    commitVolume();
    if (invalid || volErr) { try { console.warn('[OrderPanel] blocked by invalid/volErr', { invalid, volErr }); } catch {} }
    const gated = maybeGate();
    if (gated) { try { console.warn('[OrderPanel] gated (should not happen)'); } catch {} }
    const take_profit = tpVal ? Number(tpVal) : null;
    const stop_loss = slVal ? Number(slVal) : null;
    useAppStore.setState(s => ({ ...s, take_profit, stop_loss }));
  try { console.log('[ORDER] payload', { symbol, side: chosen, mode: 'UNITS', qtyUnits: volume, tp: take_profit, sl: stop_loss, leverage }); } catch {}
  const res = await placeOrderStore({ symbol, side: chosen, qtyUnits: volume, leverage, tp: take_profit, sl: stop_loss });
    try { console.debug('[OrderPanel] placeOrder result', res); } catch {}
    if (!res.ok) {
      // eslint-disable-next-line no-alert
      alert(String(res.error || 'Order failed'));
    }
  }

  return (
  <aside className="w-[20rem] p-3 border-l border-slate-800 bg-slate-950 flex flex-col text-[13px] leading-snug">
      {/* Title */}
      <div className="text-base font-semibold mb-2 tracking-tight">{symbol.replace('USD','')}</div>

      {/* Top BUY/SELL segmented */}
    <div className="grid grid-cols-2 gap-2 mb-2">
        <button
          type="button"
          onClick={() => { void submit('SELL'); }}
          disabled={isPlacing || volume <= 0 || Number.isNaN(tradePrice)}
          aria-label="Place SELL order"
      className={`h-10 rounded-lg font-medium text-white text-sm w-full bg-rose-500 hover:bg-rose-600 transition-colors ${side==='SELL' ? 'ring-2 ring-white/10' : ''} ${invalid ? 'opacity-50 cursor-not-allowed' : ''}`}
        >SELL</button>
        <button
          type="button"
          onClick={() => { void submit('BUY'); }}
          disabled={isPlacing || volume <= 0 || Number.isNaN(tradePrice)}
          aria-label="Place BUY order"
      className={`h-10 rounded-lg font-medium text-white text-sm w-full bg-emerald-500 hover:bg-emerald-600 transition-colors ${side==='BUY' ? 'ring-2 ring-white/10' : ''} ${invalid ? 'opacity-50 cursor-not-allowed' : ''}`}
        >BUY</button>
      </div>

  {/* Removed Mode & Price section per request */}

      {/* Volume */}
      <div className="mb-2">
        <label htmlFor="order-volume" className="text-[11px] text-slate-400 block mb-1">Volume</label>
        <input
          id="order-volume"
          name="volume"
          type="text"
          inputMode="decimal"
          pattern="[0-9]*[.,]?[0-9]*"
          value={volumeText}
          onKeyDown={(e) => { if (["e","E","+","-"].includes(e.key)) e.preventDefault(); }}
          onChange={(e)=> {
            const s = sanitizeVolumeInput(e.target.value);
            setVolumeText(s);
            // do not parse yet; allow transitional states
          }}
          onBlur={() => { commitVolume(); }}
          aria-label="Volume"
          className="h-9 w-full rounded-md bg-slate-900 border border-slate-700 px-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
        {(volErr || volume <= 0) && <div className="text-xs text-rose-400 mt-1">{volErr || 'Volume must be greater than 0'}</div>}
      </div>

      {/* Margin warning */}
  {(insufficientFree) && (
        <div className="mt-1 rounded-md border border-rose-700/60 bg-rose-950/60 p-2 text-[11px] mb-2">
      <div className="text-rose-300 mb-0.5">Insufficient Margin</div>
      <div className="text-slate-400">Required: ${required.toFixed(2)} | Available: ${freeMargin.toFixed(2)}</div>
          <div className="text-slate-500">Hint: Reduce size or increase leverage (higher risk).</div>
        </div>
      )}
  {/* Effective leverage warning removed (cap lifted) */}

      {/* TP / SL */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <button
          onClick={()=> setTpOpen(v=>!v)}
          className="h-9 flex-1 rounded-md bg-slate-900 border border-slate-800 px-3 text-[11px] text-slate-300 hover:bg-slate-800/60 transition-colors"
        >Take Profit: {tpOpen? 'Set' : 'Not set'}</button>
        <button
          onClick={()=> setSlOpen(v=>!v)}
          className="h-9 flex-1 rounded-md bg-slate-900 border border-slate-800 px-3 text-[11px] text-slate-300 hover:bg-slate-800/60 transition-colors"
        >Stop Loss: {slOpen? 'Set' : 'Not set'}</button>
      </div>
      {(tpOpen || slOpen) && (
        <div className="grid grid-cols-2 gap-2 mb-2">
          {tpOpen && <input value={tpVal} onChange={e=>setTpVal(e.target.value)} type="number" step="0.01" placeholder="TP price" aria-label="TP price" className="h-9 w-full rounded-md bg-slate-900 border border-slate-700 px-3 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-500" />}
          {slOpen && <input value={slVal} onChange={e=>setSlVal(e.target.value)} type="number" step="0.01" placeholder="SL price" aria-label="SL price" className="h-9 w-full rounded-md bg-slate-900 border border-slate-700 px-3 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-500" />}
        </div>
      )}

      {/* Leverage gate / card (banner only if not enabled) */}
      {!levEnabled ? (
        <LeverageGateBanner onEnable={()=> setShowLevModal(true)} onLearnMore={()=> setShowLevModal(true)} />
      ) : (
  <LeverageCard slMissing={false} onChange={handleLeverageChange} />
      )}

      {/* High leverage no-SL warning (non-blocking) */}
      {levEnabled && leverage >= 20 && !slVal && (
        <div className="mt-1 mb-2 rounded-md border border-amber-600/50 bg-amber-950/40 p-2 text-[11px]">
          <div className="text-amber-300 font-semibold mb-0.5">High leverage without Stop-Loss</div>
          <div className="text-amber-200/90">Consider adding a Stop-Loss to limit downside risk at {leverage}×.</div>
        </div>
      )}
      {/* Order Size (show whenever enabled, even at 1x) */}
  {levEnabled && (
        <div className="mt-2 rounded-md border border-slate-800 bg-slate-900 p-3 mb-3">
          <div className="text-[11px] text-slate-400 mb-0.5">Order Size (Leveraged)</div>
          <div className="text-xl font-semibold tracking-tight">{effective.toFixed(2)} USD</div>
          <div className="text-[11px] text-slate-500 mt-1">Posted: ${posted.toFixed(2)} | Eff: ${effective.toFixed(2)}</div>
          <div className="text-[11px] text-slate-500 mt-1">Eq: ${equity.toFixed(2)} | Used: ${usedMargin.toFixed(2)} | Free: ${freeMargin.toFixed(2)}</div>
          {pendingOrders.length > 0 && (
            <div className="mt-2 text-[11px] text-slate-400">
              <div className="font-semibold text-slate-300 mb-1 text-xs">Pending Limit Orders</div>
              <ul className="space-y-1 max-h-24 overflow-auto pr-1">
                {pendingOrders.map(o => (
                  <li key={o.id} className="flex justify-between text-[10px] bg-slate-800/40 rounded px-2 py-1">
                    <span>{o.side} {o.volume} @ {o.price}</span>
                    <span className="text-slate-500">{o.createdAt ? new Date(o.createdAt).toLocaleTimeString() : ''}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      {showLevModal && (
        <LeverageGuideModal
          symbol={symbol}
          qty={volume}
          price={tradePrice}
          leverage={leverage}
          equity={equity}
          used={usedMargin}
          onClose={()=> setShowLevModal(false)}
          onConfirm={()=> {
            // Permanently acknowledge (set ceiling to max so it never reopens)
            enableLeverage(100);
            setShowLevModal(false);
          }}
        />
      )}
      {/* Backend maintenance margin warning */}
      {risk.mm != null && (freeMargin < risk.mm) && (
        <div className="mt-2 rounded-md border border-rose-700/60 bg-rose-950/60 p-2 text-[11px] text-rose-300">
          Backend minimum maintenance: ${risk.mm.toFixed(2)}. Your free margin after this order would be below that.
        </div>
      )}
      {risk.lastError && (
        <div className="mt-2 rounded-md border border-amber-600/60 bg-amber-950/40 p-2 text-[11px] text-amber-300">
          Server: {risk.lastError}
        </div>
      )}
    </aside>
  );
}
