import { useState } from "react";
import { useAccount, useConfig, useReadContracts } from "wagmi";
import { sendTransaction, waitForTransactionReceipt } from "wagmi/actions";
import { erc20Abi } from "../lib/erc20Abi";
import { encodeAggregate3, MULTICALL3_FROM_ADDRESS } from "../lib/multicall3From";
import { buildSwapCalls, type SwapIntent } from "../lib/swapAdapter";
import { AnnouncementBanner } from "./AnnouncementBanner";

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

/** One banner, two jobs. Before the wallet holds any EURC/cirBTC: the usual
 *  faucet link (also copies the address, same as before). Once it holds some:
 *  the same banner switches to selling all of it to USDC, one transaction per
 *  token - Circle's testnet faucet caps each request at 20 USDC, so faucet-ing
 *  EURC and cirBTC too and selling them here stacks up more than one faucet
 *  request alone would. No separate button - it was fighting the grid on
 *  narrow screens, and one banner that explains itself is simpler anyway. */
export function FaucetOrSellBanner() {
  const { address } = useAccount();
  const config = useConfig();
  const { data: balances } = useReadContracts({
    contracts: address
      ? [
          { address: EURC_ADDRESS, abi: erc20Abi, functionName: "balanceOf", args: [address] },
          { address: CIRBTC_ADDRESS, abi: erc20Abi, functionName: "balanceOf", args: [address] },
        ]
      : [],
    // Polled, not just fetched once: this balance decides whether the banner
    // offers a faucet or a sell, and someone faucet-ing in another tab
    // shouldn't have to reload this one to see it switch over.
    query: { enabled: Boolean(address), refetchInterval: 15_000 },
  });
  const eurcBal = (balances?.[0]?.result as bigint | undefined) ?? 0n;
  const cirbtcBal = (balances?.[1]?.result as bigint | undefined) ?? 0n;
  const hasSomethingToSell = eurcBal > 0n || cirbtcBal > 0n;

  const [status, setStatus] = useState<"idle" | "eurc" | "cirbtc">("idle");
  const [error, setError] = useState<string | null>(null);
  const busy = status !== "idle";

  async function swapLeg(tokenSymbol: "EURC" | "cirBTC", tokenAddress: `0x${string}`, amountBase: bigint) {
    if (!address) return;
    const intent = await fetchIntent(tokenSymbol, address, amountBase);
    const calls = buildSwapCalls(intent, tokenAddress, amountBase);
    const hash = await sendTransaction(config, { to: MULTICALL3_FROM_ADDRESS, data: encodeAggregate3(calls) });
    const receipt = await waitForTransactionReceipt(config, { hash });
    if (receipt.status !== "success") throw new Error(`${tokenSymbol} -> USDC swap reverted on-chain`);
  }

  async function handleSell() {
    if (!address || !hasSomethingToSell || busy) return;
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
      setError(e instanceof Error ? e.message : "sell failed");
    } finally {
      setStatus("idle");
    }
  }

  if (hasSomethingToSell) {
    const text =
      status === "eurc"
        ? "Selling EURC..."
        : status === "cirbtc"
          ? "Selling cirBTC..."
          : "Click here to sell EURC and cirBTC to USDC";
    return (
      <div style={{ position: "relative", height: "100%" }}>
        <AnnouncementBanner text={text} onClick={handleSell} />
        {error && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              marginTop: 6,
              background: "#c0392b",
              color: "#fff",
              fontSize: "var(--fs-sm)",
              padding: "6px 10px",
              borderRadius: "var(--radius)",
              zIndex: 10,
            }}
          >
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <AnnouncementBanner
      text="Tap here to faucet"
      note="(if you faucet EURC & cirBTC, I can help you turn them to USDC)"
      href="https://faucet.circle.com"
      onClick={() => {
        if (address) navigator.clipboard.writeText(address);
      }}
    />
  );
}
