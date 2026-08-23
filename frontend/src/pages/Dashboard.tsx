import { useState } from "react";
import { useAccount } from "wagmi";
import { Navbar } from "../components/Navbar";
import { AnnouncementBanner } from "../components/AnnouncementBanner";
import { EpochCard } from "../components/EpochCard";
import { PoolCard } from "../components/PoolCard";
import { DrawHistoryCard } from "../components/DrawHistoryCard";
import { MyHistoryCard } from "../components/MyHistoryCard";
import { EpochDetailModal } from "../components/EpochDetailModal";
import { useCurrentEpochId, useEpoch, useEpochHistory, usePoolTotals, useUserPosition } from "../hooks/usePoolData";
import { useMyHistory } from "../hooks/useMyHistory";
import { estimateNumWinners } from "../lib/prize";
import type { EpochData } from "../hooks/usePoolData";

export function Dashboard({
  onNavigate,
}: {
  onNavigate: (view: "deposit" | "withdraw" | "scratch") => void;
}) {
  const { address } = useAccount();
  const { data: currentEpochId } = useCurrentEpochId();
  const { data: currentEpoch } = useEpoch(currentEpochId as bigint | undefined);
  const { epochs } = useEpochHistory(currentEpochId as bigint | undefined);
  const { data: totals } = usePoolTotals();
  const { data: position } = useUserPosition(address);
  const { data: historyEntries = [] } = useMyHistory(address);

  const [selectedEpoch, setSelectedEpoch] = useState<{ id: bigint; epoch: EpochData } | null>(null);

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

  return (
    <div className="app-shell">
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)", padding: 20 }}>
        <Navbar />

        {needsFaucet ? (
          <AnnouncementBanner text="Click here to faucet" href="https://faucet.circle.com" />
        ) : (
          <AnnouncementBanner text="This week's yield is funded." />
        )}

        <div className="row-epoch-pool">
          <EpochCard
            epochId={currentEpochId as bigint | undefined}
            epoch={currentEpoch}
            numWinnersEstimate={numWinnersEstimate}
          />
          <PoolCard
            totalPool={totalPool}
            depositorsCount={depositorsCount}
            myTickets={myTickets}
            walletBalance={walletBalance}
            onDeposit={() => onNavigate("deposit")}
            onWithdraw={() => onNavigate("withdraw")}
            onLatestResult={() => onNavigate("scratch")}
            latestResultAvailable={Boolean(latestDrawnEpoch)}
          />
        </div>

        <div className="row-history">
          <DrawHistoryCard epochs={epochs} onSelect={(id, epoch) => setSelectedEpoch({ id, epoch })} />
          <MyHistoryCard entries={historyEntries} connected={Boolean(address)} />
        </div>
      </div>

      {selectedEpoch && (
        <EpochDetailModal
          epochId={selectedEpoch.id}
          epoch={selectedEpoch.epoch}
          onClose={() => setSelectedEpoch(null)}
        />
      )}
    </div>
  );
}
