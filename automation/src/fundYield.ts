import { pool, publicClient, keeperWalletClient, keeperAddress, USDC_ADDRESS } from "./client";

// spec 3.4: weeklyYield = max($10, poolBalance * 10% / 52), funded in small
// increments spread across the epoch rather than one lump sum (spec 3.9).
const MIN_WEEKLY_YIELD = 10_000_000n; // $10, 6 decimals
const ANNUAL_RATE_BPS = 1000n; // 10%
const WEEKS_PER_YEAR = 52n;
const RUNS_PER_WEEK = 28n; // this script is expected to run every ~6 hours

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
] as const;

async function main() {
  const poolBalance = (await publicClient.readContract({ ...pool, functionName: "balancesTotal" })) as bigint;

  const formulaYield = (poolBalance * ANNUAL_RATE_BPS) / 10_000n / WEEKS_PER_YEAR;
  const weeklyYield = formulaYield > MIN_WEEKLY_YIELD ? formulaYield : MIN_WEEKLY_YIELD;
  const amount = weeklyYield / RUNS_PER_WEEK;

  if (amount <= 0n) {
    console.log("Nothing to fund this run.");
    return;
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
  console.log(`Funded ${amount} (6dp) yield. tx=${hash}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
