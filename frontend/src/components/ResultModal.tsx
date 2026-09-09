import { useState } from "react";
import { useReadContracts, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { poolAbi, POOL_ADDRESS } from "../lib/contract";
import { useAmount } from "../config/tokenUnit";
import { rememberScratched, wasScratched } from "../lib/scratchState";
import { useCloseOnSuccess } from "../hooks/useCloseOnSuccess";
import { useEpoch, useSweepDelay } from "../hooks/usePoolData";
import { useT } from "../i18n/LanguageContext";
import { Modal } from "./Modal";
import { ScratchCanvas } from "./ScratchCanvas";

export function ResultModal({
  epochId,
  address,
  onClose,
}: {
  epochId: bigint;
  address: `0x${string}`;
  onClose: () => void;
}) {
  const amount = useAmount();
  const t = useT();
  const { data } = useReadContracts({
    contracts: [
      { address: POOL_ADDRESS, abi: poolAbi, functionName: "owedTo", args: [epochId, address] },
      { address: POOL_ADDRESS, abi: poolAbi, functionName: "hasClaimed", args: [epochId, address] },
    ],
  });

  const owed = (data?.[0]?.result as bigint | undefined) ?? 0n;
  const hasClaimed = (data?.[1]?.result as boolean | undefined) ?? false;

  // claim() only works within SWEEP_DELAY of the draw; after that it reverts with
  // "past claim window, use sweep" and sweep() (permissionless, pays every unclaimed
  // winner including this one) is the only way left to get the prize out.
  const { data: epoch } = useEpoch(epochId);
  const sweepDelay = useSweepDelay().data as bigint | undefined;
  const pastClaimWindow =
    epoch !== undefined && sweepDelay !== undefined
      ? BigInt(Math.floor(Date.now() / 1000)) >= epoch.drawnAt + sweepDelay
      : false;

  const [revealed, setRevealed] = useState(() => wasScratched(epochId, address) || hasClaimed);

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  useCloseOnSuccess(isSuccess, onClose);

  function handleReveal() {
    rememberScratched(epochId, address);
    setRevealed(true);
  }

  const won = owed > 0n || hasClaimed;

  const panel = (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        borderRadius: "var(--radius)",
        background: won ? "var(--color-primary)" : "var(--color-card-bg)",
        color: won ? "#04170e" : "var(--color-text)",
      }}
    >
      {won ? (
        <>
          <span style={{ fontSize: "var(--fs-1)", fontWeight: 700, textTransform: "uppercase" }}>{t.result.youWon}</span>
          <span style={{ fontSize: "var(--fs-4)", fontWeight: 700, fontFamily: "var(--font-display)" }}>
            {amount(owed)}
          </span>
        </>
      ) : (
        <>
          <span style={{ fontSize: "var(--fs-2)", fontWeight: 700 }}>{t.result.goodLuck}</span>
          <span style={{ fontSize: "var(--fs-1)", color: "var(--color-text-secondary)" }}>
            {t.result.principalSafe}
          </span>
        </>
      )}
    </div>
  );

  return (
    <Modal
      title={`${t.common.epochWord} #${epochId.toString().padStart(2, "0")} – ${t.result.modalTitleSuffix}`}
      onClose={onClose}
    >
      {revealed ? (
        <div style={{ height: 200 }}>{panel}</div>
      ) : (
        <ScratchCanvas onRevealed={handleReveal} prompt={t.scratch.prompt}>
          {panel}
        </ScratchCanvas>
      )}

      {revealed && won && !hasClaimed && (
        <>
          <button
            className="pill-button pill-button--accent"
            disabled={isPending || isConfirming}
            onClick={() =>
              writeContract({
                address: POOL_ADDRESS,
                abi: poolAbi,
                functionName: pastClaimWindow ? "sweep" : "claim",
                args: [epochId],
              })
            }
          >
            {isPending || isConfirming ? t.common.confirming : pastClaimWindow ? t.result.releasePrize : t.result.claimNow}
          </button>
          {pastClaimWindow && (
            <div style={{ fontSize: "var(--fs-0)", color: "var(--color-text-faint)", textAlign: "center" }}>
              {t.result.pastWindowNote}
            </div>
          )}
        </>
      )}
      {revealed && won && hasClaimed && (
        <div style={{ fontSize: "var(--fs-1)", color: "var(--color-text-secondary)" }}>{t.result.alreadyClaimed}</div>
      )}
    </Modal>
  );
}
