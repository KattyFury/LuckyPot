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
        // Breaks out of the grid's 20px side padding so the separator line and
        // background reach the app-shell's true edges while sticky; the padding
        // here (20px + the original 4px) puts the logo/wallet button back where
        // they'd sit without the negative margin.
        margin: "0 -20px",
        padding: "0 24px",
        background: "#ffffff",
        /* Drawn as a shadow, not a border: a border would sit inside the
           box and shift the vertically centred content up by half a pixel. */
        boxShadow: "0 1px 0 #000000",
      }}
    >
      <a
        href="https://luckypot.cc/"
        style={{ display: "flex", alignItems: "center", gap: 6, textDecoration: "none" }}
      >
        <img src={logoUrl} alt="" style={{ height: 24, width: 24 }} />
        <span style={{ fontSize: "var(--fs-4)", fontWeight: 700, color: "var(--color-primary)" }}>LuckyPot</span>
      </a>
      {USE_PRIVY ? <NavbarPrivy {...actions} /> : <NavbarInjected {...actions} />}
    </nav>
  );
}
