import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// Arc Testnet USDC (native gas token, ERC-20 interface, 6-decimal display).
// https://docs.arc.io/arc/references/contract-addresses
const DEFAULT_USDC_ADDRESS = "0x3600000000000000000000000000000000000000";

/**
 * Deploys LuckyStackerPool behind a UUPS proxy.
 *
 * Parameters (pass via --parameters or env-backed defaults):
 *   - usdcAddress: ERC20 token used as the pool asset
 *   - adminAddress: Safe multisig granted DEFAULT_ADMIN_ROLE
 *   - keeperAddress: bot wallet granted KEEPER_ROLE
 */
export default buildModule("LuckyStackerPoolModule", (m) => {
  const usdcAddress = m.getParameter("usdcAddress", DEFAULT_USDC_ADDRESS);
  const adminAddress = m.getParameter("adminAddress");
  const keeperAddress = m.getParameter("keeperAddress");

  const implementation = m.contract("LuckyStackerPool", [], { id: "LuckyStackerPoolImplementation" });

  const initData = m.encodeFunctionCall(implementation, "initialize", [
    usdcAddress,
    adminAddress,
    keeperAddress,
  ]);

  const proxy = m.contract("ERC1967Proxy", [implementation, initData], {
    id: "LuckyStackerPoolProxy",
  });

  const pool = m.contractAt("LuckyStackerPool", proxy, { id: "LuckyStackerPool" });

  return { pool, implementation, proxy };
});
