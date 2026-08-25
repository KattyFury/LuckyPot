/**
 * Bare number, no unit. For the unit-aware version see useAmount().
 *
 * Default max 2 decimals, not 0 — whole numbers still print clean (1,127, not
 * 1,127.00) since maximumFractionDigits is a ceiling, not a fixed width, but
 * small prizes (e.g. 0.075 USDC) no longer round away to a misleading "0".
 */
export function formatUSDC(value: bigint, maximumFractionDigits = 2): string {
  const asNumber = Number(value) / 1e6;
  return asNumber.toLocaleString("en-US", { maximumFractionDigits });
}

/** Picks the singular or plural noun for a count: plural(1, "depositor"). */
export function plural(count: number | bigint, singular: string, pluralForm = `${singular}s`): string {
  return Number(count) === 1 ? singular : pluralForm;
}

export function shortAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatCountdown(secondsRemaining: number): string {
  if (secondsRemaining <= 0) return "0d 0h 0m 0s";
  const d = Math.floor(secondsRemaining / 86400);
  const h = Math.floor((secondsRemaining % 86400) / 3600);
  const m = Math.floor((secondsRemaining % 3600) / 60);
  const s = Math.floor(secondsRemaining % 60);
  return `${d}d ${h}h ${m}m ${s}s`;
}
