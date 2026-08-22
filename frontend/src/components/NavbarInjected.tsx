import { useAccount, useConnect } from "wagmi";
import { WalletAddressDisplay } from "./WalletAddressDisplay";

export function NavbarInjected() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();

  if (isConnected && address) {
    return <WalletAddressDisplay address={address} />;
  }

  return (
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
  );
}
