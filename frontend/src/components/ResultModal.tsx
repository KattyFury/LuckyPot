import { useState } from "react";
import { useReadContracts, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { poolAbi, POOL_ADDRESS } from "../lib/contract";
import { useAmount } from "../config/tokenUnit";
import { rememberScratched, wasScratched } from "../lib/scratchState";
import { useCloseOnSuccess } from "../hooks/useCloseOnSuccess";
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
  const { data } = useReadContracts({
    contracts: [
      { address: POOL_ADDRESS, abi: poolAbi, functionName: "owedTo", args: [epochId, address] },
      { address: POOL_ADDRESS, abi: poolAbi, functionName: "hasClaimed", args: [epochId, address] },
    ],
  });

  const owed = (data?.[0]?.result as bigint | undefined) ?? 0n;
  const hasClaimed = (data?.[1]?.result as boolean | undefined) ?? false;

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
          <span style={{ fontSize: "var(--fs-1)", fontWeight: 700, textTransform: "uppercase" }}>You won</span>
          <span style={{ fontSize: "var(--fs-4)", fontWeight: 700, fontFamily: "var(--font-display)" }}>
            {amount(owed)}
          </span>
        </>
      ) : (
        <>
          <span style={{ fontSize: "var(--fs-2)", fontWeight: 700 }}>Good luck next epoch</span>
          <span style={{ fontSize: "var(--fs-1)", color: "var(--color-text-secondary)" }}>
            Your principal is safe and still deposited.
          </span>
        </>
      )}
    </div>
  );

  return (
    <Modal title={`Epoch #${epochId.toString().padStart(2, "0")} – your result`} onClose={onClose}>
      {revealed ? <div style={{ height: 200 }}>{panel}</div> : <ScratchCanvas onRevealed={handleReveal}>{panel}</ScratchCanvas>}

      {revealed && won && !hasClaimed && (
        <button
          className="pill-button pill-button--accent"
          disabled={isPending || isConfirming}
          onClick={() =>
            writeContract({ address: POOL_ADDRESS, abi: poolAbi, functionName: "claim", args: [epochId] })
          }
        >
          {isPending || isConfirming ? "Confirming..." : "Claim now"}
        </button>
      )}
      {revealed && won && hasClaimed && (
        <div style={{ fontSize: "var(--fs-1)", color: "var(--color-text-secondary)" }}>Already claimed.</div>
      )}
    </Modal>
  );
}
