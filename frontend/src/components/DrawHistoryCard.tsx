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
    return <div style={{ fontSize: "var(--fs-5)", color: "var(--color-text-secondary)" }}>No draws yet.</div>;
  }

  return (
    <>
      {epochs.map(({ id, epoch }) => (
        <button key={id.toString()} className="card-list__row" onClick={() => onSelect(id, epoch)}>
          <span style={{ fontSize: "var(--fs-4)", fontWeight: 700 }}>Epoch #{id.toString().padStart(2, "0")}</span>
          <span style={{ fontSize: "var(--fs-caption)", fontWeight: 700 }}>
            {amount(epoch.eligiblePoolSnapshot)}
            <span style={{ fontWeight: 400, color: "var(--color-text-secondary)" }}>
              /{epoch.eligibleParticipants.toString()} depositors
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
      <div className="card-list__header">DRAW HISTORY</div>
      <div className="card-list__body scroll-panel">
        <DrawHistoryList epochs={epochs} onSelect={onSelect} />
      </div>
    </div>
  );
}
