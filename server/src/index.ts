import WebSocket from "ws";
import { Client } from "pg";

import format from "pg-format";
import dotenv from "dotenv";
import { createClient } from "redis";

dotenv.config();

const url =
  "wss://stream.binance.com:9443/stream?streams=btcusdt@aggTrade/ethusdt@aggTrade/solusdt@aggTrade";

const batch_size = 100;
let batch: [string, string, number, number][] = [];

const client = new Client({
  host: "localhost",
  port: 5432,                
  user: "postgres",
  password: process.env.DB_PASSWORD ?? "postgres",
  database: "xness",
});

const redis = createClient({ url: "redis://localhost:6379" });

async function startServer() {
  await redis.connect();
  console.log("redis connected");
  console.log("ws server running");
}
startServer().catch(console.error);

(async () => {
  await client.connect();
  console.log("connected to db");

  const ws = new WebSocket(url);

  ws.on("open", () => {
    console.log("connected");
  });

  ws.on("message", async (event) => {
    const data = event.toString();
    const parsed = JSON.parse(data);      
    const d = parsed.data;

    const ts = new Date(d.T).toISOString().replace("T", " ").replace("Z", "");
    const price = Number(d.p);
    const qty = Number(d.q);

    batch.push([ts, d.s, price, qty]);

    if (batch.length >= batch_size) {
      const query = format(
        "INSERT INTO trades (time, asset, price, quantity) VALUES %L",
        batch
      );
      try {
        await client.query("BEGIN");
        await client.query(query);
        await client.query("COMMIT");
      } catch (e) {
        await client.query("ROLLBACK");
        console.error("batch insert error:", e);
      }
      batch = [];
    }

    await redis.publish(
      "trades",
      JSON.stringify({ timestamp: ts, asset: d.s, price })
    );
  });
})();
