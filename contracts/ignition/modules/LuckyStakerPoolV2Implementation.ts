import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Deploys ONLY the new LuckyStakerPool implementation (technical-spec upgrade,
 * 2026-08-24) — no proxy, no initializer call. The constructor's
 * `_disableInitializers()` makes this implementation address inert on its own;
 * it does nothing until the live proxy's multisig calls `upgradeToAndCall`
 * pointing at it. Safe to deploy any time without affecting the running pool.
 */
export default buildModule("LuckyStakerPoolV2ImplementationModule", (m) => {
  const implementation = m.contract("LuckyStakerPool", [], { id: "LuckyStakerPoolV2Implementation" });
  return { implementation };
});
