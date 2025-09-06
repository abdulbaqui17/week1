export const toFixed2 = (n: number) => Number(Math.round((n + Number.EPSILON) * 100) / 100);
export const fmtUSD = (n: number) => toFixed2(n);
