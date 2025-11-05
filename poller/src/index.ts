import WebSocket from "ws";
import { createClient } from "redis";
import type { RedisClientType } from "redis";
import { Client } from "pg";

// --- Env-configurable endpoints ---
const DATABASE_URL = process.env.DATABASE_URL;
const PGHOST = process.env.PGHOST || "localhost";
const PGPORT = Number(process.env.PGPORT || 5432);
const PGUSER = process.env.PGUSER || "postgres";
const PGPASSWORD = process.env.PGPASSWORD || "postgres";
const PGDATABASE = process.env.PGDATABASE || "xness";
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

const pgClient = new Client(
    DATABASE_URL
        ? { connectionString: DATABASE_URL }
        : { host: PGHOST, port: PGPORT, user: PGUSER, password: PGPASSWORD, database: PGDATABASE }
);
let publisher: RedisClientType | null = createClient({ url: REDIS_URL });

const ws = new WebSocket(
    "wss://fstream.binance.com/stream?streams=btcusdt@aggTrade/bnbusdt@aggTrade/ethusdt@aggTrade/solusdt@aggTrade"
);

// --- Robust connection with retries ---
function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

async function connectPgWithRetry() {
    let attempt = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
        try {
            await pgClient.connect();
            console.log(`[poller] Postgres connected → ${DATABASE_URL ? DATABASE_URL : `${PGUSER}@${PGHOST}:${PGPORT}/${PGDATABASE}`}`);
            return;
        } catch (e) {
            attempt += 1;
            const delay = Math.min(1000 * 2 ** Math.min(attempt, 5), 10000); // cap 10s
            console.error(`[poller] Postgres connect failed (attempt ${attempt}) → retry in ${delay}ms`, e);
            await sleep(delay);
        }
    }
}

let redisReady = false;
async function ensureRedisConnected() {
    if (!publisher) publisher = createClient({ url: REDIS_URL });
    if (publisher.isOpen) { redisReady = true; return; }
    let attempt = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
        try {
            await publisher.connect();
            publisher.on("error", (e) => {
                redisReady = false;
                console.error(`[poller] Redis error`, e);
            });
            publisher.on("end", () => {
                redisReady = false;
                console.warn(`[poller] Redis connection ended`);
            });
            console.log(`[poller] Redis connected → ${REDIS_URL}`);
            redisReady = true;
            return;
        } catch (e) {
            attempt += 1;
            const delay = Math.min(1000 * 2 ** Math.min(attempt, 5), 10000);
            console.error(`[poller] Redis connect failed (attempt ${attempt}) → retry in ${delay}ms`, e);
            await sleep(delay);
        }
    }
}

(async () => {
    try {
        await Promise.all([connectPgWithRetry(), ensureRedisConnected()]);
    } catch (e) {
        // We never throw; retries loop until connected
        console.error(`[poller] startup error`, e);
    }
})();



let batch: [string, string, number, number][] = []
let flushing = false;

async function flushBatch() {
    if (flushing) return; // avoid concurrent flushes
    // Take a snapshot and clear the shared batch immediately to avoid races
    const toInsert = batch.splice(0, batch.length);
    if (toInsert.length === 0) return; // nothing to do
    flushing = true;
    try {
        await pgClient.query("BEGIN");
        const values = toInsert
            .map((_, i) => `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`)
            .join(', ');
        const sql = `INSERT INTO trades (time, asset, price, quantity) VALUES ${values};`;
        console.log("SQL Query:", sql);
        console.log("Batch length:", toInsert.length);
        const flatBatch = toInsert.flat();
        console.log("Flat batch length:", flatBatch.length);
        await pgClient.query(sql, flatBatch);
        await pgClient.query("COMMIT");
    } catch (e) {
        await pgClient.query("ROLLBACK");
        console.error("batch insert error:", e);
        batch = toInsert.concat(batch);
    } finally {
        flushing = false;
    }
}

ws.on("message", async (event) => {
    const data = event.toString()
    const parseData = JSON.parse(data)
    const log = parseData.data
    const ts = new Date(log.T)
    const asset = log.s
    const price = Number(log.p)
    const quantity = Number(log.q)

    console.log(asset + " " + price + " " + quantity + " " + ts)

    batch.push([ts.toISOString(), asset, price, quantity])

        // Publish to Redis only if connected
        if (publisher && publisher.isOpen) {
            try {
                await publisher.publish(
                    "trades",
                    JSON.stringify({ timestamp: ts.toISOString(), asset, price, quantity })
                );
                // Persist latest price for quick lookups by API
                const sym = asset.toUpperCase();
                const ms = ts.getTime();
                await publisher.mSet({
                    [`price:last:${sym}`]: String(price),
                    [`price:last:${sym}:ts`]: String(ms),
                });
            } catch (e) {
                console.error('[poller] redis publish/set error', e);
            }
        }
    if (batch.length >= 100) {
        await flushBatch();
    }

})

// Ensure periodic flushing so DB stays up-to-date even if flow is light
setInterval(async () => {
    try {
                if (batch.length > 0) {
                        await flushBatch();
                }
    } catch (e) {
        console.error('periodic flush error:', e);
    }
}, 1000);

// Graceful shutdown
async function shutdown() {
    console.log("[poller] Shutting down...");
    try { if (batch.length) await flushBatch(); } catch {}
    try { await pgClient.end(); } catch {}
    try { if (publisher && publisher.isOpen) await publisher.quit(); } catch {}
    process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);