import { useEffect, useRef, useState } from "react";
import { shortAddress } from "../lib/format";

export function WalletAddressDisplay({
  address,
  onDeposit,
  onWithdraw,
  onDrawHistory,
  onMyHistory,
  onMyReferral,
  onDisconnect,
}: {
  address: `0x${string}`;
  onDeposit: () => void;
  onWithdraw: () => void;
  onDrawHistory: () => void;
  onMyHistory: () => void;
  onMyReferral: () => void;
  onDisconnect: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
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
      {/* An outlined pill rather than bare text: on the dark surface a plain
          run of text in the nav had nothing holding it, and the pill also
          gives the connected-dot somewhere to live. */}
      <button className="wallet-pill" onClick={() => setOpen((v) => !v)}>
        <span
          aria-hidden="true"
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: "var(--color-primary)",
            display: "block",
            flex: "none",
          }}
        />
        <span className="num">{shortAddress(address)}</span>
        <span
          className={copied ? "icon icon-check" : "icon icon-copy"}
          title="Copy address"
          onClick={(e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(address);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          style={{ color: copied ? "var(--color-primary)" : "var(--color-text-faint)" }}
        />
      </button>

      {open && (
        <div className="wallet-menu">
          <button onClick={() => pick(onDeposit)}>Deposit</button>
          <button onClick={() => pick(onWithdraw)}>Withdraw</button>
          <button onClick={() => pick(onDrawHistory)}>Draw history</button>
          <button onClick={() => pick(onMyHistory)}>My history</button>
          <button onClick={() => pick(onMyReferral)}>My referral</button>
          <button className="is-danger" onClick={() => pick(onDisconnect)}>
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
