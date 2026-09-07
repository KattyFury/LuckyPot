import { pool, publicClient, keeperWalletClient, waitForSuccess } from "./client";

// sweep() is permissionless by design (spec: "no need to trust admin, no need for
// Chainlink Automation") — but permissionless only means anyone CAN call it, not
// that anyone WILL. Without a scheduled caller, an unclaimed prize just sits in the
// contract forever once the 3-day self-claim window closes. This script is that
// caller: it scans every past epoch and sweeps any that are past SWEEP_DELAY and
// still have an unclaimed winner. Cheap to run every keeper cycle — epochs are
// weekly, so the scan is a handful of read calls even after years of runs, and a
// real tx is only sent when there's actually something to sweep.
const SWEEP_DELAY_SECONDS = 3n * 24n * 60n * 60n;

type EpochTuple = [bigint, bigint, bigint, bigint, bigint, bigint, bigint, boolean, boolean, `0x${string}`[]];

async function main() {
  const currentEpochId = (await publicClient.readContract({ ...pool, functionName: "currentEpochId" })) as bigint;
  const nowSeconds = BigInt(Math.floor(Date.now() / 1000));

  let sweptAny = false;

  for (let epochId = 1n; epochId < currentEpochId; epochId++) {
    const raw = (await publicClient.readContract({
      ...pool,
      functionName: "getEpoch",
      args: [epochId],
    })) as EpochTuple;
    const [, , drawnAt, , , , , , drawn, winners] = raw;

    if (!drawn || winners.length === 0) continue;
    if (nowSeconds < drawnAt + SWEEP_DELAY_SECONDS) continue;

    let needsSweep = false;
    for (const winner of winners) {
      const claimed = (await publicClient.readContract({
        ...pool,
        functionName: "hasClaimed",
        args: [epochId, winner],
      })) as boolean;
      if (!claimed) {
        needsSweep = true;
        break;
      }
    }
    if (!needsSweep) continue;

    const gasEstimate = await publicClient.estimateContractGas({
      ...pool,
      functionName: "sweep",
      args: [epochId],
      account: keeperWalletClient.account,
    });
    const gas = (gasEstimate * 160n) / 100n;

    const hash = await keeperWalletClient.writeContract({
      ...pool,
      functionName: "sweep",
      args: [epochId],
      gas,
    });
    await waitForSuccess(hash, `sweep(epoch ${epochId})`);
    console.log(`Swept epoch ${epochId}. tx=${hash}`);
    sweptAny = true;
  }

  if (!sweptAny) {
    console.log("No epoch has an unclaimed prize past the 3-day sweep window — nothing to do.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
