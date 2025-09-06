import { WebSocket, WebSocketServer } from "ws";
import { createClient } from "redis";

// Allow overriding the port via env (WS_PORT or PORT)
const PORT = Number(process.env.WS_PORT || process.env.PORT || 4000);
const wss = new WebSocketServer({ port: PORT });
// Basic server lifecycle logs and error handling for clearer diagnostics
wss.on("listening", () => {
    console.log(`[wsserver] listening on :${PORT}`);
});
wss.on("error", (err: any) => {
    if (err && (err as any).code === "EADDRINUSE") {
        console.error(`[wsserver] Port ${PORT} is already in use. Set WS_PORT/PORT or free the port.`);
        process.exit(1);
    }
    console.error(`[wsserver] WebSocketServer error`, err);
});
const subscriber = createClient({ url: "redis://localhost:6379" });

// Basic connection logs and heartbeat to keep connections alive
type ExtWebSocket = WebSocket & { isAlive?: boolean };

// Track connection liveness and handle pong frames
wss.on("connection", (ws) => {
    const sock = ws as ExtWebSocket;
    sock.isAlive = true;
    ws.on("pong", () => {
        sock.isAlive = true;
    });
    ws.on("close", () => {
        // no-op; interval loop will drop closed sockets automatically
    });
    ws.on("error", () => {
        // ignore; client may reconnect
    });
});


// Heartbeat interval
const interval = setInterval(() => {
    for (const client of wss.clients) {
        const sock = client as ExtWebSocket;
        if (sock.isAlive === false) {
            try { sock.terminate(); } catch {}
            continue;
        }
        sock.isAlive = false;
        try { sock.ping(); } catch {}
    }
}, 30000);

wss.on("close", () => {
    clearInterval(interval);
});

(async () => {
    try {
        await subscriber.connect();
        console.log(`[wsserver] Redis subscriber connected`);
    } catch (e) {
        console.error(`[wsserver] Redis connect error`, e);
        process.exit(1);
    }

    subscriber.on("error", (e) => console.error(`[wsserver] Redis error`, e));

    await subscriber.subscribe("trades", (message) => {
        // Broadcast trade events to all connected clients
        for (const client of wss.clients) {
            if (client.readyState === WebSocket.OPEN) {
                try { client.send(message); } catch {}
            }
        }
    });

    // Also subscribe to order events and broadcast
    await subscriber.subscribe("orders", (message) => {
        for (const client of wss.clients) {
            if (client.readyState === WebSocket.OPEN) {
                try { client.send(message); } catch {}
            }
        }
    });

    console.log(`[wsserver] Subscribed to channels: trades, orders`);
})();