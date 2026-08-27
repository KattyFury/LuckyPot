// Shared by functions/api/swap.js — one place for the part where money gets lost.
//
// THE CORRECT WAY to call swap (proven in the EZwallet project — see its
// functions/api/_swapCore.js for the full dissection of @circle-fin/adapter-viem-v2 +
// provider-stablecoin-service-swap):
//   POST /v1/stablecoinKits/swap returns a SIGNED INTENT (transaction.executionParams +
//   .signature). The frontend submits it itself via the connected wallet — batched
//   [approve(tokenIn->ADAPTER), ADAPTER.execute(...)] through Multicall3From, 1 signature.
//   KIT_KEY never leaves this function; the wallet's own signature is what moves funds.
export const CIRCLE_API = "https://api.circle.com";

// Same predeploy addresses as EZwallet uses on Arc Testnet (kitContracts.adapter).
export const ADAPTER = "0xBBD70b01a1CAbc96d5b7b129Ae1AAabdf50dd40b";

export const TOKEN_ADDR = {
  USDC: "0x3600000000000000000000000000000000000000",
  EURC: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a",
  cirBTC: "0xf0c4a4ce82a5746abaad9425360ab04fbba432bf",
};

export async function fetchSwapIntent(kitKey, fromAddr, toAddr, walletAddress, amountBase) {
  const res = await fetch(`${CIRCLE_API}/v1/stablecoinKits/swap`, {
    method: "POST",
    headers: { Authorization: `Bearer ${kitKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      tokenInAddress: fromAddr,
      tokenInChain: "Arc_Testnet",
      tokenOutAddress: toAddr,
      tokenOutChain: "Arc_Testnet",
      fromAddress: walletAddress,
      toAddress: walletAddress,
      amount: amountBase.toString(),
      slippageBps: 300,
    }),
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}
