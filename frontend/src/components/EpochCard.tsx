import { useEffect, useState } from "react";
import { formatCountdown } from "../lib/format";
import { TokenToggle } from "./TokenToggle";
import type { EpochData } from "../hooks/usePoolData";

export function EpochCard({
  epochId,
  epoch,
  numWinnersEstimate,
}: {
  epochId: bigint | undefined;
  epoch: EpochData | undefined;
  numWinnersEstimate: bigint;
}) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  const secondsRemaining = epoch ? Number(epoch.endTime) - now : 0;
  const idLabel = epochId !== undefined ? `#${epochId.toString().padStart(2, "0")}` : "#--";

  return (
    <div className="card card-rows card-rows--epoch">
      <div
        className="box-header box-header--inline"
        style={{ fontSize: "var(--fs-4)", fontWeight: 700, justifyContent: "space-between" }}
      >
        <span style={{ color: "var(--color-primary)" }}>EPOCH {idLabel}</span>
        <TokenToggle />
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 8,
          fontFamily: "var(--font-condensed)",
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ fontSize: "var(--fs-4)", color: "var(--color-text-secondary)" }}>end in</span>
        {/* Tightened word spacing so the d/h/m/s groups sit closer together. */}
        <span style={{ fontSize: "var(--fs-3)", fontWeight: 700, wordSpacing: "-3px" }}>
          {formatCountdown(secondsRemaining)}
        </span>
      </div>

      <div
        style={{
          fontSize: "var(--fs-caption)",
          color: "var(--color-text-secondary)",
          lineHeight: 1.4,
          fontFamily: "var(--font-condensed)",
        }}
      >
        Weekly yield gets raffled off among{" "}
        <strong style={{ color: "var(--color-text)" }}>{numWinnersEstimate.toString()}</strong>{" "}
        {numWinnersEstimate === 1n ? "person" : "people"}, 1 dollar = 1 ticket.
      </div>
    </div>
  );
}
