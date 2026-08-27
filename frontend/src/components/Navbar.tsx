import { USE_PRIVY } from "../config/authMode";
import { NavbarInjected } from "./NavbarInjected";
import { NavbarPrivy } from "./NavbarPrivy";
import logoFullUrl from "../assets/logo-full.svg";

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
        // Needed now that .g-navbar is sticky: without it, cards scrolling up
        // underneath would show through the nav's own row instead of being
        // covered by it. (A negative margin to make the line/background reach
        // .app-shell's true edges was tried and reverted - it overflowed the
        // grid horizontally, since overflow-x:hidden to contain it would have
        // broken position:sticky on an ancestor.)
        background: "#ffffff",
        /* Drawn as a shadow, not a border: a border would sit inside the
           box and shift the vertically centred content up by half a pixel. */
        boxShadow: "0 1px 0 #000000",
      }}
    >
      <a href="https://luckypot.cc/" style={{ display: "flex", alignItems: "center" }}>
        <img src={logoFullUrl} alt="LuckyPot" style={{ height: 28, width: "auto" }} />
      </a>
      {USE_PRIVY ? <NavbarPrivy {...actions} /> : <NavbarInjected {...actions} />}
    </nav>
  );
}
