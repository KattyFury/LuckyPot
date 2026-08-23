import { formatUSDC } from "../lib/format";
import type { EpochData } from "../hooks/usePoolData";

export function DrawHistoryCard({
  epochs,
  onSelect,
}: {
  epochs: { id: bigint; epoch: EpochData }[];
  onSelect: (id: bigint, epoch: EpochData) => void;
}) {
  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", height: 340, overflow: "hidden" }}>
      <div style={{ fontSize: "var(--fs-4)", fontWeight: 700, color: "var(--color-primary)", marginBottom: 12 }}>
        DRAW HISTORY
      </div>

      <div className="scroll-panel" style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
        {epochs.length === 0 ? (
          <div style={{ fontSize: "var(--fs-5)", color: "var(--color-text-secondary)" }}>No draws yet.</div>
        ) : (
          epochs.map(({ id, epoch }) => (
            <button
              key={id.toString()}
              onClick={() => onSelect(id, epoch)}
              style={{
                background: "none",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                textAlign: "left",
              }}
            >
              <span style={{ fontSize: "var(--fs-3)", fontWeight: 700 }}>Epoch #{id.toString().padStart(4, "0")}</span>
              <span style={{ fontSize: "var(--fs-4)", fontWeight: 700 }}>
                ${formatUSDC(epoch.eligiblePoolSnapshot)}
                <span style={{ fontSize: "var(--fs-5)", fontWeight: 400, color: "var(--color-text-secondary)" }}>
                  /{epoch.eligibleParticipants.toString()} depositors
                </span>
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
