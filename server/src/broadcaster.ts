import { WebSocketServer, WebSocket } from "ws";
import { createClient } from "redis";

const wss = new WebSocketServer({ port: 8080 });
const subscriber = createClient({ url: "redis://localhost:6379" });

(async () => {
  await subscriber.connect();

  wss.on("connection", (ws) => {
    console.log("client connected");
    ws.on("message", (m) => ws.send(`ECHO: ${m}`));
  });

  await subscriber.subscribe("trades", (message) => {
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  });
})();
