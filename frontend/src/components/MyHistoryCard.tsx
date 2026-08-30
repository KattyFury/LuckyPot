import { plural } from "../lib/format";
import { useAmount } from "../config/tokenUnit";
import type { HistoryEntry } from "../hooks/useMyHistory";

/** Short form on purpose: the row is one --row-h tall now, and the year adds
 *  nothing next to an epoch history that only runs weeks back. */
function formatDate(timestamp: number): string {
  if (!timestamp) return "";
  return new Date(timestamp * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function MyHistoryList({ entries, connected }: { entries: HistoryEntry[]; connected: boolean }) {
  const amount = useAmount();

  if (!connected) {
    return (
      <div style={{ fontSize: "var(--fs-1)", color: "var(--color-text-secondary)" }}>
        Connect your wallet to see your history.
      </div>
    );
  }
  if (entries.length === 0) {
    return (
      <div style={{ fontSize: "var(--fs-1)", color: "var(--color-text-secondary)" }}>No activity yet.</div>
    );
  }

  /* One --row-h row per entry, the same unit Draw history uses, so the two
     boxes rule off at identical heights across the fold. The date used to
     own a line of its own, which made these rows twice as tall as the ones
     beside them; it now sits beside the action as secondary metadata. */
  return (
    <>
      {entries.map((entry, i) => {
        const won = entry.type === "Won";
        return (
          <div key={i} className="card-list__row">
            <span style={{ display: "flex", alignItems: "baseline", gap: 6, minWidth: 0 }}>
              <span
                className="pair"
                style={{ fontWeight: won ? 700 : 600, color: won ? "var(--color-primary)" : undefined }}
              >
                {entry.type}
              </span>
              <span
                className="pair"
                style={{ fontSize: "var(--fs-0)", color: "var(--color-text-faint)" }}
              >
                {formatDate(entry.timestamp)}
              </span>
            </span>
            <span
              className="num pair"
              style={{ fontWeight: 600, color: won ? "var(--color-primary)" : undefined }}
            >
              {amount(entry.amount)}
            </span>
          </div>
        );
      })}
    </>
  );
}

export function MyHistoryCard({ entries, connected }: { entries: HistoryEntry[]; connected: boolean }) {
  const wins = entries.filter((e) => e.type === "Won").length;

  return (
    <div className="card card-list">
      <div className="card-list__header">
        <span>My history</span>
        {wins > 0 && (
          <span className="tag">
            {wins} {plural(wins, "win")}
          </span>
        )}
      </div>
      <div className="card-list__body scroll-panel">
        <MyHistoryList entries={entries} connected={connected} />
      </div>
    </div>
  );
}
