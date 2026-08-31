// Cloudflare Pages Function. Serves a wallet's referral summary (who they
// referred, how much each one earned them, total lifetime) straight out of
// D1 (binding HISTORY_DB, see wrangler.toml) - see
// automation/src/indexHistory.ts for how the referrals/referral_earnings
// tables are kept populated.
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
    const w = wallet.toLowerCase();

    const { results: referred } = await db
      .prepare(
        `SELECT r.referred AS wallet, r.timestamp,
                COALESCE((SELECT SUM(CAST(e.amount AS INTEGER)) FROM referral_earnings e
                          WHERE e.referrer = r.referrer AND e.referred = r.referred), 0) AS earned
         FROM referrals r
         WHERE r.referrer = ?1
         ORDER BY r.timestamp DESC`,
      )
      .bind(w)
      .all();

    const { results: totalRows } = await db
      .prepare("SELECT COALESCE(SUM(CAST(amount AS INTEGER)), 0) AS total FROM referral_earnings WHERE referrer = ?1")
      .bind(w)
      .all();

    return new Response(
      JSON.stringify({
        referredCount: referred.length,
        totalEarned: String(totalRows[0]?.total ?? 0),
        referred: referred.map((r) => ({ wallet: r.wallet, earned: String(r.earned) })),
      }),
      { headers: JSON_HEADERS },
    );
  } catch (e) {
    return err(`unhandled: ${e.message}`);
  }
}
