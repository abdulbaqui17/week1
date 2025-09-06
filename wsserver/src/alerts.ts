// Extend wsserver to subscribe to 'alerts' channel and broadcast to all clients.
import { WebSocket } from 'ws';
import { createClient } from 'redis';

export async function startAlertsBridge(wss: import('ws').WebSocketServer) {
  const sub = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
  await sub.connect();
  await sub.subscribe('alerts', (message) => {
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        try { client.send(message); } catch {}
      }
    }
  });
  console.log('[wsserver] Subscribed to alerts channel');
}
