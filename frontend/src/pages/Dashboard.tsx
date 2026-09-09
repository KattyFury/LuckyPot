import { useState } from "react";
import { useAccount } from "wagmi";
import { Navbar } from "../components/Navbar";
import { AnnouncementBanner, Chevron } from "../components/AnnouncementBanner";
import { EpochCard } from "../components/EpochCard";
import { PoolCard } from "../components/PoolCard";
import { DrawHistoryCard, DrawHistoryList } from "../components/DrawHistoryCard";
import { MyHistoryCard, MyHistoryList } from "../components/MyHistoryCard";
import { EpochDetailModal } from "../components/EpochDetailModal";
import { ResultModal } from "../components/ResultModal";
import { ReferralInfoModal } from "../components/ReferralInfoModal";
import { FaucetOrSellBanner } from "../components/FaucetOrSellBanner";
import { Modal } from "../components/Modal";
import { DepositModal } from "./Deposit";
import { WithdrawModal } from "./Withdraw";
import {
  useCurrentAprBps,
  useCurrentEpochId,
  useEligiblePoolTotal,
  useEpoch,
  useEpochHistory,
  usePoolTotals,
  useUserPosition,
} from "../hooks/usePoolData";
import { useMyHistory } from "../hooks/useMyHistory";
import { estimateNumWinners, projectedWeeklyYield } from "../lib/prize";
import { useTokenUnit } from "../config/tokenUnit";
import { useT } from "../i18n/LanguageContext";
import { wasScratched } from "../lib/scratchState";
import type { EpochData } from "../hooks/usePoolData";

type Popup = "draw-history" | "my-history" | "deposit" | "withdraw" | "referral" | null;

export function Dashboard() {
  const { address } = useAccount();
  const { unit } = useTokenUnit();
  const t = useT();
  const { data: currentEpochId } = useCurrentEpochId();
  const { data: currentEpoch } = useEpoch(currentEpochId as bigint | undefined);
  const { epochs } = useEpochHistory(currentEpochId as bigint | undefined);
  const { data: totals } = usePoolTotals();
  const { data: position } = useUserPosition(address);
  const { data: historyEntries = [] } = useMyHistory(address);

  const [popup, setPopup] = useState<Popup>(null);
  const [selectedEpoch, setSelectedEpoch] = useState<{ id: bigint; epoch: EpochData } | null>(null);
  const [resultEpochId, setResultEpochId] = useState<bigint | null>(null);
  // Bumped when the result popup closes, so the banner re-reads localStorage.
  const [scratchTick, setScratchTick] = useState(0);

  const totalPool = (totals?.[0]?.result as bigint | undefined) ?? 0n;
  const depositorsCount = Number((totals?.[1]?.result as bigint | undefined) ?? 0n);
  const { total: eligiblePoolTotal, eligibleCount } = useEligiblePoolTotal(depositorsCount);
  const { data: aprBps } = useCurrentAprBps();
  const numWinnersEstimate = estimateNumWinners(
    eligiblePoolTotal,
    projectedWeeklyYield(eligiblePoolTotal, (aprBps as bigint | undefined) ?? 0n),
  );

  const eligible = (position?.[1]?.result as bigint | undefined) ?? 0n;
  const walletBalance = (position?.[3]?.result as bigint | undefined) ?? 0n;
  const myPoolBalance = (position?.[0]?.result as bigint | undefined) ?? 0n;

  const latestDrawnEpoch = epochs.find((e) => e.epoch.drawn) ?? null;
  const myWins = historyEntries.filter((e) => e.type === "Won").length;

  // Announce a fresh draw to EVERY depositor, not just the winners — saying
  // who won here would give away the scratch card before it's scratched.
  const unscratchedResult =
    latestDrawnEpoch && address && myPoolBalance > 0n && !wasScratched(latestDrawnEpoch.id, address)
      ? latestDrawnEpoch
      : null;
  void scratchTick; // re-runs the check above after the popup closes

  function openEpoch(id: bigint, epoch: EpochData) {
    setPopup(null);
    setSelectedEpoch({ id, epoch });
  }

  return (
    <div className="app-shell">
      <div className="dashboard-grid">
        <div className="g-navbar">
          <Navbar
            onDeposit={() => setPopup("deposit")}
            onWithdraw={() => setPopup("withdraw")}
            onDrawHistory={() => setPopup("draw-history")}
            onMyHistory={() => setPopup("my-history")}
            onMyReferral={() => setPopup("referral")}
          />
        </div>

        <div className="g-banner">
          {unit === "$ARC" ? (
            <AnnouncementBanner text={t.dashboard.arcNotLive} />
          ) : unscratchedResult ? (
            <AnnouncementBanner
              lead={`${t.common.epochWord} #${unscratchedResult.id.toString().padStart(2, "0")} ${t.dashboard.hasBeenDrawnSuffix}`}
              text={t.dashboard.scratchCard}
              onClick={() => setResultEpochId(unscratchedResult.id)}
            />
          ) : (
            <FaucetOrSellBanner />
          )}
        </div>

        <div className="g-epoch">
          <EpochCard
            epochId={currentEpochId as bigint | undefined}
            epoch={currentEpoch}
            numWinnersEstimate={numWinnersEstimate}
            participantCount={eligibleCount}
          />
        </div>

        <div className="g-pool">
          <PoolCard
            totalPool={totalPool}
            eligiblePoolTotal={eligiblePoolTotal}
            myEligible={eligible}
            myDeposited={myPoolBalance}
            walletBalance={walletBalance}
            onDeposit={() => setPopup("deposit")}
            onWithdraw={() => setPopup("withdraw")}
            onLatestResult={() => latestDrawnEpoch && openEpoch(latestDrawnEpoch.id, latestDrawnEpoch.epoch)}
            latestResultAvailable={Boolean(latestDrawnEpoch)}
          />
        </div>

        <div className="g-referral">
          <AnnouncementBanner
            variant="referral"
            lead={t.dashboard.referralLead}
            text={t.dashboard.getYourLink}
            onClick={() => setPopup("referral")}
          />
        </div>

        <div className="g-draw-history">
          <DrawHistoryCard epochs={epochs} onSelect={openEpoch} />
        </div>

        <div className="g-my-history">
          <MyHistoryCard entries={historyEntries} connected={Boolean(address)} />
        </div>

        {/* Mobile stand-ins for the two boxes. Each carries the same count
            the desktop box shows in its header, so collapsing the box doesn't
            cost the reader the one fact visible at a glance. */}
        <button className="history-button g-draw-history-btn" onClick={() => setPopup("draw-history")}>
          <span>{t.common.drawHistory}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {epochs.length > 0 && (
              <span className="eyebrow">
                {epochs.length} {t.common.drawWord(epochs.length)}
              </span>
            )}
            <Chevron />
          </span>
        </button>

        <button className="history-button g-my-history-btn" onClick={() => setPopup("my-history")}>
          <span>{t.common.myHistory}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {myWins > 0 && (
              <span className="tag">
                {myWins} {t.common.winWord(myWins)}
              </span>
            )}
            <Chevron />
          </span>
        </button>
      </div>

      {popup === "deposit" && <DepositModal onClose={() => setPopup(null)} />}

      {popup === "withdraw" && <WithdrawModal onClose={() => setPopup(null)} />}

      {popup === "draw-history" && (
        <Modal title={t.common.drawHistory} onClose={() => setPopup(null)}>
          <DrawHistoryList epochs={epochs} onSelect={openEpoch} />
        </Modal>
      )}

      {popup === "my-history" && (
        <Modal title={t.common.myHistory} onClose={() => setPopup(null)}>
          <MyHistoryList entries={historyEntries} connected={Boolean(address)} />
        </Modal>
      )}

      {popup === "referral" && <ReferralInfoModal onClose={() => setPopup(null)} />}

      {selectedEpoch && (
        <EpochDetailModal
          epochId={selectedEpoch.id}
          epoch={selectedEpoch.epoch}
          myAddress={address}
          onSelectMine={() => {
            setResultEpochId(selectedEpoch.id);
            setSelectedEpoch(null);
          }}
          onClose={() => setSelectedEpoch(null)}
        />
      )}

      {resultEpochId !== null && address && (
        <ResultModal
          epochId={resultEpochId}
          address={address}
          onClose={() => {
            setResultEpochId(null);
            setScratchTick((n) => n + 1);
          }}
        />
      )}
    </div>
  );
}
