import { plural } from "../lib/format";
import { useAmount } from "../config/tokenUnit";
import type { EpochData } from "../hooks/usePoolData";

export function DrawHistoryList({
  epochs,
  onSelect,
}: {
  epochs: { id: bigint; epoch: EpochData }[];
  onSelect: (id: bigint, epoch: EpochData) => void;
}) {
  const amount = useAmount();

  if (epochs.length === 0) {
    return (
      <div style={{ fontSize: "var(--fs-1)", color: "var(--color-text-secondary)" }}>No draws yet.</div>
    );
  }

  return (
    <>
      {epochs.map(({ id, epoch }) => (
        <button key={id.toString()} className="card-list__row" onClick={() => onSelect(id, epoch)}>
          <span className="pair" style={{ fontWeight: 600 }}>
            Epoch #{id.toString().padStart(2, "0")}
          </span>
          <span style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span className="num pair" style={{ fontWeight: 600 }}>
              {amount(epoch.eligiblePoolSnapshot)}
            </span>
            <span className="pair" style={{ color: "var(--color-text-faint)" }}>
              {epoch.eligibleParticipants.toString()} {plural(epoch.eligibleParticipants, "depositor")}
            </span>
          </span>
        </button>
      ))}
    </>
  );
}

export function DrawHistoryCard({
  epochs,
  onSelect,
}: {
  epochs: { id: bigint; epoch: EpochData }[];
  onSelect: (id: bigint, epoch: EpochData) => void;
}) {
  return (
    <div className="card card-list">
      <div className="card-list__header">
        <span>Draw history</span>
        {epochs.length > 0 && (
          <span className="eyebrow">
            {epochs.length} {plural(epochs.length, "draw")}
          </span>
        )}
      </div>
      <div className="card-list__body scroll-panel">
        <DrawHistoryList epochs={epochs} onSelect={onSelect} />
      </div>
    </div>
  );
}
