import { useState } from "react";
import { useAccount, useConfig, useReadContracts } from "wagmi";
import { sendTransaction, waitForTransactionReceipt } from "wagmi/actions";
import { erc20Abi } from "../lib/erc20Abi";
import { USDC_ADDRESS } from "../lib/contract";
import { arcTestnet } from "../chains/arcTestnet";
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
          // USDC is the gas token on Arc, so this is what pays for the swap
          // itself - see the guard in handleSell.
          { address: USDC_ADDRESS, abi: erc20Abi, functionName: "balanceOf", args: [address] },
        ]
      : [],
    // Polled, not just fetched once: this balance decides whether the banner
    // offers a faucet or a sell, and someone faucet-ing in another tab
    // shouldn't have to reload this one to see it switch over.
    query: { enabled: Boolean(address), refetchInterval: 15_000 },
  });
  const eurcBal = (balances?.[0]?.result as bigint | undefined) ?? 0n;
  const cirbtcBal = (balances?.[1]?.result as bigint | undefined) ?? 0n;
  const usdcBal = (balances?.[2]?.result as bigint | undefined) ?? 0n;
  // Majority rule, not unanimous: "sell" shows once at least 2 of the 3
  // tokens clear their own bar, so one straggler (e.g. cirBTC's faucet drip
  // being tiny and slow to stack up) doesn't keep blocking the sell flow for
  // two tokens the wallet is already flush with. USDC/EURC: 10 units, 6
  // decimals. cirBTC: 0.00005, 8 decimals.
  const USDC_SELL_THRESHOLD = 10_000_000n;
  const EURC_SELL_THRESHOLD = 10_000_000n;
  const CIRBTC_SELL_THRESHOLD = 5_000n; // 0.00005 cirBTC, 8 decimals
  const tokensOverThreshold =
    Number(usdcBal > USDC_SELL_THRESHOLD) +
    Number(eurcBal > EURC_SELL_THRESHOLD) +
    Number(cirbtcBal > CIRBTC_SELL_THRESHOLD);
  const showSellBanner = tokensOverThreshold >= 2;

  const [status, setStatus] = useState<"idle" | "eurc" | "cirbtc">("idle");
  const [error, setError] = useState<string | null>(null);
  const busy = status !== "idle";

  async function swapLeg(tokenSymbol: "EURC" | "cirBTC", tokenAddress: `0x${string}`, amountBase: bigint) {
    if (!address) return;
    const intent = await fetchIntent(tokenSymbol, address, amountBase);
    const calls = buildSwapCalls(intent, tokenAddress, amountBase);
    // account and chainId are passed explicitly rather than left to whatever
    // connection happens to be current. Privy registers ONE wagmi connector per
    // wallet it knows about - the embedded one plus every external wallet the
    // user has linked - so "the current connection" is not necessarily the
    // address this swap intent was built for. Circle binds the intent to
    // fromAddress, so a mismatch reverts inside the adapter with nothing useful
    // to show the user; naming the account makes wagmi refuse up front instead.
    const hash = await sendTransaction(config, {
      account: address,
      chainId: arcTestnet.id,
      to: MULTICALL3_FROM_ADDRESS,
      data: encodeAggregate3(calls),
    });
    const receipt = await waitForTransactionReceipt(config, { hash });
    if (receipt.status !== "success") throw new Error(`${tokenSymbol} -> USDC swap reverted on-chain`);
  }

  async function handleSell() {
    if (!address || (eurcBal === 0n && cirbtcBal === 0n) || busy) return;
    setError(null);
    // Worth saying plainly rather than letting the wallet throw: on Arc the gas
    // token IS USDC, so a wallet holding EURC/cirBTC but no USDC can't pay for
    // the swap that would get it any. A fresh Privy embedded wallet lands here.
    if (usdcBal === 0n) {
      setError("This wallet has no USDC, and USDC is the gas token on Arc — faucet some first, then sell.");
      return;
    }
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

  if (showSellBanner) {
    const text =
      status === "eurc"
        ? "Selling EURC..."
        : status === "cirbtc"
          ? "Selling cirBTC..."
          : "Click here to sell EURC and cirBTC to USDC";
    return (
      <div style={{ position: "relative", height: "100%" }}>
        <AnnouncementBanner text={text} onClick={handleSell} status={status !== "idle"} />
        {error && (
          <div
            className="prose"
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              marginTop: 6,
              background: "#7f1d1d",
              color: "#fecaca",
              border: "1px solid #b91c1c",
              fontSize: "var(--fs-1)",
              lineHeight: 1.45,
              padding: "8px 12px",
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
      lead="If you faucet EURC & cirBTC too, I can help turn them into USDC."
      text="Tap here to faucet."
      href="https://faucet.circle.com"
      onClick={() => {
        if (address) navigator.clipboard.writeText(address);
      }}
    />
  );
}
