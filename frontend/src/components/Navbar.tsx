import { USE_PRIVY } from "../config/authMode";
import { NavbarInjected } from "./NavbarInjected";
import { NavbarPrivy } from "./NavbarPrivy";
import logoUrl from "../assets/logo.svg";

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
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <img src={logoUrl} alt="" style={{ height: 24, width: 24 }} />
        <span style={{ fontSize: "var(--fs-4)", fontWeight: 700, color: "var(--color-primary)" }}>LuckyPot</span>
      </span>
      {USE_PRIVY ? <NavbarPrivy {...actions} /> : <NavbarInjected {...actions} />}
    </nav>
  );
}
