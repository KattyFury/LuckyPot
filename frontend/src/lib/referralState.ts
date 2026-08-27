/** Remembers a `?ref=0x...` link until it's bundled into the wearer's first
 *  deposit (see Deposit.tsx) — captured on load since the wallet often isn't
 *  connected yet when the link is first opened. */
const STORAGE_KEY = "luckypot:pendingReferrer";

export function captureReferrerFromUrl(): void {
  try {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref && /^0x[a-fA-F0-9]{40}$/.test(ref)) {
      localStorage.setItem(STORAGE_KEY, ref);
    }
  } catch {
    /* private mode / storage blocked — referral link just won't stick */
  }
}

export function getPendingReferrer(): `0x${string}` | null {
  try {
    return localStorage.getItem(STORAGE_KEY) as `0x${string}` | null;
  } catch {
    return null;
  }
}

export function clearPendingReferrer(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
