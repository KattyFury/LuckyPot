import { useEffect, useState } from "react";
import { useAccount, useSendTransaction, useWaitForTransactionReceipt } from "wagmi";
import { encodeFunctionData, formatUnits, parseUnits } from "viem";
import { erc20Abi } from "../lib/erc20Abi";
import { poolAbi, POOL_ADDRESS, USDC_ADDRESS } from "../lib/contract";
import { encodeAggregate3, MULTICALL3_FROM_ADDRESS } from "../lib/multicall3From";
import { useReferrer, useUserPosition } from "../hooks/usePoolData";
import { useAmount } from "../config/tokenUnit";
import { useCloseOnSuccess } from "../hooks/useCloseOnSuccess";
import { clearPendingReferrer, getPendingReferrer } from "../lib/referralState";
import { Modal } from "../components/Modal";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export function DepositModal({ onClose }: { onClose: () => void }) {
  const { address } = useAccount();
  const { data: position } = useUserPosition(address);
  const walletBalance = (position?.[3]?.result as bigint | undefined) ?? 0n;
  const { data: existingReferrer } = useReferrer(address);
  const fmt = useAmount();

  const [amount, setAmount] = useState("");
  const { sendTransaction, data: hash, isPending, error } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  useCloseOnSuccess(isSuccess, onClose);

  // Only ever needs to fire once — refBy is set-once-permanent on the contract,
  // so once this deposit lands there's nothing left for the stored link to do.
  useEffect(() => {
    if (isSuccess) clearPendingReferrer();
  }, [isSuccess]);

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

    const calls = [
      { target: USDC_ADDRESS, allowFailure: false, callData: approveData },
      { target: POOL_ADDRESS, allowFailure: false, callData: depositData },
    ];

    // Bundles the referral link into the same signature — no extra tx, no extra
    // gas prompt. allowFailure: true because refBy is set-once: if it's already
    // set (returning depositor, or the pending link is stale), the call just
    // no-ops instead of reverting the whole deposit.
    const pendingReferrer = getPendingReferrer();
    if (
      pendingReferrer &&
      existingReferrer === ZERO_ADDRESS &&
      pendingReferrer.toLowerCase() !== address.toLowerCase()
    ) {
      calls.push({
        target: POOL_ADDRESS,
        allowFailure: true,
        callData: encodeFunctionData({ abi: poolAbi, functionName: "setReferrer", args: [pendingReferrer] }),
      });
    }

    const batchData = encodeAggregate3(calls);

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
          Tickets you'll receive once this sits in the pool from this epoch's start to its
          end: <strong>{amount || "0"}</strong>
        </div>

        <button
          className="pill-button pill-button--primary"
          disabled={amountBase <= 0n || amountBase > walletBalance || isPending || isConfirming}
          onClick={handleConfirm}
        >
          {isPending || isConfirming ? "Confirming..." : "Confirm"}
        </button>

        {error && <div style={{ color: "#c0392b", fontSize: "var(--fs-5)" }}>{error.message.slice(0, 200)}</div>}
    </Modal>
  );
}
