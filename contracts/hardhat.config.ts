import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox-viem";
import "@nomicfoundation/hardhat-ignition-viem";
import * as dotenv from "dotenv";

dotenv.config();

const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const KEEPER_PRIVATE_KEY = process.env.KEEPER_PRIVATE_KEY;

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "cancun",
    },
  },
  networks: {
    // Arc Testnet — see https://docs.arc.io/arc/references/connect-to-arc
    arcTestnet: {
      url: "https://rpc.testnet.arc.io",
      chainId: 5042002,
      accounts: [DEPLOYER_PRIVATE_KEY, KEEPER_PRIVATE_KEY].filter(
        (k): k is string => Boolean(k)
      ),
    },
  },
};

export default config;
