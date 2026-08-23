import { USE_PRIVY } from "../config/authMode";
import { NavbarInjected } from "./NavbarInjected";
import { NavbarPrivy } from "./NavbarPrivy";

export function Navbar() {
  return (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: "100%",
        padding: "0 4px 10px",
        borderBottom: "1px solid #000000",
      }}
    >
      <span style={{ fontSize: "var(--fs-3)", fontWeight: 700, color: "var(--color-primary)" }}>LuckyStaker</span>
      {USE_PRIVY ? <NavbarPrivy /> : <NavbarInjected />}
    </nav>
  );
}
