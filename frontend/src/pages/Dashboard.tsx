import { useState } from "react";
import { useAccount } from "wagmi";
import { Navbar } from "../components/Navbar";
import { AnnouncementBanner } from "../components/AnnouncementBanner";
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
import { wasScratched } from "../lib/scratchState";
import type { EpochData } from "../hooks/usePoolData";

type Popup = "draw-history" | "my-history" | "deposit" | "withdraw" | "referral" | null;

export function Dashboard() {
  const { address } = useAccount();
  const { unit } = useTokenUnit();
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
          />
        </div>

        <div className="g-banner">
          {unit === "$ARC" ? (
            <AnnouncementBanner text="$ARC isn't live yet – figures are the USDC pool." />
          ) : unscratchedResult ? (
            <AnnouncementBanner
              text={`Epoch #${unscratchedResult.id.toString().padStart(2, "0")} result is in – tap to scratch`}
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
            text="Invite a friend, earn 2.5% every time they win — tap here"
            onClick={() => setPopup("referral")}
          />
        </div>

        <div className="g-draw-history">
          <DrawHistoryCard epochs={epochs} onSelect={openEpoch} />
        </div>

        <div className="g-my-history">
          <MyHistoryCard entries={historyEntries} connected={Boolean(address)} />
        </div>

        <button className="history-button g-draw-history-btn" onClick={() => setPopup("draw-history")}>
          DRAW HISTORY
        </button>

        <button className="history-button g-my-history-btn" onClick={() => setPopup("my-history")}>
          MY HISTORY
        </button>
      </div>

      {popup === "deposit" && <DepositModal onClose={() => setPopup(null)} />}

      {popup === "withdraw" && <WithdrawModal onClose={() => setPopup(null)} />}

      {popup === "draw-history" && (
        <Modal title="DRAW HISTORY" onClose={() => setPopup(null)}>
          <DrawHistoryList epochs={epochs} onSelect={openEpoch} />
        </Modal>
      )}

      {popup === "my-history" && (
        <Modal title="MY HISTORY" onClose={() => setPopup(null)}>
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
