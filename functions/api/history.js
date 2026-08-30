// Cloudflare Pages Function. Serves a wallet's Deposited/Withdrawn/Claimed
// history straight out of D1 (binding HISTORY_DB, see wrangler.toml) instead
// of the frontend scanning eth_getLogs itself - see automation/src/indexHistory.ts
// for what keeps this table populated and why that moved off the client.
const JSON_HEADERS = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };
const err = (msg, status = 500) => new Response(JSON.stringify({ error: msg }), { status, headers: JSON_HEADERS });

export async function onRequestGet(ctx) {
  try {
    const db = ctx.env.HISTORY_DB;
    if (!db) return err("HISTORY_DB not configured");

    const wallet = new URL(ctx.request.url).searchParams.get("wallet");
    if (!wallet || !/^0x[0-9a-fA-F]{40}$/.test(wallet)) {
      return err("missing or malformed ?wallet=0x... query param", 400);
    }

    const { results } = await db
      .prepare("SELECT type, amount, block_number, timestamp FROM history WHERE wallet = ?1 ORDER BY block_number DESC")
      .bind(wallet.toLowerCase())
      .all();

    return new Response(JSON.stringify(results), { headers: JSON_HEADERS });
  } catch (e) {
    return err(`unhandled: ${e.message}`);
  }
}
