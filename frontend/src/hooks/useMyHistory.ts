import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { parseAbiItem, parseEventLogs, type Log } from "viem";
import { POOL_ADDRESS } from "../lib/contract";
import { loadHistoryCache, saveHistoryCache } from "../lib/historyCache";

type PublicClient = NonNullable<ReturnType<typeof usePublicClient>>;

const depositedEvent = parseAbiItem(
  "event Deposited(address indexed user, uint256 amount, uint256 newBalance)"
);
const withdrawnEvent = parseAbiItem(
  "event Withdrawn(address indexed user, uint256 amount, uint256 newBalance, bool forfeitedTicket)"
);
const claimedEvent = parseAbiItem(
  "event Claimed(uint256 indexed epochId, address indexed winner, uint256 amount)"
);
const historyAbi = [depositedEvent, withdrawnEvent, claimedEvent];

export type HistoryEntry = {
  type: "Deposited" | "Withdrawn" | "Won";
  amount: bigint;
  blockNumber: bigint;
  timestamp: number;
};

/** Block the pool proxy was actually created at (found by binary-searching
 *  eth_getCode — see HANDOFF). This RPC unconditionally throws "pruned
 *  history unavailable" for getLogs({ fromBlock: 0n }), no matter the wallet's
 *  real activity — that's why My History always rendered "No activity yet."
 *  before this fix, regardless of what the wallet had actually done. Starting
 *  from the real deploy block is both correct (nothing happened earlier) and
 *  the only starting point this RPC will serve. If the proxy is ever
 *  redeployed at a new address, this must be updated to match. */
const POOL_DEPLOY_BLOCK = 58_425_277n;

/** The RPC's real, documented cap ("eth_getLogs is limited to a 10,000
 *  range"), confirmed by the error message itself — not a guess. */
const LOG_WINDOW = 10_000n;

/** This RPC is shared across every dApp on Arc Testnet (see the existing 429
 *  notes elsewhere in this codebase) and its rate limit is tight enough that
 *  a plain back-to-back page-through gets throttled after roughly a dozen
 *  requests. A small fixed gap between chunks, plus exponential backoff on
 *  the ones that still get throttled, is what actually gets a full scan to
 *  finish rather than just failing louder. */
const CHUNK_DELAY_MS = 350;
const MAX_RETRIES = 6;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function getLogsWithRetry(
  publicClient: PublicClient,
  fromBlock: bigint,
  toBlock: bigint,
  attempt = 0,
): Promise<Log[]> {
  try {
    return await publicClient.getLogs({ address: POOL_ADDRESS, fromBlock, toBlock });
  } catch (e) {
    if (attempt >= MAX_RETRIES) throw e;
    await sleep(800 * 2 ** attempt);
    return getLogsWithRetry(publicClient, fromBlock, toBlock, attempt + 1);
  }
}

function toEntries(logs: Log[], address: `0x${string}`): HistoryEntry[] {
  // One request per chunk instead of three: pull every log the contract
  // emitted in that range (Deposited/Withdrawn/Claimed plus whatever else,
  // e.g. Swept/VaultAccrued) and let parseEventLogs keep only what matches
  // one of these three signatures, decoding each into named args.
  return parseEventLogs({ abi: historyAbi, logs, strict: false })
    .map((log) => {
      const args = log.args as { user?: `0x${string}`; winner?: `0x${string}`; amount?: bigint };
      const owner = log.eventName === "Claimed" ? args.winner : args.user;
      if (!owner || owner.toLowerCase() !== address.toLowerCase()) return null;
      return {
        type: (log.eventName === "Claimed" ? "Won" : log.eventName) as HistoryEntry["type"],
        amount: args.amount ?? 0n,
        blockNumber: log.blockNumber!,
        // Arc's eth_getLogs includes blockTimestamp directly on each log, so
        // this needs no extra getBlock() round trip per unique block.
        timestamp: Number(log.blockTimestamp ?? 0n),
      };
    })
    .filter((e): e is HistoryEntry => e !== null);
}

export function useMyHistory(address: `0x${string}` | undefined) {
  const publicClient = usePublicClient();

  return useQuery({
    queryKey: ["myHistory", address],
    enabled: Boolean(address && publicClient),
    staleTime: 60_000,
    queryFn: async (): Promise<HistoryEntry[]> => {
      if (!address || !publicClient) return [];

      const latest = await publicClient.getBlockNumber();
      const cached = loadHistoryCache(address);
      let lastBlock = cached && cached.lastBlock >= POOL_DEPLOY_BLOCK ? cached.lastBlock : POOL_DEPLOY_BLOCK - 1n;
      const entries = cached?.entries ?? [];

      // A cold scan can take minutes (see the constants above) once the pool
      // has been live a while, so progress is saved after every chunk rather
      // than only at the end — closing the tab mid-scan resumes next time
      // from lastBlock instead of paying for the whole range again.
      for (let start = lastBlock + 1n; start <= latest; start += LOG_WINDOW) {
        const end = start + LOG_WINDOW - 1n > latest ? latest : start + LOG_WINDOW - 1n;
        const logs = await getLogsWithRetry(publicClient, start, end);
        entries.push(...toEntries(logs, address));
        lastBlock = end;
        saveHistoryCache(address, lastBlock, entries);
        if (end < latest) await sleep(CHUNK_DELAY_MS);
      }

      return [...entries].sort((a, b) =>
        b.blockNumber === a.blockNumber ? 0 : b.blockNumber > a.blockNumber ? 1 : -1
      );
    },
  });
}
