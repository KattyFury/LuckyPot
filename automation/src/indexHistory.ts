// Keeps luckypot-history (D1) in sync with the pool's Deposited/Withdrawn/
// Claimed events, so the frontend's My History reads a database instead of
// paging through eth_getLogs itself. Runs on the keeper's existing 6-hour
// GitHub Actions schedule (see .github/workflows/keeper.yml) - each run only
// has to cover ~6 hours of blocks (a couple of chunks), never the whole
// chain, which is what made scanning from the client impractical: Arc's
// public RPC caps eth_getLogs at a 10,000-block range and rate-limits
// aggressively across every dApp on the testnet, and the pool's full history
// is already over a million blocks.
import "dotenv/config";
import { parseAbiItem, parseEventLogs, type Log } from "viem";
import { publicClient, pool } from "./client";

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const CF_API_TOKEN = process.env.CF_API_TOKEN;
const D1_DATABASE_ID = "5d8b9b50-3903-4cc7-9dc4-d5d8374969c0";

if (!CF_ACCOUNT_ID) throw new Error("CF_ACCOUNT_ID is not set");
if (!CF_API_TOKEN) throw new Error("CF_API_TOKEN is not set");

// Block the pool proxy was actually created at (found by binary-searching
// eth_getCode for where its bytecode first appears - see HANDOFF). Nothing
// happened before it, and eth_getLogs({ fromBlock: 0n }) unconditionally
// throws "pruned history unavailable" on this RPC regardless, so it's also
// the only starting point this RPC will serve. Update this if the proxy is
// ever redeployed at a new address.
const POOL_DEPLOY_BLOCK = 58_425_277n;

// The RPC's documented cap, from its own error message ("eth_getLogs is
// limited to a 10,000 range") - not a guess.
const LOG_WINDOW = 10_000n;

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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function d1Query(sql: string, params: unknown[] = []): Promise<Record<string, unknown>[]> {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${D1_DATABASE_ID}/query`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${CF_API_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ sql, params }),
    },
  );
  const json = (await res.json()) as { success: boolean; result?: { results: Record<string, unknown>[] }[]; errors?: unknown };
  if (!json.success) throw new Error(`D1 query failed: ${JSON.stringify(json.errors)}`);
  return json.result?.[0]?.results ?? [];
}

async function getLogsWithRetry(fromBlock: bigint, toBlock: bigint, attempt = 0): Promise<Log[]> {
  try {
    return await publicClient.getLogs({ address: pool.address, fromBlock, toBlock });
  } catch (e) {
    if (attempt >= 6) throw e;
    await sleep(800 * 2 ** attempt);
    return getLogsWithRetry(fromBlock, toBlock, attempt + 1);
  }
}

type Row = {
  wallet: string;
  type: "Deposited" | "Withdrawn" | "Won";
  amount: string;
  blockNumber: string;
  txHash: `0x${string}`;
  logIndex: number;
  timestamp: number;
};

function toRows(logs: Log[]): Row[] {
  return parseEventLogs({ abi: historyAbi, logs, strict: false })
    .map((log) => {
      const args = log.args as { user?: `0x${string}`; winner?: `0x${string}`; amount?: bigint };
      const wallet = (log.eventName === "Claimed" ? args.winner : args.user)?.toLowerCase();
      if (!wallet) return null;
      return {
        wallet,
        type: (log.eventName === "Claimed" ? "Won" : log.eventName) as Row["type"],
        amount: (args.amount ?? 0n).toString(),
        blockNumber: log.blockNumber!.toString(),
        txHash: log.transactionHash!,
        logIndex: log.logIndex!,
        timestamp: Number(log.blockTimestamp ?? 0n),
      };
    })
    .filter((r): r is Row => r !== null);
}

async function insertRows(rows: Row[]) {
  if (rows.length === 0) return;
  const placeholders = rows.map((_, i) => {
    const base = i * 7;
    return `(?${base + 1},?${base + 2},?${base + 3},?${base + 4},?${base + 5},?${base + 6},?${base + 7})`;
  });
  const params = rows.flatMap((r) => [r.wallet, r.type, r.amount, r.blockNumber, r.txHash, r.logIndex, r.timestamp]);
  await d1Query(
    `INSERT OR IGNORE INTO history (wallet, type, amount, block_number, tx_hash, log_index, timestamp) VALUES ${placeholders.join(",")}`,
    params,
  );
}

async function saveSyncState(lastBlock: bigint) {
  await d1Query(
    "INSERT INTO sync_state (id, last_block) VALUES (1, ?1) ON CONFLICT(id) DO UPDATE SET last_block = excluded.last_block",
    [lastBlock.toString()],
  );
}

async function main() {
  const state = await d1Query("SELECT last_block FROM sync_state WHERE id = 1");
  const latest = await publicClient.getBlockNumber();
  const fromBlock = state[0]?.last_block ? BigInt(state[0].last_block as string) + 1n : POOL_DEPLOY_BLOCK;

  if (fromBlock > latest) {
    console.log("Nothing new to index.");
    return;
  }

  console.log(`Indexing blocks ${fromBlock} -> ${latest} (${latest - fromBlock + 1n} blocks)`);

  let totalInserted = 0;
  for (let start = fromBlock; start <= latest; start += LOG_WINDOW) {
    const end = start + LOG_WINDOW - 1n > latest ? latest : start + LOG_WINDOW - 1n;
    const logs = await getLogsWithRetry(start, end);
    const rows = toRows(logs);
    await insertRows(rows);
    totalInserted += rows.length;
    // Saved after every chunk, not just at the end: a run that gets cut off
    // resumes from here next time instead of re-scanning from the start.
    await saveSyncState(end);
    if (end < latest) await sleep(350);
  }

  console.log(`Indexed ${totalInserted} new entries, synced to block ${latest}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
