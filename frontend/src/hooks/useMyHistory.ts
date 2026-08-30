import { useQuery } from "@tanstack/react-query";

export type HistoryEntry = {
  type: "Deposited" | "Withdrawn" | "Won";
  amount: bigint;
  blockNumber: bigint;
  timestamp: number;
};

type HistoryRow = { type: HistoryEntry["type"]; amount: string; block_number: string; timestamp: number };

/** Reads from luckypot-history (D1) via functions/api/history.js instead of
 *  scanning eth_getLogs from the browser. Arc's public RPC caps a single
 *  eth_getLogs call at 10,000 blocks and rate-limits aggressively across
 *  every dApp on the testnet, while the pool's full history is already over
 *  a million blocks - a client-side scan worked but took several minutes on
 *  a wallet's first-ever visit. automation/src/indexHistory.ts keeps the
 *  table caught up on the keeper's existing 6-hour schedule, so this is just
 *  a normal fast read. */
export function useMyHistory(address: `0x${string}` | undefined) {
  return useQuery({
    queryKey: ["myHistory", address],
    enabled: Boolean(address),
    staleTime: 60_000,
    queryFn: async (): Promise<HistoryEntry[]> => {
      const res = await fetch(`/api/history?wallet=${address}`);
      if (!res.ok) throw new Error(`history fetch failed: ${res.status}`);
      const rows: HistoryRow[] = await res.json();
      return rows.map((r) => ({
        type: r.type,
        amount: BigInt(r.amount),
        blockNumber: BigInt(r.block_number),
        timestamp: r.timestamp,
      }));
    },
  });
}
