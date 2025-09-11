// Monetary scaling & formatting helpers (cents precision by default)
export const MONEY_SCALE = 100; // cents

export const toFixed2 = (n: number) => Number(Math.round((n + Number.EPSILON) * 100) / 100);
export const fmtUSD = (n: number) => toFixed2(n);

export function scaleMoney(amount: number): bigint {
	return BigInt(Math.round(amount * MONEY_SCALE));
}

export function formatMoneyScaled(scaled: bigint): string {
	return (Number(scaled) / MONEY_SCALE).toFixed(2);
}

export function formatMoney(amount: number): string { return amount.toFixed(2); }
