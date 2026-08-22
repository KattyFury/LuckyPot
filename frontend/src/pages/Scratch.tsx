import { useMemo, useState } from "react";
import { useAccount, useReadContracts, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { poolAbi, POOL_ADDRESS } from "../lib/contract";
import { formatUSDC } from "../lib/format";
import { useCurrentEpochId, useEpoch } from "../hooks/usePoolData";
import { ScreenHeader } from "../components/ScreenHeader";
import { ScratchCanvas } from "../components/ScratchCanvas";

const SWEEP_DELAY_SECONDS = 3 * 24 * 60 * 60;

export function Scratch({ onBack }: { onBack: () => void }) {
  const { address } = useAccount();
  const { data: currentEpochId } = useCurrentEpochId();
  const lastEpochId = currentEpochId ? (currentEpochId as bigint) - 1n : undefined;
  const { data: epoch } = useEpoch(lastEpochId);

  const { data: extras } = useReadContracts({
    contracts: [
      { address: POOL_ADDRESS, abi: poolAbi, functionName: "owedTo", args: lastEpochId && address ? [lastEpochId, address] : undefined },
      { address: POOL_ADDRESS, abi: poolAbi, functionName: "hasClaimed", args: lastEpochId && address ? [lastEpochId, address] : undefined },
    ],
    query: { enabled: Boolean(lastEpochId && address) },
  });

  const owed = (extras?.[0]?.result as bigint | undefined) ?? 0n;
  const hasClaimed = (extras?.[1]?.result as boolean | undefined) ?? false;

  const [scratched, setScratched] = useState(false);
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const pastSweepWindow = useMemo(() => {
    if (!epoch?.drawnAt) return false;
    return Date.now() / 1000 >= Number(epoch.drawnAt) + SWEEP_DELAY_SECONDS;
  }, [epoch]);

  function handleClaim() {
    if (!lastEpochId) return;
    writeContract({ address: POOL_ADDRESS, abi: poolAbi, functionName: "claim", args: [lastEpochId] });
  }

  if (!epoch || !epoch.drawn) {
    return (
      <div style={{ maxWidth: 480, margin: "0 auto", padding: 20 }}>
        <ScreenHeader title="Latest Result" onBack={onBack} />
        <div className="card" style={{ marginTop: 20, fontSize: "var(--fs-5)", color: "var(--color-text-secondary)" }}>
          No draw has happened yet.
        </div>
      </div>
    );
  }

  const won = owed > 0n || hasClaimed;
  const showDirect = pastSweepWindow || scratched;

  const resultPanel = won ? (
    <div
      className="card"
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        background: "var(--color-primary)",
        color: "#ffffff",
      }}
    >
      <span style={{ fontSize: "var(--fs-5)", fontWeight: 700, textTransform: "uppercase" }}>You won</span>
      <span style={{ fontSize: "var(--fs-1)", fontWeight: 700 }}>${formatUSDC(owed || epoch.weeklyYield)}</span>
    </div>
  ) : (
    <div
      className="card"
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
      }}
    >
      <span style={{ fontSize: "var(--fs-3)", fontWeight: 700 }}>Good luck next epoch</span>
      <span style={{ fontSize: "var(--fs-5)", color: "var(--color-text-secondary)" }}>
        Your principal is safe and still deposited.
      </span>
    </div>
  );

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: 20, display: "flex", flexDirection: "column", gap: 20 }}>
      <ScreenHeader title="Latest Result" onBack={onBack} />

      {showDirect ? (
        <div style={{ height: 260 }}>{resultPanel}</div>
      ) : (
        <ScratchCanvas onRevealed={() => setScratched(true)}>{resultPanel}</ScratchCanvas>
      )}

      {won && !hasClaimed && (
        <button className="pill-button pill-button--primary" disabled={isPending || isConfirming} onClick={handleClaim}>
          {isPending || isConfirming ? "Confirming..." : "Claim now"}
        </button>
      )}
      {won && hasClaimed && (
        <div style={{ fontSize: "var(--fs-5)", color: "var(--color-text-secondary)" }}>Already claimed.</div>
      )}
      {won && pastSweepWindow && !hasClaimed && (
        <div style={{ fontSize: "var(--fs-5)", color: "var(--color-text-secondary)" }}>
          Claim window closed — anyone can now trigger the permissionless sweep to send this to your wallet.
        </div>
      )}
      {isSuccess && <div style={{ color: "var(--color-primary)", fontSize: "var(--fs-5)" }}>Claim confirmed.</div>}
    </div>
  );
}
