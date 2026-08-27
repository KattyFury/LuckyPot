// Cloudflare Pages Function. Proxies the Circle Stablecoin Kit swap intent so KIT_KEY
// stays server-side — see ./_swapCore.js for why this shape and not hand-executing.
// The frontend does the rest (build the approve+execute batch, send via its own wallet).
import { TOKEN_ADDR, fetchSwapIntent } from "./_swapCore.js";

const JSON_HEADERS = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };
const err = (msg, detail, status = 500) =>
  new Response(JSON.stringify({ error: msg, detail }), { status, headers: JSON_HEADERS });

export async function onRequestPost(ctx) {
  try {
    const kitKey = ctx.env.KIT_KEY;
    if (!kitKey) return err("KIT_KEY not configured");

    const { tokenIn, tokenOut, walletAddress, amountBase } = await ctx.request.json();
    const fromAddr = TOKEN_ADDR[tokenIn];
    const toAddr = TOKEN_ADDR[tokenOut];
    if (!fromAddr || !toAddr || !walletAddress || !amountBase) {
      return err("missing or unknown tokenIn/tokenOut/walletAddress/amountBase", null, 400);
    }

    const intent = await fetchSwapIntent(kitKey, fromAddr, toAddr, walletAddress, BigInt(amountBase));
    if (!intent.ok) {
      return err(`Stablecoin Kit ${intent.status}: ${intent.data?.message || "swap failed"}`, intent.data);
    }
    return new Response(JSON.stringify(intent.data), { headers: JSON_HEADERS });
  } catch (e) {
    return err("unhandled", { message: e.message });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
