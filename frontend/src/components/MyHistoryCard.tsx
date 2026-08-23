import { formatUSDC } from "../lib/format";
import type { HistoryEntry } from "../hooks/useMyHistory";

function formatDate(timestamp: number): string {
  if (!timestamp) return "";
  return new Date(timestamp * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function MyHistoryList({ entries, connected }: { entries: HistoryEntry[]; connected: boolean }) {
  if (!connected) {
    return (
      <div style={{ fontSize: "var(--fs-5)", color: "var(--color-text-secondary)" }}>
        Connect your wallet to see your history.
      </div>
    );
  }
  if (entries.length === 0) {
    return <div style={{ fontSize: "var(--fs-5)", color: "var(--color-text-secondary)" }}>No activity yet.</div>;
  }

  return (
    <>
      {entries.map((entry, i) => (
        <div key={i} className="card-list__row" style={{ fontSize: "var(--fs-5)" }}>
          <span style={{ color: "var(--color-text-secondary)" }}>{formatDate(entry.timestamp)}</span>
          <span style={{ fontWeight: 700 }}>{entry.type}</span>
          <span style={{ fontWeight: 700, color: entry.type === "Won" ? "var(--color-primary)" : undefined }}>
            ${formatUSDC(entry.amount)}
          </span>
        </div>
      ))}
    </>
  );
}

export function MyHistoryCard({ entries, connected }: { entries: HistoryEntry[]; connected: boolean }) {
  return (
    <div className="card card-list">
      <div className="card-list__header">MY HISTORY</div>
      <div className="card-list__body scroll-panel">
        <MyHistoryList entries={entries} connected={connected} />
      </div>
    </div>
  );
}
