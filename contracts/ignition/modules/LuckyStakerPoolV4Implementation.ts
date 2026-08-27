import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Deploys ONLY the new LuckyStakerPool implementation (referral cut now splits
 * 2.5% always-to-vaultReserve / 2.5% pushed straight to the referrer's wallet
 * instead of the old 5%-to-pendingRef accrual, 2026-08-27) — no proxy, no
 * initializer call. Same pattern as V2/V3: inert on its own until the live
 * proxy's admin Safe calls upgradeToAndCall pointing at it. No new storage
 * was added, so the upgrade call needs no init data.
 */
export default buildModule("LuckyStakerPoolV4ImplementationModule", (m) => {
  const implementation = m.contract("LuckyStakerPool", [], { id: "LuckyStakerPoolV4Implementation" });
  return { implementation };
});
