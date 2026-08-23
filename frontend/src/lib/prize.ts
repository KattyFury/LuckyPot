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
