# HANDOFF – LuckyStaker

> No-loss weekly USDC prize pool trên Arc. Gộp tiền gửi của nhiều người vào 1
> pool, mỗi tuần quay số ngẫu nhiên trao toàn bộ yield của tuần đó cho một vài
> người, thay vì chia đều lãi cho tất cả. Không ai mất gốc — rút lại 100% USDC
> đã gửi bất cứ lúc nào.

**Repo:** https://github.com/KattyFury/LuckyStaker (đổi tên từ `LuckyStacker` → `LuckyStaker` ngày 2026-08-23, sửa lỗi chính tả — bao gồm cả redeploy contract để đồng bộ tên)
**Web đang chạy:** https://luckystaker.pages.dev (Cloudflare Pages, project `luckystaker`, deploy tay bằng `npx wrangler pages deploy dist --project-name=luckystaker --branch=main` — **KHÔNG** auto-deploy từ GitHub)
**Spec gốc:** [`arc-prize-pool-spec.md`](./arc-prize-pool-spec.md) — đã có trong repo, encoding sạch

---

## HỆ LƯỚI GIAO DIỆN — đọc trước khi đụng vào bất kỳ layout nào

User rất khắt khe về lưới; đã phải dựng lại 2 lần vì làm sai. **Luật bất di bất dịch:**

- **1 hàng = `--row-h` = 50px CỐ ĐỊNH, giống hệt nhau ở cả desktop lẫn mobile.** User đã cân nhắc và **chọn px cố định thay vì tỉ lệ màn hình** (`1fr`/`vh`), chấp nhận đánh đổi: desktop cần `15×50 + 14×10 = 890px` chiều cao, cửa sổ thấp hơn thì **cuộn**, tuyệt đối không bóp hàng nhỏ lại. **ĐỪNG đổi về `1fr`/`vh`.**
- **Khe giữa hàng 10px** (`--gap`), **box bo góc 15px**.
- **Desktop = 860px** (đúng x2 mobile 430px — user chốt, khác spec ghi 1290). Ngoài khung đổ nền xám `--color-page-bg`, KHÔNG bao giờ giãn full màn hình.
- **Desktop 15 hàng:** 1 navbar · 2 banner · 3-6 EPOCH(1/3) | TOTAL POOL(2/3) · 7-14 DRAW HISTORY(2/3) | MY HISTORY(1/3) · 15 trống.
- **Mobile 13 hàng:** 1 navbar · 2 banner · 3-6 EPOCH · 7-10 POOL · 11 nút DRAW HISTORY · 12 nút MY HISTORY · 13 trống. Hai box history **thu thành nút 1 hàng, bấm mở popup** (để trang mobile không dài lê thê).
- **KHÔNG có padding dọc ở lưới trang** (`padding: 0 20px`) — hàng 1 phải bắt đầu từ đúng mép trên trang, nếu không dải trắng phía trên bị mắt hiểu là một phần hàng 1 và navbar trông như bị đẩy xuống dưới tâm. Khoảng trắng đáy do hàng cuối (trống) đảm nhiệm.
- **Trong box:** nội dung chia **4 hàng bằng nhau + khe 10px**, mỗi yếu tố 1 hàng (EPOCH: mô tả chiếm 2 hàng cuối).
- **Đường kẻ dưới navbar dùng `box-shadow`, KHÔNG dùng `border-bottom`** — border nằm trong hộp nên đẩy nội dung lệch tâm 0.5px.
- **Thang chữ 35/30/25/20/15** (`--fs-1..5`) + **`--fs-caption: 17px` riêng cho chú thích** (nằm ngoài thang, user chốt "từ nay chú thích là 17"). Chỉ dùng biến, không tự chế cỡ.
- **Header của box: 20px, BOLD, Roboto Condensed**, có **đường kẻ ngăn với nội dung** (`.box-header` / `.card-list__header`, vẽ bằng `box-shadow`). Nội dung số liệu cũng dùng Condensed (`--font-condensed`).
- **Trong box KHÔNG có padding trên** (`padding: 0 20px 20px`) — user chốt sau khi thử.
- Cách kiểm tra: đừng tin mắt, mở Playwright đo `getBoundingClientRect` / `gridTemplateRows` rồi so số (xem mục "Bài học" bên dưới).

---

## Trạng thái nghỉ 2026-08-23 — ĐÃ DEPLOY THẬT LÊN ARC TESTNET (bản có forceEndEpoch để test nhanh)

**Toàn bộ pipeline chạy thật end-to-end, verify trực tiếp on-chain.**

- **Contract đã deploy:** proxy **`0x88dCB2f36356AA8DADdC2e8fb4A3E122Ba9D0Beb`** trên Arc Testnet (chainId 5042002). Implementation `0x9b59644e4475B894c83c9e66962ca80171d3eB16`. Verify on-chain: `currentEpochId` tăng đúng, Safe có `DEFAULT_ADMIN_ROLE`, ví bot có `KEEPER_ROLE`.
  - ⚠️ **2 địa chỉ cũ đã bỏ** (không dùng nữa): `0x182a77...` (tên contract cũ `LuckyStackerPool`) và `0xCaC33b...` (bản đổi tên nhưng chưa có `forceEndEpoch`). Mỗi lần đổi contract = redeploy toàn bộ, không có cách "sửa tại chỗ".
  - **Tính năng mới: `forceEndEpoch()` (chỉ `KEEPER_ROLE` gọi được)** — cho phép kết thúc epoch hiện tại NGAY LẬP TỨC (bỏ qua chờ 7 ngày thật), miễn là đã `commitRandom` trước đó. Mục đích: test/fix bug nhanh, KHÔNG dùng cho sản xuất thật (sẽ phá vỡ tính công bằng "phải giữ đủ 1 tuần" nếu dùng bừa khi có người gửi tiền thật — cân nhắc revoke `KEEPER_ROLE` khỏi ví bot hoặc bỏ hẳn hàm này trước khi có depositor thật).
- **Script test nhanh: `npm run draw:now`** (trong `automation/`) — chạy `commitRandom` → `forceEndEpoch` → `revealAndDraw` liên tiếp trong 1 lệnh, xổ số ngay lập tức, không cần chờ gì cả. Đã test **2 lần liên tiếp thành công** (epoch 1 và epoch 2), lặp lại được thoải mái để debug. Script `npm run draw` (bản thật, tôn trọng thời gian epoch) vẫn giữ nguyên cho production/cron.
- **Admin Safe 2-of-2:** `0x0f5514fCA02b639229528a5521dafd0a61bb27ef` — 2 owner là 2 ví cá nhân của user (`0xEb2D222d28F35fE7BeB5387f8Bc4eBF65f2652F6` và `0xb0ea48A1979326BA9e0b5027D105C8DF9CCAA12E`), tạo qua app.safe.global. Có 120 USDC test. Không đổi qua các lần redeploy.
- **Ví bot (deploy + keeper):** `0x4672A3B3C14727629107711D9853B52e8E1E26B1`. Private key trong `contracts/.env` + `automation/.env` (gitignored) và GitHub Secrets (`KEEPER_PRIVATE_KEY`) — KHÔNG in ra chat. USDC còn lại giảm dần theo mỗi lần deploy/test (theo dõi qua faucet nếu cạn).
- **Frontend:** trỏ `VITE_POOL_ADDRESS` vào contract mới nhất, đã deploy lên Cloudflare Pages, verify bằng Playwright — 0 lỗi console.
- **GitHub:** collaborator `still2412` đã được mời (quyền write, đang chờ accept). Repo đã đổi tên, `gh secret POOL_ADDRESS` đã cập nhật theo địa chỉ mới nhất.
- **Privy:** App ID thật `cmt43aax701w40cl5r86us72b` nằm ở `frontend/.env` (gitignored). Nếu biến này rỗng, app **tự fallback** sang connector ví injected (MetaMask) thay vì crash — xem `frontend/src/config/authMode.ts`.

### Trạng thái UI hiện tại (cuối phiên 08-23)

- **Navbar:** bấm địa chỉ ví → dropdown **nền ĐEN** 5 mục, chữ Title Case đồng bộ: Deposit · Withdraw · Draw History · My History · **Disconnect (chữ đỏ)**. Icon copy bấm riêng để copy (có `stopPropagation`), không kèm chữ "copy".
- **Đơn vị tiền hiển thị là `0 USDC`, KHÔNG phải `$0`.** Dùng hook `useAmount()` (`config/tokenUnit.tsx`), đừng tự nối `$` + `formatUSDC` nữa.
- **Toggle `USDC | $ARC`** ở góc phải header box EPOCH (`components/TokenToggle.tsx`) — nút bật qua lại thật, state ở `TokenUnitProvider` bọc trong `App.tsx`, đổi đơn vị toàn app.
  - ⚠️ Pool thật vẫn giữ USDC, **$ARC chưa tồn tại** (spec mục 4: TGE chưa có ngày). Nên khi bật $ARC, banner tự đổi thành *"$ARC isn't live yet — figures are the USDC pool."* để màn hình không nói sai sự thật. **Chưa được user duyệt dòng này** — hỏi lại, nếu user thấy thừa thì bỏ.
- **Luồng Latest Result (đã đổi hẳn theo yêu cầu user):** bấm **không** nhảy sang màn cào nữa. Nó mở popup **DRAW HISTORY của epoch vừa quay**; nếu ví đang kết nối có trong danh sách trúng thì dòng đó **highlight xanh + ghi "You"**, bấm vào dòng đó mới ra popup kết quả.
- **Cào chỉ 1 lần duy nhất:** nhớ bằng `localStorage` khoá `luckystaker:scratched:<addr>:<epochId>`; mở lại lần sau hiện thẳng kết quả. Đã `claim` rồi thì cũng bỏ qua bước cào.
- **Màn Scratch riêng đã XOÁ** (`frontend/src/pages/Scratch.tsx`) — giờ là `components/ResultModal.tsx`. `App.tsx` chỉ còn 3 view: dashboard / deposit / withdraw.
- **Popup dùng chung** `components/Modal.tsx`: header căn trái ở hàng 1, rộng `75vw` mobile / `645px` desktop (đúng spec §5).
- Deposit đã có hiển thị số dư ví + nút MAX; banner tự đổi thành **"Click here to faucet"** (link faucet.circle.com) khi ví có 0 USDC; kết nối ví tự động xin chuyển sang Arc Testnet.

**Còn lại — không khẩn:**
1. Dùng `npm run draw:now` để test lặp lại các luồng claim/sweep/UI bao nhiêu lần tuỳ ý trong lúc còn debug.
2. **Chưa test bằng ví thật:** toàn bộ luồng cần ví (auto switch mạng, dropdown, highlight "You", cào, claim) mới chỉ verify bằng code + Playwright — **Playwright không giả lập được MetaMask**, user phải tự bấm thử.
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

### Bài học về LAYOUT (đây là chỗ tốn nhiều thời gian nhất, đọc kỹ)

- **ĐỌC SPEC §5 TRƯỚC KHI SỬA LƯỚI.** Đã tự chế "20 hàng" trong khi spec ghi rõ **15 hàng**, làm hỏng bản desktop vốn đang đúng. User cực kỳ khó chịu chuyện này.
- **Đừng vá layout bằng padding/margin tuỳ hứng.** Mỗi lần "sửa nhẹ" kiểu đó là layout hỏng thêm một chỗ khác. Phải có hệ lưới khai báo rõ (xem mục "HỆ LƯỚI GIAO DIỆN" ở đầu file) rồi sửa trong hệ đó.
- **`grid-template-rows: repeat(N, 5vh)` + `gap` sẽ TRÀN quá màn hình** — `N×5vh` đã bằng 100vh rồi, cộng thêm gaps là vượt. Đây là lỗi làm box bị kéo dài lê thê.
- **Đừng dùng 2 đơn vị khác bản chất cho cùng 1 khái niệm.** Từng để desktop dùng `1fr` (co theo cửa sổ) còn mobile dùng `60px` (cố định) → đặt 2 màn cạnh nhau thấy hàng cao thấp khác nhau. User bắt được ngay.
- **Padding dọc trong box làm hàng con lệch khỏi hàng của trang.** Box cao 4 hàng = `4×50+3×10=230px`; chia trong `(230−40)/4` mà không có khe thì trôi dần.
- **Phần tử grid không được gán `grid-column` sẽ tự đẻ cột ngầm.** 2 nút history mobile quên ẩn trên desktop → grid sinh cột thứ 4, bóp 3 cột chính từ 266px còn 202px làm chữ tràn. Ẩn/hiện theo breakpoint phải chú ý **thứ tự khai báo CSS**: `.history-button{display:flex}` nằm sau media query nên đè `display:none` (cùng specificity) — phải scope `.dashboard-grid > .g-...-btn` cho thắng.
- **`border-bottom` làm lệch tâm khi căn giữa.** Border nằm trong hộp (`box-sizing: border-box`) nên nuốt 1px chiều cao content → nội dung lệch lên 0.5px. Dùng `box-shadow: 0 1px 0` để vẽ đường kẻ mà không chiếm chỗ.
- **Padding dọc ở lưới TRANG làm navbar trông như bị đẩy xuống đáy** dù nó có căn giữa đúng trong ô của nó — vì dải trắng phía trên mắt hiểu là một phần hàng 1. Hàng 1 phải chạm mép trên trang.
- **ĐO, ĐỪNG ĐOÁN.** Cách hiệu quả nhất trong phiên này là viết script Playwright in ra `gridTemplateRows`, `getBoundingClientRect`, và so tâm phần tử với tâm dải nhìn thấy. Vài lần suýt sửa nhầm chỗ vì đoán mò. Lưu ý `Number("62px")` → `NaN`, phải `parseFloat`.

## Việc tiếp theo khi quay lại (user hẹn làm tiếp tối 2026-08-23)

0. **Việc UI còn dở / cần user chốt:**
   - **Dropdown ví chưa ai nhìn thấy bằng ảnh** — nó chỉ hiện khi có ví kết nối, mà Playwright không lái được MetaMask. Cần user bấm thử xem nền đen + chữ đã ổn chưa.
   - **Banner cảnh báo khi bật $ARC** (xem mục UI ở trên) là tôi tự thêm, chưa được user duyệt.
   - `($ deposited)` cạnh MY TICKETS: user chốt dùng ký hiệu `$` ở đây trong khi mọi chỗ khác đã đổi sang `USDC` — cố ý, đừng "sửa cho đồng bộ".
1. Dùng `npm run draw:now` (trong `automation/`) để test nhanh — không cần chờ epoch thật.
2. **Test bằng ví thật** các luồng chưa verify được tự động: auto switch mạng, dropdown ví, highlight "You", cào, claim.
3. Theo dõi `still2412` đã accept lời mời GitHub collaborator chưa.
4. Trước khi có depositor thật: cân nhắc khoá lại `forceEndEpoch` (xem mục cảnh báo ở trên).

## Lệnh hay dùng

```bash
# frontend (D:\Files\Claude\Build on Arc\LuckyStaker\frontend)
npx vite --port 5183 --host        # dev server (user hay xem ở đây trước khi chốt)
./node_modules/.bin/tsc -b --noEmit  # typecheck (đừng dùng `npx tsc`, npx kéo nhầm gói tsc rác)
npx vite build && npx wrangler pages deploy dist --project-name=luckystaker --branch=main --commit-dirty=true

# contracts
npx hardhat test
echo "y" | npx hardhat ignition deploy ignition/modules/LuckyStakerPool.ts --network arcTestnet --deployment-id <id-moi> --parameters '<json>'

# automation
npm run fund-yield && npm run draw:now
```
