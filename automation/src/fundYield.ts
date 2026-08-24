import { pool, publicClient, keeperWalletClient, keeperAddress, USDC_ADDRESS } from "./client";

// Technical-spec upgrade (2026-08-24): realYieldEarned = balancesTotal * currentAprBps()
// / 10000 / 52 — read live from the contract, since aprBps is now admin-adjustable
// within a hard band rather than a fixed 10%/year. No dollar floor anymore (that was
// the old tier system); the contract itself only requires funding to reach that
// epoch's weeklyPrizePool (the smaller, eligible-only figure) — funding the full
// realYieldEarned target is what makes the surplus-to-vault split honest.
//
// Each run TOPS THE POT UP to that week's figure rather than adding a fixed
// slice of it. Same effect over a week, but the prize pot is correct the whole
// time instead of climbing from zero: a draw zeroes pendingYield, and the next
// run refills it within the hour. It's also self-healing — a failed run costs
// nothing, the next one still tops up to the same target — and it keeps a
// force-ended epoch (draw:now) from paying out a part-filled prize.
const WEEKS_PER_YEAR = 52n;

const erc20Abi = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

async function main() {
  const poolBalance = (await publicClient.readContract({ ...pool, functionName: "balancesTotal" })) as bigint;
  const alreadyFunded = (await publicClient.readContract({ ...pool, functionName: "pendingYield" })) as bigint;
  const aprBps = (await publicClient.readContract({ ...pool, functionName: "currentAprBps" })) as bigint;

  const weeklyYield = (poolBalance * aprBps) / 10_000n / WEEKS_PER_YEAR;
  const amount = weeklyYield > alreadyFunded ? weeklyYield - alreadyFunded : 0n;

  if (amount <= 0n) {
    console.log(`Prize pot already at ${weeklyYield} (6dp) for this epoch — nothing to top up.`);
    return;
  }

  const keeperBalance = (await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [keeperAddress],
  })) as bigint;
  if (keeperBalance < amount) {
    throw new Error(
      `Keeper holds ${keeperBalance} (6dp) but the pot needs ${amount} more to reach ${weeklyYield}. ` +
        "Top the keeper up from https://faucet.circle.com (10 USDC per 24h, manual — Circle's " +
        "faucet API is mainnet-only and its console faucet only serves Circle-platform wallets)."
    );
  }

  const allowance = (await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "allowance",
    args: [keeperAddress, pool.address],
  })) as bigint;

  if (allowance < amount) {
    const approveHash = await keeperWalletClient.writeContract({
      address: USDC_ADDRESS,
      abi: erc20Abi,
      functionName: "approve",
      args: [pool.address, weeklyYield * 10n], // headroom so we don't re-approve every run
    });
    await publicClient.waitForTransactionReceipt({ hash: approveHash });
  }

  const hash = await keeperWalletClient.writeContract({
    ...pool,
    functionName: "fundYield",
    args: [amount],
  });
  await publicClient.waitForTransactionReceipt({ hash });
  console.log(`Topped the prize pot up by ${amount} (6dp) to ${weeklyYield}. tx=${hash}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
