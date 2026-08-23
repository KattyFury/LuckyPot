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
import { Modal } from "../components/Modal";
import { useCurrentEpochId, useEpoch, useEpochHistory, usePoolTotals, useUserPosition } from "../hooks/usePoolData";
import { useMyHistory } from "../hooks/useMyHistory";
import { estimateNumWinners } from "../lib/prize";
import type { EpochData } from "../hooks/usePoolData";

type Popup = "draw-history" | "my-history" | null;

export function Dashboard({ onNavigate }: { onNavigate: (view: "deposit" | "withdraw") => void }) {
  const { address } = useAccount();
  const { data: currentEpochId } = useCurrentEpochId();
  const { data: currentEpoch } = useEpoch(currentEpochId as bigint | undefined);
  const { epochs } = useEpochHistory(currentEpochId as bigint | undefined);
  const { data: totals } = usePoolTotals();
  const { data: position } = useUserPosition(address);
  const { data: historyEntries = [] } = useMyHistory(address);

  const [popup, setPopup] = useState<Popup>(null);
  const [selectedEpoch, setSelectedEpoch] = useState<{ id: bigint; epoch: EpochData } | null>(null);
  const [resultEpochId, setResultEpochId] = useState<bigint | null>(null);

  const totalPool = (totals?.[0]?.result as bigint | undefined) ?? 0n;
  const depositorsCount = Number((totals?.[1]?.result as bigint | undefined) ?? 0n);
  const pendingYield = (totals?.[2]?.result as bigint | undefined) ?? 0n;
  const numWinnersEstimate = estimateNumWinners(BigInt(depositorsCount), pendingYield);

  const eligible = (position?.[1]?.result as bigint | undefined) ?? 0n;
  const pending = (position?.[2]?.result as bigint | undefined) ?? 0n;
  const walletBalance = (position?.[3]?.result as bigint | undefined) ?? 0n;
  const myTickets = eligible + pending;

  const latestDrawnEpoch = epochs.find((e) => e.epoch.drawn) ?? null;
  const needsFaucet = Boolean(address) && walletBalance === 0n;

  function openEpoch(id: bigint, epoch: EpochData) {
    setPopup(null);
    setSelectedEpoch({ id, epoch });
  }

  return (
    <div className="app-shell">
      <div className="dashboard-grid">
        <div className="g-navbar">
          <Navbar
            onDeposit={() => onNavigate("deposit")}
            onWithdraw={() => onNavigate("withdraw")}
            onDrawHistory={() => setPopup("draw-history")}
            onMyHistory={() => setPopup("my-history")}
          />
        </div>

        <div className="g-banner">
          {needsFaucet ? (
            <AnnouncementBanner text="Click here to faucet" href="https://faucet.circle.com" />
          ) : (
            <AnnouncementBanner text="This week's yield is funded." />
          )}
        </div>

        <div className="g-epoch">
          <EpochCard
            epochId={currentEpochId as bigint | undefined}
            epoch={currentEpoch}
            numWinnersEstimate={numWinnersEstimate}
          />
        </div>

        <div className="g-pool">
          <PoolCard
            totalPool={totalPool}
            depositorsCount={depositorsCount}
            myTickets={myTickets}
            walletBalance={walletBalance}
            onDeposit={() => onNavigate("deposit")}
            onWithdraw={() => onNavigate("withdraw")}
            onLatestResult={() => latestDrawnEpoch && openEpoch(latestDrawnEpoch.id, latestDrawnEpoch.epoch)}
            latestResultAvailable={Boolean(latestDrawnEpoch)}
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
        <ResultModal epochId={resultEpochId} address={address} onClose={() => setResultEpochId(null)} />
      )}
    </div>
  );
}
