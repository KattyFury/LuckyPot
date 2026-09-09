import { useAmount } from "../config/tokenUnit";
import { useT } from "../i18n/LanguageContext";
import type { HistoryEntry } from "../hooks/useMyHistory";

/** Short form on purpose: the row is one --row-h tall now, and the year adds
 *  nothing next to an epoch history that only runs weeks back. */
function formatDate(timestamp: number, locale: string): string {
  if (!timestamp) return "";
  return new Date(timestamp * 1000).toLocaleDateString(locale, { month: "short", day: "numeric" });
}

export function MyHistoryList({ entries, connected }: { entries: HistoryEntry[]; connected: boolean }) {
  const amount = useAmount();
  const t = useT();

  if (!connected) {
    return (
      <div style={{ fontSize: "var(--fs-1)", color: "var(--color-text-secondary)" }}>
        {t.myHistory.connectPrompt}
      </div>
    );
  }
  if (entries.length === 0) {
    return (
      <div style={{ fontSize: "var(--fs-1)", color: "var(--color-text-secondary)" }}>{t.myHistory.noActivity}</div>
    );
  }

  /* One --row-h row per entry, the same unit Draw history uses, so the two
     boxes rule off at identical heights across the fold. The date used to
     own a line of its own, which made these rows twice as tall as the ones
     beside them; it now sits beside the action as secondary metadata. */
  return (
    <>
      {entries.map((entry, i) => {
        // Both are money-in-your-favor events - "Won" fires the moment the
        // epoch draws (gross prize), "Claimed" when it actually lands in the
        // wallet (net, after the 5% referral cut). Same green treatment for
        // both; "Won" alone is what the header's win count below is about.
        const positive = entry.type === "Won" || entry.type === "Claimed";
        return (
          <div key={i} className="card-list__row">
            <span style={{ display: "flex", alignItems: "baseline", gap: 6, minWidth: 0 }}>
              <span
                className="pair"
                style={{ fontWeight: positive ? 700 : 600, color: positive ? "var(--color-primary)" : undefined }}
              >
                {t.myHistory.typeLabels[entry.type]}
              </span>
              <span
                className="pair"
                style={{ fontSize: "var(--fs-0)", color: "var(--color-text-faint)" }}
              >
                {formatDate(entry.timestamp, t.common.dateLocale)}
              </span>
            </span>
            <span
              className="num pair"
              style={{ fontWeight: 600, color: positive ? "var(--color-primary)" : undefined }}
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
  const t = useT();
  const wins = entries.filter((e) => e.type === "Won").length;

  return (
    <div className="card card-list">
      <div className="card-list__header">
        <span>{t.common.myHistory}</span>
        {wins > 0 && (
          <span className="tag">
            {wins} {t.common.winWord(wins)}
          </span>
        )}
      </div>
      <div className="card-list__body scroll-panel">
        <MyHistoryList entries={entries} connected={connected} />
      </div>
    </div>
  );
}
