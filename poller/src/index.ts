import WebSocket from "ws";
import { createClient } from "redis";
import { Client } from "pg";
import format from "pg-format"


const pgClient = new Client({
    host: "localhost",
    port: 5432,
    user: "postgres",
    password: "postgres",
    database: "xness"
})
const publisher = createClient({ url: "redis://localhost:6379" })
const ws = new WebSocket("wss://fstream.binance.com/stream?streams=bnbusdt@aggTrade/ethusdt@aggTrade/solusdt@aggTrade");


(async () => {
    await pgClient.connect()
    await publisher.connect()
    console.log("redis connected")
})().catch((e) => {
    console.log("connection error", e)
})



let batch: [Date, string, number, number][] = []

ws.on("message", async (event) => {
    const data = event.toString()
    const parseData = JSON.parse(data)
    const log = parseData.data
    const ts = new Date(log.T)
    const asset = log.s
    const price = Number(log.p)
    const quantity = Number(log.q)

    console.log(asset + " " + price + " " + quantity + " " + ts)

    // batch.push([ts, asset, price, quantity])

    await publisher.publish(
        "trades",
        JSON.stringify({ timestamp: ts.toISOString(), asset, price, quantity })
    );
    // if (batch.length >= 100) {
    //     try {
    //         await pgClient.query("BEGIN")
    //         const sql = format(
    //             'INSERT INTO trades ("time", asset, price, quantity) VALUES %L',
    //             batch
    //         );
    //         await pgClient.query(sql)
    //         await pgClient.query("COMMIT")
    //         batch=[]
    //     } catch (e) {
    //         await pgClient.query("ROLLBACK");
    //         console.error("batch insert error:", e);
    //     }
    //     batch = []
    // }

})