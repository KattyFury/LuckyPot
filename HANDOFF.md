# HANDOFF – StableLuck

> No-loss weekly USDC prize pool trên Arc. Gộp tiền gửi của nhiều người vào 1
> pool, mỗi tuần quay số ngẫu nhiên trao toàn bộ yield của tuần đó cho một vài
> người, thay vì chia đều lãi cho tất cả. Không ai mất gốc — rút lại 100% USDC
> đã gửi bất cứ lúc nào.

**Repo:** https://github.com/KattyFury/StableLuck (đổi tên từ `LuckyStaker` → `StableLuck` ngày 2026-08-24, đổi thương hiệu — repo cũng đã chuyển **Private** cùng ngày vì user chưa muốn lộ dự án sớm)
**Web đang chạy:** https://stableluck.pages.dev (Cloudflare Pages, project `stableluck`, deploy tay bằng `npx wrangler pages deploy dist --project-name=stableluck --branch=main` — **KHÔNG** auto-deploy từ GitHub. Project Cloudflare cũ `luckystaker` vẫn còn tồn tại nhưng ngừng cập nhật, có thể xoá tay nếu muốn.)
⚠️ **Contract Solidity CỐ Ý giữ nguyên tên `LuckyStakerPool`, KHÔNG redeploy khi đổi thương hiệu** — spec không yêu cầu tên contract khớp tên sản phẩm, và contract đang giữ dữ liệu thật (685 USDC, lịch sử epoch 3/4 đã quay). Mọi chỗ trong repo nhắc tới `LuckyStakerPool.sol` / `LuckyStakerPool (proxy)` là tên kỹ thuật thật, không phải sai sót quên đổi.
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
- **Thang chữ 33/28/23/18/13** (`--fs-1..5`) + **`--fs-caption: 15px` riêng cho chú thích** (nằm ngoài thang). Đã giảm đồng loạt 2pt so với thang gốc 35/30/25/20/15 ngày 2026-08-24, theo yêu cầu user — giữ đúng tỉ lệ tương đối giữa các bậc. Chỉ dùng biến, không tự chế cỡ.
- **Header của box: 20px, BOLD, Roboto Condensed**, có **đường kẻ ngăn với nội dung** (`.box-header` / `.card-list__header`, vẽ bằng `box-shadow`). Nội dung số liệu cũng dùng Condensed (`--font-condensed`).
- **Trong box KHÔNG có padding trên** (`padding: 0 20px 20px`) — user chốt sau khi thử.
- Cách kiểm tra: đừng tin mắt, mở Playwright đo `getBoundingClientRect` / `gridTemplateRows` rồi so số (xem mục "Bài học" bên dưới).

---

## Trạng thái nghỉ 2026-08-24 (tối) — technical-spec upgrade ĐÃ CHẠY THẬT lên chain

**Đã upgrade contract logic thật trên proxy đang chạy** (`0x88dCB2f36356AA8DADdC2e8fb4A3E122Ba9D0Beb`), không redeploy, không mất dữ liệu cũ (verify lại: `balancesTotal=65 USDC`, `currentEpochId=5` giữ nguyên sau upgrade).

- **Implementation mới:** `0x1fEB6ac87f97B2C080d9BbDA940351116A2A54F0`, deploy qua `contracts/ignition/modules/LuckyStakerPoolV2Implementation.ts` (module CHỈ deploy implementation, không đụng proxy — an toàn deploy bất cứ lúc nào).
- **Logic mới (theo `stableluck-technical-spec.md` user gửi):**
  - Yield: `aprBpsUSDC` (mặc định 600 = 6%/năm, khung cứng 400–800) và `aprBpsARC` (300 = 3%/năm, khung 200–400), admin set tay qua `setAprBpsUSDC`/`setAprBpsARC`, rate-limit 7 ngày/lần đổi mỗi token. `currentAprBps()` so `poolToken` với `referenceUSDC` (biến mới, KHÔNG hardcode địa chỉ — set lúc `initializeV2`, hiện trỏ đúng USDC thật `0x3600...0000`) để chọn nhánh.
  - `weeklyPrizePool` chỉ tính trên `eligibleBalance` (đủ 1 tuần); phần dư giữa số đã funding và weeklyPrizePool là `surplus`, tự động chia 50/50 vào `vaultReserve`/`vaultDev` lúc quay số.
  - `numWinners = max(1, sqrt(eligibleBalance / $1000))` — công thức liên tục, thay hẳn bảng tier cũ.
  - Referral: `setReferrer()` set 1 lần vĩnh viễn, `claimReferral()` rút riêng. Lúc `claim`/`sweep`, luôn trừ 5% mọi giải — có ref thì vào `pendingRef[ref]`, không thì chia 50/50 vào 2 vault.
  - `vaultReserve`/`vaultDev` là **bộ đếm `uint256` bên trong contract chính, KHÔNG phải 2 ví ngoài** — quyết định thiết kế quan trọng, lý do: nếu tiền rời contract ngay khi tích luỹ thì điều kiện `whenPaused` trên `withdrawReserve` mất tác dụng (tiền đã ở ví khác, rút được bất kể pause hay không). `withdrawReserve(amount, to, reason)` chỉ chạy khi `paused`; `withdrawDev(amount, to)` rút tự do; cả 2 nhận `to` làm tham số lúc rút, không có địa chỉ ví cố định lưu sẵn.
  - `forceEndEpoch()` **CỐ Ý GIỮ LẠI** theo yêu cầu user (dự án còn thay đổi nhiều, cần test nhanh) — KHÔNG bị xoá/khoá dù spec gốc đề xuất nên xoá trước khi có tiền thật.
  - Đề xuất "nút trả hết tiền cho toàn bộ user" (admin-triggered mass refund) đã bị user từ chối — giữ nguyên nguyên tắc cũ: chỉ từng người tự rút, admin không bao giờ đụng được tiền người khác.
- **`automation/src/fundYield.ts`** đọc `currentAprBps()` thật từ chain để tính `realYieldEarned = balancesTotal × aprBps/10000/52`, bỏ hẳn sàn `$10` cứng cũ.
- **`frontend/src/lib/prize.ts`** đổi chữ ký `projectedWeeklyYield(eligibleTotal, aprBps)` và `estimateNumWinners(eligibleTotal, weeklyYield)` (trước nhận `poolBalance`/`participantCount`) — khớp công thức sqrt mới, tránh hiện số ước lượng sai/lỗi thời cho người dùng.
- **`aprBpsUSDC=600`, `aprBpsARC=300`** đã set qua `initializeV2` trong lúc upgrade — verify on-chain đúng.

### Bài học/gotcha mới trong lần upgrade này

- **Admin Safe đổi từ 2-of-2 sang CÓ THÊM 1 admin ví đơn** — user chọn né bớt việc phải dùng Safe UI liên tục khi đang gấp deadline thuyết trình T5. Đã `grantRole(DEFAULT_ADMIN_ROLE, 0xb0ea48A1979326BA9e0b5027D105C8DF9CCAA12E)` — ví này giờ có toàn quyền admin y hệt Safe (`pause`, `setAprBps*`, `withdrawDev/Reserve`, `_authorizeUpgrade`...). **Safe VẪN CÒN giữ quyền admin** (không bị revoke) — chỉ là thêm 1 đường tắt, không phải thay thế hẳn. Cân nhắc: đây là đánh đổi bảo mật thật (1 ví đơn giờ có thể tự ý upgrade contract), chấp nhận được vì đang testnet/tiền test, nhưng **phải xử lý lại đúng chuẩn trước khi có yield/tiền thật** (xem mục Roadmap).
- **Tính slot lưu implementation ERC1967 nhớ PHẢI trừ 1** (`keccak256("eip1967.proxy.implementation") - 1`), không phải dùng thẳng hash — đã tính sai 1 lần dẫn tới đọc nhầm storage toàn số 0, tưởng upgrade chưa chạy trong khi thực ra chỉ đọc sai slot.
- **Safe Transaction Builder mất state đã nhập nếu gặp lỗi RPC rồi user rời trang** — giao dịch upgrade đầu tiên bị soạn xong nhưng KHÔNG nằm trong batch cuối cùng được execute (chỉ có `grantRole` chạy thật), phải làm lại từ đầu. Nếu Safe báo "Error connecting to the blockchain" (rate limit RPC công khai), đợi vài phút rồi thử lại thay vì vội chuyển hướng.
- **MetaMask không inject `window.ethereum` đáng tin cậy trên trang mở kiểu `file://`** — viết 1 trang HTML gọi thẳng `eth_sendTransaction` để 1 ví đơn (không cần Safe) tự gửi giao dịch upgrade, nhưng phải serve qua `http://localhost` (copy vào `frontend/public/`, chạy `npx vite --port 5183 --host`) thì MetaMask mới kết nối được — mở trực tiếp bằng double-click báo "No wallet found" dù đã cài MetaMask.
- **Confirm (ký đủ ngưỡng) và Execute (đẩy lên chain) là 2 bước khác nhau trong Safe** — dễ nhầm "đủ chữ ký" là "đã xong việc".

### Roadmap — cần làm trước khi có yield/tiền thật (không phải bây giờ)

1. Đưa quyền admin về lại ĐÚNG chuẩn multisig (thu bớt quyền ví đơn `0xb0ea48A1...`, hoặc ít nhất đảm bảo Safe 2-of-2 vẫn là nơi quyết định cuối cùng) trước khi bật yield thật/nhận tiền thật quy mô lớn.
2. `IYieldSource` interface đã khai báo sẵn trong contract nhưng chưa có implementation — chờ Arc có nguồn yield DeFi thật đáng tin.

## Trạng thái nghỉ 2026-08-24 — repo chuyển Private, TOTAL POOL đổi sang eligible/total thật

- **Repo đã chuyển từ Public sang Private** (`gh repo edit --visibility private --accept-visibility-change-consequences`) — user không muốn lộ sớm vì thấy dự án tiềm năng. **Hệ quả cần nhớ:** GitHub Pages/Actions dùng repo private vẫn chạy bình thường (đã có secrets sẵn), nhưng link repo không còn xem công khai được nữa — nếu sau này cần mời ai xem thì phải add làm collaborator (giống `still2412`), không share link suông được nữa. `still2412` (đã là collaborator từ trước) vẫn giữ quyền truy cập bình thường khi repo private.
- **TOTAL POOL đổi cách hiển thị:** từ `"685 USDC/3 depositors"` sang `"eligible/total USDC"` (vd `65/685 USDC`) — bỏ số depositor vì box EPOCH đã hiện participant count rồi, tránh trùng lặp. Số eligible **cộng thật từ on-chain** (`eligibleBalance(address)` của từng participant trong mảng `participants`, không có getter tổng sẵn nên phải tự cộng ở frontend — xem `useEligiblePoolTotal()` trong `hooks/usePoolData.ts`). Có icon `info.svg` (mask-image, cùng kỹ thuật `copy.svg`/`back.svg`) mở popup giải thích: tổng pool luôn an toàn/rút được, phần eligible là phần đã nằm đủ 1 epoch (7 ngày) nên được tính vé; tiền mới gửi tự cuộn vào eligible ở lần quay kế tiếp; khuyên gửi ngay sau khi vừa quay để được tính đủ tuần ngay.
  - ⚠️ **Epoch KHÔNG neo theo lịch dương** (không phải "luôn bắt đầu/kết thúc đúng 0h UTC thứ Hai") — nó chạy cuốn chiếu 7 ngày kể từ lần `revealAndDraw()` trước đó. Nội dung popup viết đúng theo cơ chế thật này, **không** dùng chữ "thứ Hai" như yêu cầu ban đầu của user vì sẽ sai sự thật.
- **Toggle `USDC | $ARC` giờ đã KHOÁ nút `$ARC`** (`disabled`, mờ đi, có tooltip "chưa launch") — trước đó bấm vào chỉ đổi nhãn còn số vẫn là USDC (gây hiểu lầm), user xác nhận nên khoá hẳn thay vì để bấm được.
- Đã build + typecheck + test bằng Playwright thật trên `vite preview` (đọc số liệu on-chain thật `65/685`, không phải giả lập) trước khi deploy. Deploy Cloudflare Pages + push GitHub commit `0d0b3c5`.

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
- **Cào chỉ 1 lần duy nhất:** nhớ bằng `localStorage` khoá `stableluck:scratched:<addr>:<epochId>` (đổi prefix theo rebrand 2026-08-24, key cũ `luckystaker:...` không migrate — vô hại, chỉ khiến thẻ cũ cào lại được 1 lần). Mở lại lần sau hiện thẳng kết quả. Đã `claim` rồi thì cũng bỏ qua bước cào.
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
# frontend (D:\Files\Claude\Build on Arc\LuckyStaker\frontend — thư mục local CHƯA đổi tên, bị khoá bởi VS Code lúc rebrand 2026-08-24, tự đổi tay nếu muốn)
npx vite --port 5183 --host        # dev server (user hay xem ở đây trước khi chốt)
./node_modules/.bin/tsc -b --noEmit  # typecheck (đừng dùng `npx tsc`, npx kéo nhầm gói tsc rác)
npx vite build && npx wrangler pages deploy dist --project-name=stableluck --branch=main --commit-dirty=true

# contracts
npx hardhat test
echo "y" | npx hardhat ignition deploy ignition/modules/LuckyStakerPool.ts --network arcTestnet --deployment-id <id-moi> --parameters '<json>'

# automation
npm run fund-yield && npm run draw:now
```
