# HANDOFF – LuckyStacker

> No-loss weekly USDC prize pool trên Arc. Gộp tiền gửi của nhiều người vào 1
> pool, mỗi tuần quay số ngẫu nhiên trao toàn bộ yield của tuần đó cho một vài
> người, thay vì chia đều lãi cho tất cả. Không ai mất gốc — rút lại 100% USDC
> đã gửi bất cứ lúc nào.

**Repo:** https://github.com/KattyFury/LuckyStacker
**Spec gốc:** `arc-prize-pool-spec.md` (⚠️ xem mục "Nợ kỹ thuật" bên dưới — file này CHƯA có trong repo, bị lỗi encoding khi truyền vào chat)

---

## Trạng thái nghỉ 2026-08-23 — ĐÃ DEPLOY THẬT LÊN ARC TESTNET

**Toàn bộ pipeline chạy thật end-to-end, verify trực tiếp on-chain, không chỉ "chắc là được".**

- **Contract đã deploy:** proxy `0x182a77Adc866e81e059F147255bcdcD063Cb2736` trên Arc Testnet (chainId 5042002). Implementation `0x2D3c6E4E9061C58d6f39A5bE64999a72ECFF936F`. Verify on-chain: `currentEpochId=1`, `poolToken` đúng USDC, Safe có `DEFAULT_ADMIN_ROLE`, ví bot có `KEEPER_ROLE`.
- **Admin Safe 2-of-2:** `0x0f5514fCA02b639229528a5521dafd0a61bb27ef` — 2 owner là 2 ví cá nhân của user (`0xEb2D222d28F35fE7BeB5387f8Bc4eBF65f2652F6` và `0xb0ea48A1979326BA9e0b5027D105C8DF9CCAA12E`), tự tạo qua app.safe.global (Arc Testnet có hỗ trợ chính thức). Đã nạp 120 USDC test.
- **Ví bot (deploy + keeper), Claude tự sinh mới:** `0x4672A3B3C14727629107711D9853B52e8E1E26B1`. Private key nằm trong `contracts/.env` + `automation/.env` (gitignored) **và** GitHub Secrets (`KEEPER_PRIVATE_KEY`) của repo — KHÔNG in ra chat sau khi tạo. Có 20 USDC test để trả gas.
- **`fund-yield` và `draw` đã chạy thật 1 lần bằng tay, thành công:** funded 0.357142 USDC yield cho epoch 1 (đúng công thức `max($10,...)/28`), đã commit randomness cho epoch 1 (chưa reveal vì epoch chưa hết hạn — 7 ngày kể từ deploy, tức khoảng 2026-08-30).
- **Frontend:** đã trỏ `VITE_POOL_ADDRESS` vào contract thật, verify bằng Playwright — Dashboard hiện đúng "EPOCH #0001" + đếm ngược thật, 0 lỗi console.
- **GitHub:** collaborator `still2412` đã được mời (quyền write, đang chờ họ accept invite).

**Còn lại — không khẩn, làm khi cần:**
1. **Chờ tới khi epoch 1 hết hạn (~2026-08-30)** rồi chạy `npm run draw` lần nữa (trong `automation/`) để reveal + quay số thật. Có thể để cron `keeper.yml` tự làm (đã có secrets), hoặc chạy tay.
2. **Thả file `arc-prize-pool-spec.md` bản sạch vào repo** — xem mục "Nợ kỹ thuật" bên dưới.
3. Test thử luồng Deposit/Withdraw/Claim bằng ví thật trên frontend (chưa ai deposit thật, `Total Pool` vẫn $0).

---

## Nợ kỹ thuật: file spec gốc bị lỗi encoding

`arc-prize-pool-spec.md` được đưa vào context lúc bắt đầu phiên 2026-08-22 nhưng **bị mojibake nặng** (UTF-8 bị đọc nhầm encoding 1 byte rồi mất luôn một số byte trong dải 0x80-0x9F — không tự động đảo ngược 100% chính xác được, đã thử `iconv-lite` windows-1252 round-trip vẫn mất ký tự ở nhiều từ có dấu ớ/ờ/ợ...). Toàn bộ NỘI DUNG spec đã được hiểu và áp dụng đúng vào code, nhưng chưa dám ghi file này vào repo vì sợ ghi sai chính tả do đoán nhầm ký tự đã mất.

**Việc cần làm:** user tìm lại bản gốc sạch (rất có thể đã tạo ở phiên chat trước theo đúng quy trình "Bước 1-4" mô tả trong spec) và thả file `arc-prize-pool-spec.md` (encoding UTF-8 chuẩn) vào thẳng thư mục gốc `LuckyStacker/`, rồi báo lại — sẽ commit ngay.

---

## Stack & địa chỉ quan trọng (Arc Testnet)

| | |
|---|---|
| Chain ID | `5042002` |
| RPC | `https://rpc.testnet.arc.io` |
| Explorer | `https://testnet.arcscan.app` |
| USDC (ERC-20, cũng là gas token) | `0x3600000000000000000000000000000000000000` |
| Multicall3From (batch approve+deposit 1 chữ ký) | `0x522fAf9A91c41c443c66765030741e4AaCe147D0` |
| **LuckyStackerPool (proxy, dùng địa chỉ này)** | `0x182a77Adc866e81e059F147255bcdcD063Cb2736` |
| Admin Safe (2-of-2) | `0x0f5514fCA02b639229528a5521dafd0a61bb27ef` |
| Ví bot (deploy + keeper) | `0x4672A3B3C14727629107711D9853B52e8E1E26B1` |

## Bài học/gotcha phát hiện lúc build (đừng lặp lại)

- **OpenZeppelin Contracts Upgradeable v5.6 đã bỏ `ReentrancyGuardUpgradeable`** — dùng `ReentrancyGuardTransient` (từ package `@openzeppelin/contracts` KHÔNG PHẢI `-upgradeable`, dùng transient storage nên an toàn với proxy dù không có hàm init riêng) + bắt buộc set `evmVersion: "cancun"` trong `hardhat.config.ts`, thiếu dòng này sẽ lỗi biên dịch transient storage.
- **`UUPSUpgradeable` v5 cũng bỏ luôn `__UUPSUpgradeable_init()`** — gọi hàm này trong `initialize()` sẽ báo lỗi "Undeclared identifier", chỉ cần các mixin khác gọi `__init()`.
- **Hardhat 2.x + `hardhat-toolbox-viem` chạy test bằng Mocha, KHÔNG PHẢI `node:test`** — lỡ `import { describe, it } from "node:test"` sẽ làm mọi test bị bỏ qua âm thầm (`0 passing`, không báo lỗi gì) vì mocha không nhận diện được các test đã đăng ký qua registry của `node:test`.
- **Privy: nếu `appId` rỗng/không hợp lệ, `PrivyProvider` sẽ crash TOÀN BỘ app** (không tự fallback nhẹ nhàng) — đã tự viết `USE_PRIVY` flag (`frontend/src/config/authMode.ts`) để chọn giữa cây Provider có Privy và cây plain wagmi + injected connector (MetaMask), tránh app trắng trang khi chưa có Privy account.
- **gh CLI token của KattyFury thiếu quyền `workflow` mặc định** — push file trong `.github/workflows/` bị GitHub từ chối cho tới khi chạy `gh auth refresh -h github.com -s workflow` (cần user tự nhập code trên trình duyệt, không tự động hoá được).
- **Hardhat Ignition `deploy` hỏi xác nhận `(y/N)` trên terminal không tương tác** — không có flag `--yes`, phải pipe `echo "y" |` vào lệnh.
- **Frontend đọc dữ liệu on-chain qua react-query là bất đồng bộ** — chụp screenshot/kiểm tra ngay sau khi trang load xong (`domcontentloaded`) sẽ thấy giá trị mặc định/rỗng (VD "EPOCH #----") dù mọi thứ đúng; phải đợi vài giây cho RPC round-trip xong mới thấy đúng số liệu thật.

## Việc tiếp theo khi quay lại

1. Chạy `npm run draw` (trong `automation/`) sau khi epoch 1 hết hạn để reveal + quay số — hoặc để cron `keeper.yml` tự làm.
2. Thả `arc-prize-pool-spec.md` bản sạch vào repo (xem mục "Nợ kỹ thuật" ở trên).
3. Test luồng Deposit/Withdraw/Claim bằng ví thật trên frontend.
4. Theo dõi `still2412` đã accept lời mời GitHub collaborator chưa.
