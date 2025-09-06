import { fmtUSD } from './money.js';

export const RISK = {
  ACCOUNT_MAX_LEVERAGE: 100,    // exchange/account-configured max
  MAX_EFFECTIVE_LEVERAGE: 10,   // chosen cap for safety
  TAKER_FEE_RATE: 0.0005,       // 0.05% example; adjust to your real rate
  MAINT_MARGIN_RATE: 0.005,     // 0.5% example; adjust to your real rate
} as const;

export type OrderInput = {
  userId: string;
  symbol: string;
  side: 'buy' | 'sell' | 'BUY' | 'SELL';
  qty: number;   // lots/units
  price: number; // current/mark used for checks
  leverage?: number; // optional, if per-order
};

export type AccountSnapshot = {
  equity: number;       // includes unrealized PnL if you do that
  usedMargin: number;   // margin currently reserved
  openNotional: number; // sum abs(notional) of open positions
};

export function notionalUSD(price: number, qty: number) {
  return fmtUSD(price * qty);
}

export function feesUSD(notional: number, rate = RISK.TAKER_FEE_RATE) {
  return fmtUSD(notional * rate);
}

// Required initial margin if account allows up to ACCOUNT_MAX_LEVERAGE
export function requiredInitialMarginUSD(notional: number) {
  const im = notional / RISK.ACCOUNT_MAX_LEVERAGE;
  return fmtUSD(im);
}

export function maintenanceMarginUSD(notional: number) {
  return fmtUSD(notional * RISK.MAINT_MARGIN_RATE);
}

export function effectiveLeverage(notional: number, equity: number) {
  if (equity <= 0) return Infinity;
  return notional / equity;
}

export function validateOrderRisk(
  input: OrderInput,
  acct: AccountSnapshot
): { ok: true } | { ok: false; code: string; message: string; details?: any } {
  const newNotional = notionalUSD(input.price, input.qty);
  const reqIM = fmtUSD(requiredInitialMarginUSD(newNotional) + feesUSD(newNotional));
  const freeMargin = fmtUSD(acct.equity - acct.usedMargin);

  if (freeMargin < reqIM) {
    return {
      ok: false,
      code: 'INSUFFICIENT_MARGIN',
      message: `Insufficient free margin. Required ${reqIM}, available ${fmtUSD(freeMargin)}.`,
      details: { reqIM, freeMargin, newNotional },
    };
  }

  const notionalAfter = fmtUSD(acct.openNotional + newNotional);
  const effLevAfter = effectiveLeverage(notionalAfter, acct.equity);

  if (effLevAfter > RISK.MAX_EFFECTIVE_LEVERAGE) {
    return {
      ok: false,
      code: 'EFFECTIVE_LEVERAGE_CAP',
      message: `Order exceeds max effective leverage of ${RISK.MAX_EFFECTIVE_LEVERAGE}×.`,
      details: {
        effLevAfter: Number(effLevAfter.toFixed(2)),
        notionalAfter,
        equity: fmtUSD(acct.equity),
        cap: RISK.MAX_EFFECTIVE_LEVERAGE,
      },
    };
  }

  const mm = maintenanceMarginUSD(notionalAfter);
  if (freeMargin < mm) {
    return {
      ok: false,
      code: 'MAINT_MARGIN_AT_RISK',
      message: `Order would leave free margin below maintenance (${mm}).`,
      details: { mm, freeMargin: fmtUSD(freeMargin) },
    };
  }

  return { ok: true };
}
