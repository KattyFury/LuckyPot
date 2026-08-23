// Mirrors LuckyStakerPool.revealAndDraw's numWinners formula (spec 3.3) so the
// dashboard can say up front how many people this epoch will pay out.
const MIN_PARTICIPANTS_PER_WINNER = 10n;
const MIN_PRIZE = 10_000_000n; // $10, 6 decimals
const ANNUAL_RATE_BPS = 1000n; // 10%
const WEEKS_PER_YEAR = 52n;

/**
 * The yield this epoch will hold by the time it's drawn — spec 3.4's
 * `max($10, poolBalance x 10% / 52)`.
 *
 * The card has to project it rather than read `pendingYield`: the keeper drips
 * the week's yield in across the epoch, so right after a draw the pot is 0 and
 * reading it live would claim "0 lucky winners" for most of the week.
 */
export function projectedWeeklyYield(poolBalance: bigint): bigint {
  const byFormula = (poolBalance * ANNUAL_RATE_BPS) / 10_000n / WEEKS_PER_YEAR;
  return byFormula > MIN_PRIZE ? byFormula : MIN_PRIZE;
}

export function estimateNumWinners(participantCount: bigint, weeklyYield: bigint): bigint {
  if (participantCount === 0n || weeklyYield === 0n) return 0n;
  const byParticipants = participantCount / MIN_PARTICIPANTS_PER_WINNER;
  const byPrize = weeklyYield / MIN_PRIZE;
  const n = byParticipants < byPrize ? byParticipants : byPrize;
  return n === 0n ? 1n : n;
}

// Mirrors LuckyStakerPool.prizeForRank (contracts/contracts/LuckyStakerPool.sol) so the
// UI can render prize breakdowns without an extra RPC round-trip per winner.
export function prizeForRank(rank: number, numWinners: bigint, weeklyYield: bigint): bigint {
  if (numWinners === 0n) return 0n;
  if (numWinners === 1n) return rank === 0 ? weeklyYield : 0n;

  const jackpotBps = numWinners <= 5n ? 5000n : 3300n;
  const jackpot = (weeklyYield * jackpotBps) / 10000n;
  if (rank === 0) return jackpot;

  return (weeklyYield - jackpot) / (numWinners - 1n);
}
