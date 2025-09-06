export type SymbolKey = 'BTCUSDT' | 'ETHUSDT' | 'SOLUSDT';
export type Timeframe = '1m' | '5m' | '15m';
export type Side = 'BUY' | 'SELL';
export type Mode = 'MARKET' | 'LIMIT';

export type PositionStatus = 'OPEN' | 'CLOSED';

export type Position = {
  id: string;
  symbol: SymbolKey;
  side: Side;
  volume: number; // lots/units
  entry: number; // price
  leverage: 5 | 10 | 20 | 100;
  pnl: number; // placeholder
  status: PositionStatus;
};
export type Instrument = {
  key: 'BTCUSDT' | 'ETHUSDT' | 'SOLUSDT';
  label: string;
  display: string; // e.g., 'BTC / USD'
};
export type SymbolInfo = {
  id: string;
  name: string;
  base: string;
  quote: string;
};

export type Quote = {
  bid: number;
  ask: number;
  mid: number;
};

export type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};
