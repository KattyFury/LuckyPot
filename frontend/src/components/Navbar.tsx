import { USE_PRIVY } from "../config/authMode";
import { NavbarInjected } from "./NavbarInjected";
import { NavbarPrivy } from "./NavbarPrivy";

export function Navbar({
  onDeposit,
  onWithdraw,
}: {
  onDeposit: () => void;
  onWithdraw: () => void;
}) {
  return (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "4px 4px 14px",
        borderBottom: "1px solid #000000",
      }}
    >
      <span style={{ fontSize: "var(--fs-3)", fontWeight: 700, color: "var(--color-primary)" }}>LuckyStaker</span>
      {USE_PRIVY ? (
        <NavbarPrivy onDeposit={onDeposit} onWithdraw={onWithdraw} />
      ) : (
        <NavbarInjected onDeposit={onDeposit} onWithdraw={onWithdraw} />
      )}
    </nav>
  );
}
