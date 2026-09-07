import "dotenv/config";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arcTestnet, USDC_ADDRESS } from "./arcTestnet";
import poolAbiJson from "./poolAbi.json" with { type: "json" };

const KEEPER_PRIVATE_KEY = process.env.KEEPER_PRIVATE_KEY;
const POOL_ADDRESS = process.env.POOL_ADDRESS as `0x${string}` | undefined;

if (!KEEPER_PRIVATE_KEY) throw new Error("KEEPER_PRIVATE_KEY is not set");
if (!POOL_ADDRESS) throw new Error("POOL_ADDRESS is not set");

export const poolAbi = poolAbiJson as readonly unknown[];
export const pool = { address: POOL_ADDRESS, abi: poolAbi } as const;
export { USDC_ADDRESS };

const account = privateKeyToAccount(KEEPER_PRIVATE_KEY as `0x${string}`);

export const publicClient = createPublicClient({ chain: arcTestnet, transport: http() });
export const keeperWalletClient = createWalletClient({ account, chain: arcTestnet, transport: http() });
export const keeperAddress = account.address;

// A tx can be mined but still revert (status "reverted") — waitForTransactionReceipt
// alone doesn't throw for that. Callers must check the receipt or use this helper,
// otherwise a reverted keeper action silently reports success (this bit us for real:
// a revealAndDraw ran out of gas mid-loop and the workflow still went green).
export async function waitForSuccess(hash: `0x${string}`, label: string) {
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") {
    throw new Error(`${label} reverted on-chain. tx=${hash}`);
  }
  return receipt;
}
