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
      {/* The mark is the artwork as drawn; "LuckyPot" beside it is live type
          in the app's display face, which is why there's no logo-full.svg
          any more — a baked-in wordmark can't pick up the type scale and
          goes soft the moment it's rescaled. */}
      <a href="https://luckypot.cc/" className="brand">
        <img src={logoUrl} alt="" className="brand__mark" />
        <span className="brand__word">LuckyPot</span>
      </a>
      {USE_PRIVY ? <NavbarPrivy {...actions} /> : <NavbarInjected {...actions} />}
    </nav>
  );
}
