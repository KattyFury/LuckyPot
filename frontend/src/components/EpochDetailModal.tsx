import { shortAddress } from "../lib/format";
import { useAmount } from "../config/tokenUnit";
import { useT } from "../i18n/LanguageContext";
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
  const t = useT();
  const mine = myAddress?.toLowerCase();

  return (
    <Modal title={`${t.common.epochWord} #${epochId.toString().padStart(2, "0")}`} onClose={onClose}>
      <div style={{ fontSize: "var(--fs-1)", color: "var(--color-text-secondary)" }}>
        {t.epochDetail.eligiblePool}{" "}
        <strong style={{ color: "var(--color-text)" }}>
          {amount(epoch.eligiblePoolSnapshot)}/{epoch.eligibleParticipants.toString()}{" "}
          {t.common.depositorWord(epoch.eligibleParticipants)}
        </strong>{" "}
        &nbsp;·&nbsp; {t.epochDetail.weeklyYield}{" "}
        <strong style={{ color: "var(--color-text)" }}>{amount(epoch.weeklyYield)}</strong> &nbsp;·&nbsp;{" "}
        {t.epochDetail.winners}{" "}
        <strong style={{ color: "var(--color-text)" }}>{epoch.numWinners.toString()}</strong>
      </div>

      {epoch.winners.length === 0 ? (
        <div style={{ fontSize: "var(--fs-1)", color: "var(--color-text-secondary)" }}>
          {t.epochDetail.noWinners}
        </div>
      ) : (
        <div
          style={{ display: "flex", flexDirection: "column", gap: 8, fontFamily: "var(--font-display)" }}
        >
          {epoch.winners.map((winner, i) => {
            const isMine = mine !== undefined && winner.toLowerCase() === mine;
            const row = (
              <>
                <span>
                  <span style={{ color: isMine ? "rgba(4, 23, 14, 0.65)" : "var(--color-text-faint)" }}>#{i + 1}</span>{" "}
                  {isMine ? t.common.you : shortAddress(winner)}
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
                style={{ ...base, background: "var(--color-primary)", color: "#04170e", fontWeight: 700 }}
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
