import type { HistoryEntry } from "../hooks/useMyHistory";

/** Caches the fully-scanned wallet history so a returning visit only has to
 *  fetch logs since the last visit, not re-page through the whole chain
 *  again — see the comment on POOL_DEPLOY_BLOCK in useMyHistory.ts for why a
 *  full scan is expensive on this RPC. BigInts don't survive JSON.stringify,
 *  so blockNumber/amount/lastBlock are serialized as strings. */
type CachedHistory = {
  lastBlock: string;
  entries: { type: HistoryEntry["type"]; amount: string; blockNumber: string; timestamp: number }[];
};

function key(address: string) {
  return `luckypot:history:${address.toLowerCase()}`;
}

export function loadHistoryCache(address: string): { lastBlock: bigint; entries: HistoryEntry[] } | null {
  try {
    const raw = localStorage.getItem(key(address));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedHistory;
    return {
      lastBlock: BigInt(parsed.lastBlock),
      entries: parsed.entries.map((e) => ({
        ...e,
        amount: BigInt(e.amount),
        blockNumber: BigInt(e.blockNumber),
      })),
    };
  } catch {
    return null;
  }
}

export function saveHistoryCache(address: string, lastBlock: bigint, entries: HistoryEntry[]): void {
  try {
    const serializable: CachedHistory = {
      lastBlock: lastBlock.toString(),
      entries: entries.map((e) => ({ ...e, amount: e.amount.toString(), blockNumber: e.blockNumber.toString() })),
    };
    localStorage.setItem(key(address), JSON.stringify(serializable));
  } catch {
    /* private mode / storage blocked — just rescans from POOL_DEPLOY_BLOCK next time */
  }
}
