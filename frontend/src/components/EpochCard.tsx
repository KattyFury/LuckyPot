import { useEffect, useState } from "react";
import { formatCountdown, plural } from "../lib/format";
import { TokenToggle } from "./TokenToggle";
import type { EpochData } from "../hooks/usePoolData";

export function EpochCard({
  epochId,
  epoch,
  numWinnersEstimate,
  participantCount,
}: {
  epochId: bigint | undefined;
  epoch: EpochData | undefined;
  numWinnersEstimate: bigint;
  participantCount: number;
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
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "var(--fs-2)",
          fontWeight: 700,
          letterSpacing: "-0.01em",
          justifyContent: "space-between",
        }}
      >
        <span className="pair">
          Epoch <span style={{ color: "var(--color-primary)" }}>{idLabel}</span>
        </span>
        <TokenToggle />
      </div>

      {/* "Draw in" sits above the clock rather than beside it: at 430px the
          inline pair was the widest thing in the column. */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        <span className="eyebrow">Draw in</span>
        <span
          className="num pair"
          style={{ fontSize: "var(--fs-3)", fontWeight: 700, color: "var(--color-primary)" }}
        >
          {formatCountdown(secondsRemaining)}
        </span>
      </div>

      <div
        className="prose"
        style={{ fontSize: "var(--fs-1)", color: "var(--color-text-secondary)", lineHeight: 1.55 }}
      >
        This week&rsquo;s yield goes to{" "}
        <strong style={{ color: "var(--color-text)", fontWeight: 600 }}>{numWinnersEstimate.toString()}</strong>{" "}
        {plural(numWinnersEstimate, "winner")} out of{" "}
        <strong style={{ color: "var(--color-text)", fontWeight: 600 }}>
          {participantCount.toLocaleString("en-US")}
        </strong>{" "}
        {plural(participantCount, "player")}. Winners return 5% to the protocol.
      </div>
    </div>
  );
}
