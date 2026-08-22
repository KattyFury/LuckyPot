import { formatUSDC, shortAddress } from "../lib/format";
import { prizeForRank } from "../lib/prize";
import type { EpochData } from "../hooks/usePoolData";

export function EpochDetailModal({
  epochId,
  epoch,
  onClose,
}: {
  epochId: bigint;
  epoch: EpochData;
  onClose: () => void;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card"
        style={{
          width: "min(75vw, 800px)",
          maxHeight: "80vh",
          overflowY: "auto",
          background: "#ffffff",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "var(--fs-3)", fontWeight: 700, color: "var(--color-primary)" }}>
            Epoch #{epochId.toString().padStart(4, "0")}
          </span>
          <button onClick={onClose} style={{ background: "none", fontSize: "var(--fs-4)" }}>
            ✕
          </button>
        </div>

        <div style={{ fontSize: "var(--fs-5)", color: "var(--color-text-secondary)" }}>
          Eligible pool:{" "}
          <strong style={{ color: "var(--color-text)" }}>
            ${formatUSDC(epoch.eligiblePoolSnapshot)}/{epoch.eligibleParticipants.toString()} depositors
          </strong>{" "}
          &nbsp;·&nbsp; Weekly yield:{" "}
          <strong style={{ color: "var(--color-text)" }}>${formatUSDC(epoch.weeklyYield)}</strong> &nbsp;·&nbsp;
          Winners: <strong style={{ color: "var(--color-text)" }}>{epoch.numWinners.toString()}</strong>
        </div>

        {epoch.winners.length === 0 ? (
          <div style={{ fontSize: "var(--fs-5)", color: "var(--color-text-secondary)" }}>
            No winners this epoch — not enough participants or yield funded yet.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {epoch.winners.map((winner, i) => (
              <div
                key={`${winner}-${i}`}
                style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--fs-5)" }}
              >
                <span>
                  <span style={{ color: "var(--color-text-secondary)" }}>#{i + 1}</span> {shortAddress(winner)}
                </span>
                <span style={{ fontWeight: 700 }}>${formatUSDC(prizeForRank(i, epoch.numWinners, epoch.weeklyYield))}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
