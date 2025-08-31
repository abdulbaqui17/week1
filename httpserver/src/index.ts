import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { Pool } from '../node_modules/@types/pg/index.js';

const PORT = parseInt(process.env.API_PORT ?? '8081', 10);
const DATABASE_URL =
    process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/xness';

const pool = new Pool({ connectionString: DATABASE_URL });
const app = express();
app.use(cors());

app.get('/api/candles', async (req, res) => {
    try {
        const asset = (req.query.asset ?? 'SOLUSDT').toString().toUpperCase();
        const tf = (req.query.tf ?? '1m').toString();
        const lookback = (req.query.lookback ?? '6 hours').toString();
        const table = tf === '5m' ? 'trades_5m' : tf === '15m' ? 'trades_15m' : 'trades_1m';

        const { rows } = await pool.query(
            `SELECT
      bucket AS ts,
      open::float8   AS open,
      high::float8   AS high,
      low::float8    AS low,
      close::float8  AS close,
      volume::float8 AS volume
   FROM ${table}
   WHERE asset = $1
     AND bucket >= now() - $2::interval
   ORDER BY ts;`,
            [asset.toUpperCase(), lookback]
        );
        res.json(rows);

    } catch (e: any) {
        console.error('[api] /api/candles error:', e);
        res.status(500).json({ error: 'internal_error' });
    }
});

app.get('/api/last', async (_req, res) => {
    try {
        const q = `
      SELECT DISTINCT ON (asset)
             asset, "time" AS ts, price, quantity
      FROM trades
      ORDER BY asset, "time" DESC;
    `;
        const { rows } = await pool.query(q);
        res.json(rows);
    } catch (e: any) {
        console.error('[api] /api/last error:', e);
        res.status(500).json({ error: 'internal_error' });
    }
});

app.listen(PORT, () => {
    console.log(`[api] listening on :${PORT}`);
});
