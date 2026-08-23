import { useEffect, useRef, useState } from "react";
import { shortAddress } from "../lib/format";

export function WalletAddressDisplay({
  address,
  onDeposit,
  onWithdraw,
  onDrawHistory,
  onMyHistory,
  onDisconnect,
}: {
  address: `0x${string}`;
  onDeposit: () => void;
  onWithdraw: () => void;
  onDrawHistory: () => void;
  onMyHistory: () => void;
  onDisconnect: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function pick(action: () => void) {
    setOpen(false);
    action();
  }

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ background: "none", display: "flex", alignItems: "center", gap: 8, fontSize: "var(--fs-5)" }}
      >
        <span style={{ fontWeight: 700, color: "var(--color-text)" }}>{shortAddress(address)}</span>
        <span
          className="icon icon-copy"
          title="Copy address"
          onClick={(e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(address);
          }}
          style={{ color: "var(--color-text-secondary)" }}
        />
      </button>

      {open && (
        <div className="wallet-menu">
          <button onClick={() => pick(onDeposit)}>Deposit</button>
          <button onClick={() => pick(onWithdraw)}>Withdraw</button>
          <button onClick={() => pick(onDrawHistory)}>DRAW HISTORY</button>
          <button onClick={() => pick(onMyHistory)}>MY HISTORY</button>
          <button className="is-danger" onClick={() => pick(onDisconnect)}>
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
