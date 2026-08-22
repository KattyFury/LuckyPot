import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { parseAbiItem } from "viem";
import { POOL_ADDRESS } from "../lib/contract";

const depositedEvent = parseAbiItem(
  "event Deposited(address indexed user, uint256 amount, uint256 newBalance)"
);
const withdrawnEvent = parseAbiItem(
  "event Withdrawn(address indexed user, uint256 amount, uint256 newBalance, bool forfeitedTicket)"
);
const claimedEvent = parseAbiItem(
  "event Claimed(uint256 indexed epochId, address indexed winner, uint256 amount)"
);

export type HistoryEntry = {
  type: "Deposited" | "Withdrawn" | "Won";
  amount: bigint;
  blockNumber: bigint;
  timestamp: number;
};

export function useMyHistory(address: `0x${string}` | undefined) {
  const publicClient = usePublicClient();

  return useQuery({
    queryKey: ["myHistory", address],
    enabled: Boolean(address && publicClient),
    queryFn: async (): Promise<HistoryEntry[]> => {
      if (!address || !publicClient) return [];

      const [deposits, withdrawals, claims] = await Promise.all([
        publicClient.getLogs({
          address: POOL_ADDRESS,
          event: depositedEvent,
          args: { user: address },
          fromBlock: 0n,
        }),
        publicClient.getLogs({
          address: POOL_ADDRESS,
          event: withdrawnEvent,
          args: { user: address },
          fromBlock: 0n,
        }),
        publicClient.getLogs({
          address: POOL_ADDRESS,
          event: claimedEvent,
          args: { winner: address },
          fromBlock: 0n,
        }),
      ]);

      const raw = [
        ...deposits.map((log) => ({ type: "Deposited" as const, amount: log.args.amount!, blockNumber: log.blockNumber! })),
        ...withdrawals.map((log) => ({ type: "Withdrawn" as const, amount: log.args.amount!, blockNumber: log.blockNumber! })),
        ...claims.map((log) => ({ type: "Won" as const, amount: log.args.amount!, blockNumber: log.blockNumber! })),
      ];

      const blockNumbers = [...new Set(raw.map((r) => r.blockNumber))];
      const blocks = await Promise.all(blockNumbers.map((bn) => publicClient.getBlock({ blockNumber: bn })));
      const timestampByBlock = new Map(blocks.map((b) => [b.number, Number(b.timestamp)]));

      return raw
        .map((r) => ({ ...r, timestamp: timestampByBlock.get(r.blockNumber) ?? 0 }))
        .sort((a, b) => b.blockNumber === a.blockNumber ? 0 : b.blockNumber > a.blockNumber ? 1 : -1);
    },
  });
}
