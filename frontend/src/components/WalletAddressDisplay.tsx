import { shortAddress } from "../lib/format";

export function WalletAddressDisplay({ address }: { address: `0x${string}` }) {
  function handleCopy() {
    navigator.clipboard.writeText(address);
  }

  return (
    <button
      onClick={handleCopy}
      style={{ background: "none", display: "flex", alignItems: "center", gap: 6, fontSize: "var(--fs-5)" }}
    >
      <span style={{ fontWeight: 700, color: "var(--color-text)" }}>{shortAddress(address)}</span>
      <span style={{ color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
        copy
        <span className="icon icon-copy" style={{ color: "var(--color-text-secondary)" }} />
      </span>
    </button>
  );
}
