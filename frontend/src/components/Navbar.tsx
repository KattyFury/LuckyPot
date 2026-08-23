import { USE_PRIVY } from "../config/authMode";
import { NavbarInjected } from "./NavbarInjected";
import { NavbarPrivy } from "./NavbarPrivy";

export type WalletMenuActions = {
  onDeposit: () => void;
  onWithdraw: () => void;
  onDrawHistory: () => void;
  onMyHistory: () => void;
};

export function Navbar(actions: WalletMenuActions) {
  return (
    <nav
      style={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 4px",
        /* Drawn as a shadow, not a border: a border would sit inside the
           box and shift the vertically centred content up by half a pixel. */
        boxShadow: "0 1px 0 #000000",
      }}
    >
      <span style={{ fontSize: "var(--fs-3)", fontWeight: 700, color: "var(--color-primary)" }}>LuckyStaker</span>
      {USE_PRIVY ? <NavbarPrivy {...actions} /> : <NavbarInjected {...actions} />}
    </nav>
  );
}
