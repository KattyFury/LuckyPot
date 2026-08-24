/** Remembers that a wallet already scratched a given epoch, so the card is
 *  only ever scratched once — reopening the result just shows it. */
function key(epochId: bigint, address: string) {
  return `stableluck:scratched:${address.toLowerCase()}:${epochId}`;
}

export function wasScratched(epochId: bigint, address: string): boolean {
  try {
    return localStorage.getItem(key(epochId, address)) === "1";
  } catch {
    return false;
  }
}

export function rememberScratched(epochId: bigint, address: string): void {
  try {
    localStorage.setItem(key(epochId, address), "1");
  } catch {
    /* private mode / storage blocked — the card just scratches again */
  }
}
