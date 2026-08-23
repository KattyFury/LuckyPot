import { useAccount, useConnect, useDisconnect } from "wagmi";
import { arcTestnet } from "../chains/arcTestnet";
import { WalletAddressDisplay } from "./WalletAddressDisplay";

export function NavbarInjected({
  onDeposit,
  onWithdraw,
}: {
  onDeposit: () => void;
  onWithdraw: () => void;
}) {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <WalletAddressDisplay
        address={address}
        onDeposit={onDeposit}
        onWithdraw={onWithdraw}
        onDisconnect={disconnect}
      />
    );
  }

  return (
    <button
      onClick={() => connectors[0] && connect({ connector: connectors[0], chainId: arcTestnet.id })}
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
