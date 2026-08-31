import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// Arc Testnet USDC (native gas token, ERC-20 interface, 6-decimal display).
// https://docs.arc.io/arc/references/contract-addresses
const DEFAULT_USDC_ADDRESS = "0x3600000000000000000000000000000000000000";

/**
 * Deploys LuckyStakerPool behind a UUPS proxy.
 *
 * One initialize() call now sets everything - the original launch needed a
 * second initializeV2()/reinitializer(2) step to add the technical-spec fields
 * onto a proxy that already held real deposits and couldn't take a new
 * initialize() signature. That split ended with the 2026-08-31 fresh relaunch
 * (empty pool, clean slate) - see HANDOFF for why.
 *
 * Parameters (pass via --parameters or env-backed defaults):
 *   - usdcAddress: ERC20 token used as the pool asset AND as referenceUSDC,
 *     so currentAprBps() resolves the USDC (not $ARC) branch by default
 *   - adminAddress: Safe multisig granted DEFAULT_ADMIN_ROLE
 *   - keeperAddress: bot wallet granted KEEPER_ROLE
 *   - aprUsdcBps / aprArcBps: admin-set benchmark yield (spec 1) - defaults
 *     match the values the previous deployment had live (6%/3%)
 */
export default buildModule("LuckyStakerPoolModule", (m) => {
  const usdcAddress = m.getParameter("usdcAddress", DEFAULT_USDC_ADDRESS);
  const adminAddress = m.getParameter("adminAddress");
  const keeperAddress = m.getParameter("keeperAddress");
  const aprUsdcBps = m.getParameter("aprUsdcBps", 600n);
  const aprArcBps = m.getParameter("aprArcBps", 300n);

  const implementation = m.contract("LuckyStakerPool", [], { id: "LuckyStakerPoolImplementation" });

  const initData = m.encodeFunctionCall(implementation, "initialize", [
    usdcAddress,
    adminAddress,
    keeperAddress,
    aprUsdcBps,
    aprArcBps,
    usdcAddress,
  ]);

  const proxy = m.contract("ERC1967Proxy", [implementation, initData], {
    id: "LuckyStakerPoolProxy",
  });

  const pool = m.contractAt("LuckyStakerPool", proxy, { id: "LuckyStakerPool" });

  return { pool, implementation, proxy };
});
