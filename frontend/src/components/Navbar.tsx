import { useAccount, useConnect } from "wagmi";
import { shortAddress } from "../lib/format";

export function Navbar() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();

  function handleCopy() {
    if (address) navigator.clipboard.writeText(address);
  }

  return (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: "100%",
        padding: "0 4px 10px",
        borderBottom: "1px solid #000000",
      }}
    >
      <span style={{ fontSize: "var(--fs-3)", fontWeight: 700, color: "var(--color-primary)" }}>LuckyStacker</span>

      {isConnected && address ? (
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
      ) : (
        <button
          onClick={() => connectors[0] && connect({ connector: connectors[0] })}
          disabled={isPending || connectors.length === 0}
          style={{
            background: "#000000",
            color: "#ffffff",
            borderRadius: 999,
            padding: "8px 20px",
            fontSize: "var(--fs-5)",
            fontWeight: 700,
          }}
        >
          {isPending ? "Connecting..." : "Connect Wallet"}
        </button>
      )}
    </nav>
  );
}
