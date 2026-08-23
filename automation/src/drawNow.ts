import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { keccak256, encodePacked } from "viem";
import { pool, publicClient, keeperWalletClient } from "./client";

// Testnet-only convenience: runs a full commit -> forceEndEpoch -> reveal cycle
// in one shot, using LuckyStakerPool.forceEndEpoch() to skip the real epochDuration
// wait. Use this while iterating on bugs; `draw.ts` (the real cadence-respecting
// script driven by keeper.yml) is what actually runs in production.
const STATE_DIR = path.join(process.cwd(), "state");

type EpochTuple = [bigint, bigint, bigint, bigint, bigint, bigint, bigint, boolean, boolean, `0x${string}`[]];

function secretFile(epochId: bigint) {
  return path.join(STATE_DIR, `epoch-${epochId}.json`);
}

async function send(functionName: string, args: readonly unknown[] = []) {
  const hash = await keeperWalletClient.writeContract({ ...pool, functionName, args } as never);
  await publicClient.waitForTransactionReceipt({ hash });
  console.log(`${functionName}() tx=${hash}`);
  return hash;
}

async function main() {
  const currentEpochId = (await publicClient.readContract({ ...pool, functionName: "currentEpochId" })) as bigint;
  const raw = (await publicClient.readContract({
    ...pool,
    functionName: "getEpoch",
    args: [currentEpochId],
  })) as EpochTuple;
  const [, , , , , , , committed, drawn] = raw;

  if (drawn) {
    console.log(`Epoch ${currentEpochId} already drawn — nothing to do.`);
    return;
  }

  let secret: bigint;
  if (committed) {
    const file = secretFile(currentEpochId);
    if (!fs.existsSync(file)) {
      throw new Error(
        `Epoch ${currentEpochId} was already committed by a previous run and no secret is ` +
          `cached at ${file} — can't reveal it here. Wait for the normal draw.ts/cron to run instead.`
      );
    }
    secret = BigInt(JSON.parse(fs.readFileSync(file, "utf8")).secret);
    console.log(`Reusing already-committed secret for epoch ${currentEpochId}.`);
  } else {
    secret = BigInt(`0x${crypto.randomBytes(32).toString("hex")}`);
    const commitHash = keccak256(encodePacked(["uint256"], [secret]));
    await send("commitRandom", [commitHash]);
    fs.mkdirSync(STATE_DIR, { recursive: true });
    fs.writeFileSync(secretFile(currentEpochId), JSON.stringify({ secret: secret.toString() }));
  }

  await send("forceEndEpoch");
  await send("revealAndDraw", [secret]);
  console.log(`Drew epoch ${currentEpochId} on demand.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
