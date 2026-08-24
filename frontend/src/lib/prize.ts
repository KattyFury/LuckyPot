// Mirrors LuckyStakerPool's yield/prize formulas (technical-spec upgrade, 2026-08-24)
// so the dashboard can say up front how many people this epoch will pay out, without
// an extra RPC round-trip per winner. Keep in sync with contracts/contracts/LuckyStakerPool.sol.
const WEEKS_PER_YEAR = 52n;
const DOLLARS_PER_WINNER_STEP = 1000n * 1_000_000n; // $1000, 6 decimals

function sqrtBigint(value: bigint): bigint {
  if (value < 2n) return value;
  let x = value;
  let y = (x + 1n) / 2n;
  while (y < x) {
    x = y;
    y = (x + value / x) / 2n;
  }
  return x;
}

/**
 * weeklyPrizePool = eligibleTotal * currentAprBps / 10000 / 52 — funded only on the
 * portion of the pool that's sat a full epoch, not the whole pool (that's
 * realYieldEarned, which also feeds the vault surplus but isn't shown here).
 *
 * The card has to project it rather than read `pendingYield` directly: the keeper
 * tops the pot up across the epoch, so right after a draw the pot is 0 and reading it
 * live would claim "0 lucky winners" for most of the week.
 */
export function projectedWeeklyYield(eligibleTotal: bigint, aprBps: bigint): bigint {
  return (eligibleTotal * aprBps) / 10_000n / WEEKS_PER_YEAR;
}

export function estimateNumWinners(eligibleTotal: bigint, weeklyYield: bigint): bigint {
  if (eligibleTotal === 0n || weeklyYield === 0n) return 0n;
  const n = sqrtBigint(eligibleTotal / DOLLARS_PER_WINNER_STEP);
  return n === 0n ? 1n : n;
}

// Mirrors LuckyStakerPool.prizeForRank (contracts/contracts/LuckyStakerPool.sol) —
// continuous 50/50 jackpot split, replacing the old participant-count tier table.
export function prizeForRank(rank: number, numWinners: bigint, weeklyYield: bigint): bigint {
  if (numWinners === 0n) return 0n;
  if (numWinners === 1n) return rank === 0 ? weeklyYield : 0n;

  const jackpot = weeklyYield / 2n;
  if (rank === 0) return jackpot;

  return (weeklyYield - jackpot) / (numWinners - 1n);
}
