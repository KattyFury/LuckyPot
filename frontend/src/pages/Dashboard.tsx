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

  const eligible = (position?.[1]?.result as bigint | undefined) ?? 0n;
  const pending = (position?.[2]?.result as bigint | undefined) ?? 0n;
  const walletBalance = (position?.[3]?.result as bigint | undefined) ?? 0n;
  const myTickets = eligible + pending;

  const latestDrawnEpoch = epochs.find((e) => e.epoch.drawn) ?? null;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateRows: "repeat(15, 1fr)",
        gap: "var(--gap)",
        height: "100vh",
        maxWidth: 1290,
        margin: "0 auto",
        padding: 20,
      }}
    >
      <div style={{ gridRow: "1 / 2" }}>
        <Navbar />
      </div>

      <div style={{ gridRow: "2 / 3" }}>
        <AnnouncementBanner text="Announcements: this epoch's yield has been funded and is ready to raffle." />
      </div>

      <div
        style={{
          gridRow: "3 / 7",
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "var(--gap)",
        }}
      >
        <div style={{ gridColumn: "1 / 2" }}>
          <EpochCard epochId={currentEpochId as bigint | undefined} epoch={currentEpoch} />
        </div>
        <div style={{ gridColumn: "2 / 4" }}>
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
      </div>

      <div
        style={{
          gridRow: "7 / 15",
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "var(--gap)",
        }}
      >
        <div style={{ gridColumn: "1 / 3" }}>
          <DrawHistoryCard epochs={epochs} onSelect={(id, epoch) => setSelectedEpoch({ id, epoch })} />
        </div>
        <div style={{ gridColumn: "3 / 4" }}>
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
