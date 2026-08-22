import { useEffect, useState } from "react";
import { formatCountdown } from "../lib/format";
import type { EpochData } from "../hooks/usePoolData";

export function EpochCard({ epochId, epoch }: { epochId: bigint | undefined; epoch: EpochData | undefined }) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  const secondsRemaining = epoch ? Number(epoch.endTime) - now : 0;
  const idLabel = epochId !== undefined ? `#${epochId.toString().padStart(4, "0")}` : "#----";
  const numWinners = epoch && epoch.numWinners > 0n ? epoch.numWinners.toString() : "N";

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%" }}>
      <div style={{ fontSize: "var(--fs-4)", fontWeight: 700 }}>
        <span style={{ color: "var(--color-primary)" }}>EPOCH {idLabel}</span>{" "}
        <span style={{ color: "var(--color-text-secondary)", fontWeight: 400 }}>end in</span>
      </div>

      <div style={{ fontSize: "var(--fs-1)", fontWeight: 700, fontFamily: "'Roboto Condensed', sans-serif" }}>
        {formatCountdown(secondsRemaining)}
      </div>

      <div style={{ fontSize: "var(--fs-5)", color: "var(--color-text-secondary)", lineHeight: 1.4 }}>
        The pool gets placed into trusted DeFi protocol, weekly yield gets raffled off among{" "}
        <strong style={{ color: "var(--color-text)" }}>{numWinners}</strong> people who kept their funds deposited
        for the full week.
        <br />
        TLDR: <strong style={{ color: "var(--color-text)" }}>1 dollar = 1 ticket</strong>.
      </div>
    </div>
  );
}
