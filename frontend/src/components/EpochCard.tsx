import { useEffect, useState } from "react";
import { formatCountdown } from "../lib/format";
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
  const idLabel = epochId !== undefined ? `#${epochId.toString().padStart(4, "0")}` : "#----";

  return (
    <div className="card card-rows">
      <div style={{ fontSize: "var(--fs-4)", fontWeight: 400 }}>
        <span style={{ color: "var(--color-primary)" }}>EPOCH {idLabel}</span>{" "}
        <span style={{ color: "var(--color-text-secondary)" }}>end in</span>
      </div>

      <div style={{ fontSize: "var(--fs-1)", fontWeight: 700, fontFamily: "var(--font-condensed)" }}>
        {formatCountdown(secondsRemaining)}
      </div>

      <div
        style={{
          fontSize: "var(--fs-4)",
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
