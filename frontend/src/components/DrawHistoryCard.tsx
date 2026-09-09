import { useAmount } from "../config/tokenUnit";
import { useT } from "../i18n/LanguageContext";
import type { EpochData } from "../hooks/usePoolData";

export function DrawHistoryList({
  epochs,
  onSelect,
}: {
  epochs: { id: bigint; epoch: EpochData }[];
  onSelect: (id: bigint, epoch: EpochData) => void;
}) {
  const amount = useAmount();
  const t = useT();

  if (epochs.length === 0) {
    return (
      <div style={{ fontSize: "var(--fs-1)", color: "var(--color-text-secondary)" }}>{t.drawHistory.noDraws}</div>
    );
  }

  return (
    <>
      {epochs.map(({ id, epoch }) => (
        <button key={id.toString()} className="card-list__row" onClick={() => onSelect(id, epoch)}>
          <span className="pair" style={{ fontWeight: 600 }}>
            {t.common.epochWord} #{id.toString().padStart(2, "0")}
          </span>
          <span style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span className="num pair" style={{ fontWeight: 600 }}>
              {amount(epoch.eligiblePoolSnapshot)}
            </span>
            <span className="pair" style={{ color: "var(--color-text-faint)" }}>
              {epoch.eligibleParticipants.toString()} {t.common.depositorWord(epoch.eligibleParticipants)}
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
  const t = useT();
  return (
    <div className="card card-list">
      <div className="card-list__header">
        <span>{t.common.drawHistory}</span>
        {epochs.length > 0 && (
          <span className="eyebrow">
            {epochs.length} {t.common.drawWord(epochs.length)}
          </span>
        )}
      </div>
      <div className="card-list__body scroll-panel">
        <DrawHistoryList epochs={epochs} onSelect={onSelect} />
      </div>
    </div>
  );
}
