import { formatUSDC } from "../lib/format";
import type { HistoryEntry } from "../hooks/useMyHistory";

function formatDate(timestamp: number): string {
  if (!timestamp) return "";
  return new Date(timestamp * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function MyHistoryCard({ entries, connected }: { entries: HistoryEntry[]; connected: boolean }) {
  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", height: 340, overflow: "hidden" }}>
      <div style={{ fontSize: "var(--fs-4)", fontWeight: 400, color: "var(--color-primary)", marginBottom: 12 }}>
        MY HISTORY
      </div>

      <div
        className="scroll-panel"
        style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, fontFamily: "var(--font-condensed)" }}
      >
        {!connected ? (
          <div style={{ fontSize: "var(--fs-5)", color: "var(--color-text-secondary)" }}>
            Connect your wallet to see your history.
          </div>
        ) : entries.length === 0 ? (
          <div style={{ fontSize: "var(--fs-5)", color: "var(--color-text-secondary)" }}>No activity yet.</div>
        ) : (
          entries.map((entry, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--fs-5)" }}>
              <span style={{ color: "var(--color-text-secondary)" }}>{formatDate(entry.timestamp)}</span>
              <span style={{ fontWeight: 700 }}>{entry.type}</span>
              <span style={{ fontWeight: 700, color: entry.type === "Won" ? "var(--color-primary)" : undefined }}>
                ${formatUSDC(entry.amount)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
