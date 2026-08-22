import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { keccak256, encodePacked } from "viem";
import { pool, publicClient, keeperWalletClient } from "./client";

// Commit-reveal randomness (spec 3.5). This script is idempotent and stateless
// across invocations except for the secret, which must survive from the
// commit run to the reveal run ~7 days later — see .github/workflows/keeper.yml,
// which persists ./state via actions/cache between runs.
const STATE_DIR = path.join(process.cwd(), "state");

type EpochTuple = [bigint, bigint, bigint, bigint, bigint, bigint, bigint, boolean, boolean, `0x${string}`[]];

function secretFile(epochId: bigint) {
  return path.join(STATE_DIR, `epoch-${epochId}.json`);
}

async function main() {
  const currentEpochId = (await publicClient.readContract({ ...pool, functionName: "currentEpochId" })) as bigint;
  const raw = (await publicClient.readContract({
    ...pool,
    functionName: "getEpoch",
    args: [currentEpochId],
  })) as EpochTuple;
  const [, endTime, , , , , , committed, drawn] = raw;

  const nowSeconds = Math.floor(Date.now() / 1000);

  if (drawn) {
    console.log(`Epoch ${currentEpochId} already drawn — nothing to do.`);
    return;
  }

  if (!committed) {
    const secret = BigInt(`0x${crypto.randomBytes(32).toString("hex")}`);
    const commitHash = keccak256(encodePacked(["uint256"], [secret]));

    const hash = await keeperWalletClient.writeContract({ ...pool, functionName: "commitRandom", args: [commitHash] });
    await publicClient.waitForTransactionReceipt({ hash });

    fs.mkdirSync(STATE_DIR, { recursive: true });
    fs.writeFileSync(secretFile(currentEpochId), JSON.stringify({ secret: secret.toString() }));
    console.log(`Committed randomness for epoch ${currentEpochId}. tx=${hash}`);
    return;
  }

  if (nowSeconds < Number(endTime)) {
    console.log(`Epoch ${currentEpochId} committed, not ended yet — nothing to do.`);
    return;
  }

  const file = secretFile(currentEpochId);
  if (!fs.existsSync(file)) {
    throw new Error(
      `Epoch ${currentEpochId} is ready to draw but no persisted secret was found at ${file}. ` +
        "The commit/reveal state cache may have been lost."
    );
  }
  const { secret } = JSON.parse(fs.readFileSync(file, "utf8")) as { secret: string };

  const hash = await keeperWalletClient.writeContract({
    ...pool,
    functionName: "revealAndDraw",
    args: [BigInt(secret)],
  });
  await publicClient.waitForTransactionReceipt({ hash });
  console.log(`Drew epoch ${currentEpochId}. tx=${hash}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
