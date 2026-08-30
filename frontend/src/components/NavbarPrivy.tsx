import { usePrivy } from "@privy-io/react-auth";
import { useAccount } from "wagmi";
import { WalletAddressDisplay } from "./WalletAddressDisplay";
import type { WalletMenuActions } from "./Navbar";

export function NavbarPrivy(actions: WalletMenuActions) {
  const { ready, authenticated, login, logout } = usePrivy();
  const { address } = useAccount();

  if (ready && authenticated && address) {
    return <WalletAddressDisplay address={address} {...actions} onDisconnect={logout} />;
  }

  return (
    <button
      onClick={login}
      disabled={!ready}
      style={{
        background: "var(--color-primary)",
        color: "#04170e",
        borderRadius: 999,
        padding: "8px 18px",
        fontSize: "var(--fs-1)",
        fontWeight: 700,
      }}
    >
      Connect Wallet
    </button>
  );
}
