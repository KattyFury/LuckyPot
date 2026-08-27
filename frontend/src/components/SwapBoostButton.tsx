import { useState } from "react";
import { useAccount, useConfig, useReadContracts } from "wagmi";
import { sendTransaction, waitForTransactionReceipt } from "wagmi/actions";
import { erc20Abi } from "../lib/erc20Abi";
import { encodeAggregate3, MULTICALL3_FROM_ADDRESS } from "../lib/multicall3From";
import { buildSwapCalls, type SwapIntent } from "../lib/swapAdapter";

const EURC_ADDRESS = "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a" as const;
const CIRBTC_ADDRESS = "0xf0c4a4ce82a5746abaad9425360ab04fbba432bf" as const;

async function fetchIntent(
  tokenIn: string,
  walletAddress: `0x${string}`,
  amountBase: bigint,
): Promise<SwapIntent> {
  const res = await fetch("/api/swap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tokenIn, tokenOut: "USDC", walletAddress, amountBase: amountBase.toString() }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `${tokenIn} -> USDC swap failed`);
  return data as SwapIntent;
}

/** "x3" — one leg per token: fetches that leg's swap intent, sends its own
 *  approve+execute Multicall3From transaction, and waits for it to actually land
 *  on-chain before moving to the next leg or reporting success. Two separate
 *  signatures (one per token held), not one combined batch - simpler to reason
 *  about, and a revert on one leg doesn't silently swallow the other. */
export function SwapBoostButton() {
  const { address } = useAccount();
  const config = useConfig();
  const { data: balances } = useReadContracts({
    contracts: address
      ? [
          { address: EURC_ADDRESS, abi: erc20Abi, functionName: "balanceOf", args: [address] },
          { address: CIRBTC_ADDRESS, abi: erc20Abi, functionName: "balanceOf", args: [address] },
        ]
      : [],
    query: { enabled: Boolean(address) },
  });
  const eurcBal = (balances?.[0]?.result as bigint | undefined) ?? 0n;
  const cirbtcBal = (balances?.[1]?.result as bigint | undefined) ?? 0n;
  const hasSomethingToSwap = eurcBal > 0n || cirbtcBal > 0n;

  const [status, setStatus] = useState<"idle" | "eurc" | "cirbtc">("idle");
  const [error, setError] = useState<string | null>(null);
  const busy = status !== "idle";

  async function swapLeg(tokenSymbol: "EURC" | "cirBTC", tokenAddress: `0x${string}`, amountBase: bigint) {
    if (!address) return;
    const intent = await fetchIntent(tokenSymbol, address, amountBase);
    const calls = buildSwapCalls(intent, tokenAddress, amountBase);
    const hash = await sendTransaction(config, {
      to: MULTICALL3_FROM_ADDRESS,
      data: encodeAggregate3(calls),
    });
    const receipt = await waitForTransactionReceipt(config, { hash });
    if (receipt.status !== "success") {
      throw new Error(`${tokenSymbol} -> USDC swap reverted on-chain`);
    }
  }

  async function handleClick() {
    if (!address || !hasSomethingToSwap || busy) return;
    setError(null);
    try {
      if (eurcBal > 0n) {
        setStatus("eurc");
        await swapLeg("EURC", EURC_ADDRESS, eurcBal);
      }
      if (cirbtcBal > 0n) {
        setStatus("cirbtc");
        await swapLeg("cirBTC", CIRBTC_ADDRESS, cirbtcBal);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "swap failed");
    } finally {
      setStatus("idle");
    }
  }

  const label = status === "eurc" ? "EURC..." : status === "cirbtc" ? "cirBTC..." : "x3";

  return (
    <div style={{ position: "relative", height: "100%" }}>
      <button
        type="button"
        onClick={handleClick}
        disabled={!address || !hasSomethingToSwap || busy}
        title="Swap your EURC and cirBTC into USDC, one transaction per token"
        style={{
          background: "var(--color-banner-bg)",
          color: "#000000",
          borderRadius: "var(--radius)",
          height: "100%",
          minWidth: 60,
          fontWeight: 700,
          fontSize: "var(--fs-4)",
          opacity: !address || !hasSomethingToSwap ? 0.5 : 1,
          cursor: !address || !hasSomethingToSwap || busy ? "not-allowed" : "pointer",
        }}
      >
        {label}
      </button>
      {error && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: 6,
            background: "#c0392b",
            color: "#fff",
            fontSize: "var(--fs-5)",
            padding: "6px 10px",
            borderRadius: "var(--radius)",
            whiteSpace: "nowrap",
            zIndex: 10,
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
