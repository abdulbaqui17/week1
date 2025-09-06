// Centralized formatting helpers so we can adjust precision consistently in one place.
// For now, we keep 2 decimals for display; could be extended per-symbol later.

import type { TSymbol } from '../store/app';

// Avoid showing "-0.00" for tiny negatives and give more precision for very small P/L so user sees movement.
function sanitizeZero(n: number, precision: number) {
	const factor = Math.pow(10, precision);
	const rounded = Math.round(n * factor) / factor;
	if (Object.is(rounded, -0)) return 0;
	return rounded;
}

export function formatPrice(value: number | null | undefined, _symbol?: TSymbol): string {
	if (value == null || !isFinite(value)) return '—';
	return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatPnl(value: number): string {
	if (!isFinite(value)) return '—';
	const abs = Math.abs(value);
	let precision = 2;
	if (abs > 0 && abs < 0.01) precision = 6; // extremely tiny
	else if (abs < 0.1) precision = 4;
	const val = sanitizeZero(value, precision);
	return val.toLocaleString(undefined, { minimumFractionDigits: precision, maximumFractionDigits: precision });
}

export function formatVolumeLots(v: number): string {
	if (!isFinite(v)) return '0.00';
	return v.toFixed(2);
}

export function formatSigned(value: number): string {
	const s = formatPnl(value);
	if (value > 0) return '+' + s;
	return s;
}

