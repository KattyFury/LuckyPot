import { POOL_ADDRESS } from "./contract";

/** Remembers the secret behind a manual commitRandom() call from the admin
 *  page, so the same browser can reveal it later without re-deriving it —
 *  there is no on-chain or admin escape hatch if it's lost (see
 *  LuckyStakerPool.sol's commit-reveal design), so this is the only copy. */
function key(epochId: bigint) {
  return `luckypot:commitSecret:${POOL_ADDRESS.toLowerCase()}:${epochId}`;
}

export function saveCommitSecret(epochId: bigint, secret: bigint): void {
  try {
    localStorage.setItem(key(epochId), secret.toString());
  } catch {
    /* private mode / storage blocked — the admin will need the secret from elsewhere */
  }
}

export function loadCommitSecret(epochId: bigint): bigint | null {
  try {
    const raw = localStorage.getItem(key(epochId));
    return raw === null ? null : BigInt(raw);
  } catch {
    return null;
  }
}
