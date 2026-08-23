import { shortAddress } from "../lib/format";

export function WalletAddressDisplay({ address }: { address: `0x${string}` }) {
  function handleCopy() {
    navigator.clipboard.writeText(address);
  }

  return (
    <button
      onClick={handleCopy}
      title="Copy address"
      style={{ background: "none", display: "flex", alignItems: "center", gap: 8, fontSize: "var(--fs-5)" }}
    >
      <span style={{ fontWeight: 700, color: "var(--color-text)" }}>{shortAddress(address)}</span>
      <span className="icon icon-copy" style={{ color: "var(--color-text-secondary)" }} />
    </button>
  );
}
