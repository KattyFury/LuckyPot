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
  const { data: currentEpochId } = useReadContract({ address: POOL_ADDRESS, abi: poolAbi, functionName: "currentEpochId" });
  const { data: aprUSDC } = useReadContract({ address: POOL_ADDRESS, abi: poolAbi, functionName: "aprBpsUSDC" });
  const { data: aprARC } = useReadContract({ address: POOL_ADDRESS, abi: poolAbi, functionName: "aprBpsARC" });

  const [implAddr, setImplAddr] = useState("");
  const [aprUsdcInput, setAprUsdcInput] = useState("");
  const [aprArcInput, setAprArcInput] = useState("");
  const [fundAmount, setFundAmount] = useState("");
  const [sweepEpochId, setSweepEpochId] = useState("");
  const [targetInput, setTargetInput] = useState("");
  const [execTarget, setExecTarget] = useState("");
  const [execApprove, setExecApprove] = useState("");
  const [execCalldata, setExecCalldata] = useState("");
  const [roleAddrInput, setRoleAddrInput] = useState("");
  const [roleChoice, setRoleChoice] = useState<"admin" | "keeper">("admin");

  const isAddr = (v: string): v is `0x${string}` => /^0x[0-9a-fA-F]{40}$/.test(v);

  const { data: adminRoleHash } = useReadContract({ address: POOL_ADDRESS, abi: poolAbi, functionName: "DEFAULT_ADMIN_ROLE" });
  const { data: keeperRoleHash } = useReadContract({ address: POOL_ADDRESS, abi: poolAbi, functionName: "KEEPER_ROLE" });
  const { data: roleAddrHasIt, refetch: refetchRoleAddr } = useReadContract({
    address: POOL_ADDRESS,
    abi: poolAbi,
    functionName: "hasRole",
    args:
      isAddr(roleAddrInput) && (roleChoice === "admin" ? adminRoleHash : keeperRoleHash) !== undefined
        ? [roleChoice === "admin" ? adminRoleHash! : keeperRoleHash!, roleAddrInput]
        : undefined,
    query: { enabled: isAddr(roleAddrInput) && (roleChoice === "admin" ? adminRoleHash : keeperRoleHash) !== undefined },
  });

  const { data: totalExternalDeployed } = useReadContract({
    address: POOL_ADDRESS,
    abi: poolAbi,
    functionName: "totalExternalDeployed",
  });
  const { data: targetAllowedAt, refetch: refetchTargetStatus } = useReadContract({
    address: POOL_ADDRESS,
    abi: poolAbi,
    functionName: "targetAllowedAt",
    args: isAddr(targetInput) ? [targetInput] : undefined,
    query: { enabled: isAddr(targetInput) },
  });
  const { data: execTargetDeployed } = useReadContract({
    address: POOL_ADDRESS,
    abi: poolAbi,
    functionName: "externalDeployed",
    args: isAddr(execTarget) ? [execTarget] : undefined,
    query: { enabled: isAddr(execTarget) },
  });

  const call = (functionName: string, args: readonly unknown[] = []) =>
    writeContractAsync({ address: POOL_ADDRESS, abi: poolAbi, functionName, args } as Parameters<
      typeof writeContractAsync
    >[0]);

  let content: React.ReactNode;
  if (!address) {
    content = (
      <div className="card" style={{ fontSize: "var(--fs-1)", color: "var(--color-text-secondary)" }}>
        Kết nối ví admin để tiếp tục.
      </div>
    );
  } else if (!isAdmin) {
    content = (
      <div className="card" style={{ fontSize: "var(--fs-1)", color: "var(--color-text-secondary)" }}>
        Ví <code className="num">{address}</code> không có quyền admin trên contract.
      </div>
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
          title="Grant / Revoke role"
          description="Cấp hoặc thu quyền DEFAULT_ADMIN_ROLE / KEEPER_ROLE cho 1 địa chỉ (vd Safe multisig)."
        >
          <input
            placeholder="0x... địa chỉ"
            value={roleAddrInput}
            onChange={(e) => setRoleAddrInput(e.target.value)}
            style={inputStyle}
          />
          <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "var(--fs-1)" }}>
              <input
                type="radio"
                checked={roleChoice === "admin"}
                onChange={() => setRoleChoice("admin")}
              />
              DEFAULT_ADMIN_ROLE
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "var(--fs-1)" }}>
              <input
                type="radio"
                checked={roleChoice === "keeper"}
                onChange={() => setRoleChoice("keeper")}
              />
              KEEPER_ROLE
            </label>
          </div>
          {isAddr(roleAddrInput) && (
            <div style={{ fontSize: "var(--fs-0)", color: "var(--color-text-faint)", marginBottom: 10 }}>
              {roleAddrHasIt === undefined
                ? "Đang kiểm tra..."
                : roleAddrHasIt
                  ? "✓ Địa chỉ này đang có quyền này."
                  : "Địa chỉ này chưa có quyền này."}
            </div>
          )}
          <div style={{ display: "flex", gap: 10 }}>
            <TxButton
              label="Grant"
              onRun={async () => {
                const roleHash = roleChoice === "admin" ? adminRoleHash : keeperRoleHash;
                const h = await call("grantRole", [roleHash, roleAddrInput]);
                refetchRoleAddr();
                return h;
              }}
            />
            <TxButton
              variant="accent"
              label="Revoke"
              onRun={async () => {
                const roleHash = roleChoice === "admin" ? adminRoleHash : keeperRoleHash;
                const h = await call("revokeRole", [roleHash, roleAddrInput]);
                refetchRoleAddr();
                return h;
              }}
            />
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

        <ActionCard
          title="Force end epoch"
          description={`Testnet only — kết thúc ngay epoch hiện tại (#${
            currentEpochId != null ? String(currentEpochId) : "..."
          }) thay vì chờ đủ 7 ngày. Phải commitRandom() trước, chưa quay số. Bỏ qua luôn luật "giữ đủ 1 tuần". Cần KEEPER_ROLE (không phải admin) — tự cấp cho mình ở mục Grant/Revoke role phía trên nếu chưa có.`}
        >
          <TxButton label="Force end epoch" variant="accent" onRun={() => call("forceEndEpoch")} />
        </ActionCard>

        <ActionCard
          title="Force sweep ready"
          description="Testnet only — coi như 3 ngày SWEEP_DELAY đã trôi qua cho 1 epoch, để test sweep() ngay thay vì chờ thật. Đóng luôn cửa self-claim của epoch đó. Cần KEEPER_ROLE (không phải admin)."
        >
          <input
            placeholder="Epoch ID"
            value={sweepEpochId}
            onChange={(e) => setSweepEpochId(e.target.value)}
            style={inputStyle}
          />
          <TxButton label="Force sweep ready" onRun={() => call("forceSweepReady", [BigInt(sweepEpochId || "0")])} />
        </ActionCard>

        <ActionCard
          title="External pool whitelist"
          description={`Tổng đang triển khai ra ngoài: ${
            totalExternalDeployed !== undefined ? (Number(totalExternalDeployed) / 1e6).toLocaleString() : "..."
          } USDC. Thêm target mới có trễ 3 ngày mới dùng được (setAllowedTarget); gỡ thì tức thì.`}
        >
          <input
            placeholder="0x... địa chỉ pool ngoài"
            value={targetInput}
            onChange={(e) => setTargetInput(e.target.value)}
            style={inputStyle}
          />
          {isAddr(targetInput) && (
            <div style={{ fontSize: "var(--fs-0)", color: "var(--color-text-faint)", marginBottom: 10 }}>
              {targetAllowedAt === undefined || targetAllowedAt === 0n
                ? "Chưa được đề xuất."
                : Date.now() / 1000 >= Number(targetAllowedAt)
                  ? "✓ Đã dùng được."
                  : `Đang chờ trễ hiệu lực, dùng được từ ${new Date(Number(targetAllowedAt) * 1000).toLocaleString()}.`}
            </div>
          )}
          <div style={{ display: "flex", gap: 10 }}>
            <TxButton
              label="Propose (3-day timelock)"
              onRun={async () => {
                const h = await call("proposeAllowedTarget", [targetInput]);
                refetchTargetStatus();
                return h;
              }}
            />
            <TxButton
              variant="accent"
              label="Revoke (ngay lập tức)"
              onRun={async () => {
                const h = await call("revokeAllowedTarget", [targetInput]);
                refetchTargetStatus();
                return h;
              }}
            />
          </div>
        </ActionCard>

        <ActionCard
          title="Execute external call"
          description={`Gửi tiền pool tới target đã whitelist, hoặc gọi lại để rút về. Đã triển khai ở target này: ${
            execTargetDeployed !== undefined ? (Number(execTargetDeployed) / 1e6).toLocaleString() : "..."
          } USDC. Cần pause trước.`}
        >
          <input
            placeholder="0x... target (phải đã whitelist)"
            value={execTarget}
            onChange={(e) => setExecTarget(e.target.value)}
            style={inputStyle}
          />
          <input
            placeholder="Approve amount (USDC) — 0 nếu chỉ rút về"
            value={execApprove}
            onChange={(e) => setExecApprove(e.target.value)}
            style={inputStyle}
          />
          <input
            placeholder="Calldata (0x...) gọi hàm supply/withdraw của target"
            value={execCalldata}
            onChange={(e) => setExecCalldata(e.target.value)}
            style={inputStyle}
          />
          <TxButton
            label="Execute"
            onRun={() =>
              call("executeExternalCall", [
                execTarget,
                parseUnits(execApprove || "0", 6),
                execCalldata || "0x",
              ])
            }
          />
        </ActionCard>
      </>
    );
  }

  return (
    <div className="app-shell">
      <div style={{ height: "var(--row-h)", position: "sticky", top: 0, zIndex: 20 }}>
        <Navbar onDeposit={noop} onWithdraw={noop} onDrawHistory={noop} onMyHistory={noop} onMyReferral={noop} />
      </div>
      <div style={{ padding: "16px" }}>
        <div
          style={{
            fontSize: "var(--fs-3)",
            fontWeight: 700,
            fontFamily: "var(--font-display)",
            letterSpacing: "-0.01em",
            color: "var(--color-text)",
            marginBottom: "var(--gap)",
          }}
        >
          Admin
        </div>
        {content}
      </div>
    </div>
  );
}
