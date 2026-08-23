import { formatUSDC } from "../lib/format";

export function PoolCard({
  totalPool,
  depositorsCount,
  myTickets,
  walletBalance,
  onDeposit,
  onWithdraw,
  onLatestResult,
  latestResultAvailable,
}: {
  totalPool: bigint;
  depositorsCount: number;
  myTickets: bigint;
  walletBalance: bigint;
  onDeposit: () => void;
  onWithdraw: () => void;
  onLatestResult: () => void;
  latestResultAvailable: boolean;
}) {
  return (
    <div className="card card-rows">
      <div className="two-col box-header">
        <span style={{ fontSize: "var(--fs-4)", fontWeight: 400, color: "var(--color-primary)" }}>TOTAL POOL</span>
        <span style={{ fontSize: "var(--fs-4)", fontWeight: 400, color: "var(--color-primary)", textAlign: "left" }}>
          MY TICKETS
        </span>
      </div>

      <div className="two-col" style={{ alignItems: "baseline", fontFamily: "var(--font-condensed)" }}>
        <div style={{ fontSize: "var(--fs-3)", fontWeight: 700 }}>
          ${formatUSDC(totalPool)}
          <span style={{ fontSize: "var(--fs-4)", fontWeight: 400, color: "var(--color-text-secondary)" }}>
            /{depositorsCount} depositors
          </span>
        </div>
        <div style={{ fontSize: "var(--fs-3)", fontWeight: 700, textAlign: "left" }}>
          {formatUSDC(myTickets)}
          <span style={{ fontSize: "var(--fs-4)", fontWeight: 400, color: "var(--color-text-secondary)" }}>
            {" "}
            (USDC deposited)
          </span>
        </div>
      </div>

      <div
        style={{
          fontSize: "var(--fs-caption)",
          color: "var(--color-text-secondary)",
          fontFamily: "var(--font-condensed)",
        }}
      >
        My Wallet's Balance: <strong style={{ color: "var(--color-text)" }}>${formatUSDC(walletBalance)}</strong>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button className="pill-button pill-button--primary" onClick={onDeposit}>
          Deposit
        </button>
        <button className="pill-button pill-button--primary" onClick={onWithdraw}>
          Withdraw
        </button>
        <button
          className="pill-button pill-button--secondary"
          onClick={onLatestResult}
          disabled={!latestResultAvailable}
        >
          Latest Result
        </button>
      </div>
    </div>
  );
}
