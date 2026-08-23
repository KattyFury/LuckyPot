import { useState } from "react";
import { useAccount, useSendTransaction, useWaitForTransactionReceipt } from "wagmi";
import { encodeFunctionData, parseUnits } from "viem";
import { erc20Abi } from "../lib/erc20Abi";
import { poolAbi, POOL_ADDRESS, USDC_ADDRESS } from "../lib/contract";
import { encodeAggregate3, MULTICALL3_FROM_ADDRESS } from "../lib/multicall3From";
import { ScreenHeader } from "../components/ScreenHeader";

export function Deposit({ onBack }: { onBack: () => void }) {
  const { address } = useAccount();
  const [amount, setAmount] = useState("");
  const { sendTransaction, data: hash, isPending, error } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const amountBase = amount ? parseUnits(amount, 6) : 0n;

  function handleConfirm() {
    if (!address || amountBase <= 0n) return;

    const approveData = encodeFunctionData({
      abi: erc20Abi,
      functionName: "approve",
      args: [POOL_ADDRESS, amountBase],
    });
    const depositData = encodeFunctionData({ abi: poolAbi, functionName: "deposit", args: [amountBase] });

    const batchData = encodeAggregate3([
      { target: USDC_ADDRESS, allowFailure: false, callData: approveData },
      { target: POOL_ADDRESS, allowFailure: false, callData: depositData },
    ]);

    sendTransaction({ to: MULTICALL3_FROM_ADDRESS, data: batchData });
  }

  return (
    <div className="app-shell">
      <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 20 }}>
        <ScreenHeader title="Deposit" onBack={onBack} />

        <div>
          <label style={{ fontSize: "var(--fs-5)", color: "var(--color-text-secondary)" }}>Amount (USDC)</label>
          <input
            type="number"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            style={{
              width: "100%",
              fontSize: "var(--fs-2)",
              fontWeight: 700,
              padding: "12px 0",
              border: "none",
              borderBottom: "2px solid #000000",
              outline: "none",
            }}
          />
        </div>

        <div style={{ fontSize: "var(--fs-4)" }}>
          Tickets you'll receive: <strong>{amount || "0"}</strong>
        </div>

        <div className="card" style={{ fontSize: "var(--fs-5)", color: "var(--color-text-secondary)" }}>
          Keep this deposited for the full week to count toward this epoch's draw.
        </div>

        <button
          className="pill-button pill-button--primary"
          disabled={amountBase <= 0n || isPending || isConfirming}
          onClick={handleConfirm}
        >
          {isPending || isConfirming ? "Confirming..." : "Confirm"}
        </button>

        {isSuccess && (
          <div style={{ color: "var(--color-primary)", fontSize: "var(--fs-5)" }}>Deposit confirmed.</div>
        )}
        {error && <div style={{ color: "#c0392b", fontSize: "var(--fs-5)" }}>{error.message.slice(0, 200)}</div>}
      </div>
    </div>
  );
}
