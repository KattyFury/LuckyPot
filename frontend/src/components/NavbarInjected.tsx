import { useAccount, useConnect, useDisconnect } from "wagmi";
import { arcTestnet } from "../chains/arcTestnet";
import { WalletAddressDisplay } from "./WalletAddressDisplay";
import type { WalletMenuActions } from "./Navbar";

export function NavbarInjected(actions: WalletMenuActions) {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return <WalletAddressDisplay address={address} {...actions} onDisconnect={disconnect} />;
  }

  return (
    <button
      onClick={() => connectors[0] && connect({ connector: connectors[0], chainId: arcTestnet.id })}
      disabled={isPending || connectors.length === 0}
      style={{
        background: "var(--color-primary)",
        color: "#04170e",
        borderRadius: 999,
        padding: "8px 18px",
        fontSize: "var(--fs-1)",
        fontWeight: 700,
      }}
    >
      {isPending ? "Connecting..." : "Connect Wallet"}
    </button>
  );
}
