import { plural, shortAddress } from "../lib/format";
import { useAmount } from "../config/tokenUnit";
import { prizeForRank } from "../lib/prize";
import { Modal } from "./Modal";
import type { EpochData } from "../hooks/usePoolData";

export function EpochDetailModal({
  epochId,
  epoch,
  myAddress,
  onSelectMine,
  onClose,
}: {
  epochId: bigint;
  epoch: EpochData;
  myAddress?: `0x${string}`;
  /** Called when the viewer clicks their own highlighted winning row. */
  onSelectMine?: () => void;
  onClose: () => void;
}) {
  const amount = useAmount();
  const mine = myAddress?.toLowerCase();

  return (
    <Modal title={`Epoch #${epochId.toString().padStart(2, "0")}`} onClose={onClose}>
      <div style={{ fontSize: "var(--fs-1)", color: "var(--color-text-secondary)" }}>
        Eligible pool:{" "}
        <strong style={{ color: "var(--color-text)" }}>
          {amount(epoch.eligiblePoolSnapshot)}/{epoch.eligibleParticipants.toString()}{" "}
          {plural(epoch.eligibleParticipants, "depositor")}
        </strong>{" "}
        &nbsp;·&nbsp; Weekly yield:{" "}
        <strong style={{ color: "var(--color-text)" }}>{amount(epoch.weeklyYield)}</strong> &nbsp;·&nbsp; Winners:{" "}
        <strong style={{ color: "var(--color-text)" }}>{epoch.numWinners.toString()}</strong>
      </div>

      {epoch.winners.length === 0 ? (
        <div style={{ fontSize: "var(--fs-1)", color: "var(--color-text-secondary)" }}>
          No winners this epoch – not enough participants or yield funded yet.
        </div>
      ) : (
        <div
          style={{ display: "flex", flexDirection: "column", gap: 8, fontFamily: "var(--font-condensed)" }}
        >
          {epoch.winners.map((winner, i) => {
            const isMine = mine !== undefined && winner.toLowerCase() === mine;
            const row = (
              <>
                <span>
                  <span style={{ color: isMine ? "#ffffff" : "var(--color-text-secondary)" }}>#{i + 1}</span>{" "}
                  {isMine ? "You" : shortAddress(winner)}
                </span>
                <span style={{ fontWeight: 700 }}>
                  {amount(prizeForRank(i, epoch.numWinners, epoch.weeklyYield))}
                </span>
              </>
            );

            const base: React.CSSProperties = {
              display: "flex",
              justifyContent: "space-between",
              fontSize: "var(--fs-1)",
              padding: "8px 12px",
              borderRadius: 8,
            };

            return isMine ? (
              <button
                key={`${winner}-${i}`}
                onClick={onSelectMine}
                style={{ ...base, background: "var(--color-primary)", color: "#ffffff", fontWeight: 700 }}
              >
                {row}
              </button>
            ) : (
              <div key={`${winner}-${i}`} style={base}>
                {row}
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
