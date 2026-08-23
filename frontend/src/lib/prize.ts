// Mirrors LuckyStakerPool.revealAndDraw's numWinners formula (spec 3.3) so the
// dashboard can show a live estimate before the epoch is actually drawn.
const MIN_PARTICIPANTS_PER_WINNER = 10n;
const MIN_PRIZE = 10_000_000n; // $10, 6 decimals

export function estimateNumWinners(participantCount: bigint, pendingYield: bigint): bigint {
  if (participantCount === 0n || pendingYield === 0n) return 0n;
  const byParticipants = participantCount / MIN_PARTICIPANTS_PER_WINNER;
  const byPrize = pendingYield / MIN_PRIZE;
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
