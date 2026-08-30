import { useState, type CSSProperties } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits } from "viem";
import { poolAbi, POOL_ADDRESS, USDC_ADDRESS } from "../lib/contract";
import { erc20Abi } from "../lib/erc20Abi";
import { Navbar } from "../components/Navbar";

const noop = () => {};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  marginBottom: 8,
  borderRadius: 8,
  border: "1px solid var(--color-line)",
  background: "var(--color-surface)",
  color: "var(--color-text)",
  fontSize: "var(--fs-1)",
};

function useIsAdmin() {
  const { address } = useAccount();
  const { data: role } = useReadContract({ address: POOL_ADDRESS, abi: poolAbi, functionName: "DEFAULT_ADMIN_ROLE" });
  const { data: has } = useReadContract({
    address: POOL_ADDRESS,
    abi: poolAbi,
    functionName: "hasRole",
    args: role !== undefined && address ? [role, address] : undefined,
    query: { enabled: Boolean(role !== undefined && address) },
  });
  return { address, isAdmin: Boolean(has) };
}

function ActionCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: 20, marginBottom: 16 }}>
      <div style={{ fontWeight: 700, fontSize: "var(--fs-2)", marginBottom: 4 }}>{title}</div>
      {description && (
        <div style={{ fontSize: "var(--fs-1)", color: "var(--color-text-secondary)", marginBottom: 12 }}>{description}</div>
      )}
      {children}
    </div>
  );
}

/** One writeContract call, with its own pending/success/error state shown inline.
 *  Every action on this page shares this instead of repeating the tx lifecycle
 *  seven times over. */
function TxButton({
  label,
  onRun,
  variant = "quiet",
}: {
  label: string;
  onRun: () => Promise<`0x${string}`>;
  variant?: "quiet" | "accent";
}) {
  const [hash, setHash] = useState<`0x${string}` | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  async function run() {
    setError(null);
    setSending(true);
    try {
      setHash(await onRun());
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <button
        className={`pill-button pill-button--${variant}`}
        style={{ width: "auto", padding: "8px 20px" }}
        disabled={sending || confirming}
        onClick={run}
      >
        {sending || confirming ? "Confirming..." : label}
      </button>
      {isSuccess && hash && (
        <div style={{ fontSize: "var(--fs-0)", color: "var(--color-primary)", marginTop: 6 }}>
          Done.{" "}
          <a href={`https://testnet.arcscan.app/tx/${hash}`} target="_blank" rel="noreferrer" style={{ color: "inherit" }}>
            View on ArcScan
          </a>
        </div>
      )}
      {error && <div style={{ fontSize: "var(--fs-0)", color: "#ff6b6b", marginTop: 6 }}>{error}</div>}
    </div>
  );
}

export function AdminPage() {
  const { address, isAdmin } = useIsAdmin();
  const { writeContractAsync } = useWriteContract();
  const { data: paused } = useReadContract({ address: POOL_ADDRESS, abi: poolAbi, functionName: "paused" });
  const { data: balancesTotal } = useReadContract({ address: POOL_ADDRESS, abi: poolAbi, functionName: "balancesTotal" });
  const { data: aprUSDC } = useReadContract({ address: POOL_ADDRESS, abi: poolAbi, functionName: "aprBpsUSDC" });
  const { data: aprARC } = useReadContract({ address: POOL_ADDRESS, abi: poolAbi, functionName: "aprBpsARC" });

  const [implAddr, setImplAddr] = useState("");
  const [aprUsdcInput, setAprUsdcInput] = useState("");
  const [aprArcInput, setAprArcInput] = useState("");
  const [fundAmount, setFundAmount] = useState("");

  const call = (functionName: string, args: readonly unknown[] = []) =>
    writeContractAsync({ address: POOL_ADDRESS, abi: poolAbi, functionName, args } as Parameters<
      typeof writeContractAsync
    >[0]);

  let content: React.ReactNode;
  if (!address) {
    content = <p>Kết nối ví admin để tiếp tục.</p>;
  } else if (!isAdmin) {
    content = (
      <p>
        Ví <code>{address}</code> không có quyền admin trên contract.
      </p>
    );
  } else {
    content = (
      <>
        <ActionCard title="Pause / Unpause" description={`Trạng thái hiện tại: ${paused ? "PAUSED" : "đang chạy"}`}>
          <div style={{ display: "flex", gap: 10 }}>
            <TxButton label="Pause" onRun={() => call("pause")} />
            <TxButton label="Unpause" onRun={() => call("unpause")} />
          </div>
        </ActionCard>

        <ActionCard
          title="Force withdraw all"
          description={`Trả toàn bộ ${
            balancesTotal !== undefined ? (Number(balancesTotal) / 1e6).toLocaleString() : "..."
          } USDC về đúng ví từng người. Cần pause trước, không thì revert.`}
        >
          <TxButton label="Force withdraw all" variant="accent" onRun={() => call("forceWithdrawAll")} />
        </ActionCard>

        <ActionCard title="Upgrade implementation" description="upgradeToAndCall(newImplementation, 0x) — không có init data.">
          <input
            placeholder="0x... implementation address"
            value={implAddr}
            onChange={(e) => setImplAddr(e.target.value)}
            style={inputStyle}
          />
          <TxButton label="Upgrade" onRun={() => call("upgradeToAndCall", [implAddr, "0x"])} />
        </ActionCard>

        <ActionCard
          title="APR (bps)"
          description={`USDC hiện tại: ${aprUSDC ?? "..."} bps (band 400-800). ARC hiện tại: ${
            aprARC ?? "..."
          } bps (band 200-400). Mỗi loại chỉ đổi được 1 lần / 7 ngày.`}
        >
          <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
            <input
              placeholder="bps USDC mới"
              value={aprUsdcInput}
              onChange={(e) => setAprUsdcInput(e.target.value)}
              style={inputStyle}
            />
            <TxButton label="Set APR USDC" onRun={() => call("setAprBpsUSDC", [BigInt(aprUsdcInput || "0")])} />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <input
              placeholder="bps ARC mới"
              value={aprArcInput}
              onChange={(e) => setAprArcInput(e.target.value)}
              style={inputStyle}
            />
            <TxButton label="Set APR ARC" onRun={() => call("setAprBpsARC", [BigInt(aprArcInput || "0")])} />
          </div>
        </ActionCard>

        <ActionCard title="Fund yield" description="Approve rồi nạp USDC từ ví admin vào pendingYield của epoch hiện tại.">
          <input
            placeholder="Số USDC (vd 10.5)"
            value={fundAmount}
            onChange={(e) => setFundAmount(e.target.value)}
            style={inputStyle}
          />
          <TxButton
            label="Approve + Fund"
            onRun={async () => {
              const amount = parseUnits(fundAmount || "0", 6);
              await writeContractAsync({
                address: USDC_ADDRESS,
                abi: erc20Abi,
                functionName: "approve",
                args: [POOL_ADDRESS, amount],
              });
              return writeContractAsync({ address: POOL_ADDRESS, abi: poolAbi, functionName: "fundYield", args: [amount] });
            }}
          />
        </ActionCard>
      </>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-page-bg)" }}>
      <div style={{ height: 50 }}>
        <Navbar onDeposit={noop} onWithdraw={noop} onDrawHistory={noop} onMyHistory={noop} />
      </div>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "30px 20px" }}>
        <h1 style={{ fontSize: "var(--fs-3)", marginBottom: 20, color: "var(--color-text)" }}>Admin</h1>
        {content}
      </div>
    </div>
  );
}
