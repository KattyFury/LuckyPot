import type { Abi } from "viem";
import poolAbiJson from "./poolAbi.json";
import { USDC_ADDRESS } from "../chains/arcTestnet";

// Filled in after `npm run deploy:arcTestnet` in /contracts.
export const POOL_ADDRESS = (import.meta.env.VITE_POOL_ADDRESS ??
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

export const poolAbi = poolAbiJson as Abi;

export { USDC_ADDRESS };
