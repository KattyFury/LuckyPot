# HANDOFF – LuckyStacker

> No-loss weekly USDC prize pool trên Arc. Gộp tiền gửi của nhiều người vào 1
> pool, mỗi tuần quay số ngẫu nhiên trao toàn bộ yield của tuần đó cho một vài
> người, thay vì chia đều lãi cho tất cả. Không ai mất gốc — rút lại 100% USDC
> đã gửi bất cứ lúc nào.

**Repo:** https://github.com/KattyFury/LuckyStacker
**Spec gốc:** `arc-prize-pool-spec.md` (⚠️ xem mục "Nợ kỹ thuật" bên dưới — file này CHƯA có trong repo, bị lỗi encoding khi truyền vào chat)

---

## Trạng thái nghỉ 2026-08-22 — đọc trước khi làm tiếp

**Đã build xong khung sườn đầy đủ theo spec trong 1 phiên, đã push lên GitHub.**

- **Contract** (`contracts/`) — `LuckyStackerPool.sol`, UUPS-upgradeable. Compile sạch, **7/7 test pass**, deploy thử qua Hardhat Ignition (local) chạy được. **CHƯA deploy lên Arc Testnet thật** (đang chờ Safe address).
- **Frontend** (`frontend/`) — React + Vite + wagmi + viem + Privy, layout khớp đúng ảnh tham khảo user gửi (Roboto, lưới 15 hàng, xanh/vàng/xám). Build được, dev server chạy verify bằng Playwright headless — **0 lỗi console**. **Privy ĐÃ CÓ App ID thật** (`cmt43aax701w40cl5r86us72b`, nằm trong `frontend/.env` — gitignored, KHÔNG commit), đã test bấm "Connect Wallet" mở đúng popup login Privy.
- **Automation** (`automation/`) — script `fund-yield` + `draw` (commit-reveal) viết xong, GitHub Actions workflow `keeper.yml` đã push lên (chạy cron 6h/lần, cần secrets `KEEPER_PRIVATE_KEY` + `POOL_ADDRESS` mới hoạt động được).

**3 việc còn treo, chưa xong (đang chờ user):**
1. **Safe 2-of-2 cho admin** — CHƯA tạo. User đang định thêm 1 người bạn làm chữ ký thứ 2 (2-of-2 multisig), đang chờ **địa chỉ ví (0x...)** của bạn đó. Hướng dẫn đầy đủ đã gửi trong chat: app.safe.global → chọn network Arc Testnet (Safe đã hỗ trợ chính thức, xác nhận qua docs.safe.global có trang riêng cho Arc Testnet) → tạo Safe, 2 owner, threshold 2/2.
2. **Add bạn đó làm GitHub collaborator** trên repo — đang chờ username GitHub của họ.
3. **Deploy contract thật lên Arc Testnet** — cần `ADMIN_SAFE_ADDRESS` (từ bước 1) + USDC testnet nạp cho ví deployer/keeper qua Circle faucet (https://faucet.circle.com, 20 USDC/ngày/địa chỉ).

---

## Nợ kỹ thuật: file spec gốc bị lỗi encoding

`arc-prize-pool-spec.md` được đưa vào context lúc bắt đầu phiên này nhưng **bị mojibake nặng** (kiểu UTF-8 bị đọc nhầm encoding 1 byte rồi mất luôn một số byte trong dải 0x80-0x9F — không phải lỗi có thể tự động đảo ngược 100% chính xác, đã thử `iconv-lite` windows-1252 round-trip và vẫn mất ký tự ở nhiều từ có dấu ớ/ờ/ợ...). Toàn bộ NỘI DUNG spec đã được hiểu và áp dụng đúng vào code (đọc được nghĩa dù chữ bị lỗi hiển thị), nhưng **chưa dám ghi file này vào repo vì sợ ghi sai chính tả do đoán nhầm ký tự mất**.

**Việc cần làm:** user tìm lại bản gốc sạch (rất có thể đã tạo ở phiên chat trước theo đúng quy trình "Bước 1-4" mô tả trong spec) và thả file `arc-prize-pool-spec.md` (encoding UTF-8 chuẩn) vào thẳng thư mục gốc `LuckyStacker/`, rồi báo lại — sẽ commit ngay. Nếu không tìm lại được bản gốc, có thể yêu cầu viết lại từ đầu dựa theo README + code hiện tại (đã phản ánh đúng mọi quyết định trong spec).

---

## Stack & địa chỉ quan trọng (Arc Testnet)

| | |
|---|---|
| Chain ID | `5042002` |
| RPC | `https://rpc.testnet.arc.io` |
| Explorer | `https://testnet.arcscan.app` |
| USDC (ERC-20, cũng là gas token) | `0x3600000000000000000000000000000000000000` |
| Multicall3From (batch approve+deposit 1 chữ ký) | `0x522fAf9A91c41c443c66765030741e4AaCe147D0` |

## Bài học/gotcha phát hiện lúc build (đừng lặp lại)

- **OpenZeppelin Contracts Upgradeable v5.6 đã bỏ `ReentrancyGuardUpgradeable`** — dùng `ReentrancyGuardTransient` (từ package `@openzeppelin/contracts` KHÔNG PHẢI `-upgradeable`, dùng transient storage nên an toàn với proxy dù không có hàm init riêng) + bắt buộc set `evmVersion: "cancun"` trong `hardhat.config.ts`, thiếu dòng này sẽ lỗi biên dịch transient storage.
- **`UUPSUpgradeable` v5 cũng bỏ luôn `__UUPSUpgradeable_init()`** — gọi hàm này trong `initialize()` sẽ báo lỗi "Undeclared identifier", chỉ cần các mixin khác gọi `__init()`.
- **Hardhat 2.x + `hardhat-toolbox-viem` chạy test bằng Mocha, KHÔNG PHẢI `node:test`** — lỡ `import { describe, it } from "node:test"` sẽ làm mọi test bị bỏ qua âm thầm (`0 passing`, không báo lỗi gì) vì mocha không nhận diện được các test đã đăng ký qua registry của `node:test`.
- **Privy: nếu `appId` rỗng/không hợp lệ, `PrivyProvider` sẽ crash TOÀN BỘ app** (không tự fallback nhẹ nhàng) — đã tự viết `USE_PRIVY` flag (`frontend/src/config/authMode.ts`) để chọn giữa cây Provider có Privy và cây plain wagmi + injected connector (MetaMask), tránh app trắng trang khi chưa có Privy account.
- **gh CLI token của KattyFury thiếu quyền `workflow` mặc định** — push file trong `.github/workflows/` bị GitHub từ chối cho tới khi chạy `gh auth refresh -h github.com -s workflow` (cần user tự nhập code trên trình duyệt, không tự động hoá được).

## Việc tiếp theo khi quay lại

1. Nhận địa chỉ ví bạn (2nd signer cho Safe) + username GitHub → add collaborator qua `gh api` + hướng dẫn tạo Safe 2-of-2 trên app.safe.global (Arc Testnet).
2. Sau khi có Safe address: điền `contracts/.env` (`DEPLOYER_PRIVATE_KEY`, `ADMIN_SAFE_ADDRESS`) rồi `npm run deploy:arcTestnet`.
3. Set `VITE_POOL_ADDRESS` ở `frontend/.env`, `POOL_ADDRESS` + `KEEPER_PRIVATE_KEY` ở `automation/.env` **và** GitHub Secrets (cho workflow cron chạy được).
4. Nạp USDC testnet cho ví keeper qua Circle faucet, chạy thử `npm run fund-yield` + `npm run draw` bằng tay 1 lần trước khi để cron tự chạy.
5. Thả lại `arc-prize-pool-spec.md` bản sạch vào repo (xem mục "Nợ kỹ thuật" ở trên).
