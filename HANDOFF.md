# HANDOFF – LuckyStaker

> No-loss weekly USDC prize pool trên Arc. Gộp tiền gửi của nhiều người vào 1
> pool, mỗi tuần quay số ngẫu nhiên trao toàn bộ yield của tuần đó cho một vài
> người, thay vì chia đều lãi cho tất cả. Không ai mất gốc — rút lại 100% USDC
> đã gửi bất cứ lúc nào.

**Repo:** https://github.com/KattyFury/LuckyStaker (đổi tên từ `LuckyStacker` → `LuckyStaker` ngày 2026-08-23, sửa lỗi chính tả — bao gồm cả redeploy contract để đồng bộ tên)
**Spec gốc:** [`arc-prize-pool-spec.md`](./arc-prize-pool-spec.md) — đã có trong repo, encoding sạch

---

## Trạng thái nghỉ 2026-08-23 — ĐÃ DEPLOY THẬT LÊN ARC TESTNET (bản đổi tên, mới nhất)

**Toàn bộ pipeline chạy thật end-to-end, verify trực tiếp on-chain.**

- **Contract đã deploy:** proxy **`0xCaC33b281a48f2C6ac92c3AaeD9bF5466Eb65fa6`** trên Arc Testnet (chainId 5042002). Implementation `0x953Fdc98172Cc4F63cC95fe571A75eE9eFE24b6b`. Verify on-chain: `currentEpochId=1`, `poolToken` đúng USDC, Safe có `DEFAULT_ADMIN_ROLE`, ví bot có `KEEPER_ROLE`.
  - ⚠️ **Địa chỉ cũ `0x182a77Adc866e81e059F147255bcdcD063Cb2736` (tên contract `LuckyStackerPool`) ĐÃ BỎ** — redeploy lại hoàn toàn dưới tên `LuckyStakerPool` theo yêu cầu đổi chính tả của user. Epoch 1 cũ mất tiến độ (đã commit nhưng chưa reveal), không sao vì chưa ai deposit thật.
- **Admin Safe 2-of-2:** `0x0f5514fCA02b639229528a5521dafd0a61bb27ef` — 2 owner là 2 ví cá nhân của user (`0xEb2D222d28F35fE7BeB5387f8Bc4eBF65f2652F6` và `0xb0ea48A1979326BA9e0b5027D105C8DF9CCAA12E`), tạo qua app.safe.global (Arc Testnet có hỗ trợ chính thức). Có 120 USDC test. **Không đổi khi redeploy** — vẫn dùng Safe cũ.
- **Ví bot (deploy + keeper):** `0x4672A3B3C14727629107711D9853B52e8E1E26B1`. Private key trong `contracts/.env` + `automation/.env` (gitignored) và GitHub Secrets (`KEEPER_PRIVATE_KEY`) — KHÔNG in ra chat. Có ~19.6 USDC (đã trừ gas 2 lần deploy).
- **`fund-yield` và `draw` đã chạy thật trên contract MỚI, thành công:** funded 0.357142 USDC yield cho epoch 1, đã commit randomness (chưa reveal — chờ epoch hết hạn ~2026-08-30).
- **Frontend:** trỏ `VITE_POOL_ADDRESS` vào contract mới, verify bằng Playwright — Dashboard hiện đúng "LuckyStaker" + "EPOCH #0001" + đếm ngược thật, 0 lỗi console.
- **GitHub:** collaborator `still2412` đã được mời (quyền write, đang chờ accept). Repo đã đổi tên, `gh secret` `POOL_ADDRESS` đã cập nhật theo địa chỉ mới.

**Còn lại — không khẩn:**
1. **Chờ epoch 1 hết hạn (~2026-08-30)** rồi chạy `npm run draw` lần nữa (trong `automation/`) để reveal + quay số thật, hoặc để cron `keeper.yml` tự làm.
2. Test luồng Deposit/Withdraw/Claim bằng ví thật trên frontend (chưa ai deposit thật, `Total Pool` vẫn $0).
3. Theo dõi `still2412` đã accept lời mời GitHub collaborator chưa.

---

## Stack & địa chỉ quan trọng (Arc Testnet)

| | |
|---|---|
| Chain ID | `5042002` |
| RPC | `https://rpc.testnet.arc.io` |
| Explorer | `https://testnet.arcscan.app` |
| USDC (ERC-20, cũng là gas token) | `0x3600000000000000000000000000000000000000` |
| Multicall3From (batch approve+deposit 1 chữ ký) | `0x522fAf9A91c41c443c66765030741e4AaCe147D0` |
| **LuckyStakerPool (proxy, dùng địa chỉ này)** | `0xCaC33b281a48f2C6ac92c3AaeD9bF5466Eb65fa6` |
| Admin Safe (2-of-2) | `0x0f5514fCA02b639229528a5521dafd0a61bb27ef` |
| Ví bot (deploy + keeper) | `0x4672A3B3C14727629107711D9853B52e8E1E26B1` |

## Bài học/gotcha phát hiện lúc build (đừng lặp lại)

- **OpenZeppelin Contracts Upgradeable v5.6 đã bỏ `ReentrancyGuardUpgradeable`** — dùng `ReentrancyGuardTransient` (từ package `@openzeppelin/contracts` KHÔNG PHẢI `-upgradeable`, dùng transient storage nên an toàn với proxy dù không có hàm init riêng) + bắt buộc set `evmVersion: "cancun"` trong `hardhat.config.ts`, thiếu dòng này sẽ lỗi biên dịch transient storage.
- **`UUPSUpgradeable` v5 cũng bỏ luôn `__UUPSUpgradeable_init()`** — gọi hàm này trong `initialize()` sẽ báo lỗi "Undeclared identifier", chỉ cần các mixin khác gọi `__init()`.
- **Hardhat 2.x + `hardhat-toolbox-viem` chạy test bằng Mocha, KHÔNG PHẢI `node:test`** — lỡ `import { describe, it } from "node:test"` sẽ làm mọi test bị bỏ qua âm thầm (`0 passing`, không báo lỗi gì).
- **Privy: nếu `appId` rỗng/không hợp lệ, `PrivyProvider` sẽ crash TOÀN BỘ app** — đã tự viết `USE_PRIVY` flag (`frontend/src/config/authMode.ts`) để chọn giữa cây Provider có Privy và cây plain wagmi + injected connector (MetaMask).
- **gh CLI token của KattyFury thiếu quyền `workflow` mặc định** — push file trong `.github/workflows/` bị GitHub từ chối cho tới khi chạy `gh auth refresh -h github.com -s workflow` (cần user tự nhập code trên trình duyệt).
- **Hardhat Ignition `deploy` hỏi xác nhận `(y/N)` trên terminal không tương tác** — không có flag `--yes`, phải pipe `echo "y" |` vào lệnh.
- **Frontend đọc dữ liệu on-chain qua react-query là bất đồng bộ** — chụp screenshot ngay sau `domcontentloaded` sẽ thấy giá trị rỗng (VD "EPOCH #----") dù mọi thứ đúng; phải đợi vài giây cho RPC round-trip.
- **Root `package.json` với `"workspaces"` làm `npm install` trong subfolder tự động hoist lên node_modules gốc** (npm coi cả repo là 1 workspace), gây lệch state giữa lockfile gốc và lockfile từng subfolder. Đã bỏ hẳn root `package.json` — mỗi subfolder (`contracts/frontend/automation`) cài đặt độc lập như tài liệu README mô tả, không dùng workspaces.
- **Đổi tên contract Solidity đã deploy = phải redeploy toàn bộ**, không có cách "sửa tên" tại chỗ — địa chỉ, ABI, mọi thứ đều đổi theo bytecode mới. Cân nhắc kỹ trước khi đặt tên contract lần đầu.

## Việc tiếp theo khi quay lại

1. Chạy `npm run draw` (trong `automation/`) sau khi epoch 1 hết hạn để reveal + quay số — hoặc để cron `keeper.yml` tự làm.
2. Test luồng Deposit/Withdraw/Claim bằng ví thật trên frontend.
3. Theo dõi `still2412` đã accept lời mời GitHub collaborator chưa.
