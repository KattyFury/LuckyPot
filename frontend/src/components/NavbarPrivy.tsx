import { usePrivy } from "@privy-io/react-auth";
import { useAccount } from "wagmi";
import { WalletAddressDisplay } from "./WalletAddressDisplay";

export function NavbarPrivy({
  onDeposit,
  onWithdraw,
}: {
  onDeposit: () => void;
  onWithdraw: () => void;
}) {
  const { ready, authenticated, login, logout } = usePrivy();
  const { address } = useAccount();

  if (ready && authenticated && address) {
    return (
      <WalletAddressDisplay address={address} onDeposit={onDeposit} onWithdraw={onWithdraw} onDisconnect={logout} />
    );
  }

  return (
    <button
      onClick={login}
      disabled={!ready}
      style={{
        background: "#000000",
        color: "#ffffff",
        borderRadius: 999,
        padding: "8px 20px",
        fontSize: "var(--fs-5)",
        fontWeight: 700,
      }}
    >
      Connect Wallet
    </button>
  );
}
