export function formatUSDC(value: bigint, maximumFractionDigits = 0): string {
  const asNumber = Number(value) / 1e6;
  return asNumber.toLocaleString("en-US", { maximumFractionDigits });
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
