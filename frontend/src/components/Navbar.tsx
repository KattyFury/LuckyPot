import { USE_PRIVY } from "../config/authMode";
import { NavbarInjected } from "./NavbarInjected";
import { NavbarPrivy } from "./NavbarPrivy";
import logoUrl from "../assets/logo-full-dark.svg";

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
        background: "var(--color-surface)",
        /* Drawn as a shadow, not a border: a border would sit inside the
           box and shift the vertically centred content up by half a pixel. */
        boxShadow: "0 1px 0 var(--color-line)",
      }}
    >
      {/* One drawn lockup, mark and wordmark together, as supplied. It's
          vector so it stays sharp at any size; height is set on the pot, and
          the lettering sits at roughly half that by construction. The white
          wordmark variant is the one that belongs on this surface. */}
      <a href="https://luckypot.cc/" className="brand">
        <img src={logoUrl} alt="LuckyPot" className="brand__lockup" />
      </a>
      {USE_PRIVY ? <NavbarPrivy {...actions} /> : <NavbarInjected {...actions} />}
    </nav>
  );
}
