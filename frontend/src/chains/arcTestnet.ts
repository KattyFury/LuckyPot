import { defineChain } from "viem";

// https://docs.arc.io/arc/references/connect-to-arc
export const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://rpc.testnet.arc.io"],
      webSocket: ["wss://rpc.testnet.arc.io"],
    },
  },
  blockExplorers: {
    default: { name: "Arcscan", url: "https://testnet.arcscan.app" },
  },
  // Without this, wagmi can't batch multi-contract reads (useReadContracts) into one
  // multicall request — it falls back to one separate eth_call per contract, and the
  // public RPC 429s under that load (confirmed 2026-08-27: 8 eligibleBalance() reads
  // fired individually, some got rate-limited, and the ones that didn't got silently
  // summed as if they were the whole set — see useEligiblePoolTotal). Same canonical
  // Multicall3 address Arc Testnet deploys at, per docs.arc.io/arc/references/contract-addresses.
  contracts: {
    multicall3: { address: "0xcA11bde05977b3631167028862bE2a173976CA11" },
  },
  testnet: true,
});

// Arc Testnet predeployed USDC — same asset as native gas, 6-decimal ERC20 view.
export const USDC_ADDRESS = "0x3600000000000000000000000000000000000000" as const;
