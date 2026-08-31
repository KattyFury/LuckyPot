# LuckyPot – mô tả dự án (bản as-built)

> Tài liệu này mô tả **những gì đã build và đang chạy thật**, để dùng làm nguyên
> liệu thảo luận core belief, viết landing page và trang GitHub.
>
> Phân biệt với 2 file còn lại: [`arc-prize-pool-spec.md`](./arc-prize-pool-spec.md)
> là spec thiết kế lúc chưa build (Bước 1–4), [`HANDOFF.md`](./HANDOFF.md) là
> trạng thái làm việc cho phiên sau (chi tiết kỹ thuật đầy đủ nhất, cập nhật liên
> tục). File này là bản chốt "sản phẩm là gì" — cập nhật khi có thay đổi lớn về
> cơ chế/thương hiệu, không phải mỗi lần sửa UI nhỏ.

**Link:** https://luckypot.cc · **Repo:** https://github.com/KattyFury/LuckyPot (private)

---

## 1. Một câu

Xổ số không mất gốc trên Arc: gửi USDC vào pool, mỗi tuần (những) người may mắn
lấy trọn phần lãi tuần đó, còn ai không trúng vẫn rút lại đủ 100% tiền gốc
bất cứ lúc nào.

## 2. Core belief (nền tảng mọi quyết định)

Từ spec mục 2, và đây là chỗ cần bàn kỹ nhất:

> **Rủi ro mất tiền là thứ duy nhất ngăn người ta chơi trò may rủi.** Bỏ rủi ro
> đó đi mà vẫn giữ cảm giác hồi hộp và phần thưởng lớn, người ta sẽ hành động
> nhiều hơn hẳn so với một con số lãi suất cố định vô cảm.

Hai suy luận đi kèm, đều đã được chốt trong spec:

- **Yêu cầu quan trọng nhất là VUI, không phải tối ưu lợi nhuận.** Trải nghiệm
  hồi hộp / cào thẻ mới là sản phẩm; lãi suất chỉ là nhiên liệu.
- **"Cơ hội là free."** Vì gốc không mất, chi phí tham gia thực sự bằng 0 (chỉ
  mất phần lãi lẽ ra được chia). Nên phần thưởng phải **đủ đậm để đáng nhớ** —
  giữ jackpot lớn thay vì chia vụn thành nhiều giải nhỏ. Từ bản nâng cấp
  2026-08-24, điều này được mã hoá thẳng vào công thức (`sqrt`) thay vì chỉ là
  nguyên tắc — xem mục 4.

## 3. Cho ai

Người **đã hiểu crypto**, quen khái niệm staking/yield. Không phải người mới.
Căn cứ có thật (không phải phỏng đoán): vé số luôn có người mua dù kỳ vọng âm —
bản không-mất-gốc còn hấp dẫn hơn vé số thật vì loại bỏ hẳn rủi ro mất tiền.

## 4. Cơ chế (đúng như code đang chạy — nâng cấp 2026-08-24)

### Vé
- **1 USDC = 1 vé**, tính theo trọng số tiền gửi trên phần **đã đủ 1 tuần**
  (`eligibleBalance`), không tính trên tổng pool.
- **Điều kiện hợp lệ: phải giữ tiền trong pool trọn một kỳ.** Tiền vừa gửi nằm ở
  `pendingBalance`, chỉ chuyển thành `eligibleBalance` khi kỳ hiện tại kết thúc.
- **Rút bất kỳ lúc nào trong kỳ = mất vé kỳ đó** (kể cả rút một phần), nhưng
  **không bao giờ mất tiền** — gốc rút được mọi lúc, không khoá dưới mọi hình thức.

### Chu kỳ & quay số
- Kỳ (epoch) dài **7 ngày**, không neo theo lịch dương — kỳ mới bắt đầu ngay sau
  khi kỳ trước được quay xong (`revealAndDraw`), không phải luôn đúng nửa đêm
  thứ Hai.
- **Randomness bằng commit-reveal 2 lớp**, không phải VRF: bot commit
  `hash(số bí mật)` lên contract từ đầu kỳ, cuối kỳ mới reveal số gốc, contract
  trộn với `blockhash` của block trước đó để ra kết quả. Lúc commit thì blockhash
  tương lai chưa tồn tại nên **không ai đoán trước được, kể cả bot hay admin**.
- ⚠️ Lý do không dùng `PREVRANDAO`: Arc docs xác nhận nó **luôn trả về 0**, dùng
  là lộ kết quả.
- `forceEndEpoch()` cho keeper kết thúc kỳ ngay (bỏ qua thời gian chờ thật) — dùng
  để test nhanh, **cố ý giữ lại** vì dự án còn thay đổi nhiều, chưa xoá/khoá.

### Yield (đổi hẳn công thức so với bản gốc)
```solidity
aprBps          = biến, admin set tay trong khung cứng + rate-limit 7 ngày/lần
                  (USDC mặc định 600 = 6%/năm, khung 400–800
                   $ARC mặc định 300 = 3%/năm, khung 200–400 — staking an toàn
                   hơn lending nên yield thấp hơn)
realYieldEarned = totalPool      × aprBps / 10000 / 52   // TRÊN TOÀN BỘ pool
weeklyPrizePool = eligibleBalance × aprBps / 10000 / 52   // CHỈ trên phần đã đủ 1 tuần
surplus         = realYieldEarned − weeklyPrizePool       // → vault, chia 50/50
```
Đã bỏ hẳn công thức cũ `max($10, pool × 10%/52)` (sàn $10 cứng, tỉ lệ cố định
10%/năm) — giờ có khung admin điều chỉnh được, tách riêng USDC/$ARC, và có khái
niệm `surplus` (phần lãi từ tiền mới gửi giữa tuần, hoặc từ tiền rút sớm mất vé)
chảy vào vault thay vì biến mất.

### Số người trúng & chia thưởng (thay hẳn bảng tier cũ)
```solidity
numWinners = max(1, floor(sqrt(eligibleBalance / 1000)))

numWinners = 1:  giải nhất = 100% weeklyPrizePool
numWinners > 1:  giải nhất = 50%, còn lại chia đều cho (numWinners − 1) người
```
Khớp đúng 4 mốc đã thống nhất: pool $1.000 → 1 người, $100.000 → 10 người,
$10.000.000 → 100 người, $1.000.000.000 → 1.000 người. Công thức liên tục, không
mốc dollar cứng, không cần sửa contract khi pool lớn lên ngoài dự kiến.

### Referral (mới)
```solidity
setReferrer(ref)     // gọi 1 lần, vĩnh viễn, không tự-ref được
claimReferral()       // ref tự rút phần tích luỹ

// lúc claim/sweep:
cut = giải × 5%       // luôn trừ, cả giải nhất lẫn giải phụ
có ref  → cut vào pendingRef[ref]
không ref → cut chia đôi vào vaultReserve / vaultDev
```
Đã bỏ hẳn `teamBps = 200` (skim cố định trên yield mỗi tuần, không phụ thuộc ai
thắng) — thay bằng cơ chế 5% cut lúc claim này, không còn 2 dòng tiền chồng nhau.

### Vault (mới)
- `vaultReserve`/`vaultDev` là **bộ đếm `uint256` bên trong contract chính**,
  KHÔNG phải 2 ví ngoài — quyết định thiết kế cố ý: nếu tiền rời contract ngay
  khi tích luỹ thì điều kiện `whenPaused` trên `withdrawReserve` sẽ mất tác dụng.
- `withdrawReserve(amount, to, reason)` — chỉ chạy khi contract đang **paused**,
  dùng để đền bù nếu có sự cố mất quỹ. Không có cách rút ra ngoài mục đích này.
- `withdrawDev(amount, to)` — rút bình thường, dùng duy trì server/cộng đồng/marketing.
- Cả 2 đều nhận `to` làm tham số lúc rút (không có địa chỉ ví cố định lưu sẵn) —
  minh bạch nằm ở chỗ mọi lần rút đều lộ địa chỉ nhận qua event on-chain.

### Nhận thưởng
- Kết quả **chốt on-chain ngay khi quay**, không tự động chuyển vào ví.
- Người trúng vào **cào thẻ** để lộ kết quả rồi bấm Claim → tiền về ví (đã trừ
  5% referral cut). Cào **chỉ 1 lần duy nhất** cho mỗi kỳ, lần sau mở lại hiện
  thẳng kết quả.
- Không cào trong **3 ngày** → **bất kỳ ai** cũng gọi được hàm `sweep()` để đẩy
  tiền về ví người trúng. Không cần tin admin, không cần Chainlink Automation.
- **Không bao giờ có hạn chót làm mất thưởng** — quá hạn chỉ mất hiệu ứng cào,
  không mất tiền.

### Quản trị
- **Admin gốc là Safe 2-of-2 multisig**, không phải ví đơn.
- ⚠️ **Từ 2026-08-24, có thêm 1 ví đơn (`0xb0ea48A1...A12E`) cũng giữ
  `DEFAULT_ADMIN_ROLE` song song với Safe** — thêm tạm thời để tránh phải vật lộn
  với Safe UI (bị rate-limit RPC) khi đang gấp deadline. Safe không bị thu quyền,
  chỉ là có thêm 1 đường tắt. Đây là đánh đổi bảo mật thật (1 ví đơn giờ tự upgrade
  được contract) — chấp nhận được vì đang testnet/tiền test, **phải siết lại
  trước khi có yield/tiền thật quy mô lớn** (xem HANDOFF.md mục Roadmap).
- Contract **upgradable (UUPS proxy)** — chấp nhận được *chỉ vì* admin (khi đúng
  chuẩn) là multisig; nếu admin là 1 ví đơn duy nhất thì tổ hợp này là rủi ro
  rug-pull toàn phần.
- **Pause loại 2:** chỉ chặn gửi tiền/quay số mới, **KHÔNG bao giờ khoá rút gốc**.
  Không tồn tại nút "khoá toàn bộ", và cũng không có nút admin "trả hết tiền cho
  mọi người" (đã cân nhắc và từ chối — xem mục 7).
- Chống reentrancy chuẩn OpenZeppelin, đánh dấu đã claim **trước** khi chuyển tiền.

## 5. Khác gì PoolTogether

PoolTogether làm mô hình pool + xổ số từ 2019 nhưng **phụ thuộc Aave/Compound**
để sinh lãi. Bản này thiết kế **Arc-native**: không cần lending protocol bên
ngoài, và pool token là **biến có thể đổi** nên khi Arc bật staking thật thì chỉ
đổi địa chỉ token, không viết lại phần lõi. Công thức chia giải cũng khác: liên
tục theo `sqrt(eligibleBalance)` thay vì bảng tier cố định.

## 6. Ranh giới trung thực – được nói gì và KHÔNG được nói gì

Phần này quan trọng cho landing page: **đừng để copy nói quá sự thật.**

**ĐƯỢC nói:**
- Không mất gốc, rút bất cứ lúc nào, không khoá.
- Quay số verify được on-chain, admin không chọn được người trúng.
- Không phí ẩn — mọi khoản trừ (5% referral cut) đều public.
- Nhận thưởng không cần tin admin (sweep permissionless).
- Chạy thật trên Arc Testnet, đã có kỳ quay thật với người trúng thật.

**KHÔNG được nói:**
- ❌ *"Lãi từ DeFi"* — Arc chưa có DeFi/staking thật đủ tin cậy. Nguồn lãi hiện
  tại là **admin bơm USDC thật vào theo công thức sống** `aprBps` (khung admin
  set, không phải đọc từ 1 nguồn DeFi thật). Số tiền tính theo công thức, nhưng
  **người bơm là mình**, không phải protocol.
- ❌ *"Staking $ARC"* — $ARC **chưa tồn tại**. TGE chưa có ngày. Toggle
  `USDC | $ARC` trên UI đang **khoá cứng** (không bấm được), đúng vì chưa có gì
  để hiển thị thật đằng sau nó.
- ❌ *"Lãi suất X% cố định"* — `aprBps` là benchmark admin set trong khung, có
  thể đổi (trong giới hạn + rate-limit), không phải cam kết cố định.
- ❌ *"Đã audit"* / *"Mainnet"* — chưa, đang testnet.
- ⚠️ **`forceEndEpoch()`** — cố ý giữ lại để test, cho phép bỏ qua luật "giữ đủ
  1 tuần" nếu bị lạm dụng. Chưa xoá/khoá vì dự án còn thay đổi nhiều.
- ⚠️ **Admin hiện KHÔNG chỉ là Safe 2-of-2** — có thêm 1 ví đơn cùng quyền (xem
  mục 4, Quản trị). Đừng quảng bá "chỉ multisig mới điều khiển được" cho tới khi
  việc này được dọn lại.

## 7. Đã cân nhắc và từ chối

- **Nút admin "trả hết tiền cho toàn bộ user"** (emergency mass refund) — từ
  chối. Lý do: (1) đổi hẳn mô hình tin cậy, cấp cho multisig khả năng tự ý di
  chuyển tiền của tất cả mọi người trong 1 lệnh — đúng kiểu quyền lực mà rug-pull
  lợi dụng, dù ý định ban đầu là tốt; (2) khó làm đúng kỹ thuật — vòng lặp trả
  cho toàn bộ participant trong 1 transaction sẽ đụng giới hạn gas nếu số người
  tham gia lớn. Giữ nguyên nguyên tắc: chỉ từng người tự rút.

## 8. Giới hạn kỹ thuật đã biết

- **Quy mô:** vòng quay lặp qua toàn bộ người tham gia on-chain — ổn ở quy mô
  testnet/hackathon, nhưng pool lớn thì phải tính phân phối off-chain.
- **Mất secret = kỳ đó đứng vĩnh viễn.** Commit-reveal không có đường thoát cho
  admin; nếu bot mất số bí mật đã commit thì kỳ đó không bao giờ reveal được.
  Hiện secret nằm trong cache của GitHub Actions.
- **Faucet không tự động được.** Public faucet của Circle cho 10 USDC/24h và
  **không có API** cho ví tạo ngoài nền tảng Circle. Nạp tiền cho ví bot vẫn
  phải bấm tay mỗi ngày.
- **Luật vé nhị phân** ("đủ 1 tuần hay không") đơn giản hơn TWAB của PoolTogether,
  nhưng chủ động chừa một khoảng chênh: tiền đã vào pool mà chưa được tính vé kỳ
  đó — phần lãi đó giờ **có nơi đến rõ ràng** (chảy vào vault qua `surplus`),
  không còn là "khoản chênh mập mờ" như bản gốc.

## 9. Hiện trạng (2026-08-25)

| | |
|---|---|
| Web | https://luckypot.cc (Cloudflare Pages, landing ở root + dashboard ở `/app`) |
| Chain | Arc Testnet, chainId `5042002` |
| Contract (proxy) | `0xBdE568986a009eBaAE31Cb78033470c334Fad698` — deploy lại từ đầu 2026-08-31, pool sạch (0 USDC) sau khi rút hết để test |
| Admin Safe 2-of-2 | `0x0f5514fCA02b639229528a5521dafd0a61bb27ef` |
| Admin ví đơn (tạm, xem mục 4) | `0xb0ea48A1979326BA9e0b5027D105C8DF9CCAA12E` |
| Ví bot (keeper) | `0x4672A3B3C14727629107711D9853B52e8E1E26B1` |
| Pool hiện tại | 353 USDC tổng / 65 USDC đã đủ điều kiện (eligible) / 5 người gửi, đang ở epoch #05 |
| `aprBpsUSDC` | 600 (6%/năm) |
| Test contract | 15/15 pass |

**Đã chứng minh chạy thật, không phải "chắc là được":**
- **Epoch 4 đã quay thật** (trước khi nâng cấp công thức mới): quỹ thưởng $10,
  **1 người trúng** (`0xb0ea48…A12E`), đã claim.
- **Epoch 3 ra 0 người trúng** — đúng luật: người gửi tiền *giữa* kỳ nên chưa đủ
  điều kiện. Bằng chứng luật vé hoạt động thật, không phải bug.
- Logic mới (yield theo `aprBps`, chia giải `sqrt`, referral, vault) **đã lên
  chain thật** qua 1 lần upgrade proxy, nhưng **chưa qua lần quay số thật nào**
  kể từ khi nâng cấp — epoch #05 hiện tại sẽ là lần đầu chạy công thức mới lúc
  quay.

## 10. Câu hỏi còn mở (cần bàn trước khi làm landing page mở rộng)

1. **Nói thật thế nào về nguồn lãi?** Vẫn là admin bơm theo công thức `aprBps`,
   chưa phải DeFi thật. Landing page hiện tại (`luckypot.cc`) đã chọn hướng nói
   thẳng ("Current yield follows a fixed formula – it's not real DeFi yield
   yet") — có thể coi câu hỏi này đã tạm trả lời, nhưng nên xem lại khi chuẩn bị
   ra ngoài phạm vi demo/hackathon.
2. **Đối tượng có thật sự là "người đã hiểu crypto" không?** Cơ chế no-loss vốn
   dễ giải thích cho người mới. Nếu đổi đối tượng thì UI/copy phải đổi theo.
3. **Hackathon nào, deadline nào?** Vẫn để trống — chưa xác định chính thức
   (thực tế đã có áp lực deadline "thuyết trình thứ Năm" trong quá trình build,
   nhưng chưa rõ đây có phải hackathon chính thức hay không).
4. **Siết lại quyền admin về đúng chuẩn multisig** — không phải câu hỏi mở về
   sản phẩm, mà là việc kỹ thuật cần làm trước khi coi dự án "sẵn sàng thật".

## 11. Nguyên tắc thiết kế UI (cho landing page dùng lại)

- Màu: xanh thương hiệu `#16A34A`, nền thẻ `#D9D9D9`, thông báo vàng `#FFCC00`,
  chữ phụ `#8E8E93`, nền trang `#B8B8BD`.
- Font **Roboto** + **Roboto Condensed** cho số liệu. Thang chữ **33/28/23/18/13**
  (`--fs-1..5`), chú thích **15** (`--fs-caption`).
- Lưới hàng cố định 50px, bo góc 15px, khe 10px. Desktop 860px = đúng 2× mobile
  430px; ngoài khung đổ nền xám, không giãn full màn hình.
- **Trong app: mọi thứ là popup**, không có trang thứ hai.
- **Landing page** (`luckypot.cc`, tách khỏi app ở `/app`) dùng chung toàn bộ hệ
  biến trên để đồng bộ hình ảnh, nhưng có navbar `position: sticky` riêng (app
  không cần vì không cuộn dài), và section dạng cuộn dọc thay vì popup.
- **Toàn bộ icon phải lấy từ `D:\Files\Claude\Icons`** — không dùng ký tự
  unicode/emoji giả icon (đã từng sai với "✕", "↓", "+/–").
- Logo chính thức: `luckypot.svg` (lọ vàng + lá tứ diệp xanh), dùng làm favicon,
  apple-touch-icon, và hiển thị trực tiếp (không qua mask 1 màu, vì logo 2 màu).
