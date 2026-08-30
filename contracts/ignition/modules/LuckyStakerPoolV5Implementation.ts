import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Deploys ONLY the new LuckyStakerPool implementation - adds forceWithdrawAll(),
 * a testnet-only admin function that returns every depositor's principal to their
 * own wallet in one call (never anyone else's), gated by whenPaused so it can't run
 * silently. No proxy, no initializer call. Same pattern as V2/V3/V4: inert on its
 * own until the live proxy's admin calls upgradeToAndCall pointing at it. No new
 * storage was added, so the upgrade call needs no init data.
 */
export default buildModule("LuckyStakerPoolV5ImplementationModule", (m) => {
  const implementation = m.contract("LuckyStakerPool", [], { id: "LuckyStakerPoolV5Implementation" });
  return { implementation };
});
