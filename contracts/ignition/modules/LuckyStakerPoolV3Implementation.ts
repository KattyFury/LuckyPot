import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Deploys ONLY the new LuckyStakerPool implementation (Monday-anchored epoch
 * boundaries, 2026-08-25) — no proxy, no initializer call. Same pattern as
 * LuckyStakerPoolV2Implementation.ts: this implementation is inert on its
 * own until the live proxy's admin calls upgradeToAndCall pointing at it.
 * No new storage was added this time, so the upgrade call needs no init data.
 */
export default buildModule("LuckyStakerPoolV3ImplementationModule", (m) => {
  const implementation = m.contract("LuckyStakerPool", [], { id: "LuckyStakerPoolV3Implementation" });
  return { implementation };
});
