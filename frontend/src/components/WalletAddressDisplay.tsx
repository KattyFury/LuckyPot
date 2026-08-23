import { useEffect, useRef, useState } from "react";
import { shortAddress } from "../lib/format";

export function WalletAddressDisplay({
  address,
  onDeposit,
  onWithdraw,
  onDisconnect,
}: {
  address: `0x${string}`;
  onDeposit: () => void;
  onWithdraw: () => void;
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

  function handleCopy() {
    navigator.clipboard.writeText(address);
  }

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
            handleCopy();
          }}
          style={{ color: "var(--color-text-secondary)" }}
        />
      </button>

      {open && (
        <div
          className="card"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            background: "#ffffff",
            padding: 8,
            minWidth: 160,
            zIndex: 50,
            boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
          }}
        >
          <DropdownItem label="Deposit" onClick={() => pick(onDeposit)} />
          <DropdownItem label="Withdraw" onClick={() => pick(onWithdraw)} />
          <DropdownItem label="Disconnect" onClick={() => pick(onDisconnect)} />
        </div>
      )}
    </div>
  );
}

function DropdownItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "none",
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: "10px 12px",
        fontSize: "var(--fs-5)",
        fontWeight: 700,
        borderRadius: 8,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-card-bg)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
    >
      {label}
    </button>
  );
}
