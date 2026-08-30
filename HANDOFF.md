# HANDOFF – LuckyPot

> No-loss weekly USDC prize pool trên Arc. Gộp tiền gửi của nhiều người vào 1
> pool, mỗi tuần quay số ngẫu nhiên trao toàn bộ yield của tuần đó cho một vài
> người, thay vì chia đều lãi cho tất cả. Không ai mất gốc — rút lại 100% USDC
> đã gửi bất cứ lúc nào.

**Repo:** https://github.com/KattyFury/LuckyPot (đổi tên từ `LuckyStaker` → `LuckyPot` ngày 2026-08-24, đổi thương hiệu — repo cũng đã chuyển **Private** cùng ngày vì user chưa muốn lộ dự án sớm)
**Web đang chạy:** https://luckypot.cc (custom domain gắn vào Cloudflare Pages project `luckypot`) — landing page ở root, dashboard ở `/app`. Deploy tay bằng `cd frontend && npm run build:site && npx wrangler pages deploy dist-site --project-name=luckypot --branch=main` — **KHÔNG** auto-deploy từ GitHub. Project Cloudflare cũ `luckystaker`/`stableluck` vẫn còn tồn tại nhưng ngừng cập nhật.
⚠️ **Contract Solidity CỐ Ý giữ nguyên tên `LuckyStakerPool`, KHÔNG redeploy khi đổi thương hiệu** — spec không yêu cầu tên contract khớp tên sản phẩm, và contract đang giữ dữ liệu thật (685 USDC, lịch sử epoch 3/4 đã quay). Mọi chỗ trong repo nhắc tới `LuckyStakerPool.sol` / `LuckyStakerPool (proxy)` là tên kỹ thuật thật, không phải sai sót quên đổi.
**Spec gốc:** [`arc-prize-pool-spec.md`](./arc-prize-pool-spec.md) — đã có trong repo, encoding sạch

---

## Trạng thái nghỉ 2026-08-30 (nửa đêm) — My history quét thật, banner đúng ngưỡng, logo navbar to hơn

3 việc user giao trong 1 lượt, cả 3 đã deploy + verify trong bundle production.

### 1. My history luôn rỗng — do RPC, không do code logic sai

`useMyHistory.ts` cũ gọi `getLogs({ fromBlock: 0n })`. Test thẳng bằng curl vào
`rpc.testnet.arc.io` phát hiện RPC này **luôn từ chối `fromBlock: 0`** với lỗi
`"pruned history unavailable"` — không liên quan gì đến hoạt động thật của ví. Vì
`Dashboard.tsx` destructure `data: historyEntries = []`, lỗi bị nuốt âm thầm → My History
**luôn hiện "No activity yet." với MỌI ví, bất kể có deposit/withdraw/claim thật hay
không.** Đây là bug 100% tái hiện, không phải thỉnh thoảng.

Đào sâu thêm phát hiện 2 giới hạn cứng khác của RPC này (xác nhận bằng chính error message
RPC trả về, không đoán):
- `eth_getLogs is limited to a 10,000 range` — không thể quét quá 10.000 block/lần gọi.
- Rate limit khá gắt, dùng chung cho MỌI dApp trên Arc Testnet (đã ghi nhận trước đó ở mục
  "RPC 429"): ~15 request liên tiếp là bị chặn, phải lùi-chờ.

Pool contract đã sống **~1,18 triệu block** (deploy block `58425277`, tìm bằng cách nhị
phân `eth_getCode` — xem code có xuất hiện ở block nào, KHÔNG đoán từ ngày tháng) — tức
cần **~119 lần gọi** để quét hết. User hỏi "có cần database không" → **không cần**, dùng
`localStorage` (file mới `lib/historyCache.ts`, cùng convention với `scratchState.ts`) lưu
`{lastBlock, entries[]}` theo từng ví. Test thật (script Node độc lập, xoá sau khi xong)
xác nhận quét trọn 119 chunk mất **~7 phút** (có lùi-chờ theo cấp số nhân khi bị rate-limit)
và ra đúng dữ liệu Deposited thật của 2 ví thật trên chain — **đã verify, không phải suy
đoán**. Nhưng đây CHỈ xảy ra 1 lần duy nhất cho mỗi ví (lần đầu tiên mở app / xoá
localStorage) — mọi lần sau chỉ quét từ `lastBlock` đã cache tới hiện tại, thường 1 request.

Đã tối ưu thêm: gộp 3 event (Deposited/Withdrawn/Claimed) thành **1 lần gọi `getLogs`/chunk**
thay vì 3 (dùng `parseEventLogs` của viem lọc theo ABI sau khi có logs thô), và đọc
`log.blockTimestamp` **thẳng từ response `eth_getLogs`** (Arc RPC trả kèm field này, viem
tự parse) thay vì gọi `getBlock()` riêng cho mỗi block — bỏ hẳn 1 tầng round-trip so với
code cũ.

⚠️ **Nếu proxy contract bị deploy lại ở địa chỉ mới, phải cập nhật lại `POOL_DEPLOY_BLOCK`**
trong `useMyHistory.ts` (hằng số hardcode, không tự tính lại).

### 2. Banner faucet/sell — sai tiêu chí, giờ theo đúng USDC balance

`FaucetOrSellBanner.tsx` cũ chuyển sang "sell" chỉ dựa vào `eurcBal>0 || cirbtcBal>0`,
**không nhìn USDC balance** — dẫn tới hiện "Click here to sell..." ngay cả khi ví chưa có
USDC để trả gas (USDC là gas token của Arc), bấm vào là dính lỗi. User chốt luật: **USDC >
20 mới hiện sell, ≤ 20 thì hiện faucet** (20 khớp đúng comment có sẵn trong code: "Circle's
testnet faucet caps each request at 20 USDC" — tức ví đã faucet full 1 lần thì mới đủ gas).

Fix: `showSellBanner = hasSomethingToSell && usdcBal > 20_000_000n` — giữ cả 2 điều kiện
(không chỉ mỗi ngưỡng USDC) để tránh 1 kẽ hở mới: ví có nhiều USDC nhưng KHÔNG còn
EURC/cirBTC để bán thì vẫn phải hiện faucet, không hiện nút "sell" chết (bấm không làm gì).

### 3. Logo navbar quá nhỏ (26px) — đã hỏi lại trước khi đổi vì đụng luật lưới

User ban đầu xin x4 (→104px). Navbar là **hàng #1 trong hệ lưới 50px/hàng CỐ ĐỊNH** (luật
đã ghi ở mục "HỆ LƯỚI GIAO DIỆN", dựng lại 2 lần vì làm sai) — 104px cao gấp đôi cả navbar,
chắc chắn tràn ra đè lên banner bên dưới. Đã hỏi lại, user chọn: **giữ nguyên hàng 50px,
logo chỉ to vừa đủ trong hàng đó** → chốt **38px** (từ 26px, x1.46), là mức lớn nhất còn
nằm gọn trong navbar. Sửa 2 chỗ đồng bộ:
- `global.css` → `.brand__lockup` (app, `Navbar.tsx`)
- `landing/index.html` → `nav.top .brand img` (landing, vốn đã tự nhận "same look as the
  app's" và cùng dùng `--row-h`)

Verify bằng screenshot Chrome headless zoom cận cảnh cả 2 navbar sau deploy — logo to rõ
rệt, không tràn, không đè lên đường kẻ dưới navbar.

---

## Trạng thái nghỉ 2026-08-30 (khuya) — sửa lỗi "Claim now" trên phần thưởng quá 3 ngày

User gửi ảnh chụp modal Privy báo lỗi khi bấm nhận thưởng:
`Execution reverted with reason: past claim window, use sweep.` — không phải bug ngẫu
nhiên, đây là **contract hoạt động đúng thiết kế nhưng frontend chưa theo kịp**.

Contract (`LuckyStakerPool.sol`) có 2 đường lấy thưởng tách biệt:
- `claim(epochId)` — tự bấm, **chỉ trong vòng `SWEEP_DELAY` = 3 ngày** kể từ lúc quay số
  (`e.drawnAt`). Quá hạn thì revert đúng câu trên.
- `sweep(epochId)` — permissionless, ai gọi cũng được, mở **sau** 3 ngày, tự động trả cho
  MỌI người thắng chưa nhận (kể cả người đang gọi). Đây là đường thoát duy nhất sau khi hết
  hạn claim.

`ResultModal.tsx` (nút "Claim now" trong popup xem kết quả epoch) **trước giờ chỉ biết gọi
`claim`**, không hề đọc `drawnAt`/`SWEEP_DELAY`, nên với bất kỳ epoch nào thắng mà quá 3
ngày chưa bấm nhận — kể cả epoch cũ từ mấy tuần trước xem lại trong "My history" — nút vẫn
hiện "Claim now" và luôn revert.

**Đã sửa** (`ResultModal.tsx` + thêm hook `useSweepDelay()` vào `hooks/usePoolData.ts`):
đọc `useEpoch(epochId).drawnAt` và `SWEEP_DELAY` từ chain, so với `Date.now()`. Quá hạn thì
nút đổi thành **"Release prize"** và gọi `sweep` thay vì `claim`, kèm 1 dòng giải thích nhỏ
("The 3-day self-claim window passed, but your prize is still there — this releases it.").
Chưa quá hạn thì hành vi y hệt cũ, không đổi gì.

Lưu ý kỹ thuật: `poolAbi` cast thẳng sang `Abi` (không `as const`) nên wagmi không suy được
kiểu trả về chính xác — theo đúng quy ước sẵn có trong file (`aprBps as bigint | undefined`
ở `Dashboard.tsx`), phải tự cast `useSweepDelay().data as bigint | undefined`. Không dùng
`epoch as EpochData` kiểu tương tự vì `useEpoch` đã tự parse tuple thành object có kiểu qua
`toEpoch()` sẵn trong `usePoolData.ts`.

Đã `tsc -b` sạch, build+deploy, và `grep` xác nhận `"Release prize"` / `"SWEEP_DELAY"` có
mặt trong bundle production (`index-BCm-kdVo.js`). **Chưa test bằng ví thật** — headless
Chrome không connect được Privy/MetaMask nên không click thật được nút; cần user tự bấm
thử trên 1 epoch đã thắng và đã quá 3 ngày để xác nhận `sweep` chạy đúng và tiền về ví.

---

## Trạng thái nghỉ 2026-08-30 (tối) — bộ nhận dạng thương hiệu MỚI thay toàn bộ logo cũ

`main` chưa push lúc viết dòng này, đang chuẩn bị commit ngay sau. Đã deploy live lên
luckypot.cc, đã verify md5 live = local cho mọi file, đã chụp cả 2 navbar (landing + app).

**Đây là bộ mark HOÀN TOÀN KHÁC** với hũ-vàng-cỏ-xanh của mục "logo mới" bên dưới (viết
sáng cùng ngày) — chuyện logo đổi 2 lần trong 1 ngày. Mark mới: hũ bo tròn nền xanh lá
`#3DCF88`, thân hũ vàng `#FCD34D`, dấu USD đen trong vòng tròn ở giữa (không còn cỏ 4 lá).
User cầm nguyên bộ 4 file từ Desktop, dặn rõ vai trò từng file — **đọc kỹ trước khi tưởng
nhầm file nào thay file nào**:

| File Desktop  | Vai trò user chỉ định                              | Đích trong repo |
|---------------|-----------------------------------------------------|-----------------|
| `favicon.svg` | favicon + apple-touch-icon + **logo đứng lẻ** (mark)| `public/favicon.svg`, `landing/favicon.svg`, `landing/logo.svg`, `src/assets/logo.svg`, + apple-touch-icon.png render lại 180×180 (cả `public/` và `landing/`) |
| `fulllogo.svg`| logo navbar website (đổi đen→trắng cho nền tối)      | `landing/logo-full.svg` (light, giữ nguyên đen) → tự sinh `logo-full-dark.svg` (light này thay `fill="black"` bằng `#FFFFFF`, đúng 9 chỗ, y hệt cách làm bản cũ) ở cả `landing/` và `src/assets/` |
| `privy.svg`   | logo cho Privy Dashboard (login-screen logo, "cầm embed thành link") | render PNG `landing/privy-logo.png` (đen) + `privy-logo-dark.png` (trắng) — file này viewBox **200×100 sẵn đúng 2:1**, không cần padding như bộ trước |
| `pfp.svg`     | lưu để dùng làm PFP app SAU NÀY, KHÔNG wire vào gì hết | `frontend/brand-assets/pfp.svg` — thư mục mới, KHÔNG nằm trong `build-site.mjs`, không lên site, chỉ backup trong git |

`favicon.svg` và `pfp.svg` tự thân đã có nền (bo góc xanh lá / vuông xanh lá đặc), khác bộ
cũ (mark trong suốt) — nên **không cần bản dark riêng cho 2 file này**, chỉ `fulllogo`/
`privy` mới cần lật màu vì chữ wordmark của chúng vẽ đen trên nền trong suốt.

Link dán vào ô Logo của Privy Dashboard: `https://luckypot.cc/privy-logo.png` (nếu modal
Privy để theme dark thì dùng `privy-logo-dark.png`) — xem ghi chú cũ bên dưới, `main.tsx`
không set `appearance` nên theme modal nằm ở Privy Dashboard, code không biết được.

`build-site.mjs` **KHÔNG cần sửa gì** — chỉ thay NỘI DUNG file, giữ nguyên tên, nên pipeline
copy cũ vẫn đúng luôn. `_headers` từ mục sửa cache bên dưới cũng ăn theo, nên đổi logo lần
này KHÔNG bị kẹt cache 4 tiếng như lần trước — verify md5 live = local ngay sau deploy,
không cần đợi.

`logo.svg` (mark đứng lẻ) và `src/assets/logo.svg` đã cập nhật nội dung theo yêu cầu user,
nhưng **2 file này hiện KHÔNG được import/dùng ở đâu trong code** (Navbar dùng
`logo-full-dark.svg`, không dùng `logo.svg`) — giữ nguyên trạng thái "có sẵn nhưng chưa
wire" đó, không tự ý thêm chỗ dùng mới vì user không yêu cầu.

---

## Trạng thái nghỉ 2026-08-30 — redesign dark theo Privy, logo mới, và MỘT BUG DEPLOY LỚN

`main` = `84dd8ec`, đã push, đã deploy lên luckypot.cc.

### ⚠️ ĐỌC TRƯỚC: lệnh deploy CŨ trong HANDOFF là SAI, và đã sai từ đầu dự án

`wrangler` compile thư mục `functions/` mà nó tìm thấy trong **CWD của chính nó**.
`functions/` nằm ở **gốc repo**, còn lệnh cũ chạy từ `frontend/` → wrangler đi tìm
`frontend/functions/`, không thấy, và upload một site **thuần tĩnh không có API**.

Hệ quả: `POST /api/swap` trả **405 với body rỗng** (đó là static asset handler của
Pages từ chối POST, không phải lỗi code). **Mọi lần deploy của dự án này đều ship
thiếu API** → nút "sell EURC/cirBTC" chưa bao giờ chạy trên production, với ví nào
cũng vậy. MetaMask "chạy được" là do test qua `wrangler pages dev` — lệnh đó *có*
compile functions.

**Deploy đúng: `cd frontend && npm run deploy`** (script mới, tự `cd ..` rồi mới gọi
wrangler). Deploy thành công phải in ra 2 dòng `Compiled Worker successfully` và
`Uploading Functions bundle`. Không thấy 2 dòng đó = Functions lại rớt.

Verify nhanh sau mỗi lần deploy:

```bash
curl -X POST https://luckypot.cc/api/swap -H "Content-Type: application/json" \
  -d '{"tokenIn":"EURC","tokenOut":"USDC","walletAddress":"0x4672A3B3C14727629107711D9853B52e8E1E26B1","amountBase":"1000000"}'
```

→ phải trả JSON intent có `executionParams` + `signature`, KHÔNG phải 405.
`KIT_KEY` đã cấu hình sẵn trên Pages project, không cần set lại.

`build-site.mjs` cũng đã sửa: trước đây nó KHÔNG dọn thư mục gốc `dist-site/`, nên
file landing bị đổi tên/xoá vẫn nằm lại từ build cũ và ship lên production (chính vì
vậy `favicon.svg` và `logo-full.svg` cũ vẫn còn sau khi đã xoá khỏi repo). Giờ xoá
sạch mọi thứ trừ `app/` (vite tự quản thư mục đó).

### ✅ ĐÃ GIẢI QUYẾT — "navbar vẫn ra logo cũ" là CACHE TRÌNH DUYỆT, không phải bug

Kết luận cuối (2026-08-30, sau khi chụp được màn hình thật): **server luôn đúng ngay từ
đầu.** Cái user nhìn thấy là bản `logo-full.svg` CŨ (cỏ 4 lá xanh gradient, không có hũ
vàng) nằm trong cache đĩa của trình duyệt họ.

Bằng chứng: `git show b75964a:frontend/landing/logo-full.svg` render ra đúng y hệt ảnh user
gửi — file đó dùng `fill="url(#paint0_linear_...)"` + 2 `linearGradient`, còn file hiện tại
dùng `#FCD34D` (hũ) + `#3DCF88` (cỏ), không có gradient nào. File cũ **đã biến mất khỏi
server**, md5 local ≡ md5 live.

Vì sao kẹt: Cloudflare Pages mặc định cho asset tĩnh `Cache-Control: max-age=14400` (4
tiếng) mà tên file logo **không có content hash** → đổi logo xong người đã từng vào site
vẫn thấy bản cũ suốt 4 tiếng, trong khi curl (không cache) báo đúng. Đó là lý do curl và
mắt user nói ngược nhau 3 lần.

**Đã fix gốc: thêm `frontend/landing/_headers`** đặt `max-age=0, must-revalidate` cho 5 file
brand không hash tên (favicon, apple-touch-icon, logo, logo-full, logo-full-dark) + 2 PNG
Privy. `/app/*` KHÔNG đụng tới — vite hash tên nên phải cache dài. `build-site.mjs` copy
thêm `_headers`. Verify: preview deployment trả `max-age=0` đúng. Domain chính còn dính edge
cache cũ vài giờ; token Cloudflare trong `EZwallet/.env.txt` **đọc được zone nhưng KHÔNG có
quyền purge_cache** (trả `Authentication error` code 10000) — muốn purge phải cấp thêm quyền.

### 🖼️ Logo cho Privy dashboard (đã xong)

Privy (Dashboard → login screen → Logo) đòi **URL của một PNG**, khuyến nghị 180x90, tỉ lệ
**2:1**. Đưa link `.svg` vào nó báo "Logo must be a valid URL". Lockup của mình là 3.6:1
(180.1/50.1) nên **phải padding vào khung 2:1, tuyệt đối không kéo méo**.

Đã tạo 2 file, nền trong suốt, 360x180 (2:1, 2x cho màn retina), lockup canh giữa:

- `https://luckypot.cc/privy-logo.png` — chữ ĐEN, cho modal Privy theme **light** (mặc định)
- `https://luckypot.cc/privy-logo-dark.png` — chữ TRẮNG, nếu modal để theme **dark**

⚠️ `main.tsx` KHÔNG set `appearance` trong `PrivyProvider` config → theme modal lấy từ
Privy Dashboard, đọc source không biết được. Nếu sau này set `appearance.theme` trong code
thì nhớ đổi luôn logo cho khớp.

Nguồn sinh PNG: `scripts/build-site.mjs` chỉ copy file; PNG được render bằng Chrome headless
(xem mục công cụ bên dưới) từ chính 2 file SVG trong `landing/`. Muốn tạo lại: dựng 1 trang
HTML `width:360px;height:180px;display:flex;align-items:center;justify-content:center` bọc
`<img style="width:340px">`, rồi chụp với `--default-background-color=00000000`.

### 🔧 CHỤP MÀN HÌNH ĐƯỢC RỒI — không cần Playwright

Handoff cũ ghi "không có trình duyệt, chưa verify được". **Sai — máy có sẵn Chrome và dùng
headless chụp được ngay**, không phải cài gì:

```bash
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu   --hide-scrollbars --window-size=1280,900 --virtual-time-budget=15000   --screenshot="C:\duong\dan\out.png" https://luckypot.cc/app
```

Thêm `--allow-file-access-from-files` nếu trang có `<img src="file:///...">`, và
`--default-background-color=00000000` để nền trong suốt. Đã dùng để verify cả 2 navbar,
so file live với file gốc trên Desktop, và render PNG cho Privy. Browser cache của Chrome
headless là profile tạm nên mỗi lần chạy là một lần load sạch — chính vì vậy nó thấy logo
mới trong khi trình duyệt user thấy logo cũ.

### Trạng thái các file logo (giữ lại để tham chiếu)

- Nguồn logo là **2 file trên Desktop**: `luckpot-SVG.svg` (chỉ mark, 1.558 bytes) và
  `luckpot-full.svg` (lockup mark + chữ, 6.323 bytes, mtime 2026-08-30 16:06,
  md5 `5b012c5dedb1f0464339c2d851b79c65`). Đã quét toàn bộ `C:\Users\Dell` —
  **chỉ có ĐÚNG 1 bản** `luckpot-full.svg`, không có bản OneDrive nào khác.
- Repo đang có: `landing/logo.svg` (mark), `landing/logo-full.svg` (chữ đen),
  `landing/logo-full-dark.svg` + `src/assets/logo-full-dark.svg` (chữ trắng).
  Bản dark = bản light replace đúng 8 path `fill="black"` sang `#FFFFFF` (bình `#FCD34D`
  và cỏ `#3DCF88` giữ nguyên; cái `rect fill="white"` trong `clipPath` dùng chuỗi khác
  nên không bị chạm).
- **viewBox đã bị crop** từ `0 0 200 100` sang `10 22.2 180.1 50.1`. Lý do: file gốc đặt
  hình giữa canvas cao gấp đôi, để nguyên thì `height: 26px` render ra hình chỉ ~13px.
  Bounding box đo bằng sharp trim. **Nếu user muốn giữ nguyên 100% file gốc thì hoàn
  nguyên chỗ này và bù bằng CSS.**
- Navbar app (`Navbar.tsx`) + landing đều đã đổi sang `<img src=logo-full-dark.svg>`;
  cách ghép cũ (mark riêng + chữ "LuckyPot" đánh bằng Space Grotesk) đã xoá, kèm 2 class
  `.brand__word` / `.brand__mark`.
- **Verify được từ server**: HTML landing live đúng là
  `<img src="logo-full-dark.svg" alt="LuckyPot" />`, file trả về có
  `viewBox="10 22.2 180.1 50.1"` và 8 path `#FFFFFF`; bundle app tham chiếu
  `assets/logo-full-dark-CAnD0q43.svg`. Render ra đúng lockup bình + chữ trắng.
- **Nhưng user vẫn báo thấy logo cũ.** Đã hỏi, user chọn "vẫn thấy logo cũ trên site"
  (không phải phản đối việc crop, không phải chê navbar xấu).

→ Đã xong: nghi ngờ "cache trình duyệt" là đúng, xem mục ✅ ĐÃ GIẢI QUYẾT ở trên.
**Bài học: khi curl nói ngược với mắt user, đừng curl thêm lần thứ ba — hãy chụp màn hình
bằng Chrome headless, và nghi cache trước tiên nếu tên file không có content hash.**

Ngoài ra `/logo` và `/logo-dark` là 2 short URL (302 qua `landing/_redirects`) trỏ tới
`logo-full.svg` / `logo-full-dark.svg`. Đây là hiểu nhầm ban đầu của tôi khi user nói
"trỏ nó vào luckypot.cc/logo" — user muốn nói *logo của site*, không phải một URL.
Giữ lại vì vẫn tiện, nhưng không phải cái user yêu cầu.

### Redesign dark — hệ token và typography (đã xong, đã live)

**Font: Inter (UI/body) + Space Grotesk (heading, wordmark, MỌI con số).** Self-host qua
`@fontsource/inter` + `@fontsource/space-grotesk`, không gọi Google Fonts lúc runtime.
Biến: `--font-ui`, `--font-display`. `--font-condensed` (Roboto Condensed) đã BỎ khỏi app;
landing còn giữ tên đó nhưng chỉ là alias trỏ về `--font-display`.

Lý do chọn: docs.privy.io dùng **FFF Acid Grotesk** cho heading (font thương mại họ tự
host, repo không ship được) + **Inter** cho body. Inter lấy đúng y hệt; Space Grotesk
đứng thay Acid Grotesk. Muốn đúng bản gốc = mua licence webfont rồi đổi mỗi `--font-display`.

**Thang chữ hạ từ 15/18/22/27 sang `--fs-0..4` = 10/12/14/19/20** (user kêu chữ to, chèn lấn).
0 = nhãn micro in hoa (tầng mới), 1 = body/UI/nút/dòng list (sàn), 2 = tiêu đề card,
3 = countdown, 4 = con số lớn nhất của card.

**Màu: lấy nguyên token dark của Privy** để modal login của họ khớp chrome mình.
`--color-page-bg #000008` · `--color-surface #010110` · `--color-card-bg #16172a` ·
`--color-elevated #22222a` · `--color-line #333455` · `--color-hair #24253f` ·
text `#ffffff` / secondary `#cbcde1` / faint `#8b8dab`.

⚠️ **Xanh đổi `#16a34a` sang `#3dcf88`**: xanh cũ (vừa là primary của mình vừa là success
của Privy) KHÔNG đủ tương phản trên nền gần đen. `#3dcf88` là sắc Privy dùng cho dark.
Kéo theo: **mọi nút xanh đặc dùng chữ `#04170e`**, không dùng trắng.
Slab `#ffcc00` cũ thay bằng card amber `#fcd34d` 12% + viền 35%.

**`pill-button--primary/--secondary` đổi tên thành `--quiet/--accent`** — restyle làm đảo
cái nào đặc cái nào viền, giữ tên cũ là bẫy cho lần sửa sau. `--accent` = xanh đặc (1 hành
động chính mỗi màn), `--quiet` = nền elevated + viền.

**LƯỚI KHÔNG ĐỔI**: vẫn 50px/hàng, gap 10, bo 15, shell 860/430, 13 hàng đúng thứ tự cũ.

### 3 luật xuống dòng (đừng phá)

1. **KHÔNG bọc chữ trong span có `min-width: 0`** rồi thả vào flex — flex sẽ bóp chữ xuống
   dưới bề rộng tự nhiên và ngắt dòng dù còn thừa cả trăm px. Đây chính là bug banner user
   bắt được.
2. **`text-wrap: pretty` (class `.prose`), KHÔNG dùng `balance`** — `balance` chủ động chia
   đôi một dòng đang vừa khít. Đó là nửa còn lại của bug banner.
3. **`.pair` = `white-space: nowrap`** cho cặp số + đơn vị (`1,300.38 USDC`), địa chỉ rút
   gọn, countdown, và cụm CTA gạch chân.

Banner giờ đúng 3 flex item: icon (`flex: none`) · chữ (`flex: 1 1 auto`) · chevron
(`flex: none`). Xem `.banner*` trong global.css và `AnnouncementBanner.tsx`.

**MY HISTORY: hàng 50px** (trước 90/100px) — bằng đúng đơn vị của DRAW HISTORY để 2 box kẻ
ngang trùng nhau. Ngày dời sang cạnh action thay vì chiếm riêng 1 dòng, vừa 5 dòng thay vì
3. Class `.card-list__row--stacked` đã xoá.

### Copy: "full epoch" chứ không phải "full week"

`deposit()` cộng vào `pendingBalance`; roll-in sang `eligibleBalance` xảy ra trong
`revealAndDraw`, tức **tại mốc epoch** — mà mốc đó neo Thứ Hai 00:00 UTC (= 7h sáng T2 giờ
VN). Nên luật là **mốc-tới-mốc**, không phải đếm đủ 7 ngày. Gửi thứ 4 thì chờ hết epoch đó,
thành ticket ở mốc T2, rồi chạy cho epoch kế. Ai đọc "a full week" mà gửi thứ 7 sẽ tưởng T7
tuần sau có vé — chuyện đó không bao giờ xảy ra. Đã sửa ở landing (hero, meta description,
step 2, mục Tickets, mục Yield) và 2 popup của app (`PoolCard`).

⚠️ **Cảnh báo cũ "đừng dùng chữ Monday" trong HANDOFF ĐÃ HẾT HIỆU LỰC** — nó có từ trước
bản V3 neo lịch (2026-08-25). Giờ nói "Monday 00:00 UTC" là đúng sự thật.

**Copy multisig đã sửa**: dòng "Admin is a 2-of-2 Safe multisig, not a single wallet" bị bỏ
khỏi danh sách "What never changes" (nó không phải thứ không đổi) và chuyển xuống mục
"Honest boundaries", nói thẳng là ví đơn vẫn có quyền ngang Safe, chưa siết vì chưa deposit
vào DeFi thật, và sẽ siết trước khi có tiền thật. User đã duyệt cách diễn đạt này.

### Privy — 2 bug, mức độ chắc chắn KHÁC NHAU

**`VITE_PRIVY_APP_ID` có trong `frontend/.env` nên `USE_PRIVY = true` và production LUÔN
build cây Privy.** "Dùng MetaMask" thực chất là nối MetaMask *qua* Privy. Không có chuyện
2 config wagmi khác nhau ở production.

1. **Login email nhưng vào nhầm MetaMask — tìm ra gốc trong source, CHƯA TEST.**
   `useSyncPrivyWallets.mjs` đăng ký 1 wagmi connector cho MỖI ví rồi gọi `reconnect()`,
   mà `reconnect()` khôi phục theo `recentConnectorId` trong localStorage — key này Privy
   ghi mỗi lần có ví nào connect. Nên một khi MetaMask từng dùng trên trình duyệt đó, mọi
   lần login email sau đều reconnect thẳng về MetaMask.
   Fix: truyền `setActiveWalletForWagmi` (prop có sẵn, chưa bao giờ truyền) trong `main.tsx`
   — `pickActiveWallet` ưu tiên ví `walletClientType === "privy"`. Vì
   `createOnLogin: "users-without-wallets"`, ví embedded chỉ tồn tại với người đăng ký
   KHÔNG có ví, nên "ưu tiên embedded" = "dùng đúng ví vừa login". Truyền prop này cũng làm
   Privy bỏ luôn việc ghi `recentConnectorId` (`a || (...)` trong source), nên đường storage
   cũ bị gỡ chứ không phải bị lấn át. **KHÔNG cần xoá site data.**
   Trường hợp chưa cover: tài khoản tạo bằng email VÀ đã link MetaMask sẽ luôn bị ép vào
   embedded, không có cách đổi trong app. Có thể thêm nút đổi ví trong dropdown navbar
   (`useWallets` + `useSetActiveWallet`, khoảng 20 dòng) — user chưa duyệt.

2. **Nút sell không chạy — GỐC THẬT chính là bug deploy 405 ở đầu mục này.** Không liên
   quan Privy chút nào. Hai thứ tôi sửa trước đó (chặn khi ví 0 USDC vì USDC là gas token
   của Arc; truyền `account` + `chainId` tường minh cho `sendTransaction`) là lỗi thật và
   nên giữ, **nhưng KHÔNG phải nguyên nhân** — tôi đã nói sai với user chỗ này.

### RPC 429

Console user ngập `429` từ `rpc.testnet.arc.io`. `multicall3` vốn đã cấu hình nên các hook
nhiều contract chỉ tốn 1 call, nhưng các read đơn lẻ cộng lại vẫn bắn khoảng 8 request cùng
lúc lúc mount, rồi react-query retry mỗi cái 3 lần. Đã sửa: transport
`http(undefined, { batch: true })` ở cả 2 config (gộp eth_call cùng tick vào 1 POST), và
QueryClient hạ `retry: 1`, `staleTime: 10_000`, `refetchOnWindowFocus: false`.

### Chưa verify được (cập nhật 2026-08-30 chiều)

**ĐÃ verify bằng Chrome headless** (xem mục 🔧 ở trên): 2 navbar hiện đúng logo mới, landing
+ /app render đúng theme dark, banner không xuống dòng vô lý, `POST /api/swap` trên
production trả **HTTP 200** kèm intent đầy đủ (bug 405 đã hết thật).

Còn lại phải có người thật bấm (headless không login ví được): **luồng Privy
login-email → faucet → sell**, tức là fix Privy #1 bên dưới vẫn CHƯA test thật.

Rasterize SVG: dùng Chrome headless (mục 🔧) — không cần `sharp`, không cần ImageMagick.

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

## Tổng hợp — những việc lớn CHƯA từng ghi vào HANDOFF (bổ sung 2026-08-25)

Các việc này đã làm xong và push từ trước nhưng chưa được note lại ở đây:

- **Rebrand LuckyStaker → StableLuck → LuckyPot (tên CUỐI CÙNG).** Đổi tên repo GitHub,
  text trong app, package name, localStorage key prefix (`luckypot:...`), 2 lần liền —
  contract Solidity vẫn giữ tên cũ `LuckyStakerPool.sol` (xem cảnh báo đầu file).
- **Landing page mới** ở `frontend/landing/index.html` — file HTML tĩnh riêng, KHÔNG qua
  Vite build, đọc dữ liệu on-chain thật bằng `viem` import trực tiếp từ `esm.sh` (không
  cần bundler vì đây không phải React app). Domain `luckypot.cc` trỏ root vào landing,
  `/app` vào dashboard React — cấu hình bằng `vite.config.ts` (`base: "/app/"`,
  `build.outDir: "dist-site/app"`) + script `frontend/scripts/build-site.mjs` copy landing
  vào `dist-site/` sau khi build app. Lệnh build đúng giờ là `npm run build:site`
  (KHÔNG PHẢI `npm run build` — lệnh đó chỉ build app, thiếu landing).
  - Domain `luckypot.cc` gắn qua Cloudflare API trực tiếp (không có `wrangler pages domain`
    command ở bản wrangler đang dùng) — token ở `EZwallet/.env.txt` (`CF_API_TOKEN`,
    `CF_ACCOUNT_ID`), xem lệnh trong lịch sử chat nếu cần gắn domain khác.
  - Toàn bộ icon (kể cả landing) phải lấy từ `D:\Files\Claude\Icons`, copy vào
    `frontend/landing/icons/` (landing) hoặc `frontend/src/assets/icons/` (app) — **không
    dùng ký tự unicode/emoji giả icon** (đã từng sai với "✕", "↓", dấu "+/–" ở accordion,
    user nhắc rất gắt vụ này).
  - Logo chính thức `luckypot.svg` (lọ vàng + lá tứ diệp xanh, 2 màu — dùng thẳng `<img>`,
    KHÔNG dùng kỹ thuật mask 1 màu) — cũng là favicon.svg + apple-touch-icon.png (render
    bằng Playwright screenshot 180×180 vì máy không có công cụ convert SVG→PNG khác).
- **Fix bug nghiêm trọng: "Buffer is not defined" khi deposit qua Privy.** Privy SDK +
  vài dependency wallet-connect của nó cần `Buffer`/`process`/`global` (biến Node.js),
  Vite (khác webpack) không tự polyfill. Fix bằng `vite-plugin-node-polyfills` trong
  `vite.config.ts`, scope đúng 3 biến đó.
- **Modal.tsx giờ render qua React Portal (`createPortal` vào `document.body`)** — trước
  đó Modal là con trực tiếp của 1 container `display:grid` (dashboard-grid hoặc card's
  own row-grid), khiến `position:fixed` bị "kẹt" trong ô grid thay vì phủ toàn màn hình
  → click ra ngoài để đóng popup KHÔNG hoạt động đúng (backdrop chỉ to bằng cái box mở
  popup đó). Đây là lỗi ẩn ảnh hưởng MỌI popup trong app, không riêng popup nào — đã fix
  1 lần cho tất cả qua Portal.
- **`formatUSDC` đổi mặc định `maximumFractionDigits` 0 → 2** — số nguyên vẫn hiện gọn
  (không thêm `.00` thừa), nhưng số lẻ nhỏ (giải thưởng 0.075 USDC) không còn hiện sai
  thành "0 USDC".
- **Icon copy trên navbar giờ animate:** bấm copy địa chỉ → đổi sang `check.svg` màu xanh
  1.5s rồi tự về lại `copy.svg`.
- **README.md và PROJECT.md đã viết lại toàn bộ** cho khớp logic mới nhất (yield `aprBps`,
  chia giải `sqrt`, referral, vault) — README giờ mở đầu bằng core belief thay vì đi thẳng
  vào cấu trúc thư mục.
- **Git identity đổi sang tài khoản `still2412`** cho repo này (LOCAL config, không phải
  global — các project khác của user vẫn dùng KattyFury bình thường). `gh` active account
  cũng là `still2412`, hiện đã có quyền **admin** trên repo (cấp qua API sau khi UI web
  không cho đổi role trực tiếp — xem lịch sử chat nếu cần lặp lại thao tác này).

## Trạng thái nghỉ 2026-08-25 — epoch giờ neo đúng lịch Thứ Hai 00:00 UTC

**Upgrade thứ 3 lên proxy** (`0xD2F9562f31eb6a1eA89D296e7a5aBf4a0E3fEA56`, module
`LuckyStakerPoolV3Implementation.ts`) — chỉ sửa logic `revealAndDraw`, KHÔNG thêm
biến mới nên không cần `initializeV2`/reinitializer, upgrade bằng
`upgradeToAndCall(newImpl, "0x")` (data rỗng).

- **Vấn đề cũ:** `epochs[currentEpochId].endTime = block.timestamp + 7 ngày` —
  tính theo giờ bot thực sự gọi `revealAndDraw`, nên trôi dần theo thời gian,
  không neo theo lịch dương.
- **Fix:** `newStart = epoch_cũ.endTime` (không phải `block.timestamp`) +
  `newEnd = _nextMondayUTC(newStart)` — hàm mới `_nextMondayUTC()` tính đúng
  0h00 UTC Thứ Hai kế tiếp (Unix epoch 0 = Thứ Năm, nên `weekday = (ngày + 3) % 7`
  với Thứ Hai = 0). Vì dùng `endTime` CŨ làm gốc (không phải giờ thực), epoch đầu
  tiên sau upgrade tự "snap" về đúng Thứ Hai gần nhất (dù ngắn hơn 7 ngày), và
  MỌI epoch sau đó tự động đúng trọn 7 ngày Thứ Hai → Thứ Hai mãi mãi — không
  cần can thiệp gì thêm.
  - ⚠️ **`forceEndEpoch()` phá chuỗi neo lịch này** — nó ghi đè `endTime = now`,
    nên nếu dùng để test nhanh, epoch NGAY SAU đó sẽ lại lệch lịch 1 lần nữa
    (rồi tự neo lại đúng từ epoch sau nữa). Đây là đánh đổi đã biết của hàm test,
    không phải bug.
- **Đã thực hiện thật:** force-end epoch #06 (quay ra 1 người trúng
  `0x24425EE2...c10`, quỹ 1.300384 USDC) → epoch #07 xác nhận kết thúc đúng
  **Thứ Hai 31/08/2026, 00:00:00 UTC** (epoch chuyển tiếp, ngắn hơn 7 ngày do bắt
  đầu giữa tuần) — từ epoch #08 trở đi sẽ luôn trọn 7 ngày Thứ Hai → Thứ Hai.
  Tiền không suy chuyển: 1,217 USDC trước/sau đều khớp.
- Test mới `"anchors epoch boundaries to Monday 00:00 UTC..."` verify cả 2 case:
  epoch đầu tự snap đúng Monday, epoch kế tiếp cách đúng 7×86400 giây.

### Bài học/gotcha đã sửa cùng đợt này

- **`formatUSDC` mặc định `maximumFractionDigits=0`** làm giải thưởng nhỏ
  (0.075 USDC) hiện thành "0 USDC" — đổi mặc định thành 2, số nguyên vẫn hiện
  gọn (`toLocaleString` không thêm `.00` thừa vì đây là max, không phải fixed).
- **Khoản ~9.925 USDC "thừa" vào vault ở epoch #05** — KHÔNG phải bug công thức
  mới. Epoch 5 đang chạy dở lúc upgrade lần 2 (aprBps) hạ cánh; `pendingYield`
  khi đó đã tích luỹ sẵn theo công thức CŨ (`max($10, pool×10%/52)`) từ cron
  chạy trước upgrade. Logic mới đúng nhận phần dư đó là `surplus`, quét vào
  vault đúng như thiết kế — chỉ là tàn dư 1 lần từ lúc chuyển đổi, đã sạch từ
  epoch #06. Code hiện không còn `$10`/`MIN_PRIZE` ở bất kỳ đâu (đã grep xác nhận).

## Trạng thái nghỉ 2026-08-24 (tối) — technical-spec upgrade ĐÃ CHẠY THẬT lên chain

**Đã upgrade contract logic thật trên proxy đang chạy** (`0x88dCB2f36356AA8DADdC2e8fb4A3E122Ba9D0Beb`), không redeploy, không mất dữ liệu cũ (verify lại: `balancesTotal=65 USDC`, `currentEpochId=5` giữ nguyên sau upgrade).

- **Implementation mới:** `0x1fEB6ac87f97B2C080d9BbDA940351116A2A54F0`, deploy qua `contracts/ignition/modules/LuckyStakerPoolV2Implementation.ts` (module CHỈ deploy implementation, không đụng proxy — an toàn deploy bất cứ lúc nào).
- **Logic mới (theo `luckypot-technical-spec.md` user gửi):**
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

## Lịch sử tóm tắt (chi tiết đầy đủ nằm trong git log / chat cũ nếu cần đào lại)

- **2026-08-23:** Deploy thật đầu tiên lên Arc Testnet, dựng xong toàn bộ UI theo spec,
  luồng cào thẻ/claim/sweep. `still2412` được mời làm collaborator (write), sau đó
  (08-25) nâng lên admin và trở thành tài khoản `gh`/git chính cho repo này.
- **2026-08-24 → 08-25:** Rebrand 2 lần (→ StableLuck → LuckyPot), chuyển repo Private,
  nâng cấp contract 3 lần (technical-spec yield/prize/referral/vault → Monday-anchor
  epoch), thêm landing page + domain `luckypot.cc`, fix hàng loạt bug UI (xem mục
  "Tổng hợp" phía trên).
- **Việc còn treo, chưa khẩn:**
  1. Siết lại quyền admin về đúng chuẩn Safe 2-of-2 (hiện có thêm 1 ví đơn ngang quyền,
     xem mục Roadmap ở section Monday-anchor phía trên) — trước khi có tiền/yield thật.
  2. `IYieldSource` interface đã khai báo, chưa có implementation thật (chờ Arc có DeFi
     đáng tin).
  3. Banner cảnh báo `$ARC isn't live yet...` là tự thêm, chưa hỏi lại user có muốn giữ
     nguyên câu chữ đó không (giờ toggle $ARC đã khoá cứng nên banner này gần như không
     bao giờ hiện nữa — có thể coi là hết cần thiết).

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
npx vite --port 5183 --host        # dev server (chỉ phục vụ app, KHÔNG có landing page)
./node_modules/.bin/tsc -b --noEmit  # typecheck (đừng dùng `npx tsc`, npx kéo nhầm gói tsc rác)
npm run build:site                 # build app + copy landing vào dist-site/ — dùng lệnh này, KHÔNG dùng `npm run build` suông
# DEPLOY: chay tu GOC REPO, khong phai tu frontend/ — wrangler compile thu muc
# functions/ tim thay trong CWD cua no, ma functions/ nam o goc. Chay tu frontend/
# thi Functions KHONG duoc upload, /api/swap tra 405 (static handler tu choi POST).
# Dung script cho chac: (tu frontend/) npm run deploy
cd .. && npx wrangler pages deploy frontend/dist-site --project-name=luckypot --branch=main --commit-dirty=true

# gắn/kiểm tra domain luckypot.cc (không có lệnh wrangler cho việc này, phải gọi API)
# xem CF_API_TOKEN/CF_ACCOUNT_ID trong D:\Files\Claude\Build on Arc\EZwallet\.env.txt

# contracts — deploy CHỈ implementation mới (an toàn, không đụng proxy đang chạy):
npx hardhat test
echo "y" | npx hardhat ignition deploy ignition/modules/LuckyStakerPoolV<n>Implementation.ts --network arcTestnet --deployment-id luckypot-v<n>-impl
# rồi tính calldata upgradeToAndCall + để ví admin (Safe hoặc 0xb0ea48A1...) tự ký qua 1 trang HTML nhỏ gọi eth_sendTransaction (xem lịch sử chat để lấy lại mẫu)

# automation
npm run fund-yield && npm run draw:now   # draw:now cần secret local, nếu epoch đã commit bởi cron thì phải trigger `gh workflow run keeper.yml` thay vì draw:now
```
