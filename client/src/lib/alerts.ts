// Client-side alerts subscription & toast dispatch
import { useEffect } from 'react';
import { useAppStore } from '../store/app';
import { addToast } from './toast';

type AlertMsg = { userId: string; type: 'TP_HIT' | 'SL_HIT'; symbol: string; positionId: string; price: number; time: number };

export function useAlerts(ws?: WebSocket | null) {
  const closePosition = useAppStore(s => s.closePosition);
  useEffect(() => {
    if (!ws) return;
    function onMessage(ev: MessageEvent) {
      try {
        const raw = JSON.parse(ev.data as string);
        if (!raw) return;
        if (raw.event === 'order:closed' && raw.order) {
          const o = raw.order;
          if (o && o.id) {
            closePosition(o.id); // sync local state
          }
        } else if (raw.type === 'TP_HIT' || raw.type === 'SL_HIT') {
          const a = raw as AlertMsg;
          addToast({ id: `${a.type}-${a.positionId}-${a.time}` , title: a.type === 'TP_HIT' ? 'Take Profit hit' : 'Stop Loss hit', body: `${a.symbol} @ ${a.price}`, tone: a.type === 'TP_HIT' ? 'success' : 'error' });
        }
      } catch {}
    }
    ws.addEventListener('message', onMessage);
    return () => { ws.removeEventListener('message', onMessage); };
  }, [ws, closePosition]);
}
