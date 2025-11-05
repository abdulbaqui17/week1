-- enable timescale
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- users table for authentication
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  balance       NUMERIC DEFAULT 5000,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- orders table to track user-specific orders
CREATE TABLE IF NOT EXISTS orders (
  id            TEXT PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  symbol        TEXT NOT NULL,
  side          TEXT NOT NULL,
  volume        NUMERIC NOT NULL,
  entry_price   NUMERIC NOT NULL,
  leverage      INTEGER NOT NULL,
  status        TEXT DEFAULT 'OPEN',
  close_price   NUMERIC,
  closed_at     TIMESTAMPTZ,
  realized_pnl  NUMERIC,
  take_profit   NUMERIC,
  stop_loss     NUMERIC,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- base table (matches schema.ts)
CREATE TABLE IF NOT EXISTS trades (
  "time"    timestamptz NOT NULL,
  asset     text        NOT NULL,
  price     numeric     NOT NULL,
  quantity  numeric     NOT NULL
);

-- hypertable
SELECT create_hypertable('trades', 'time', if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS idx_trades_asset_time ON trades(asset, "time");

-- continuous aggregates
CREATE MATERIALIZED VIEW IF NOT EXISTS trades_1m
WITH (timescaledb.continuous) AS
SELECT
  asset,
  time_bucket('1 minute', "time") AS bucket,
  first(price, "time") AS open,
  max(price)            AS high,
  min(price)            AS low,
  last(price, "time")   AS close,
  sum(quantity)         AS volume,
  count(*)              AS trades
FROM trades
GROUP BY asset, bucket;

CREATE MATERIALIZED VIEW IF NOT EXISTS trades_5m
WITH (timescaledb.continuous) AS
SELECT
  asset,
  time_bucket('5 minutes', "time") AS bucket,
  first(price, "time") AS open,
  max(price)            AS high,
  min(price)            AS low,
  last(price, "time")   AS close,
  sum(quantity)         AS volume,
  count(*)              AS trades
FROM trades
GROUP BY asset, bucket;

CREATE MATERIALIZED VIEW IF NOT EXISTS trades_15m
WITH (timescaledb.continuous) AS
SELECT
  asset,
  time_bucket('15 minutes', "time") AS bucket,
  first(price, "time") AS open,
  max(price)            AS high,
  min(price)            AS low,
  last(price, "time")   AS close,
  sum(quantity)         AS volume,
  count(*)              AS trades
FROM trades
GROUP BY asset, bucket;

ALTER MATERIALIZED VIEW trades_1m  SET (timescaledb.materialized_only = FALSE);
ALTER MATERIALIZED VIEW trades_5m  SET (timescaledb.materialized_only = FALSE);
ALTER MATERIALIZED VIEW trades_15m SET (timescaledb.materialized_only = FALSE);

-- policies
SELECT add_continuous_aggregate_policy('trades_1m',
  start_offset => INTERVAL '7 days',  end_offset => INTERVAL '1 minute',  schedule_interval => INTERVAL '30 seconds');
SELECT add_continuous_aggregate_policy('trades_5m',
  start_offset => INTERVAL '30 days', end_offset => INTERVAL '5 minutes', schedule_interval => INTERVAL '2 minutes');
SELECT add_continuous_aggregate_policy('trades_15m',
  start_offset => INTERVAL '90 days', end_offset => INTERVAL '15 minutes',schedule_interval => INTERVAL '5 minutes');
