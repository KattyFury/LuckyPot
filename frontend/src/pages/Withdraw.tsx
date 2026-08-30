import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { poolAbi, POOL_ADDRESS } from "../lib/contract";
import { useUserPosition } from "../hooks/usePoolData";
import { useAmount } from "../config/tokenUnit";
import { useCloseOnSuccess } from "../hooks/useCloseOnSuccess";
import { Modal } from "../components/Modal";

export function WithdrawModal({ onClose }: { onClose: () => void }) {
  const { address } = useAccount();
  const { data: position } = useUserPosition(address);
  const balance = (position?.[0]?.result as bigint | undefined) ?? 0n;
  const eligible = (position?.[1]?.result as bigint | undefined) ?? 0n;
  const fmt = useAmount();

  const [amount, setAmount] = useState("");
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  useCloseOnSuccess(isSuccess, onClose);

  const amountBase = amount ? parseUnits(amount, 6) : 0n;
  const willForfeit = eligible > 0n && amountBase > 0n;

  function handleMax() {
    setAmount(formatUnits(balance, 6));
  }

  function handleConfirm() {
    if (amountBase <= 0n || amountBase > balance) return;
    writeContract({ address: POOL_ADDRESS, abi: poolAbi, functionName: "withdraw", args: [amountBase] });
  }

  return (
    <Modal title="Withdraw" onClose={onClose}>

        <div style={{ fontSize: "var(--fs-1)", color: "var(--color-text-secondary)" }}>
          Available: <strong style={{ color: "var(--color-text)" }}>{fmt(balance)}</strong>
        </div>

        <div>
          <label style={{ fontSize: "var(--fs-1)", color: "var(--color-text-secondary)" }}>Amount (USDC)</label>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              borderBottom: "1px solid var(--color-line)",
            }}
          >
            <input
              className="num"
              type="number"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              style={{
                flex: 1,
                minWidth: 0,
                fontSize: "var(--fs-4)",
                fontWeight: 700,
                padding: "12px 0",
                border: "none",
                outline: "none",
                // The input has no chrome of its own on the dark panel: without
                // these it renders as the browser's white field.
                background: "transparent",
                color: "var(--color-text)",
              }}
            />
            <button
              onClick={handleMax}
              style={{
                background: "none",
                fontSize: "var(--fs-0)",
                fontWeight: 700,
                letterSpacing: "0.06em",
                color: "var(--color-primary)",
              }}
            >
              MAX
            </button>
          </div>
        </div>

        {willForfeit && (
          <div className="card" style={{ fontSize: "var(--fs-1)", color: "var(--color-text-secondary)" }}>
            Withdrawing now will remove you from this epoch's ticket draw.
          </div>
        )}

        <button
          className="pill-button pill-button--accent"
          disabled={amountBase <= 0n || amountBase > balance || isPending || isConfirming}
          onClick={handleConfirm}
        >
          {isPending || isConfirming ? "Confirming..." : "Confirm"}
        </button>

        {error && <div style={{ color: "#c0392b", fontSize: "var(--fs-1)" }}>{error.message.slice(0, 200)}</div>}
    </Modal>
  );
}
