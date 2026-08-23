import { useState } from "react";
import { useAccount, useSendTransaction, useWaitForTransactionReceipt } from "wagmi";
import { encodeFunctionData, formatUnits, parseUnits } from "viem";
import { erc20Abi } from "../lib/erc20Abi";
import { poolAbi, POOL_ADDRESS, USDC_ADDRESS } from "../lib/contract";
import { encodeAggregate3, MULTICALL3_FROM_ADDRESS } from "../lib/multicall3From";
import { useUserPosition } from "../hooks/usePoolData";
import { useAmount } from "../config/tokenUnit";
import { Modal } from "../components/Modal";

export function DepositModal({ onClose }: { onClose: () => void }) {
  const { address } = useAccount();
  const { data: position } = useUserPosition(address);
  const walletBalance = (position?.[3]?.result as bigint | undefined) ?? 0n;
  const fmt = useAmount();

  const [amount, setAmount] = useState("");
  const { sendTransaction, data: hash, isPending, error } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const amountBase = amount ? parseUnits(amount, 6) : 0n;

  function handleMax() {
    setAmount(formatUnits(walletBalance, 6));
  }

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
    <Modal title="Deposit" onClose={onClose}>

        <div style={{ fontSize: "var(--fs-5)", color: "var(--color-text-secondary)" }}>
          Wallet balance: <strong style={{ color: "var(--color-text)" }}>{fmt(walletBalance)}</strong>
        </div>

        <div>
          <label style={{ fontSize: "var(--fs-5)", color: "var(--color-text-secondary)" }}>Amount (USDC)</label>
          <div style={{ display: "flex", alignItems: "center", gap: 12, borderBottom: "2px solid #000000" }}>
            <input
              type="number"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              style={{
                flex: 1,
                fontSize: "var(--fs-2)",
                fontWeight: 700,
                padding: "12px 0",
                border: "none",
                outline: "none",
              }}
            />
            <button onClick={handleMax} style={{ background: "none", fontSize: "var(--fs-5)", fontWeight: 700 }}>
              MAX
            </button>
          </div>
        </div>

        <div style={{ fontSize: "var(--fs-4)" }}>
          Tickets you'll receive: <strong>{amount || "0"}</strong>
        </div>

        <div className="card" style={{ fontSize: "var(--fs-5)", color: "var(--color-text-secondary)" }}>
          Keep this deposited for the full week to count toward this epoch's draw.
        </div>

        <button
          className="pill-button pill-button--primary"
          disabled={amountBase <= 0n || amountBase > walletBalance || isPending || isConfirming}
          onClick={handleConfirm}
        >
          {isPending || isConfirming ? "Confirming..." : "Confirm"}
        </button>

        {isSuccess && (
          <div style={{ color: "var(--color-primary)", fontSize: "var(--fs-5)" }}>Deposit confirmed.</div>
        )}
        {error && <div style={{ color: "#c0392b", fontSize: "var(--fs-5)" }}>{error.message.slice(0, 200)}</div>}
    </Modal>
  );
}
