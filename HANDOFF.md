# HANDOFF – LuckyStaker

> No-loss weekly USDC prize pool trên Arc. Gộp tiền gửi của nhiều người vào 1
> pool, mỗi tuần quay số ngẫu nhiên trao toàn bộ yield của tuần đó cho một vài
> người, thay vì chia đều lãi cho tất cả. Không ai mất gốc — rút lại 100% USDC
> đã gửi bất cứ lúc nào.

**Repo:** https://github.com/KattyFury/LuckyStaker (đổi tên từ `LuckyStacker` → `LuckyStaker` ngày 2026-08-23, sửa lỗi chính tả — bao gồm cả redeploy contract để đồng bộ tên)
**Spec gốc:** [`arc-prize-pool-spec.md`](./arc-prize-pool-spec.md) — đã có trong repo, encoding sạch

---

## Trạng thái nghỉ 2026-08-23 — ĐÃ DEPLOY THẬT LÊN ARC TESTNET (bản có forceEndEpoch để test nhanh)

**Toàn bộ pipeline chạy thật end-to-end, verify trực tiếp on-chain.**

- **Contract đã deploy:** proxy **`0x88dCB2f36356AA8DADdC2e8fb4A3E122Ba9D0Beb`** trên Arc Testnet (chainId 5042002). Implementation `0x9b59644e4475B894c83c9e66962ca80171d3eB16`. Verify on-chain: `currentEpochId` tăng đúng, Safe có `DEFAULT_ADMIN_ROLE`, ví bot có `KEEPER_ROLE`.
  - ⚠️ **2 địa chỉ cũ đã bỏ** (không dùng nữa): `0x182a77...` (tên contract cũ `LuckyStackerPool`) và `0xCaC33b...` (bản đổi tên nhưng chưa có `forceEndEpoch`). Mỗi lần đổi contract = redeploy toàn bộ, không có cách "sửa tại chỗ".
  - **Tính năng mới: `forceEndEpoch()` (chỉ `KEEPER_ROLE` gọi được)** — cho phép kết thúc epoch hiện tại NGAY LẬP TỨC (bỏ qua chờ 7 ngày thật), miễn là đã `commitRandom` trước đó. Mục đích: test/fix bug nhanh, KHÔNG dùng cho sản xuất thật (sẽ phá vỡ tính công bằng "phải giữ đủ 1 tuần" nếu dùng bừa khi có người gửi tiền thật — cân nhắc revoke `KEEPER_ROLE` khỏi ví bot hoặc bỏ hẳn hàm này trước khi có depositor thật).
- **Script test nhanh: `npm run draw:now`** (trong `automation/`) — chạy `commitRandom` → `forceEndEpoch` → `revealAndDraw` liên tiếp trong 1 lệnh, xổ số ngay lập tức, không cần chờ gì cả. Đã test **2 lần liên tiếp thành công** (epoch 1 và epoch 2), lặp lại được thoải mái để debug. Script `npm run draw` (bản thật, tôn trọng thời gian epoch) vẫn giữ nguyên cho production/cron.
- **Admin Safe 2-of-2:** `0x0f5514fCA02b639229528a5521dafd0a61bb27ef` — 2 owner là 2 ví cá nhân của user (`0xEb2D222d28F35fE7BeB5387f8Bc4eBF65f2652F6` và `0xb0ea48A1979326BA9e0b5027D105C8DF9CCAA12E`), tạo qua app.safe.global. Có 120 USDC test. Không đổi qua các lần redeploy.
- **Ví bot (deploy + keeper):** `0x4672A3B3C14727629107711D9853B52e8E1E26B1`. Private key trong `contracts/.env` + `automation/.env` (gitignored) và GitHub Secrets (`KEEPER_PRIVATE_KEY`) — KHÔNG in ra chat. USDC còn lại giảm dần theo mỗi lần deploy/test (theo dõi qua faucet nếu cạn).
- **Frontend:** trỏ `VITE_POOL_ADDRESS` vào contract mới nhất, verify bằng Playwright — hiện đúng "LuckyStaker" + dữ liệu epoch thật, 0 lỗi console.
- **GitHub:** collaborator `still2412` đã được mời (quyền write, đang chờ accept). Repo đã đổi tên, `gh secret POOL_ADDRESS` đã cập nhật theo địa chỉ mới nhất.

**Còn lại — không khẩn:**
1. Dùng `npm run draw:now` để test lặp lại các luồng claim/sweep/UI bao nhiêu lần tuỳ ý trong lúc còn debug.
2. Test luồng Deposit/Withdraw/Claim bằng ví thật trên frontend (chưa ai deposit thật, `Total Pool` vẫn $0).
3. Theo dõi `still2412` đã accept lời mời GitHub collaborator chưa.
4. **Trước khi có depositor thật / lên thật:** cân nhắc revoke quyền gọi `forceEndEpoch` của ví bot (hoặc bỏ hẳn hàm này khỏi contract bằng 1 bản redeploy sạch) để không ai phá được nhịp "đủ 1 tuần" của epoch thật.

---

## Stack & địa chỉ quan trọng (Arc Testnet)

| | |
|---|---|
| Chain ID | `5042002` |
| RPC | `https://rpc.testnet.arc.io` |
| Explorer | `https://testnet.arcscan.app` |
| USDC (ERC-20, cũng là gas token) | `0x3600000000000000000000000000000000000000` |
| Multicall3From (batch approve+deposit 1 chữ ký) | `0x522fAf9A91c41c443c66765030741e4AaCe147D0` |
| **LuckyStakerPool (proxy, dùng địa chỉ này)** | `0x88dCB2f36356AA8DADdC2e8fb4A3E122Ba9D0Beb` |
| Admin Safe (2-of-2) | `0x0f5514fCA02b639229528a5521dafd0a61bb27ef` |
| Ví bot (deploy + keeper) | `0x4672A3B3C14727629107711D9853B52e8E1E26B1` |

## Bài học/gotcha phát hiện lúc build (đừng lặp lại)

- **OpenZeppelin Contracts Upgradeable v5.6 đã bỏ `ReentrancyGuardUpgradeable`** — dùng `ReentrancyGuardTransient` (từ package `@openzeppelin/contracts` KHÔNG PHẢI `-upgradeable`) + bắt buộc set `evmVersion: "cancun"` trong `hardhat.config.ts`.
- **`UUPSUpgradeable` v5 cũng bỏ luôn `__UUPSUpgradeable_init()`** — gọi hàm này trong `initialize()` sẽ báo lỗi "Undeclared identifier".
- **Hardhat 2.x + `hardhat-toolbox-viem` chạy test bằng Mocha, KHÔNG PHẢI `node:test`** — lỡ `import { describe, it } from "node:test"` sẽ làm mọi test bị bỏ qua âm thầm (`0 passing`, không báo lỗi gì).
- **Privy: nếu `appId` rỗng/không hợp lệ, `PrivyProvider` sẽ crash TOÀN BỘ app** — đã tự viết `USE_PRIVY` flag (`frontend/src/config/authMode.ts`) để chọn giữa cây Provider có Privy và cây plain wagmi + injected connector (MetaMask).
- **gh CLI token của KattyFury thiếu quyền `workflow` mặc định** — push file trong `.github/workflows/` bị GitHub từ chối cho tới khi chạy `gh auth refresh -h github.com -s workflow`.
- **Hardhat Ignition `deploy` hỏi xác nhận `(y/N)` trên terminal không tương tác** — không có flag `--yes`, phải pipe `echo "y" |` vào lệnh.
- **Frontend đọc dữ liệu on-chain qua react-query là bất đồng bộ** — chụp screenshot ngay sau `domcontentloaded` sẽ thấy giá trị rỗng dù mọi thứ đúng; phải đợi vài giây cho RPC round-trip.
- **Root `package.json` với `"workspaces"` làm `npm install` trong subfolder tự động hoist lên node_modules gốc**, gây lệch state lockfile. Đã bỏ hẳn — mỗi subfolder cài đặt độc lập.
- **Đổi tên contract Solidity đã deploy = phải redeploy toàn bộ**, không có cách "sửa tên" tại chỗ.
- **Epoch 7 ngày/sweep 3 ngày là hằng số cứng trong contract → không test nhanh được vòng lặp commit-reveal thật.** Thay vì đổi thời lượng epoch (phức tạp, ảnh hưởng epoch đang chạy dở), giải pháp gọn hơn: thêm hàm `forceEndEpoch()` cho keeper gọi để kết thúc epoch ngay sau khi đã commit — không đổi logic random/fairness gì cả (keeper vẫn không đoán trước được blockhash lúc reveal), chỉ bỏ qua bước CHỜ.

## Việc tiếp theo khi quay lại

1. Dùng `npm run draw:now` (trong `automation/`) để test nhanh — không cần chờ epoch thật.
2. Test luồng Deposit/Withdraw/Claim bằng ví thật trên frontend.
3. Theo dõi `still2412` đã accept lời mời GitHub collaborator chưa.
4. Trước khi có depositor thật: cân nhắc khoá lại `forceEndEpoch` (xem mục cảnh báo ở trên).
