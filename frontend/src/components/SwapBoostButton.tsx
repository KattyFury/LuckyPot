import { useState } from "react";
import { useAccount, useReadContracts, useSendTransaction, useWaitForTransactionReceipt } from "wagmi";
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

/** "x3" — one click swaps every EURC + cirBTC the wallet holds into USDC, batched into
 *  the same 1-signature Multicall3From pattern deposit/withdraw already use. Lets
 *  testers stack up more USDC than Circle's 20 USDC/faucet-request cap by also
 *  faucet-ing EURC and cirBTC and converting them here. */
export function SwapBoostButton() {
  const { address } = useAccount();
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

  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { sendTransaction, isPending } = useSendTransaction();

  async function handleClick() {
    if (!address || !hasSomethingToSwap || preparing || isPending) return;
    setError(null);
    setPreparing(true);
    try {
      const calls = [];
      if (eurcBal > 0n) calls.push(...buildSwapCalls(await fetchIntent("EURC", address, eurcBal), EURC_ADDRESS, eurcBal));
      if (cirbtcBal > 0n)
        calls.push(...buildSwapCalls(await fetchIntent("cirBTC", address, cirbtcBal), CIRBTC_ADDRESS, cirbtcBal));

      sendTransaction({ to: MULTICALL3_FROM_ADDRESS, data: encodeAggregate3(calls) });
    } catch (e) {
      setError(e instanceof Error ? e.message : "swap failed");
    } finally {
      setPreparing(false);
    }
  }

  const busy = preparing || isPending;

  return (
    <div style={{ position: "relative", height: "100%" }}>
      <button
        type="button"
        onClick={handleClick}
        disabled={!address || !hasSomethingToSwap || busy}
        title="Swap all your EURC + cirBTC into USDC"
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
        {busy ? "..." : "x3"}
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
